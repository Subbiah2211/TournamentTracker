package com.tournamenttracker.backend.repository;

import com.tournamenttracker.backend.model.Participant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ParticipantRepository extends JpaRepository<Participant, Long> {
    
    @Query("SELECT p FROM Participant p WHERE p.divisionId IN (SELECT d.id FROM Division d WHERE d.tournamentId = :tournamentId)")
    List<Participant> findByTournamentId(@Param("tournamentId") Long tournamentId);

    List<Participant> findByDivisionId(Integer divisionId);
    java.util.Optional<Participant> findByPlayerTeamIdAndType(Long playerTeamId, String type);

    List<Participant> findByGroupId(Long groupId);
    long countByGroupId(Long groupId);
}

