package com.tournamenttracker.backend.service;

import com.tournamenttracker.backend.model.*;
import com.tournamenttracker.backend.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class PlayerDeduplicationService {

    private static final Logger log = LoggerFactory.getLogger(PlayerDeduplicationService.class);

    @Autowired
    private PlayerRepository playerRepository;

    @Autowired
    private ParticipantRepository participantRepository;

    @Autowired
    private MatchRepository matchRepository;

    @Autowired
    private TeamPlayerRepository teamPlayerRepository;

    @Autowired
    private ResultRepository resultRepository;

    @Autowired
    private MatchPlayerOverrideRepository matchPlayerOverrideRepository;

    public static class DuplicateGroupDetail {
        private String email;
        private Long primaryPlayerId;
        private String primaryPlayerName;
        private List<Long> duplicatePlayerIds = new ArrayList<>();
        private List<String> actions = new ArrayList<>();

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }

        public Long getPrimaryPlayerId() { return primaryPlayerId; }
        public void setPrimaryPlayerId(Long primaryPlayerId) { this.primaryPlayerId = primaryPlayerId; }

        public String getPrimaryPlayerName() { return primaryPlayerName; }
        public void setPrimaryPlayerName(String primaryPlayerName) { this.primaryPlayerName = primaryPlayerName; }

        public List<Long> getDuplicatePlayerIds() { return duplicatePlayerIds; }
        public void setDuplicatePlayerIds(List<Long> duplicatePlayerIds) { this.duplicatePlayerIds = duplicatePlayerIds; }

        public List<String> getActions() { return actions; }
        public void setActions(List<String> actions) { this.actions = actions; }
    }

    public static class DeduplicationReport {
        private boolean dryRun;
        private int totalDuplicateEmailsFound;
        private int totalDuplicatesProcessed;
        private Map<String, Integer> summary = new LinkedHashMap<>();
        private List<DuplicateGroupDetail> details = new ArrayList<>();

        public boolean isDryRun() { return dryRun; }
        public void setDryRun(boolean dryRun) { this.dryRun = dryRun; }

        public int getTotalDuplicateEmailsFound() { return totalDuplicateEmailsFound; }
        public void setTotalDuplicateEmailsFound(int totalDuplicateEmailsFound) { this.totalDuplicateEmailsFound = totalDuplicateEmailsFound; }

        public int getTotalDuplicatesProcessed() { return totalDuplicatesProcessed; }
        public void setTotalDuplicatesProcessed(int totalDuplicatesProcessed) { this.totalDuplicatesProcessed = totalDuplicatesProcessed; }

        public Map<String, Integer> getSummary() { return summary; }
        public void setSummary(Map<String, Integer> summary) { this.summary = summary; }

        public List<DuplicateGroupDetail> getDetails() { return details; }
        public void setDetails(List<DuplicateGroupDetail> details) { this.details = details; }
    }

    /**
     * Deduplicates all duplicate player emails in the database.
     * If dryRun is true, scans and returns a detailed preview without modifying any data.
     */
    @Transactional
    public DeduplicationReport deduplicateAll(boolean dryRun) {
        List<String> duplicateEmails = playerRepository.findDuplicateEmails();
        log.info("Found {} duplicate player emails to process. dryRun={}", duplicateEmails.size(), dryRun);

        DeduplicationReport report = new DeduplicationReport();
        report.setDryRun(dryRun);
        report.setTotalDuplicateEmailsFound(duplicateEmails.size());

        Map<String, Integer> counters = initializeCounters();

        int dupCount = 0;
        for (String email : duplicateEmails) {
            DuplicateGroupDetail detail = processDuplicateEmail(email, dryRun, counters);
            if (detail != null) {
                dupCount += detail.getDuplicatePlayerIds().size();
                report.getDetails().add(detail);
            }
        }

        report.setTotalDuplicatesProcessed(dupCount);
        report.setSummary(counters);
        return report;
    }

    /**
     * Deduplicates a single player email.
     */
    @Transactional
    public DeduplicationReport deduplicateSingleEmail(String email, boolean dryRun) {
        if (email == null || email.trim().isEmpty()) {
            throw new IllegalArgumentException("Email cannot be empty");
        }
        String normalizedEmail = email.trim().toLowerCase();

        DeduplicationReport report = new DeduplicationReport();
        report.setDryRun(dryRun);

        Map<String, Integer> counters = initializeCounters();
        DuplicateGroupDetail detail = processDuplicateEmail(normalizedEmail, dryRun, counters);

        if (detail != null && !detail.getDuplicatePlayerIds().isEmpty()) {
            report.setTotalDuplicateEmailsFound(1);
            report.setTotalDuplicatesProcessed(detail.getDuplicatePlayerIds().size());
            report.getDetails().add(detail);
        } else {
            report.setTotalDuplicateEmailsFound(0);
            report.setTotalDuplicatesProcessed(0);
        }

        report.setSummary(counters);
        return report;
    }

    private Map<String, Integer> initializeCounters() {
        Map<String, Integer> counters = new LinkedHashMap<>();
        counters.put("participantsUpdated", 0);
        counters.put("participantsMerged", 0);
        counters.put("matchesReassigned", 0);
        counters.put("resultsUpdated", 0);
        counters.put("teamPlayersUpdated", 0);
        counters.put("teamPlayersDeduplicated", 0);
        counters.put("matchPlayerOverridesUpdated", 0);
        counters.put("matchPlayerOverridesRemoved", 0);
        counters.put("playersDeprecated", 0);
        return counters;
    }

    private DuplicateGroupDetail processDuplicateEmail(String email, boolean dryRun, Map<String, Integer> counters) {
        List<Player> players = playerRepository.findAllByEmailIgnoreCase(email);
        if (players.size() <= 1) {
            log.info("No duplicates found for email: {}", email);
            return null;
        }

        // Sort by ID ascending — oldest record is primary
        players.sort(Comparator.comparing(Player::getId));
        Player primary = players.get(0);

        DuplicateGroupDetail detail = new DuplicateGroupDetail();
        detail.setEmail(email);
        detail.setPrimaryPlayerId(primary.getId());
        detail.setPrimaryPlayerName(primary.getFirstName() + " " + (primary.getLastName() != null ? primary.getLastName() : ""));

        for (int i = 1; i < players.size(); i++) {
            Player dup = players.get(i);
            detail.getDuplicatePlayerIds().add(dup.getId());

            // 1. Deprecate duplicate Player FIRST so that the email address is immediately released
            // in the database, avoiding unique constraint collisions when referencing/updating primary.
            deprecatePlayer(dup, dryRun, counters, detail.getActions());

            // 2. Process Participants (Singles)
            processParticipants(primary, dup, dryRun, counters, detail.getActions());

            // 3. Process Results (last_edited_by_player_id)
            processResults(primary, dup, dryRun, counters, detail.getActions());

            // 4. Process Team_Players (player_id)
            processTeamPlayers(primary, dup, dryRun, counters, detail.getActions());

            // 5. Process Match_Player_Overrides (absent_player_id & sub_player_id)
            processOverrides(primary, dup, dryRun, counters, detail.getActions());
        }

        // 6. After ALL duplicates have been deprecated and flushed, safely normalize primary player's email
        if (!dryRun) {
            String normalizedEmail = email.toLowerCase().trim();
            if (!normalizedEmail.equals(primary.getEmail())) {
                primary.setEmail(normalizedEmail);
                playerRepository.saveAndFlush(primary);
            }
        }

        return detail;
    }

    private void processParticipants(Player primary, Player dup, boolean dryRun, Map<String, Integer> counters, List<String> actions) {
        List<Participant> dupParticipants = participantRepository.findAllByPlayerTeamIdAndType(dup.getId(), "Singles");

        for (Participant dupPart : dupParticipants) {
            Optional<Participant> primaryPartOpt = participantRepository.findByPlayerTeamIdAndTypeAndDivisionId(
                    primary.getId(), "Singles", dupPart.getDivisionId());

            if (primaryPartOpt.isEmpty()) {
                // No conflict in this division: simply update playerTeamId and playerTeamName
                actions.add("Participants: Re-assigned Singles participant #" + dupPart.getId() +
                        " in division " + dupPart.getDivisionId() + " from duplicate player #" + dup.getId() +
                        " to primary player #" + primary.getId());
                counters.put("participantsUpdated", counters.get("participantsUpdated") + 1);

                if (!dryRun) {
                    dupPart.setPlayerTeamId(primary.getId());
                    dupPart.setPlayerTeamName(primary.getFirstName() + " " + (primary.getLastName() != null ? primary.getLastName() : ""));
                    participantRepository.save(dupPart);
                }
            } else {
                // Conflict! Both primary and duplicate are registered in the same division
                Participant primaryPart = primaryPartOpt.get();
                actions.add("Participants Collision: Both player #" + primary.getId() + " and duplicate #" + dup.getId() +
                        " are registered in division " + dupPart.getDivisionId() +
                        ". Merging participant #" + dupPart.getId() + " into #" + primaryPart.getId());

                // Find matches referencing dupPart
                List<Match> matches = matchRepository.findByParticipant1OrParticipant2(dupPart.getId(), dupPart.getId());
                for (Match m : matches) {
                    actions.add("Matches: Re-assigned match #" + m.getMatchId() + " participant from #" + dupPart.getId() + " to #" + primaryPart.getId());
                    counters.put("matchesReassigned", counters.get("matchesReassigned") + 1);

                    if (!dryRun) {
                        if (m.getParticipant1() != null && m.getParticipant1().equals(dupPart.getId())) {
                            m.setParticipant1(primaryPart.getId());
                        }
                        if (m.getParticipant2() != null && m.getParticipant2().equals(dupPart.getId())) {
                            m.setParticipant2(primaryPart.getId());
                        }
                        matchRepository.save(m);
                    }
                }

                counters.put("participantsMerged", counters.get("participantsMerged") + 1);

                if (!dryRun) {
                    // Combine stats
                    primaryPart.setMatchesPlayed(nvl(primaryPart.getMatchesPlayed()) + nvl(dupPart.getMatchesPlayed()));
                    primaryPart.setWon(nvl(primaryPart.getWon()) + nvl(dupPart.getWon()));
                    primaryPart.setLost(nvl(primaryPart.getLost()) + nvl(dupPart.getLost()));
                    primaryPart.setDrawn(nvl(primaryPart.getDrawn()) + nvl(dupPart.getDrawn()));
                    primaryPart.setPointsFor(nvl(primaryPart.getPointsFor()) + nvl(dupPart.getPointsFor()));
                    primaryPart.setPointsAgaint(nvl(primaryPart.getPointsAgaint()) + nvl(dupPart.getPointsAgaint()));
                    primaryPart.setPointsDiff(nvl(primaryPart.getPointsDiff()) + nvl(dupPart.getPointsDiff()));
                    participantRepository.save(primaryPart);

                    // Delete the redundant participant row
                    participantRepository.delete(dupPart);
                }
            }
        }
    }

    private void processResults(Player primary, Player dup, boolean dryRun, Map<String, Integer> counters, List<String> actions) {
        List<Result> results = resultRepository.findByLastEditedByPlayerId(dup.getId());
        for (Result r : results) {
            actions.add("Results: Updated result #" + r.getId() + " (match #" + r.getMatchId() +
                    ") lastEditedByPlayerId from #" + dup.getId() + " to #" + primary.getId());
            counters.put("resultsUpdated", counters.get("resultsUpdated") + 1);

            if (!dryRun) {
                r.setLastEditedByPlayerId(primary.getId());
                resultRepository.save(r);
            }
        }
    }

    private void processTeamPlayers(Player primary, Player dup, boolean dryRun, Map<String, Integer> counters, List<String> actions) {
        List<TeamPlayer> teamPlayers = teamPlayerRepository.findByPlayerId(dup.getId());
        for (TeamPlayer tp : teamPlayers) {
            Optional<TeamPlayer> existingPrimaryTp = teamPlayerRepository.findByTeamIdAndPlayerId(tp.getTeamId(), primary.getId());

            if (existingPrimaryTp.isPresent()) {
                // Primary is already a member of this team -> remove redundant row
                actions.add("Team_Players Collision: Removed duplicate TeamPlayer #" + tp.getId() +
                        " because primary player #" + primary.getId() + " is already in team #" + tp.getTeamId());
                counters.put("teamPlayersDeduplicated", counters.get("teamPlayersDeduplicated") + 1);

                if (!dryRun) {
                    teamPlayerRepository.delete(tp);
                }
            } else {
                // Reassign to primary
                actions.add("Team_Players: Updated TeamPlayer #" + tp.getId() + " (team #" + tp.getTeamId() +
                        ") playerId from #" + dup.getId() + " to #" + primary.getId());
                counters.put("teamPlayersUpdated", counters.get("teamPlayersUpdated") + 1);

                if (!dryRun) {
                    tp.setPlayerId(primary.getId());
                    teamPlayerRepository.save(tp);
                }
            }
        }
    }

    private void processOverrides(Player primary, Player dup, boolean dryRun, Map<String, Integer> counters, List<String> actions) {
        // Absent player overrides
        List<MatchPlayerOverride> absentOverrides = matchPlayerOverrideRepository.findByAbsentPlayerId(dup.getId());
        for (MatchPlayerOverride mpo : absentOverrides) {
            if (mpo.getSubPlayerId() != null && mpo.getSubPlayerId().equals(primary.getId())) {
                // Self-substitution conflict (player subbing for themselves)
                actions.add("Match_Player_Overrides: Removed self-substitution override #" + mpo.getId() +
                        " in match #" + mpo.getMatchId() + " (player #" + primary.getId() + " was both absent and sub)");
                counters.put("matchPlayerOverridesRemoved", counters.get("matchPlayerOverridesRemoved") + 1);

                if (!dryRun) {
                    matchPlayerOverrideRepository.delete(mpo);
                }
            } else {
                actions.add("Match_Player_Overrides: Updated override #" + mpo.getId() +
                        " absentPlayerId from #" + dup.getId() + " to #" + primary.getId());
                counters.put("matchPlayerOverridesUpdated", counters.get("matchPlayerOverridesUpdated") + 1);

                if (!dryRun) {
                    mpo.setAbsentPlayerId(primary.getId());
                    matchPlayerOverrideRepository.save(mpo);
                }
            }
        }

        // Sub player overrides
        List<MatchPlayerOverride> subOverrides = matchPlayerOverrideRepository.findBySubPlayerId(dup.getId());
        for (MatchPlayerOverride mpo : subOverrides) {
            if (mpo.getAbsentPlayerId() != null && mpo.getAbsentPlayerId().equals(primary.getId())) {
                actions.add("Match_Player_Overrides: Removed self-substitution override #" + mpo.getId() +
                        " in match #" + mpo.getMatchId() + " (player #" + primary.getId() + " was both absent and sub)");
                counters.put("matchPlayerOverridesRemoved", counters.get("matchPlayerOverridesRemoved") + 1);

                if (!dryRun) {
                    matchPlayerOverrideRepository.delete(mpo);
                }
            } else {
                actions.add("Match_Player_Overrides: Updated override #" + mpo.getId() +
                        " subPlayerId from #" + dup.getId() + " to #" + primary.getId());
                counters.put("matchPlayerOverridesUpdated", counters.get("matchPlayerOverridesUpdated") + 1);

                if (!dryRun) {
                    mpo.setSubPlayerId(primary.getId());
                    matchPlayerOverrideRepository.save(mpo);
                }
            }
        }
    }

    private void deprecatePlayer(Player dup, boolean dryRun, Map<String, Integer> counters, List<String> actions) {
        String newEmail = dup.getEmail() + "_deprecated_" + dup.getId();
        String newLastName = (dup.getLastName() != null ? dup.getLastName() : "") + " (DEPRECATED)";

        actions.add("Players: Deprecated duplicate player #" + dup.getId() +
                " -> email set to '" + newEmail + "', lastName set to '" + newLastName + "'");
        counters.put("playersDeprecated", counters.get("playersDeprecated") + 1);

        if (!dryRun) {
            dup.setEmail(newEmail);
            dup.setLastName(newLastName);
            playerRepository.saveAndFlush(dup);
        }
    }

    private long nvl(Long val) {
        return val != null ? val : 0L;
    }
}
