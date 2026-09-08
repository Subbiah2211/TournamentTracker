package com.tournamenttracker.backend.repository;

import com.tournamenttracker.backend.model.Result;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ResultRepository extends JpaRepository<Result, Long> {

    Optional<Result> findByMatchId(Long matchId);

    /**
     * SELECT ... FOR UPDATE — used inside @Transactional save paths so that
     * concurrent requests serialise on this row instead of both seeing "no row"
     * and inserting duplicates. If no row exists, nothing is locked and the
     * caller falls through to insert; but that insert will fail with a unique
     * constraint violation for the second concurrent caller, which is caught
     * and re-tried as an update.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM Result r WHERE r.matchId = :matchId")
    Optional<Result> findByMatchIdForUpdate(@Param("matchId") Long matchId);

    /** Used when we need to detect and clean up existing duplicate rows. */
    List<Result> findAllByMatchId(Long matchId);
}
