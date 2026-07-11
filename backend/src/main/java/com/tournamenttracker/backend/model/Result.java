package com.tournamenttracker.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "\"Results\"")
public class Result {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "match_id", nullable = false)
    private Long matchId;

    @Column(name = "set1_p1")
    private Integer set1P1;

    @Column(name = "set1_p2")
    private Integer set1P2;

    @Column(name = "set2_p1")
    private Integer set2P1;

    @Column(name = "set2_p2")
    private Integer set2P2;

    @Column(name = "set3_p1")
    private Integer set3P1;

    @Column(name = "set3_p2")
    private Integer set3P2;

    @Column(name = "p1_status")
    private String p1Status;

    @Column(name = "p2_status")
    private String p2Status;

    public Result() {}

    public Result(Long matchId, Integer set1P1, Integer set1P2, Integer set2P1, Integer set2P2,
                  Integer set3P1, Integer set3P2, String p1Status, String p2Status) {
        this.matchId = matchId;
        this.set1P1 = set1P1;
        this.set1P2 = set1P2;
        this.set2P1 = set2P1;
        this.set2P2 = set2P2;
        this.set3P1 = set3P1;
        this.set3P2 = set3P2;
        this.p1Status = p1Status;
        this.p2Status = p2Status;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getMatchId() {
        return matchId;
    }

    public void setMatchId(Long matchId) {
        this.matchId = matchId;
    }

    public Integer getSet1P1() {
        return set1P1;
    }

    public void setSet1P1(Integer set1P1) {
        this.set1P1 = set1P1;
    }

    public Integer getSet1P2() {
        return set1P2;
    }

    public void setSet1P2(Integer set1P2) {
        this.set1P2 = set1P2;
    }

    public Integer getSet2P1() {
        return set2P1;
    }

    public void setSet2P1(Integer set2P1) {
        this.set2P1 = set2P1;
    }

    public Integer getSet2P2() {
        return set2P2;
    }

    public void setSet2P2(Integer set2P2) {
        this.set2P2 = set2P2;
    }

    public Integer getSet3P1() {
        return set3P1;
    }

    public void setSet3P1(Integer set3P1) {
        this.set3P1 = set3P1;
    }

    public Integer getSet3P2() {
        return set3P2;
    }

    public void setSet3P2(Integer set3P2) {
        this.set3P2 = set3P2;
    }

    public String getP1Status() {
        return p1Status;
    }

    public void setP1Status(String p1Status) {
        this.p1Status = p1Status;
    }

    public String getP2Status() {
        return p2Status;
    }

    public void setP2Status(String p2Status) {
        this.p2Status = p2Status;
    }
}
