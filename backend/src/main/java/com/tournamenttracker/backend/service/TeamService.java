package com.tournamenttracker.backend.service;

import com.tournamenttracker.backend.model.Participant;
import com.tournamenttracker.backend.model.Player;
import com.tournamenttracker.backend.model.Team;
import com.tournamenttracker.backend.model.TeamPlayer;
import com.tournamenttracker.backend.repository.ParticipantRepository;
import com.tournamenttracker.backend.repository.PlayerRepository;
import com.tournamenttracker.backend.repository.TeamPlayerRepository;
import com.tournamenttracker.backend.repository.TeamRepository;
import com.tournamenttracker.backend.controller.PlayerController.DoublesTeamRequest;
import com.tournamenttracker.backend.controller.PlayerController.DoublesPlayerRequest;
import com.tournamenttracker.backend.controller.PlayerController.GenericTeamRequest;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class TeamService {

    @Autowired
    private TeamRepository teamRepository;

    @Autowired
    private TeamPlayerRepository teamPlayerRepository;

    @Autowired
    private PlayerRepository playerRepository;

    @Autowired
    private ParticipantRepository participantRepository;

    @Transactional
    public Team registerDoublesTeam(DoublesTeamRequest request) {
        String teamName = request.getTeamName().trim();

        // 1. Create and Save Team
        Team team = new Team();
        team.setDivisionId(request.getDivisionId());
        team.setGroupId(request.getGroupId());
        team.setName(teamName);
        team.setType("Doubles");
        Team savedTeam = teamRepository.save(team);

        // 2. Save/Update Player 1
        Player player1 = saveOrUpdatePlayer(request.getPlayer1());

        // 3. Save/Update Player 2
        Player player2 = saveOrUpdatePlayer(request.getPlayer2());

        // 4. Save Team-Player relations
        TeamPlayer tp1 = new TeamPlayer(savedTeam.getId(), player1.getId());
        TeamPlayer tp2 = new TeamPlayer(savedTeam.getId(), player2.getId());
        teamPlayerRepository.save(tp1);
        teamPlayerRepository.save(tp2);

        // 5. Save Participant row
        Participant participant = new Participant();
        participant.setDivisionId(request.getDivisionId().intValue());
        participant.setGroupId(request.getGroupId());
        participant.setType("Team");
        participant.setPlayerTeamId(savedTeam.getId());
        participant.setPlayerTeamName(savedTeam.getName());
        
        participant.setMatchesPlayed(0L);
        participant.setWon(0L);
        participant.setLost(0L);
        participant.setPointsFor(0L);
        participant.setPointsAgaint(0L);
        participant.setPointsDiff(0L);
        
        participantRepository.save(participant);

        return savedTeam;
    }

    @Transactional
    public Team registerGenericTeam(GenericTeamRequest request) {
        String teamName = request.getTeamName().trim();

        // 1. Create and Save Team
        Team team = new Team();
        team.setDivisionId(request.getDivisionId());
        team.setGroupId(request.getGroupId());
        team.setName(teamName);
        team.setType("Generic");
        Team savedTeam = teamRepository.save(team);

        // 2. Save/Update players and link to the team
        for (DoublesPlayerRequest pReq : request.getPlayers()) {
            Player player = saveOrUpdatePlayer(pReq);
            TeamPlayer tp = new TeamPlayer(savedTeam.getId(), player.getId());
            teamPlayerRepository.save(tp);
        }

        // 3. Save Participant row
        Participant participant = new Participant();
        participant.setDivisionId(request.getDivisionId().intValue());
        participant.setGroupId(request.getGroupId());
        participant.setType("Team");
        participant.setPlayerTeamId(savedTeam.getId());
        participant.setPlayerTeamName(savedTeam.getName());
        
        participant.setMatchesPlayed(0L);
        participant.setWon(0L);
        participant.setLost(0L);
        participant.setPointsFor(0L);
        participant.setPointsAgaint(0L);
        participant.setPointsDiff(0L);
        
        participantRepository.save(participant);

        return savedTeam;
    }

    @Transactional
    public Team updateDoublesTeam(Long teamId, DoublesTeamRequest request) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found"));

        String oldName = team.getName();
        String newName = request.getTeamName().trim();

        team.setName(newName);
        Team savedTeam = teamRepository.save(team);

        // Update groupId if provided
        if (request.getGroupId() != null) {
            savedTeam.setGroupId(request.getGroupId());
            teamRepository.save(savedTeam);
        }

        teamPlayerRepository.deleteByTeamId(teamId);

        Player player1 = saveOrUpdatePlayer(request.getPlayer1());
        Player player2 = saveOrUpdatePlayer(request.getPlayer2());

        TeamPlayer tp1 = new TeamPlayer(savedTeam.getId(), player1.getId());
        TeamPlayer tp2 = new TeamPlayer(savedTeam.getId(), player2.getId());
        teamPlayerRepository.save(tp1);
        teamPlayerRepository.save(tp2);

        if (!oldName.equals(newName)) {
            participantRepository.findByPlayerTeamIdAndType(teamId, "Team").ifPresent(p -> {
                p.setPlayerTeamName(newName);
                participantRepository.save(p);
            });
        }
        if (request.getGroupId() != null) {
            participantRepository.findByPlayerTeamIdAndType(teamId, "Team").ifPresent(p -> {
                p.setGroupId(request.getGroupId());
                participantRepository.save(p);
            });
        }

        return savedTeam;
    }

    @Transactional
    public Team updateGenericTeam(Long teamId, GenericTeamRequest request) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found"));

        String oldName = team.getName();
        String newName = request.getTeamName().trim();

        team.setName(newName);
        Team savedTeam = teamRepository.save(team);

        // Update groupId if provided
        if (request.getGroupId() != null) {
            savedTeam.setGroupId(request.getGroupId());
            teamRepository.save(savedTeam);
        }

        teamPlayerRepository.deleteByTeamId(teamId);

        for (DoublesPlayerRequest pReq : request.getPlayers()) {
            Player player = saveOrUpdatePlayer(pReq);
            TeamPlayer tp = new TeamPlayer(savedTeam.getId(), player.getId());
            teamPlayerRepository.save(tp);
        }

        if (!oldName.equals(newName)) {
            participantRepository.findByPlayerTeamIdAndType(teamId, "Team").ifPresent(p -> {
                p.setPlayerTeamName(newName);
                participantRepository.save(p);
            });
        }
        if (request.getGroupId() != null) {
            participantRepository.findByPlayerTeamIdAndType(teamId, "Team").ifPresent(p -> {
                p.setGroupId(request.getGroupId());
                participantRepository.save(p);
            });
        }

        return savedTeam;
    }

    private Player saveOrUpdatePlayer(DoublesPlayerRequest req) {
        String email = req.getEmail().trim();
        Optional<Player> existingOpt = playerRepository.findByEmail(email);
        Player player;
        if (existingOpt.isPresent()) {
            player = existingOpt.get();
        } else {
            player = new Player();
            player.setEmail(email);
        }
        player.setFirstName(req.getFirstName().trim());
        player.setLastName(req.getLastName().trim());
        player.setPhone(req.getPhone() != null ? req.getPhone().trim() : null);
        player.setGender(req.getGender() != null ? req.getGender().trim() : null);
        player.setAge(req.getAge() != null ? req.getAge().trim() : null);
        player.setSkillLevel(req.getSkillLevel() != null ? req.getSkillLevel().trim() : null);
        return playerRepository.save(player);
    }
}
