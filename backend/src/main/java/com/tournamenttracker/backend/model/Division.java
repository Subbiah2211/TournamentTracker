package com.tournamenttracker.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;

@Entity
@Table(name = "\"Divisions\"")
public class Division {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "tournament_id", nullable = false)
    private Long tournamentId;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "division_type")
    private String divisionType;

    @Column(name = "description")
    private String description;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "gender")
    private String gender;

    @Column(name = "age_group")
    private String ageGroup;

    @Column(name = "min_skill_level")
    private String minSkillLevel;

    @Column(name = "max_skill_level")
    private String maxSkillLevel;

    @Column(name = "max_teams")
    private Integer maxTeams;

    @Column(name = "group_count")
    private Integer groupCount;

    @Column(name = "num_sets", nullable = false)
    private Integer numSets = 3;

    @Column(name = "status")
    private String status;

    @Column(name = "access_code")
    private String accessCode;

    public Division() {}

    public Division(Long tournamentId, String name, String divisionType, String description, LocalDate startDate, LocalDate endDate,
                    String gender, String ageGroup, String minSkillLevel, String maxSkillLevel, Integer maxTeams, Integer groupCount, String status) {
        this.tournamentId = tournamentId;
        this.name = name;
        this.divisionType = divisionType;
        this.description = description;
        this.startDate = startDate;
        this.endDate = endDate;
        this.gender = gender;
        this.ageGroup = ageGroup;
        this.minSkillLevel = minSkillLevel;
        this.maxSkillLevel = maxSkillLevel;
        this.maxTeams = maxTeams;
        this.groupCount = groupCount;
        this.status = status;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getTournamentId() {
        return tournamentId;
    }

    public void setTournamentId(Long tournamentId) {
        this.tournamentId = tournamentId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDivisionType() {
        return divisionType;
    }

    public void setDivisionType(String divisionType) {
        this.divisionType = divisionType;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }

    public String getGender() {
        return gender;
    }

    public void setGender(String gender) {
        this.gender = gender;
    }

    public String getAgeGroup() {
        return ageGroup;
    }

    public void setAgeGroup(String ageGroup) {
        this.ageGroup = ageGroup;
    }

    public String getMinSkillLevel() {
        return minSkillLevel;
    }

    public void setMinSkillLevel(String minSkillLevel) {
        this.minSkillLevel = minSkillLevel;
    }

    public String getMaxSkillLevel() {
        return maxSkillLevel;
    }

    public void setMaxSkillLevel(String maxSkillLevel) {
        this.maxSkillLevel = maxSkillLevel;
    }

    public Integer getMaxTeams() {
        return maxTeams;
    }

    public void setMaxTeams(Integer maxTeams) {
        this.maxTeams = maxTeams;
    }

    public Integer getGroupCount() {
        return groupCount;
    }

    public void setGroupCount(Integer groupCount) {
        this.groupCount = groupCount;
    }

    public Integer getNumSets() {
        return numSets;
    }

    public void setNumSets(Integer numSets) {
        this.numSets = (numSets != null && numSets >= 3) ? numSets : 3;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getAccessCode() {
        return accessCode;
    }

    public void setAccessCode(String accessCode) {
        this.accessCode = accessCode;
    }
}
