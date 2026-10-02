package com.tournamenttracker.backend.repository;

import com.tournamenttracker.backend.model.Player;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlayerRepository extends JpaRepository<Player, Long> {
    Optional<Player> findByEmail(String email);
    Optional<Player> findByEmailIgnoreCase(String email);
    List<Player> findAllByEmailIgnoreCase(String email);
    List<Player> findByFirstNameContainingIgnoreCaseOrLastNameContainingIgnoreCase(String firstName, String lastName);

    @org.springframework.data.jpa.repository.Query("SELECT LOWER(TRIM(p.email)) FROM Player p WHERE p.email IS NOT NULL AND TRIM(p.email) != '' GROUP BY LOWER(TRIM(p.email)) HAVING COUNT(p) > 1")
    List<String> findDuplicateEmails();
}
