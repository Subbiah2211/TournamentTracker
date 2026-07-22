package com.tournamenttracker.backend.repository;

import com.tournamenttracker.backend.model.Division;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DivisionRepository extends JpaRepository<Division, Long> {
    List<Division> findByTournamentId(Long tournamentId);
    Division findByAccessCodeIgnoreCase(String accessCode);
}
