package com.tournamenttracker.backend.repository;

import com.tournamenttracker.backend.model.TeamPlayer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TeamPlayerRepository extends JpaRepository<TeamPlayer, Long> {
    java.util.List<TeamPlayer> findByTeamId(Long teamId);
    java.util.List<TeamPlayer> findByPlayerId(Long playerId);
    java.util.Optional<TeamPlayer> findByTeamIdAndPlayerId(Long teamId, Long playerId);
    void deleteByTeamId(Long teamId);
}
