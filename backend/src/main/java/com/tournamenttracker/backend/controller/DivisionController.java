package com.tournamenttracker.backend.controller;

import com.tournamenttracker.backend.model.Division;
import com.tournamenttracker.backend.model.Group;
import com.tournamenttracker.backend.repository.DivisionRepository;
import com.tournamenttracker.backend.repository.GroupRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class DivisionController {

    @Autowired
    private DivisionRepository divisionRepository;

    @Autowired
    private GroupRepository groupRepository;

    // Alphabet labels for group naming: A, B, C, ...
    private static final String ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    private String groupLabel(int index) {
        // index 0 → "Group A", 1 → "Group B", etc.
        return "Group " + ALPHABET.charAt(index % 26);
    }

    @GetMapping("/tournaments/{tournamentId}/divisions")
    public List<Division> getDivisionsByTournament(@PathVariable Long tournamentId) {
        return divisionRepository.findByTournamentId(tournamentId);
    }

    @GetMapping("/divisions/{id}")
    public ResponseEntity<Division> getDivisionById(@PathVariable Long id) {
        return divisionRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // GET all groups for a division
    @GetMapping("/divisions/{divisionId}/groups")
    public ResponseEntity<List<Group>> getGroupsByDivision(@PathVariable Long divisionId) {
        List<Group> groups = groupRepository.findByDivisionId(divisionId);
        return ResponseEntity.ok(groups);
    }

    // POST add a new group to a division (triggered by "Add Group" button)
    @PostMapping("/divisions/{divisionId}/groups")
    public ResponseEntity<Group> addGroupToDivision(@PathVariable Long divisionId) {
        return divisionRepository.findById(divisionId).map(division -> {
            long currentCount = groupRepository.countByDivisionId(divisionId);
            String newGroupName = groupLabel((int) currentCount);

            Group newGroup = new Group(divisionId, newGroupName, "active");
            Group saved = groupRepository.save(newGroup);

            // Increment group_count on division
            int updatedCount = (int) currentCount + 1;
            division.setGroupCount(updatedCount);
            divisionRepository.save(division);

            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/divisions")
    public ResponseEntity<Division> createDivision(@RequestBody Division division) {
        if (division.getName() == null || division.getName().trim().isEmpty() ||
            division.getTournamentId() == null ||
            division.getStartDate() == null || division.getEndDate() == null ||
            division.getDivisionType() == null || division.getDivisionType().trim().isEmpty() ||
            division.getGender() == null || division.getGender().trim().isEmpty() ||
            division.getMaxTeams() == null || division.getMaxTeams() <= 0) {
            return ResponseEntity.badRequest().build();
        }

        // Default groupCount to 1 if not provided
        int groupCount = (division.getGroupCount() != null && division.getGroupCount() >= 1)
                ? division.getGroupCount() : 1;
        division.setGroupCount(groupCount);

        Division saved = divisionRepository.save(division);

        // Auto-create the groups
        for (int i = 0; i < groupCount; i++) {
            Group g = new Group(saved.getId(), groupLabel(i), "active");
            groupRepository.save(g);
        }

        return ResponseEntity.ok(saved);
    }

    @PutMapping("/divisions/{id}")
    public ResponseEntity<Division> updateDivision(@PathVariable Long id, @RequestBody Division divisionDetails) {
        if (divisionDetails.getName() == null || divisionDetails.getName().trim().isEmpty() ||
            divisionDetails.getStartDate() == null || divisionDetails.getEndDate() == null ||
            divisionDetails.getDivisionType() == null || divisionDetails.getDivisionType().trim().isEmpty() ||
            divisionDetails.getGender() == null || divisionDetails.getGender().trim().isEmpty() ||
            divisionDetails.getMaxTeams() == null || divisionDetails.getMaxTeams() <= 0) {
            return ResponseEntity.badRequest().build();
        }
        return divisionRepository.findById(id).map(existingDivision -> {
            existingDivision.setName(divisionDetails.getName());
            existingDivision.setDivisionType(divisionDetails.getDivisionType());
            existingDivision.setDescription(divisionDetails.getDescription());
            existingDivision.setStartDate(divisionDetails.getStartDate());
            existingDivision.setEndDate(divisionDetails.getEndDate());
            existingDivision.setGender(divisionDetails.getGender());
            existingDivision.setAgeGroup(divisionDetails.getAgeGroup());
            existingDivision.setMinSkillLevel(divisionDetails.getMinSkillLevel());
            existingDivision.setMaxSkillLevel(divisionDetails.getMaxSkillLevel());
            existingDivision.setMaxTeams(divisionDetails.getMaxTeams());
            existingDivision.setStatus(divisionDetails.getStatus());

            // Determine existing group count in DB
            long existingGroupCount = groupRepository.countByDivisionId(id);
            int requestedGroupCount = (divisionDetails.getGroupCount() != null && divisionDetails.getGroupCount() >= 1)
                    ? divisionDetails.getGroupCount()
                    : (int) existingGroupCount;

            if (requestedGroupCount < existingGroupCount) {
                // Cannot reduce — ignore change, keep existing count
                existingDivision.setGroupCount((int) existingGroupCount);
            } else if (requestedGroupCount > existingGroupCount) {
                // Add missing groups
                for (long i = existingGroupCount; i < requestedGroupCount; i++) {
                    Group g = new Group(id, groupLabel((int) i), "active");
                    groupRepository.save(g);
                }
                existingDivision.setGroupCount(requestedGroupCount);
            } else {
                existingDivision.setGroupCount((int) existingGroupCount);
            }

            Division updated = divisionRepository.save(existingDivision);
            return ResponseEntity.ok(updated);
        }).orElse(ResponseEntity.notFound().build());
    }
}
