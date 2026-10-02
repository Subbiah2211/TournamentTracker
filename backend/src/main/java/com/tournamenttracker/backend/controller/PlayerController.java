package com.tournamenttracker.backend.controller;

import com.tournamenttracker.backend.model.Participant;
import com.tournamenttracker.backend.model.Player;
import com.tournamenttracker.backend.model.Team;
import com.tournamenttracker.backend.model.TeamPlayer;
import com.tournamenttracker.backend.repository.DivisionRepository;
import com.tournamenttracker.backend.repository.GroupRepository;
import com.tournamenttracker.backend.repository.ParticipantRepository;
import com.tournamenttracker.backend.repository.PlayerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api")
public class PlayerController {

    private static final Pattern EMAIL_PATTERN =
            Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");

    @Autowired
    private PlayerRepository playerRepository;

    @Autowired
    private ParticipantRepository participantRepository;

    @Autowired
    private com.tournamenttracker.backend.repository.TeamRepository teamRepository;

    @Autowired
    private com.tournamenttracker.backend.service.TeamService teamService;

    @Autowired
    private com.tournamenttracker.backend.repository.TeamPlayerRepository teamPlayerRepository;

    @Autowired
    private DivisionRepository divisionRepository;

    @Autowired
    private GroupRepository groupRepository;

