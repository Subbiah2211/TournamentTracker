package com.tournamenttracker.backend.repository;

import com.tournamenttracker.backend.model.Court;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CourtRepository extends JpaRepository<Court, Long> {
    Optional<Court> findByCourtNameIgnoreCase(String courtName);
}
