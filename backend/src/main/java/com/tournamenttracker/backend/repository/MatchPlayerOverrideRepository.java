package com.tournamenttracker.backend.repository;

import com.tournamenttracker.backend.model.MatchPlayerOverride;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MatchPlayerOverrideRepository extends JpaRepository<MatchPlayerOverride, Long> {

    List<MatchPlayerOverride> findByMatchId(Long matchId);

    List<MatchPlayerOverride> findByMatchIdAndTeamId(Long matchId, Long teamId);

    @Modifying
    @Query("DELETE FROM MatchPlayerOverride o WHERE o.matchId = :matchId AND o.teamId = :teamId")
    void deleteByMatchIdAndTeamId(@Param("matchId") Long matchId, @Param("teamId") Long teamId);

    @Modifying
    @Query("DELETE FROM MatchPlayerOverride o WHERE o.matchId = :matchId AND o.teamId = :teamId AND o.slotPosition = :slotPosition")
    void deleteByMatchIdAndTeamIdAndSlotPosition(@Param("matchId") Long matchId, @Param("teamId") Long teamId, @Param("slotPosition") Integer slotPosition);
}
