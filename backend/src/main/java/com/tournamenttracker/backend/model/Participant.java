package com.tournamenttracker.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "\"Participants\"")
public class Participant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "division_id", nullable = false)
    private Integer divisionId;

    @Column(name = "type", nullable = false)
    private String type;

    @Column(name = "player_team_id", nullable = false)
    private Long playerTeamId;

    @Column(name = "player_team_name", nullable = false)
    private String playerTeamName;

    @Column(name = "group_id")
    private Long groupId;

    @Column(name = "matches_played")
    private Long matchesPlayed;

    @Column(name = "won")
    private Long won;

    @Column(name = "lost")
    private Long lost;

    @Column(name = "points_for")
    private Long pointsFor;

    @Column(name = "points_againt")
    private Long pointsAgaint; // matches database spelling 'points_againt'

    @Column(name = "points_diff")
    private Long pointsDiff;

    public Participant() {}

    public Participant(Integer divisionId, String type, Long playerTeamId, String playerTeamName) {
        this.divisionId = divisionId;
        this.type = type;
        this.playerTeamId = playerTeamId;
        this.playerTeamName = playerTeamName;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Integer getDivisionId() {
        return divisionId;
    }

    public void setDivisionId(Integer divisionId) {
        this.divisionId = divisionId;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public Long getPlayerTeamId() {
        return playerTeamId;
    }

    public void setPlayerTeamId(Long playerTeamId) {
        this.playerTeamId = playerTeamId;
    }

    public String getPlayerTeamName() {
        return playerTeamName;
    }

    public void setPlayerTeamName(String playerTeamName) {
        this.playerTeamName = playerTeamName;
    }

    public Long getGroupId() {
        return groupId;
    }

    public void setGroupId(Long groupId) {
        this.groupId = groupId;
    }

    public Long getMatchesPlayed() {
        return matchesPlayed;
    }

    public void setMatchesPlayed(Long matchesPlayed) {
        this.matchesPlayed = matchesPlayed;
    }

    public Long getWon() {
        return won;
    }

    public void setWon(Long won) {
        this.won = won;
    }

    public Long getLost() {
        return lost;
    }

    public void setLost(Long lost) {
        this.lost = lost;
    }

    public Long getPointsFor() {
        return pointsFor;
    }

    public void setPointsFor(Long pointsFor) {
        this.pointsFor = pointsFor;
    }

    public Long getPointsAgaint() {
        return pointsAgaint;
    }

    public void setPointsAgaint(Long pointsAgaint) {
        this.pointsAgaint = pointsAgaint;
    }

    public Long getPointsDiff() {
        return pointsDiff;
    }

    public void setPointsDiff(Long pointsDiff) {
        this.pointsDiff = pointsDiff;
    }
}
