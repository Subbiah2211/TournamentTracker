package com.tournamenttracker.backend.controller;

import com.tournamenttracker.backend.model.Court;
import com.tournamenttracker.backend.repository.CourtRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/courts")
public class CourtController {

    @Autowired
    private CourtRepository courtRepository;

    @GetMapping
    public List<Court> getAllCourts() {
        return courtRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<?> addCourt(@RequestBody Court court) {
        if (court.getCourtName() == null || court.getCourtName().trim().isEmpty()) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "Court name is required");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
        }
        
        Optional<Court> existing = courtRepository.findByCourtNameIgnoreCase(court.getCourtName().trim());
        if (existing.isPresent()) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "Court name exists already!");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
        }

        court.setCourtName(court.getCourtName().trim());
        Court saved = courtRepository.save(court);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateCourt(@PathVariable Long id, @RequestBody Court updatedCourt) {
        if (updatedCourt.getCourtName() == null || updatedCourt.getCourtName().trim().isEmpty()) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "Court name is required");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
        }

        Optional<Court> existingOpt = courtRepository.findById(id);
        if (!existingOpt.isPresent()) {
            return ResponseEntity.notFound().build();
        }

        Optional<Court> existingName = courtRepository.findByCourtNameIgnoreCase(updatedCourt.getCourtName().trim());
        if (existingName.isPresent() && !existingName.get().getId().equals(id)) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "Court name exists already!");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
        }

        Court existing = existingOpt.get();
        existing.setCourtName(updatedCourt.getCourtName().trim());
        Court saved = courtRepository.save(existing);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteCourt(@PathVariable Long id) {
        if (!courtRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        courtRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