    /** Search registered players by name (first or last, case-insensitive). Max 10 results. */
    @GetMapping("/players/search")
    public ResponseEntity<?> searchPlayers(@RequestParam(name = "q", defaultValue = "") String q) {
        if (q == null || q.trim().length() < 2) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "Search query must be at least 2 characters");
            return ResponseEntity.badRequest().body(err);
        }
        String trimmed = q.trim();
        List<Player> results = playerRepository
                .findByFirstNameContainingIgnoreCaseOrLastNameContainingIgnoreCase(trimmed, trimmed);
        // Limit to top 10 and return only needed fields
        List<Map<String, Object>> response = results.stream()
                .limit(10)
                .map(p -> {
                    Map<String, Object> m = new java.util.LinkedHashMap<>();
                    m.put("id", p.getId());
                    m.put("firstName", p.getFirstName());
                    m.put("lastName", p.getLastName());
                    m.put("email", p.getEmail());
                    m.put("skillLevel", p.getSkillLevel());
                    return m;
                })
                .collect(java.util.stream.Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/teams/{id}")
    public ResponseEntity<Team> getTeamById(@PathVariable Long id) {
        return teamRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }


    @GetMapping("/teams/{teamId}/players")
    public List<Player> getTeamPlayers(@PathVariable Long teamId) {
        List<TeamPlayer> teamPlayers = teamPlayerRepository.findByTeamId(teamId);
        // Sort teamPlayers by playerOrder ascending
        teamPlayers.sort((tp1, tp2) -> Integer.compare(
                tp1.getPlayerOrder() != null ? tp1.getPlayerOrder() : 0,
                tp2.getPlayerOrder() != null ? tp2.getPlayerOrder() : 0
        ));

        List<Player> result = new java.util.ArrayList<>();
        for (TeamPlayer tp : teamPlayers) {
            if (tp.getPlayerId() != null) {
                playerRepository.findById(tp.getPlayerId()).ifPresent(player -> {
                    Player displayPlayer = new Player();
                    displayPlayer.setId(player.getId());
                    displayPlayer.setFirstName(player.getFirstName());
                    displayPlayer.setLastName(player.getLastName());
                    displayPlayer.setEmail(player.getEmail());
                    displayPlayer.setPhone(player.getPhone());
                    displayPlayer.setGender(player.getGender());
                    displayPlayer.setAge(player.getAge());
                    displayPlayer.setSkillLevel(player.getSkillLevel());
                    displayPlayer.setPlayerOrder(tp.getPlayerOrder() != null ? tp.getPlayerOrder() : 0);
                    result.add(displayPlayer);
                });
            }
        }
        return result;
    }

    @GetMapping("/tournaments/{tournamentId}/participants")
    public List<Participant> getParticipants(@PathVariable Long tournamentId) {
        return participantRepository.findByTournamentId(tournamentId);
    }

    @DeleteMapping("/participants/{id}")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<Void> deleteParticipant(@PathVariable Long id) {
        return participantRepository.findById(id)
                .map(participant -> {
                    if ("Team".equals(participant.getType())) {
                        Long teamId = participant.getPlayerTeamId();
                        teamPlayerRepository.deleteByTeamId(teamId);
                        teamRepository.deleteById(teamId);
                    }
                    participantRepository.delete(participant);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/players")
    public List<Player> getAllPlayers() {
        return playerRepository.findAll();
    }

    @GetMapping("/players/{id}")
    public ResponseEntity<Player> getPlayerById(@PathVariable Long id) {
        return playerRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/players")
    public ResponseEntity<Map<String, Object>> createStandalonePlayer(@RequestBody StandalonePlayerRequest request) {
        Map<String, Object> response = new HashMap<>();

        if (request.getFirstName() == null || request.getFirstName().trim().isEmpty() ||
            request.getLastName() == null || request.getLastName().trim().isEmpty() ||
            request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            response.put("success", false);
            response.put("message", "First Name, Last Name, and Email are mandatory");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        String email = request.getEmail().trim();
        if (!EMAIL_PATTERN.matcher(email).matches()) {
            response.put("success", false);
            response.put("message", "Invalid email format");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        if (playerRepository.findByEmailIgnoreCase(email).isPresent()) {
            response.put("success", false);
            response.put("message", "User with this email already exists");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        String gender = null;
        if (request.getGender() != null && !request.getGender().trim().isEmpty()) {
            String g = request.getGender().trim();
            if (g.equalsIgnoreCase("Male")) {
                gender = "Male";
            } else if (g.equalsIgnoreCase("Female")) {
                gender = "Female";
            } else {
                response.put("success", false);
                response.put("message", "Gender must be 'Male' or 'Female'");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }
        }

        String age = null;
        if (request.getAge() != null && !request.getAge().trim().isEmpty()) {
            try {
                int ageVal = Integer.parseInt(request.getAge().trim());
                if (ageVal <= 0 || ageVal > 130) {
                    response.put("success", false);
                    response.put("message", "Age must be a valid number between 1 and 130");
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
                }
                age = String.valueOf(ageVal);
            } catch (NumberFormatException e) {
                response.put("success", false);
                response.put("message", "Age must be a valid integer");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }
        }

        String skillLevel = "3.0";
        if (request.getSkillLevel() != null && !request.getSkillLevel().trim().isEmpty()) {
            skillLevel = request.getSkillLevel().trim();
        }

        Player player = new Player();
        player.setFirstName(request.getFirstName().trim());
        player.setLastName(request.getLastName().trim());
        player.setEmail(email);
        player.setPhone(request.getPhone() != null && !request.getPhone().trim().isEmpty() ? request.getPhone().trim() : null);
        player.setGender(gender);
        player.setAge(age);
        player.setSkillLevel(skillLevel);

        Player saved = playerRepository.save(player);

        response.put("success", true);
        response.put("message", "Player successfully added");
        response.put("player", saved);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/players/bulk")
    @Transactional
    public ResponseEntity<Map<String, Object>> createBulkPlayers(@RequestBody List<StandalonePlayerRequest> requests) {
        Map<String, Object> response = new HashMap<>();

        if (requests == null || requests.isEmpty()) {
            response.put("success", false);
            response.put("message", "No players provided for bulk upload");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        List<Map<String, Object>> errors = new java.util.ArrayList<>();
        Set<String> emailsInBatch = new HashSet<>();
        List<Player> playersToSave = new java.util.ArrayList<>();

        for (int i = 0; i < requests.size(); i++) {
            StandalonePlayerRequest req = requests.get(i);
            int rowNum = i + 2; // Matching Excel row numbering starting after header

            // Validate First Name
            if (req.getFirstName() == null || req.getFirstName().trim().isEmpty()) {
                addError(errors, rowNum, "First Name", "", "First Name is required");
            }

            // Validate Last Name
            if (req.getLastName() == null || req.getLastName().trim().isEmpty()) {
                addError(errors, rowNum, "Last Name", "", "Last Name is required");
            }

            // Validate Email
            if (req.getEmail() == null || req.getEmail().trim().isEmpty()) {
                addError(errors, rowNum, "Email", "", "Email is required");
            } else {
                String email = req.getEmail().trim().toLowerCase();
                if (!EMAIL_PATTERN.matcher(email).matches()) {
                    addError(errors, rowNum, "Email", req.getEmail(), "Invalid email format");
                } else if (emailsInBatch.contains(email)) {
                    addError(errors, rowNum, "Email", req.getEmail(), "Duplicate email within upload file");
                } else if (playerRepository.findByEmailIgnoreCase(email).isPresent()) {
                    addError(errors, rowNum, "Email", req.getEmail(), "Email already exists in database");
                } else {
                    emailsInBatch.add(email);
                }
            }

            // Validate Gender (optional)
            String gender = null;
            if (req.getGender() != null && !req.getGender().trim().isEmpty()) {
                String g = req.getGender().trim();
                if (g.equalsIgnoreCase("Male")) {
                    gender = "Male";
                } else if (g.equalsIgnoreCase("Female")) {
                    gender = "Female";
                } else {
                    addError(errors, rowNum, "Gender", req.getGender(), "Gender must be 'Male' or 'Female'");
                }
            }

            // Validate Age (optional)
            String age = null;
            if (req.getAge() != null && !req.getAge().trim().isEmpty()) {
                try {
                    int ageVal = Integer.parseInt(req.getAge().trim());
                    if (ageVal <= 0 || ageVal > 130) {
                        addError(errors, rowNum, "Age", req.getAge(), "Age must be between 1 and 130");
                    } else {
                        age = String.valueOf(ageVal);
                    }
                } catch (NumberFormatException e) {
                    addError(errors, rowNum, "Age", req.getAge(), "Age must be a valid integer");
                }
            }

            // Validate Skill Level (optional, defaults to 3.0)
            String skillLevel = "3.0";
            if (req.getSkillLevel() != null && !req.getSkillLevel().trim().isEmpty()) {
                String sl = req.getSkillLevel().trim();
                try {
                    double slVal = Double.parseDouble(sl);
                    if (slVal < 1.0 || slVal > 5.0) {
                        addError(errors, rowNum, "Skill Level", sl, "Skill Level must be between 1.0 and 5.0");
                    } else {
                        skillLevel = String.format(java.util.Locale.US, "%.1f", slVal);
                    }
                } catch (NumberFormatException e) {
                    addError(errors, rowNum, "Skill Level", sl, "Skill Level must be a valid number (e.g. 3.0)");
                }
            }

            Player player = new Player();
            player.setFirstName(req.getFirstName() != null ? req.getFirstName().trim() : "");
            player.setLastName(req.getLastName() != null ? req.getLastName().trim() : "");
            player.setEmail(req.getEmail() != null ? req.getEmail().trim() : "");
            player.setPhone(req.getPhone() != null && !req.getPhone().trim().isEmpty() ? req.getPhone().trim() : null);
            player.setGender(gender);
            player.setAge(age);
            player.setSkillLevel(skillLevel);
            playersToSave.add(player);
        }

        if (!errors.isEmpty()) {
            response.put("success", false);
            response.put("message", "Validation failed for " + errors.size() + " issue(s). No players were added.");
            response.put("errors", errors);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        List<Player> savedList = playerRepository.saveAll(playersToSave);
        response.put("success", true);
        response.put("count", savedList.size());
        response.put("message", "Successfully added " + savedList.size() + " players to the database.");
        return ResponseEntity.ok(response);
    }

    private void addError(List<Map<String, Object>> errors, int row, String field, String value, String message) {
        Map<String, Object> err = new HashMap<>();
        err.put("row", row);
        err.put("field", field);
        err.put("value", value != null ? value : "");
        err.put("message", message);
        errors.add(err);
    }

    @PostMapping("/players/singles")
    public ResponseEntity<Map<String, Object>> addSinglesPlayer(@RequestBody SinglesPlayerRequest request) {
        Map<String, Object> response = new HashMap<>();

        // 1. Basic validation
        if (request.getFirstName() == null || request.getFirstName().trim().isEmpty() ||
            request.getLastName() == null || request.getLastName().trim().isEmpty() ||
            request.getEmail() == null || request.getEmail().trim().isEmpty() ||
            request.getDivisionId() == null) {
            response.put("success", false);
            response.put("message", "Mandatory fields are missing");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        // 2. Email uniqueness check
        if (playerRepository.findByEmail(request.getEmail().trim()).isPresent()) {
            response.put("success", false);
            response.put("message", "User email already exists");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        // 3. Capacity check per group
        if (request.getGroupId() != null) {
            com.tournamenttracker.backend.model.Division div = divisionRepository.findById(Long.valueOf(request.getDivisionId())).orElse(null);
            if (div != null && div.getMaxTeams() != null) {
                long groupCount = participantRepository.countByGroupId(request.getGroupId());
                if (groupCount >= div.getMaxTeams()) {
                    response.put("success", false);
                    response.put("message", "The selected group has already reached maximum capacity. Please choose another Group");
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
                }
            }
        }

        // 4. Save Player
        Player player = new Player();
        player.setFirstName(request.getFirstName().trim());
        player.setLastName(request.getLastName().trim());
        player.setEmail(request.getEmail().trim());
        player.setPhone(request.getPhone() != null ? request.getPhone().trim() : null);
        player.setGender(request.getGender() != null ? request.getGender().trim() : null);
        player.setAge(request.getAge() != null ? request.getAge().trim() : null);
        player.setSkillLevel(request.getSkillLevel() != null ? request.getSkillLevel().trim() : null);

        Player savedPlayer = playerRepository.save(player);

        // 5. Save Participant
        Participant participant = new Participant();
        participant.setDivisionId(request.getDivisionId());
        participant.setGroupId(request.getGroupId());
        participant.setType("Singles");
        participant.setPlayerTeamId(savedPlayer.getId());
        participant.setPlayerTeamName(savedPlayer.getFirstName() + " " + savedPlayer.getLastName());
        
        // Explicitly set matches/points tracking to 0 instead of null for better look and feel
        participant.setMatchesPlayed(0L);
        participant.setWon(0L);
        participant.setLost(0L);
        participant.setPointsFor(0L);
        participant.setPointsAgaint(0L);
        participant.setPointsDiff(0L);

        Participant savedParticipant = participantRepository.save(participant);

        response.put("success", true);
        response.put("message", "Player successfully created");
        response.put("playerId", savedPlayer.getId());
        response.put("participantId", savedParticipant.getId());

        return ResponseEntity.ok(response);
    }

    @PutMapping("/players/singles/{id}")
    public ResponseEntity<Map<String, Object>> updateSinglesPlayer(@PathVariable Long id, @RequestBody SinglesPlayerRequest request) {
        Map<String, Object> response = new HashMap<>();

        if (request.getFirstName() == null || request.getFirstName().trim().isEmpty() ||
            request.getLastName() == null || request.getLastName().trim().isEmpty() ||
            request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            response.put("success", false);
            response.put("message", "Mandatory fields are missing");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        Optional<Player> existing = playerRepository.findById(id);
        if (existing.isEmpty()) {
            response.put("success", false);
            response.put("message", "Player not found");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }

        Player player = existing.get();
        
        Optional<Player> conflict = playerRepository.findByEmail(request.getEmail().trim());
        if (conflict.isPresent() && !conflict.get().getId().equals(id)) {
            response.put("success", false);
            response.put("message", "User email already exists");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        player.setFirstName(request.getFirstName().trim());
        player.setLastName(request.getLastName().trim());
        player.setEmail(request.getEmail().trim());
        player.setPhone(request.getPhone() != null ? request.getPhone().trim() : null);
        player.setGender(request.getGender() != null ? request.getGender().trim() : null);
        player.setAge(request.getAge() != null ? request.getAge().trim() : null);
        player.setSkillLevel(request.getSkillLevel() != null ? request.getSkillLevel().trim() : null);

        playerRepository.save(player);

        participantRepository.findByPlayerTeamIdAndType(id, "Singles").ifPresent(p -> {
            p.setPlayerTeamName(player.getFirstName() + " " + player.getLastName());
            if (request.getDivisionId() != null) {
                p.setDivisionId(request.getDivisionId());
            }
            if (request.getGroupId() != null) {
                p.setGroupId(request.getGroupId());
            }
            participantRepository.save(p);
        });

        response.put("success", true);
        response.put("message", "Player successfully updated");
        return ResponseEntity.ok(response);
    }


    @PostMapping("/teams/doubles")
    public ResponseEntity<Map<String, Object>> addDoublesTeam(@RequestBody DoublesTeamRequest request) {
        Map<String, Object> response = new HashMap<>();

        // 1. Validation of mandatory fields
        if (request.getDivisionId() == null ||
            request.getTeamName() == null || request.getTeamName().trim().isEmpty() ||
            request.getPlayer1() == null || request.getPlayer2() == null) {
            response.put("success", false);
            response.put("message", "Mandatory fields are missing");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        DoublesPlayerRequest p1Req = request.getPlayer1();
        DoublesPlayerRequest p2Req = request.getPlayer2();

        if (p1Req.getFirstName() == null || p1Req.getFirstName().trim().isEmpty() ||
            p1Req.getLastName() == null || p1Req.getLastName().trim().isEmpty() ||
            p1Req.getEmail() == null || p1Req.getEmail().trim().isEmpty() ||
            p2Req.getFirstName() == null || p2Req.getFirstName().trim().isEmpty() ||
            p2Req.getLastName() == null || p2Req.getLastName().trim().isEmpty() ||
            p2Req.getEmail() == null || p2Req.getEmail().trim().isEmpty()) {
            response.put("success", false);
            response.put("message", "Player details are incomplete");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        // 2. Uniqueness check for team name in division
        String teamName = request.getTeamName().trim();
        if (teamRepository.findByNameAndDivisionId(teamName, request.getDivisionId()).isPresent()) {
            response.put("success", false);
            response.put("message", "Team with this name already exists. Please choose a different name");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        // 3. Capacity check per group
        if (request.getGroupId() != null) {
            com.tournamenttracker.backend.model.Division div = divisionRepository.findById(request.getDivisionId()).orElse(null);
            if (div != null && div.getMaxTeams() != null) {
                long groupParticipantCount = participantRepository.countByGroupId(request.getGroupId());
                if (groupParticipantCount >= div.getMaxTeams()) {
                    response.put("success", false);
                    response.put("message", "The selected group has already reached maximum capacity. Please choose another Group");
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
                }
            }
        }

        try {
            // 4. Register team via transactional service
            com.tournamenttracker.backend.model.Team savedTeam = teamService.registerDoublesTeam(request);

            response.put("success", true);
            response.put("message", "Team successfully created");
            response.put("teamId", savedTeam.getId());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            response.put("success", false);
            response.put("message", "Error in creating the team. Please try again!");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PostMapping("/teams/generic")
    public ResponseEntity<Map<String, Object>> addGenericTeam(@RequestBody GenericTeamRequest request) {
        Map<String, Object> response = new HashMap<>();

        // 1. Validation of mandatory fields
        if (request.getDivisionId() == null ||
            request.getTeamName() == null || request.getTeamName().trim().isEmpty() ||
            request.getPlayers() == null || request.getPlayers().size() < 3 || request.getPlayers().size() > 4) {
            response.put("success", false);
            response.put("message", "Mandatory fields are missing");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        // Validate each of the provided players (3 or 4)
        for (DoublesPlayerRequest pReq : request.getPlayers()) {
            if (pReq.getFirstName() == null || pReq.getFirstName().trim().isEmpty() ||
                pReq.getLastName() == null || pReq.getLastName().trim().isEmpty() ||
                pReq.getEmail() == null || pReq.getEmail().trim().isEmpty()) {
                response.put("success", false);
                response.put("message", "Player details are incomplete");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }
        }

        // 2. Uniqueness check for team name in division
        String teamName2 = request.getTeamName().trim();
        if (teamRepository.findByNameAndDivisionId(teamName2, request.getDivisionId()).isPresent()) {
            response.put("success", false);
            response.put("message", "Team with this name already exists. Please choose a different name");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        // 3. Capacity check per group
        if (request.getGroupId() != null) {
            com.tournamenttracker.backend.model.Division div = divisionRepository.findById(request.getDivisionId()).orElse(null);
            if (div != null && div.getMaxTeams() != null) {
                long groupParticipantCount = participantRepository.countByGroupId(request.getGroupId());
                if (groupParticipantCount >= div.getMaxTeams()) {
                    response.put("success", false);
                    response.put("message", "The selected group has already reached maximum capacity. Please choose another Group");
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
                }
            }
        }

        try {
            // 4. Register team via transactional service
            com.tournamenttracker.backend.model.Team savedTeam = teamService.registerGenericTeam(request);

            response.put("success", true);
            response.put("message", "Team successfully created");
            response.put("teamId", savedTeam.getId());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            response.put("success", false);
            response.put("message", "Error in creating the team. Please try again!");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PutMapping("/teams/doubles/{id}")
    public ResponseEntity<Map<String, Object>> updateDoublesTeam(@PathVariable Long id, @RequestBody DoublesTeamRequest request) {
        Map<String, Object> response = new HashMap<>();

        if (request.getTeamName() == null || request.getTeamName().trim().isEmpty() ||
            request.getPlayer1() == null || request.getPlayer2() == null) {
            response.put("success", false);
            response.put("message", "Mandatory fields are missing");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        String teamName = request.getTeamName().trim();
        Optional<Team> conflict = teamRepository.findByNameAndDivisionId(teamName, request.getDivisionId());
        if (conflict.isPresent() && !conflict.get().getId().equals(id)) {
            response.put("success", false);
            response.put("message", "Team with this name already exists. Please choose a different name");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        try {
            teamService.updateDoublesTeam(id, request);
            response.put("success", true);
            response.put("message", "Team successfully updated");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            response.put("success", false);
            response.put("message", "Error in updating the team. Please try again!");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PutMapping("/teams/generic/{id}")
    public ResponseEntity<Map<String, Object>> updateGenericTeam(@PathVariable Long id, @RequestBody GenericTeamRequest request) {
        Map<String, Object> response = new HashMap<>();

        if (request.getTeamName() == null || request.getTeamName().trim().isEmpty() ||
            request.getPlayers() == null || request.getPlayers().size() < 3 || request.getPlayers().size() > 4) {
            response.put("success", false);
            response.put("message", "Mandatory fields are missing");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        // Validate each of the provided players (3 or 4)
        for (DoublesPlayerRequest pReq : request.getPlayers()) {
            if (pReq.getFirstName() == null || pReq.getFirstName().trim().isEmpty() ||
                pReq.getLastName() == null || pReq.getLastName().trim().isEmpty() ||
                pReq.getEmail() == null || pReq.getEmail().trim().isEmpty()) {
                response.put("success", false);
                response.put("message", "Player details are incomplete");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }
        }

        String teamName = request.getTeamName().trim();
        Optional<Team> conflict = teamRepository.findByNameAndDivisionId(teamName, request.getDivisionId());
        if (conflict.isPresent() && !conflict.get().getId().equals(id)) {
            response.put("success", false);
            response.put("message", "Team with this name already exists. Please choose a different name");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        try {
            teamService.updateGenericTeam(id, request);
            response.put("success", true);
            response.put("message", "Team successfully updated");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            response.put("success", false);
            response.put("message", "Error in updating the team. Please try again!");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    public static class GenericTeamRequest {
        private Long divisionId;
        private Long groupId;
        private String teamName;
        private List<DoublesPlayerRequest> players;

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

        public String getTeamName() {
            return teamName;
        }

        public void setTeamName(String teamName) {
            this.teamName = teamName;
        }

        public List<DoublesPlayerRequest> getPlayers() {
            return players;
        }

        public void setPlayers(List<DoublesPlayerRequest> players) {
            this.players = players;
        }
    }

    public static class DoublesTeamRequest {
        private Long divisionId;
        private Long groupId;
        private String teamName;
        private DoublesPlayerRequest player1;
        private DoublesPlayerRequest player2;

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

        public String getTeamName() {
            return teamName;
        }

        public void setTeamName(String teamName) {
            this.teamName = teamName;
        }

        public DoublesPlayerRequest getPlayer1() {
            return player1;
        }

        public void setPlayer1(DoublesPlayerRequest player1) {
            this.player1 = player1;
        }

        public DoublesPlayerRequest getPlayer2() {
            return player2;
        }

        public void setPlayer2(DoublesPlayerRequest player2) {
            this.player2 = player2;
        }
    }

    public static class DoublesPlayerRequest {
        private String firstName;
        private String lastName;
        private String email;
        private String phone;
        private String gender;
        private String age;
        private String skillLevel;

        public String getFirstName() {
            return firstName;
        }

        public void setFirstName(String firstName) {
            this.firstName = firstName;
        }

        public String getLastName() {
            return lastName;
        }

        public void setLastName(String lastName) {
            this.lastName = lastName;
        }

        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }

        public String getPhone() {
            return phone;
        }

        public void setPhone(String phone) {
            this.phone = phone;
        }

        public String getGender() {
            return gender;
        }

        public void setGender(String gender) {
            this.gender = gender;
        }

        public String getAge() {
            return age;
        }

        public void setAge(String age) {
            this.age = age;
        }

        public String getSkillLevel() {
            return skillLevel;
        }

        public void setSkillLevel(String skillLevel) {
            this.skillLevel = skillLevel;
        }
    }

    public static class SinglesPlayerRequest {
        private String firstName;
        private String lastName;
        private String email;
        private String phone;
        private String gender;
        private String age;
        private String skillLevel;
        private Integer divisionId;
        private Long groupId;

        public String getFirstName() {
            return firstName;
        }

        public void setFirstName(String firstName) {
            this.firstName = firstName;
        }

        public String getLastName() {
            return lastName;
        }

        public void setLastName(String lastName) {
            this.lastName = lastName;
        }

        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }

        public String getPhone() {
            return phone;
        }

        public void setPhone(String phone) {
            this.phone = phone;
        }

        public String getGender() {
            return gender;
        }

        public void setGender(String gender) {
            this.gender = gender;
        }

        public String getAge() {
            return age;
        }

        public void setAge(String age) {
            this.age = age;
        }

        public String getSkillLevel() {
            return skillLevel;
        }

        public void setSkillLevel(String skillLevel) {
            this.skillLevel = skillLevel;
        }

        public Integer getDivisionId() {
            return divisionId;
        }

        public void setDivisionId(Integer divisionId) {
            this.divisionId = divisionId;
        }

        public Long getGroupId() {
            return groupId;
        }

        public void setGroupId(Long groupId) {
            this.groupId = groupId;
        }
    }

    public static class StandalonePlayerRequest {
        private String firstName;
        private String lastName;
        private String email;
        private String phone;
        private String gender;
        private String age;
        private String skillLevel;

        public String getFirstName() {
            return firstName;
        }

        public void setFirstName(String firstName) {
            this.firstName = firstName;
        }

        public String getLastName() {
            return lastName;
        }

        public void setLastName(String lastName) {
            this.lastName = lastName;
        }

        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }

        public String getPhone() {
            return phone;
        }

        public void setPhone(String phone) {
            this.phone = phone;
        }

        public String getGender() {
            return gender;
        }

        public void setGender(String gender) {
            this.gender = gender;
        }

        public String getAge() {
            return age;
        }

        public void setAge(String age) {
            this.age = age;
        }

        public String getSkillLevel() {
            return skillLevel;
        }

        public void setSkillLevel(String skillLevel) {
            this.skillLevel = skillLevel;
        }
    }
}
