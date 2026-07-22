package com.tournamenttracker.backend.controller;

import com.tournamenttracker.backend.model.Match;
import com.tournamenttracker.backend.model.Participant;
import com.tournamenttracker.backend.model.Result;
import com.tournamenttracker.backend.repository.MatchRepository;
import com.tournamenttracker.backend.repository.ParticipantRepository;
import com.tournamenttracker.backend.repository.ResultRepository;
import com.tournamenttracker.backend.repository.TeamPlayerRepository;
import com.tournamenttracker.backend.repository.PlayerRepository;
import com.tournamenttracker.backend.repository.GroupRepository;
import com.tournamenttracker.backend.repository.DivisionRepository;
import com.tournamenttracker.backend.model.Group;
import com.tournamenttracker.backend.model.Division;
import com.tournamenttracker.backend.model.TeamPlayer;
import com.tournamenttracker.backend.model.Player;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class MatchController {

    @Autowired
    private MatchRepository matchRepository;

    @Autowired
    private ResultRepository resultRepository;

    @Autowired
    private ParticipantRepository participantRepository;

    @Autowired
    private TeamPlayerRepository teamPlayerRepository;

    @Autowired
    private PlayerRepository playerRepository;

    @Autowired
    private GroupRepository groupRepository;

    @Autowired
    private DivisionRepository divisionRepository;

    private String getPlayerNamesForParticipant(Long participantId) {
        if (participantId == null) return "";
        return participantRepository.findById(participantId).map(p -> {
            if ("Doubles".equalsIgnoreCase(p.getType()) || "Team".equalsIgnoreCase(p.getType())) {
                List<TeamPlayer> teamPlayers = teamPlayerRepository.findByTeamId(p.getPlayerTeamId());
                if (teamPlayers != null && !teamPlayers.isEmpty()) {
                    List<Long> playerIds = teamPlayers.stream().map(TeamPlayer::getPlayerId).toList();
                    List<Player> players = playerRepository.findAllById(playerIds);
                    return players.stream()
                            .map(player -> player.getFirstName() + " " + player.getLastName())
                            .collect(Collectors.joining(" / "));
                }
            }
            return "";
        }).orElse("");
    }

    @GetMapping("/divisions/{divisionId}/matches")
    public List<MatchResponse> getMatchesByDivision(@PathVariable Long divisionId) {
        List<Match> matches = matchRepository.findByDivisionId(divisionId);
        if (matches.isEmpty()) {
            return Collections.emptyList();
        }

        // Fetch all participants for this division to look up names
        List<Participant> participants = participantRepository.findByDivisionId(divisionId.intValue());
        Map<Long, String> participantNames = participants.stream()
                .collect(Collectors.toMap(Participant::getId, Participant::getPlayerTeamName, (a, b) -> a));

        List<MatchResponse> responses = new ArrayList<>();
        for (Match m : matches) {
            MatchResponse res = new MatchResponse();
            res.setMatchId(m.getMatchId());
            res.setDivisionId(m.getDivisionId());
            res.setGroupId(m.getGroupId());
            res.setTournamentId(m.getTournamentId());
            res.setParticipant1(m.getParticipant1());
            res.setParticipant2(m.getParticipant2());
            res.setParticipant1Name(participantNames.getOrDefault(m.getParticipant1(), "Unknown Participant"));
            res.setParticipant2Name(participantNames.getOrDefault(m.getParticipant2(), "Unknown Participant"));
            res.setMatchDate(m.getMatchDate());
            res.setStartTime(m.getStartTime());
            res.setEndTime(m.getEndTime());
            res.setRound(m.getRound());
            res.setCourtId(m.getCourtId());
            res.setParticipant1PlayerNames(getPlayerNamesForParticipant(m.getParticipant1()));
            res.setParticipant2PlayerNames(getPlayerNamesForParticipant(m.getParticipant2()));

            // Fetch result if available
            Optional<Result> resultOpt = resultRepository.findByMatchId(m.getMatchId());
            if (resultOpt.isPresent()) {
                Result r = resultOpt.get();
                res.setP1Status(r.getP1Status());
                res.setP2Status(r.getP2Status());
            }

            responses.add(res);
        }

        return responses;
    }

    @GetMapping("/divisions/{divisionId}/participants")
    public List<Participant> getParticipantsByDivision(
            @PathVariable Long divisionId,
            @RequestParam(required = false) Long groupId) {
        if (groupId != null) {
            return participantRepository.findByGroupId(groupId);
        }
        return participantRepository.findByDivisionId(divisionId.intValue());
    }

    @GetMapping("/groups/{groupId}/matches")
    public List<MatchResponse> getMatchesByGroup(@PathVariable Long groupId) {
        List<Match> matches = matchRepository.findByGroupId(groupId);
        if (matches.isEmpty()) {
            return Collections.emptyList();
        }
        // Collect all participant IDs from these matches and resolve names
        List<Long> pIds = matches.stream()
                .flatMap(m -> java.util.stream.Stream.of(m.getParticipant1(), m.getParticipant2()))
                .distinct().toList();
        Map<Long, String> participantNames = new HashMap<>();
        for (Long pid : pIds) {
            participantRepository.findById(pid).ifPresent(p -> participantNames.put(p.getId(), p.getPlayerTeamName()));
        }
        List<MatchResponse> responses = new ArrayList<>();
        for (Match m : matches) {
            MatchResponse res = new MatchResponse();
            res.setMatchId(m.getMatchId());
            res.setDivisionId(m.getDivisionId());
            res.setGroupId(m.getGroupId());
            res.setTournamentId(m.getTournamentId());
            res.setParticipant1(m.getParticipant1());
            res.setParticipant2(m.getParticipant2());
            res.setParticipant1Name(participantNames.getOrDefault(m.getParticipant1(), "Unknown"));
            res.setParticipant2Name(participantNames.getOrDefault(m.getParticipant2(), "Unknown"));
            res.setMatchDate(m.getMatchDate());
            res.setStartTime(m.getStartTime());
            res.setEndTime(m.getEndTime());
            res.setRound(m.getRound());
            res.setCourtId(m.getCourtId());
            res.setParticipant1PlayerNames(getPlayerNamesForParticipant(m.getParticipant1()));
            res.setParticipant2PlayerNames(getPlayerNamesForParticipant(m.getParticipant2()));
            Optional<Result> resultOpt = resultRepository.findByMatchId(m.getMatchId());
            if (resultOpt.isPresent()) {
                res.setP1Status(resultOpt.get().getP1Status());
                res.setP2Status(resultOpt.get().getP2Status());
            }
            responses.add(res);
        }
        responses.sort((r1, r2) -> Integer.compare(r1.getRound() != null ? r1.getRound() : 9999, r2.getRound() != null ? r2.getRound() : 9999));
        return responses;
    }

    @GetMapping("/matches/{matchId}")
    public ResponseEntity<?> getMatchById(@PathVariable Long matchId) {
        return matchRepository.findById(matchId).map(m -> {
            List<Participant> participants = participantRepository.findByDivisionId(m.getDivisionId().intValue());
            Map<Long, String> participantNames = participants.stream()
                    .collect(Collectors.toMap(Participant::getId, Participant::getPlayerTeamName, (a, b) -> a));

            MatchResponse res = new MatchResponse();
            res.setMatchId(m.getMatchId());
            res.setDivisionId(m.getDivisionId());
            res.setGroupId(m.getGroupId());
            res.setTournamentId(m.getTournamentId());
            res.setParticipant1(m.getParticipant1());
            res.setParticipant2(m.getParticipant2());
            res.setParticipant1Name(participantNames.getOrDefault(m.getParticipant1(), "Unknown Participant"));
            res.setParticipant2Name(participantNames.getOrDefault(m.getParticipant2(), "Unknown Participant"));
            res.setMatchDate(m.getMatchDate());
            res.setStartTime(m.getStartTime());
            res.setEndTime(m.getEndTime());
            res.setRound(m.getRound());
            res.setCourtId(m.getCourtId());
            res.setParticipant1PlayerNames(getPlayerNamesForParticipant(m.getParticipant1()));
            res.setParticipant2PlayerNames(getPlayerNamesForParticipant(m.getParticipant2()));

            Optional<Result> resultOpt = resultRepository.findByMatchId(m.getMatchId());
            if (resultOpt.isPresent()) {
                Result r = resultOpt.get();
                res.setP1Status(r.getP1Status());
                res.setP2Status(r.getP2Status());
            }
            return ResponseEntity.ok(res);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/matches/{matchId}")
    public ResponseEntity<?> updateMatch(@PathVariable Long matchId, @RequestBody Match updatedMatch) {
        return matchRepository.findById(matchId).map(existingMatch -> {
            existingMatch.setMatchDate(updatedMatch.getMatchDate());
            existingMatch.setStartTime(updatedMatch.getStartTime());
            existingMatch.setEndTime(updatedMatch.getEndTime());
            existingMatch.setRound(updatedMatch.getRound());
            existingMatch.setCourtId(updatedMatch.getCourtId());
            Match saved = matchRepository.save(existingMatch);
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/matches")
    public ResponseEntity<?> createMatch(@RequestBody Match match) {
        if (match.getDivisionId() == null || match.getTournamentId() == null ||
            match.getParticipant1() == null || match.getParticipant2() == null) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "Mandatory fields are missing");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
        }

        if (match.getParticipant1().equals(match.getParticipant2())) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "Participant 1 and Participant 2 cannot be the same");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
        }

        Match saved = matchRepository.save(match);
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/matches/{matchId}/result")
    public ResponseEntity<Result> getResultByMatch(@PathVariable Long matchId) {
        return resultRepository.findByMatchId(matchId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @Transactional
    @PostMapping("/results")
    public ResponseEntity<?> saveResult(@RequestBody Result result) {
        if (result.getMatchId() == null) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "Match ID is required");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
        }

        // 1. Find the Match
        Optional<Match> matchOpt = matchRepository.findById(result.getMatchId());
        if (!matchOpt.isPresent()) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "Match not found");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(err);
        }
        Match match = matchOpt.get();

        // 2. Look up numSets for this division to decide win/draw threshold
        int numSets = 3;
        Optional<Division> divOpt = divisionRepository.findById(match.getDivisionId());
        if (divOpt.isPresent() && divOpt.get().getNumSets() != null) {
            numSets = divOpt.get().getNumSets();
        }

        // 3. Validate and calculate winner statuses
        int p1SetsWon = 0;
        int p2SetsWon = 0;

        if (result.getSet1P1() != null && result.getSet1P2() != null) {
            if (result.getSet1P1() > result.getSet1P2()) p1SetsWon++;
            else if (result.getSet1P2() > result.getSet1P1()) p2SetsWon++;
        }
        if (result.getSet2P1() != null && result.getSet2P2() != null) {
            if (result.getSet2P1() > result.getSet2P2()) p1SetsWon++;
            else if (result.getSet2P2() > result.getSet2P1()) p2SetsWon++;
        }
        if (result.getSet3P1() != null && result.getSet3P2() != null) {
            if (result.getSet3P1() > result.getSet3P2()) p1SetsWon++;
            else if (result.getSet3P2() > result.getSet3P1()) p2SetsWon++;
        }
        if (numSets >= 4 && result.getSet4P1() != null && result.getSet4P2() != null) {
            if (result.getSet4P1() > result.getSet4P2()) p1SetsWon++;
            else if (result.getSet4P2() > result.getSet4P1()) p2SetsWon++;
        }

        if (numSets == 4 && p1SetsWon == 2 && p2SetsWon == 2) {
            // 4-set Draw
            result.setP1Status("Draw");
            result.setP2Status("Draw");
        } else if (p1SetsWon > p2SetsWon && (numSets == 4 ? p1SetsWon >= 3 : p1SetsWon >= 2)) {
            result.setP1Status("Won");
            result.setP2Status("Lost");
        } else if (p2SetsWon > p1SetsWon && (numSets == 4 ? p2SetsWon >= 3 : p2SetsWon >= 2)) {
            result.setP1Status("Lost");
            result.setP2Status("Won");
        } else {
            Map<String, String> err = new HashMap<>();
            err.put("error", numSets == 4
                ? "Invalid scores. In a 4-set match one team must win 3 sets, or both teams win 2 sets (Draw)."
                : "Invalid scores. One participant must win at least 2 sets.");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
        }

        // 3. Find participants by ID
        Optional<Participant> p1Opt = participantRepository.findById(match.getParticipant1());
        Optional<Participant> p2Opt = participantRepository.findById(match.getParticipant2());

        if (!p1Opt.isPresent() || !p2Opt.isPresent()) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "One or both participants not found");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(err);
        }

        Participant p1 = p1Opt.get();
        Participant p2 = p2Opt.get();

        // Calculate match stats to apply
        int set1P1Val = result.getSet1P1() != null ? result.getSet1P1() : 0;
        int set1P2Val = result.getSet1P2() != null ? result.getSet1P2() : 0;
        int set2P1Val = result.getSet2P1() != null ? result.getSet2P1() : 0;
        int set2P2Val = result.getSet2P2() != null ? result.getSet2P2() : 0;
        int set3P1Val = result.getSet3P1() != null ? result.getSet3P1() : 0;
        int set3P2Val = result.getSet3P2() != null ? result.getSet3P2() : 0;
        int set4P1Val = result.getSet4P1() != null ? result.getSet4P1() : 0;
        int set4P2Val = result.getSet4P2() != null ? result.getSet4P2() : 0;

        int newP1PointsFor = set1P1Val + set2P1Val + set3P1Val + set4P1Val;
        int newP1PointsAgainst = set1P2Val + set2P2Val + set3P2Val + set4P2Val;

        int newP2PointsFor = newP1PointsAgainst;
        int newP2PointsAgainst = newP1PointsFor;

        // Check if result already exists for this match
        Optional<Result> existingOpt = resultRepository.findByMatchId(result.getMatchId());
        Result savedResult;

        if (existingOpt.isPresent()) {
            Result existing = existingOpt.get();

            // Revert previous stats from existing result
            int oldSet1P1 = existing.getSet1P1() != null ? existing.getSet1P1() : 0;
            int oldSet1P2 = existing.getSet1P2() != null ? existing.getSet1P2() : 0;
            int oldSet2P1 = existing.getSet2P1() != null ? existing.getSet2P1() : 0;
            int oldSet2P2 = existing.getSet2P2() != null ? existing.getSet2P2() : 0;
            int oldSet3P1 = existing.getSet3P1() != null ? existing.getSet3P1() : 0;
            int oldSet3P2 = existing.getSet3P2() != null ? existing.getSet3P2() : 0;

            int oldP1PointsFor = oldSet1P1 + oldSet2P1 + oldSet3P1;
            int oldP1PointsAgainst = oldSet1P2 + oldSet2P2 + oldSet3P2;

            int oldP2PointsFor = oldP1PointsAgainst;
            int oldP2PointsAgainst = oldP1PointsFor;

            // Revert P1 stats
            p1.setMatchesPlayed(Math.max(0, (p1.getMatchesPlayed() != null ? p1.getMatchesPlayed() : 0) - 1));
            if ("Won".equals(existing.getP1Status())) {
                p1.setWon(Math.max(0, (p1.getWon() != null ? p1.getWon() : 0) - 1));
            } else if ("Lost".equals(existing.getP1Status())) {
                p1.setLost(Math.max(0, (p1.getLost() != null ? p1.getLost() : 0) - 1));
            }
            // Draw: neither won nor lost counters change
            p1.setPointsFor(Math.max(0, (p1.getPointsFor() != null ? p1.getPointsFor() : 0) - oldP1PointsFor));
            p1.setPointsAgaint(Math.max(0, (p1.getPointsAgaint() != null ? p1.getPointsAgaint() : 0) - oldP1PointsAgainst));
            p1.setPointsDiff((p1.getPointsFor() != null ? p1.getPointsFor() : 0) - (p1.getPointsAgaint() != null ? p1.getPointsAgaint() : 0));

            // Revert P2 stats
            p2.setMatchesPlayed(Math.max(0, (p2.getMatchesPlayed() != null ? p2.getMatchesPlayed() : 0) - 1));
            if ("Won".equals(existing.getP2Status())) {
                p2.setWon(Math.max(0, (p2.getWon() != null ? p2.getWon() : 0) - 1));
            } else if ("Lost".equals(existing.getP2Status())) {
                p2.setLost(Math.max(0, (p2.getLost() != null ? p2.getLost() : 0) - 1));
            }
            // Draw: neither won nor lost counters change
            p2.setPointsFor(Math.max(0, (p2.getPointsFor() != null ? p2.getPointsFor() : 0) - oldP2PointsFor));
            p2.setPointsAgaint(Math.max(0, (p2.getPointsAgaint() != null ? p2.getPointsAgaint() : 0) - oldP2PointsAgainst));
            p2.setPointsDiff((p2.getPointsFor() != null ? p2.getPointsFor() : 0) - (p2.getPointsAgaint() != null ? p2.getPointsAgaint() : 0));

            // Update existing result fields
            existing.setSet1P1(result.getSet1P1());
            existing.setSet1P2(result.getSet1P2());
            existing.setSet2P1(result.getSet2P1());
            existing.setSet2P2(result.getSet2P2());
            existing.setSet3P1(result.getSet3P1());
            existing.setSet3P2(result.getSet3P2());
            existing.setSet4P1(result.getSet4P1());
            existing.setSet4P2(result.getSet4P2());
            existing.setSet1P1At11(result.getSet1P1At11());
            existing.setSet1P2At11(result.getSet1P2At11());
            existing.setSet2P1At11(result.getSet2P1At11());
            existing.setSet2P2At11(result.getSet2P2At11());
            existing.setSet3P1At11(result.getSet3P1At11());
            existing.setSet3P2At11(result.getSet3P2At11());
            existing.setP1Status(result.getP1Status());
            existing.setP2Status(result.getP2Status());
            existing.setLastEditedByPlayerId(result.getLastEditedByPlayerId());
            existing.setLastEditedAt(OffsetDateTime.now());

            savedResult = resultRepository.save(existing);
        } else {
            result.setLastEditedAt(OffsetDateTime.now());
            savedResult = resultRepository.save(result);
        }

        // 4. Apply new stats for P1
        p1.setMatchesPlayed((p1.getMatchesPlayed() != null ? p1.getMatchesPlayed() : 0) + 1);
        if ("Won".equals(result.getP1Status())) {
            p1.setWon((p1.getWon() != null ? p1.getWon() : 0) + 1);
        } else if ("Lost".equals(result.getP1Status())) {
            p1.setLost((p1.getLost() != null ? p1.getLost() : 0) + 1);
        }
        // Draw: neither won nor lost
        p1.setPointsFor((p1.getPointsFor() != null ? p1.getPointsFor() : 0) + newP1PointsFor);
        p1.setPointsAgaint((p1.getPointsAgaint() != null ? p1.getPointsAgaint() : 0) + newP1PointsAgainst);
        p1.setPointsDiff((p1.getPointsFor() != null ? p1.getPointsFor() : 0) - (p1.getPointsAgaint() != null ? p1.getPointsAgaint() : 0));

        // 5. Apply new stats for P2
        p2.setMatchesPlayed((p2.getMatchesPlayed() != null ? p2.getMatchesPlayed() : 0) + 1);
        if ("Won".equals(result.getP2Status())) {
            p2.setWon((p2.getWon() != null ? p2.getWon() : 0) + 1);
        } else if ("Lost".equals(result.getP2Status())) {
            p2.setLost((p2.getLost() != null ? p2.getLost() : 0) + 1);
        }
        // Draw: neither won nor lost
        p2.setPointsFor((p2.getPointsFor() != null ? p2.getPointsFor() : 0) + newP2PointsFor);
        p2.setPointsAgaint((p2.getPointsAgaint() != null ? p2.getPointsAgaint() : 0) + newP2PointsAgainst);
        p2.setPointsDiff((p2.getPointsFor() != null ? p2.getPointsFor() : 0) - (p2.getPointsAgaint() != null ? p2.getPointsAgaint() : 0));

        // Save updated participants
        participantRepository.save(p1);
        participantRepository.save(p2);

        return ResponseEntity.ok(savedResult);
    }

    @PostMapping("/groups/{groupId}/auto-schedule")
    @Transactional
    public ResponseEntity<?> autoScheduleGroupMatches(
            @PathVariable Long groupId,
            @RequestBody(required = false) AutoScheduleRequest scheduleRequest) {

        String mode = (scheduleRequest != null && scheduleRequest.getMode() != null)
                ? scheduleRequest.getMode() : "rounds";
        int value = (scheduleRequest != null && scheduleRequest.getValue() >= 1)
                ? scheduleRequest.getValue() : 1;

        if (!mode.equals("rounds") && !mode.equals("matches")) {
            return ResponseEntity.badRequest().body("Invalid mode. Use 'rounds' or 'matches'.");
        }

        Optional<Group> groupOpt = groupRepository.findById(groupId);
        if (groupOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Group group = groupOpt.get();
        Optional<Division> divisionOpt = divisionRepository.findById(group.getDivisionId());
        if (divisionOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Division not found for group");
        }
        Division division = divisionOpt.get();

        List<Participant> participants = participantRepository.findByGroupId(groupId);
        if (participants.size() < 2) {
            return ResponseEntity.badRequest().body("At least 2 participants are required to auto-schedule matches.");
        }

        // 1. Delete existing matches & results
        List<Match> existingMatches = matchRepository.findByGroupId(groupId);
        for (Match m : existingMatches) {
            resultRepository.findByMatchId(m.getMatchId()).ifPresent(resultRepository::delete);
            matchRepository.delete(m);
        }

        // 2. Generate matches based on chosen mode
        List<Match> createdMatches = mode.equals("rounds")
                ? generateRoundRobinMatches(participants, value, division, groupId)
                : generateMatchesPerTeam(participants, value, division, groupId);

        matchRepository.saveAll(createdMatches);

        return ResponseEntity.ok(getMatchesByGroup(groupId));
    }

    /**
     * Mode 1 – N-Round Robin: each team plays every other team exactly N times.
     * Uses the circle (polygon rotation) algorithm, run N passes with sequential round numbers.
     */
    private List<Match> generateRoundRobinMatches(List<Participant> participants, int numPasses,
                                                   Division division, Long groupId) {
        int n = participants.size();
        boolean isOdd = (n % 2 != 0);

        List<Long> originalOrder = new ArrayList<>();
        for (Participant p : participants) originalOrder.add(p.getId());
        if (isOdd) originalOrder.add(null); // dummy bye element

        int numElements = originalOrder.size();
        int totalRoundsPerPass = numElements - 1;
        int matchesPerRound = numElements / 2;

        List<Match> createdMatches = new ArrayList<>();
        int globalRound = 0;

        for (int pass = 0; pass < numPasses; pass++) {
            List<Long> schedulerList = new ArrayList<>(originalOrder);
            for (int roundNum = 1; roundNum <= totalRoundsPerPass; roundNum++) {
                globalRound++;
                for (int i = 0; i < matchesPerRound; i++) {
                    Long home = schedulerList.get(i);
                    Long away = schedulerList.get(numElements - 1 - i);
                    if (home != null && away != null) {
                        Match match = new Match();
                        match.setTournamentId(division.getTournamentId());
                        match.setDivisionId(division.getId());
                        match.setGroupId(groupId);
                        match.setParticipant1(home);
                        match.setParticipant2(away);
                        match.setRound(globalRound);
                        createdMatches.add(match);
                    }
                }
                // Rotate list: keep first element fixed, shift the rest
                Long last = schedulerList.remove(schedulerList.size() - 1);
                schedulerList.add(1, last);
            }
        }
        return createdMatches;
    }

    /**
     * Mode 2 – Total Matches Per Team: each team plays exactly M matches
     * (or M-1 for at most one team when n×M is odd).
     *
     * Algorithm:
     *  - Greedy pair selection: always pick the pair with the highest combined remaining-match
     *    count; break ties by choosing the pair that has played each other the least.
     *  - Fairness cap: no pair plays more than ceil(M / (n-1)) times.
     *  - After all pairs are selected, assign matches to rounds using earliest-available-round
     *    scheduling (no team plays twice in the same round).
     */
    private List<Match> generateMatchesPerTeam(List<Participant> participants, int targetM,
                                                Division division, Long groupId) {
        int n = participants.size();
        // No pair should face each other more than this many times
        int maxPairPlays = (int) Math.ceil((double) targetM / (n - 1));

        int[] matchesNeeded = new int[n];
        Arrays.fill(matchesNeeded, targetM);
        int[][] pairCount = new int[n][n];

        // If n×M is odd, floor division means one team ends up playing M-1 (acceptable)
        int totalMatchesTarget = (n * targetM) / 2;

        List<int[]> matchIndexPairs = new ArrayList<>();

        while (matchIndexPairs.size() < totalMatchesTarget) {
            int bestI = -1, bestJ = -1;
            int bestCombined = -1;
            int bestPairs = Integer.MAX_VALUE;

            for (int i = 0; i < n; i++) {
                if (matchesNeeded[i] <= 0) continue;
                for (int j = i + 1; j < n; j++) {
                    if (matchesNeeded[j] <= 0) continue;
                    if (pairCount[i][j] >= maxPairPlays) continue;
                    int combined = matchesNeeded[i] + matchesNeeded[j];
                    if (combined > bestCombined
                            || (combined == bestCombined && pairCount[i][j] < bestPairs)) {
                        bestI = i;
                        bestJ = j;
                        bestCombined = combined;
                        bestPairs = pairCount[i][j];
                    }
                }
            }

            if (bestI == -1) break; // n×M is odd — one team naturally gets M-1

            matchIndexPairs.add(new int[]{bestI, bestJ});
            matchesNeeded[bestI]--;
            matchesNeeded[bestJ]--;
            pairCount[bestI][bestJ]++;
            pairCount[bestJ][bestI]++;
        }

        // Assign matches to rounds: earliest round where neither participant already has a match
        List<boolean[]> roundSlots = new ArrayList<>();
        List<Match> result = new ArrayList<>();

        for (int[] pair : matchIndexPairs) {
            int pi = pair[0];
            int pj = pair[1];
            int assignedRound = -1;

            for (int r = 0; r < roundSlots.size(); r++) {
                boolean[] used = roundSlots.get(r);
                if (!used[pi] && !used[pj]) {
                    used[pi] = true;
                    used[pj] = true;
                    assignedRound = r + 1;
                    break;
                }
            }
            if (assignedRound == -1) {
                boolean[] newRound = new boolean[n];
                newRound[pi] = true;
                newRound[pj] = true;
                roundSlots.add(newRound);
                assignedRound = roundSlots.size();
            }

            Match match = new Match();
            match.setTournamentId(division.getTournamentId());
            match.setDivisionId(division.getId());
            match.setGroupId(groupId);
            match.setParticipant1(participants.get(pi).getId());
            match.setParticipant2(participants.get(pj).getId());
            match.setRound(assignedRound);
            result.add(match);
        }

        return result;
    }

    public static class AutoScheduleRequest {
        private String mode;  // "rounds" | "matches"
        private int value;    // N rounds per opponent OR M total matches per team

        public String getMode() { return mode; }
        public void setMode(String mode) { this.mode = mode; }
        public int getValue() { return value; }
        public void setValue(int value) { this.value = value; }
    }



    public static class MatchResponse {
        private Long matchId;
        private Long divisionId;
        private Long groupId;
        private Long tournamentId;
        private Long participant1;
        private Long participant2;
        private String participant1Name;
        private String participant2Name;
        private LocalDate matchDate;
        private LocalTime startTime;
        private LocalTime endTime;
        private String p1Status;
        private String p2Status;
        private Long courtId;

        public Long getMatchId() {
            return matchId;
        }

        public void setMatchId(Long matchId) {
            this.matchId = matchId;
        }

        public Long getDivisionId() {
            return divisionId;
        }

        public void setDivisionId(Long divisionId) {
            this.divisionId = divisionId;
        }

        public Long getGroupId() {
            return groupId;
        }

        public void setGroupId(Long groupId) {
            this.groupId = groupId;
        }

        public Long getTournamentId() {
            return tournamentId;
        }

        public void setTournamentId(Long tournamentId) {
            this.tournamentId = tournamentId;
        }

        public Long getParticipant1() {
            return participant1;
        }

        public void setParticipant1(Long participant1) {
            this.participant1 = participant1;
        }

        public Long getParticipant2() {
            return participant2;
        }

        public void setParticipant2(Long participant2) {
            this.participant2 = participant2;
        }

        public String getParticipant1Name() {
            return participant1Name;
        }

        public void setParticipant1Name(String participant1Name) {
            this.participant1Name = participant1Name;
        }

        public String getParticipant2Name() {
            return participant2Name;
        }

        public void setParticipant2Name(String participant2Name) {
            this.participant2Name = participant2Name;
        }

        public LocalDate getMatchDate() {
            return matchDate;
        }

        public void setMatchDate(LocalDate matchDate) {
            this.matchDate = matchDate;
        }

        public LocalTime getStartTime() {
            return startTime;
        }

        public void setStartTime(LocalTime startTime) {
            this.startTime = startTime;
        }

        public LocalTime getEndTime() {
            return endTime;
        }

        public void setEndTime(LocalTime endTime) {
            this.endTime = endTime;
        }

        public String getP1Status() {
            return p1Status;
        }

        public void setP1Status(String p1Status) {
            this.p1Status = p1Status;
        }

        public String getP2Status() {
            return p2Status;
        }

        public void setP2Status(String p2Status) {
            this.p2Status = p2Status;
        }

        public Long getCourtId() {
            return courtId;
        }

        public void setCourtId(Long courtId) {
            this.courtId = courtId;
        }

        private Integer round;

        public Integer getRound() {
            return round;
        }

        public void setRound(Integer round) {
            this.round = round;
        }

        private String participant1PlayerNames;
        private String participant2PlayerNames;

        public String getParticipant1PlayerNames() {
            return participant1PlayerNames;
        }

        public void setParticipant1PlayerNames(String participant1PlayerNames) {
            this.participant1PlayerNames = participant1PlayerNames;
        }

        public String getParticipant2PlayerNames() {
            return participant2PlayerNames;
        }

        public void setParticipant2PlayerNames(String participant2PlayerNames) {
            this.participant2PlayerNames = participant2PlayerNames;
        }
    }
}
