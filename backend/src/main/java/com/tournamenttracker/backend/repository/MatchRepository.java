package com.tournamenttracker.backend.repository;

import com.tournamenttracker.backend.model.Match;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MatchRepository extends JpaRepository<Match, Long> {
    List<Match> findByDivisionId(Long divisionId);
    List<Match> findByTournamentId(Long tournamentId);
    List<Match> findByGroupId(Long groupId);
}

