package com.tournamenttracker.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "\"Groups\"")
public class Group {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "division_id", nullable = false)
    private Long divisionId;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "status")
    private String status;

    public Group() {}

    public Group(Long divisionId, String name, String status) {
        this.divisionId = divisionId;
        this.name = name;
        this.status = status;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getDivisionId() { return divisionId; }
    public void setDivisionId(Long divisionId) { this.divisionId = divisionId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
