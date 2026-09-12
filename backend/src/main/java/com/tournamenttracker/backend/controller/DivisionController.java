package com.tournamenttracker.backend.controller;

import com.tournamenttracker.backend.model.Division;
import com.tournamenttracker.backend.model.Group;
import com.tournamenttracker.backend.repository.DivisionRepository;
import com.tournamenttracker.backend.repository.GroupRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import jakarta.servlet.http.HttpServletRequest;

import com.tournamenttracker.backend.model.Participant;
import com.tournamenttracker.backend.model.Player;
import com.tournamenttracker.backend.model.TeamPlayer;
import com.tournamenttracker.backend.repository.ParticipantRepository;
import com.tournamenttracker.backend.repository.PlayerRepository;
import com.tournamenttracker.backend.repository.TeamPlayerRepository;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class DivisionController {

    @Autowired
    private DivisionRepository divisionRepository;

    @Autowired
    private GroupRepository groupRepository;

    @Autowired
    private ParticipantRepository participantRepository;

    @Autowired
    private PlayerRepository playerRepository;

    @Autowired
    private TeamPlayerRepository teamPlayerRepository;

    private final Map<String, long[]> rateLimits = new ConcurrentHashMap<>();

    private boolean isRateLimited(HttpServletRequest request) {
        String ip = request.getRemoteAddr();
        long now = System.currentTimeMillis();
        long[] limit = rateLimits.computeIfAbsent(ip, k -> new long[]{0, now});
        if (now - limit[1] > 60000) {
            limit[0] = 1;
            limit[1] = now;
            return false;
        }
        if (limit[0] >= 10) return true;
        limit[0]++;
        return false;
    }

    private String generateAccessCode() {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        StringBuilder sb = new StringBuilder(5);
        java.util.Random rnd = new java.util.Random();
        for (int i = 0; i < 5; i++) {
            sb.append(chars.charAt(rnd.nextInt(chars.length())));
        }
        return sb.toString();
    }

    /** Sanitizes a custom code to uppercase alphanumeric only. Returns null if the result is blank. */
    private String sanitizeCode(String raw) {
        if (raw == null) return null;
        String sanitized = raw.toUpperCase().replaceAll("[^A-Z0-9]", "");
        return sanitized.isEmpty() ? null : sanitized;
    }

    /** Returns true if another division (other than excludeId) already uses this code (case-insensitive). */
    private boolean isAccessCodeTaken(String code, Long excludeId) {
        Division existing = divisionRepository.findByAccessCodeIgnoreCase(code);
        if (existing == null) return false;
        return excludeId == null || !existing.getId().equals(excludeId);
    }

    // Alphabet labels for group naming: A, B, C, ...
    private static final String ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    private String groupLabel(int index) {
        // index 0 → "Group A", 1 → "Group B", etc.
        return "Group " + ALPHABET.charAt(index % 26);
    }

    @GetMapping("/tournaments/{tournamentId}/divisions")
    public List<Division> getDivisionsByTournament(@PathVariable Long tournamentId) {
        return divisionRepository.findByTournamentId(tournamentId);
    }

    @GetMapping("/divisions/{id}")
    public ResponseEntity<Division> getDivisionById(@PathVariable Long id) {
        return divisionRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/divisions/verify-code")
    public ResponseEntity<?> verifyAccessCode(@RequestBody Map<String, String> payload, HttpServletRequest request) {
        if (isRateLimited(request)) {
            return ResponseEntity.status(429).body(Map.of("error", "Too Many Requests"));
        }
        String code = payload.get("code");
        if (code == null || code.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        Division division = divisionRepository.findByAccessCodeIgnoreCase(code.trim());
        if (division == null) {
            return ResponseEntity.notFound().build();
        }
        Map<String, Object> response = new HashMap<>();
        response.put("divisionId", division.getId());
        response.put("divisionName", division.getName());
        response.put("tournamentId", division.getTournamentId());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/divisions/{id}/regenerate-code")
    public ResponseEntity<Division> regenerateCode(@PathVariable Long id) {
        return divisionRepository.findById(id).map(division -> {
            division.setAccessCode(generateAccessCode());
            return ResponseEntity.ok(divisionRepository.save(division));
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/divisions/{id}/players")
    public ResponseEntity<List<Map<String, Object>>> getDivisionPlayers(@PathVariable Long id) {
        List<Participant> participants = participantRepository.findByDivisionId(id.intValue());
        List<Map<String, Object>> players = new ArrayList<>();
        
        for (Participant p : participants) {
            if ("Singles".equalsIgnoreCase(p.getType())) {
                playerRepository.findById(p.getPlayerTeamId()).ifPresent(player -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", player.getId());
                    map.put("firstName", player.getFirstName());
                    map.put("lastName", player.getLastName());
                    map.put("participantName", p.getPlayerTeamName());
                    players.add(map);
                });
            } else {
                List<TeamPlayer> tps = teamPlayerRepository.findByTeamId(p.getPlayerTeamId());
                for (TeamPlayer tp : tps) {
                    playerRepository.findById(tp.getPlayerId()).ifPresent(player -> {
                        Map<String, Object> map = new HashMap<>();
                        map.put("id", player.getId());
                        map.put("firstName", player.getFirstName());
                        map.put("lastName", player.getLastName());
                        map.put("participantName", p.getPlayerTeamName());
                        players.add(map);
                    });
                }
            }
        }
        return ResponseEntity.ok(players);
    }

    // GET all groups for a division
    @GetMapping("/divisions/{divisionId}/groups")
    public ResponseEntity<List<Group>> getGroupsByDivision(@PathVariable Long divisionId) {
        List<Group> groups = groupRepository.findByDivisionId(divisionId);
        return ResponseEntity.ok(groups);
    }

    // POST add a new group to a division (triggered by "Add Group" button)
    @PostMapping("/divisions/{divisionId}/groups")
    public ResponseEntity<Group> addGroupToDivision(@PathVariable Long divisionId) {
        return divisionRepository.findById(divisionId).map(division -> {
            long currentCount = groupRepository.countByDivisionId(divisionId);
            String newGroupName = groupLabel((int) currentCount);

            Group newGroup = new Group(divisionId, newGroupName, "active");
            Group saved = groupRepository.save(newGroup);

            // Increment group_count on division
            int updatedCount = (int) currentCount + 1;
            division.setGroupCount(updatedCount);
            divisionRepository.save(division);

            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/divisions")
    public ResponseEntity<?> createDivision(@RequestBody Division division) {
        if (division.getName() == null || division.getName().trim().isEmpty() ||
            division.getTournamentId() == null ||
            division.getStartDate() == null || division.getEndDate() == null ||
            division.getDivisionType() == null || division.getDivisionType().trim().isEmpty() ||
            division.getGender() == null || division.getGender().trim().isEmpty() ||
            division.getMaxTeams() == null || division.getMaxTeams() <= 0) {
            return ResponseEntity.badRequest().build();
        }

        // Default groupCount to 1 if not provided
        int groupCount = (division.getGroupCount() != null && division.getGroupCount() >= 1)
                ? division.getGroupCount() : 1;
        division.setGroupCount(groupCount);

        // Resolve access code: use admin-supplied custom code if provided, else auto-generate
        String customCode = sanitizeCode(division.getAccessCode());
        if (customCode != null) {
            if (isAccessCodeTaken(customCode, null)) {
                Map<String, String> err = new HashMap<>();
                err.put("error", "Access code '" + customCode + "' is already in use by another division. Please choose a different code.");
                return ResponseEntity.status(409).body(err);
            }
            division.setAccessCode(customCode);
        } else {
            // Auto-generate, retrying on the rare collision
            String generated;
            int attempts = 0;
            do {
                generated = generateAccessCode();
                attempts++;
            } while (isAccessCodeTaken(generated, null) && attempts < 10);
            division.setAccessCode(generated);
        }

        Division saved = divisionRepository.save(division);

        // Auto-create the groups
        for (int i = 0; i < groupCount; i++) {
            Group g = new Group(saved.getId(), groupLabel(i), "active");
            groupRepository.save(g);
        }

        return ResponseEntity.ok(saved);
    }

    /** Admin endpoint to set a custom access code on an existing division. */
    @PutMapping("/divisions/{id}/access-code")
    public ResponseEntity<?> setCustomAccessCode(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        String customCode = sanitizeCode(payload.get("accessCode"));
        if (customCode == null || customCode.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Access code must contain at least one alphanumeric character."));
        }
        if (isAccessCodeTaken(customCode, id)) {
            return ResponseEntity.status(409).body(Map.of("error", "Access code '" + customCode + "' is already in use by another division."));
        }
        java.util.Optional<Division> divOpt = divisionRepository.findById(id);
        if (divOpt.isEmpty()) return ResponseEntity.notFound().build();
        Division division = divOpt.get();
        division.setAccessCode(customCode);
        Division saved = divisionRepository.save(division);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/divisions/{id}")
    public ResponseEntity<Division> updateDivision(@PathVariable Long id, @RequestBody Division divisionDetails) {
        if (divisionDetails.getName() == null || divisionDetails.getName().trim().isEmpty() ||
            divisionDetails.getStartDate() == null || divisionDetails.getEndDate() == null ||
            divisionDetails.getDivisionType() == null || divisionDetails.getDivisionType().trim().isEmpty() ||
            divisionDetails.getGender() == null || divisionDetails.getGender().trim().isEmpty() ||
            divisionDetails.getMaxTeams() == null || divisionDetails.getMaxTeams() <= 0) {
            return ResponseEntity.badRequest().build();
        }
        return divisionRepository.findById(id).map(existingDivision -> {
            existingDivision.setName(divisionDetails.getName());
            existingDivision.setDivisionType(divisionDetails.getDivisionType());
            existingDivision.setDescription(divisionDetails.getDescription());
            existingDivision.setStartDate(divisionDetails.getStartDate());
            existingDivision.setEndDate(divisionDetails.getEndDate());
            existingDivision.setGender(divisionDetails.getGender());
            existingDivision.setAgeGroup(divisionDetails.getAgeGroup());
            existingDivision.setMinSkillLevel(divisionDetails.getMinSkillLevel());
            existingDivision.setMaxSkillLevel(divisionDetails.getMaxSkillLevel());
            existingDivision.setMaxTeams(divisionDetails.getMaxTeams());
            existingDivision.setStatus(divisionDetails.getStatus());

            // Determine existing group count in DB
            long existingGroupCount = groupRepository.countByDivisionId(id);
            int requestedGroupCount = (divisionDetails.getGroupCount() != null && divisionDetails.getGroupCount() >= 1)
                    ? divisionDetails.getGroupCount()
                    : (int) existingGroupCount;

            if (requestedGroupCount < existingGroupCount) {
                // Cannot reduce — ignore change, keep existing count
                existingDivision.setGroupCount((int) existingGroupCount);
            } else if (requestedGroupCount > existingGroupCount) {
                // Add missing groups
                for (long i = existingGroupCount; i < requestedGroupCount; i++) {
                    Group g = new Group(id, groupLabel((int) i), "active");
                    groupRepository.save(g);
                }
                existingDivision.setGroupCount(requestedGroupCount);
            } else {
                existingDivision.setGroupCount((int) existingGroupCount);
            }

            Division updated = divisionRepository.save(existingDivision);
            return ResponseEntity.ok(updated);
        }).orElse(ResponseEntity.notFound().build());
    }
}
