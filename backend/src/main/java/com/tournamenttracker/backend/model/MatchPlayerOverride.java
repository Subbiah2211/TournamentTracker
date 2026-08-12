package com.tournamenttracker.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.OffsetDateTime;

@Entity
@Table(
    name = "\"Match_Player_Overrides\"",
    uniqueConstraints = {
        @UniqueConstraint(columnNames = {"match_id", "team_id", "slot_position"})
    }
)
public class MatchPlayerOverride {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "match_id", nullable = false)
    private Long matchId;

    @Column(name = "team_id", nullable = false)
    private Long teamId;

    /** 1-based index of the absent player slot (1, 2, 3, or 4) */
    @Column(name = "slot_position", nullable = false)
    private Integer slotPosition;

    /** The original player occupying this slot who is absent. */
    @Column(name = "absent_player_id")
    private Long absentPlayerId;

    /**
     * The substitute player filling this slot.
     * NULL means the slot plays short (no substitute assigned).
     */
    @Column(name = "sub_player_id")
    private Long subPlayerId;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    public MatchPlayerOverride() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getMatchId() { return matchId; }
    public void setMatchId(Long matchId) { this.matchId = matchId; }

    public Long getTeamId() { return teamId; }
    public void setTeamId(Long teamId) { this.teamId = teamId; }

    public Integer getSlotPosition() { return slotPosition; }
    public void setSlotPosition(Integer slotPosition) { this.slotPosition = slotPosition; }

    public Long getAbsentPlayerId() { return absentPlayerId; }
    public void setAbsentPlayerId(Long absentPlayerId) { this.absentPlayerId = absentPlayerId; }

    public Long getSubPlayerId() { return subPlayerId; }
    public void setSubPlayerId(Long subPlayerId) { this.subPlayerId = subPlayerId; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
