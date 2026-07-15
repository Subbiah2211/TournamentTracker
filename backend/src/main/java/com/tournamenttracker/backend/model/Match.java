package com.tournamenttracker.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "\"Matches\"")
public class Match {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "match_id")
    private Long matchId;

    @Column(name = "division_id", nullable = false)
    private Long divisionId;

    @Column(name = "tournament_id", nullable = false)
    private Long tournamentId;

    @Column(name = "participant1", nullable = false)
    private Long participant1;

    @Column(name = "participant2", nullable = false)
    private Long participant2;

    @Column(name = "group_id")
    private Long groupId;

    @Column(name = "match_date")
    private LocalDate matchDate;

    @Column(name = "start_time")
    private LocalTime startTime;

    @Column(name = "end_time")
    private LocalTime endTime;

    @Column(name = "round")
    private Integer round;

    @Column(name = "court_id")
    private Long courtId;

    public Match() {}

    public Match(Long divisionId, Long tournamentId, Long participant1, Long participant2,
                 LocalDate matchDate, LocalTime startTime, LocalTime endTime, Integer round) {
        this.divisionId = divisionId;
        this.tournamentId = tournamentId;
        this.participant1 = participant1;
        this.participant2 = participant2;
        this.matchDate = matchDate;
        this.startTime = startTime;
        this.endTime = endTime;
        this.round = round;
    }

    public Long getMatchId() {
        return matchId;
    }

    public void setMatchId(Long matchId) {
        this.matchId = matchId;
    }

    public Long getDivisionId() {
        return divisionId;
    }

    public void setDivisionId(Long divisionId) {
        this.divisionId = divisionId;
    }

    public Long getTournamentId() {
        return tournamentId;
    }

    public void setTournamentId(Long tournamentId) {
        this.tournamentId = tournamentId;
    }

    public Long getParticipant1() {
        return participant1;
    }

    public void setParticipant1(Long participant1) {
        this.participant1 = participant1;
    }

    public Long getParticipant2() {
        return participant2;
    }

    public void setParticipant2(Long participant2) {
        this.participant2 = participant2;
    }

    public LocalDate getMatchDate() {
        return matchDate;
    }

    public void setMatchDate(LocalDate matchDate) {
        this.matchDate = matchDate;
    }

    public LocalTime getStartTime() {
        return startTime;
    }

    public void setStartTime(LocalTime startTime) {
        this.startTime = startTime;
    }

    public LocalTime getEndTime() {
        return endTime;
    }

    public void setEndTime(LocalTime endTime) {
        this.endTime = endTime;
    }

    public Long getGroupId() {
        return groupId;
    }

    public void setGroupId(Long groupId) {
        this.groupId = groupId;
    }

    public Integer getRound() {
        return round;
    }

    public void setRound(Integer round) {
        this.round = round;
    }

    public Long getCourtId() {
        return courtId;
    }

    public void setCourtId(Long courtId) {
        this.courtId = courtId;
    }
}
