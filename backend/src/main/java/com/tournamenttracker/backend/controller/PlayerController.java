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
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
@RestController
@RequestMapping("/api")
public class PlayerController {

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

    @GetMapping("/players/search")
    public List<Player> searchPlayers(@RequestParam String query) {
        if (query == null || query.trim().isEmpty()) {
            return java.util.Collections.emptyList();
        }
        String q = query.trim();
        return playerRepository.findByFirstNameContainingIgnoreCaseOrLastNameContainingIgnoreCase(q, q);
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
            request.getPlayers() == null || request.getPlayers().size() != 4) {
            response.put("success", false);
            response.put("message", "Mandatory fields are missing");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        // Validate each of the 4 players
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
            request.getPlayers() == null || request.getPlayers().size() != 4) {
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
}
