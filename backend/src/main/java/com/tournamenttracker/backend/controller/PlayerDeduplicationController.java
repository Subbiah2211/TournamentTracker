package com.tournamenttracker.backend.controller;

import com.tournamenttracker.backend.repository.PlayerRepository;
import com.tournamenttracker.backend.service.PlayerDeduplicationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/players")
public class PlayerDeduplicationController {

    @Autowired
    private PlayerDeduplicationService deduplicationService;

    @Autowired
    private PlayerRepository playerRepository;

    /**
     * Lists all emails that currently have duplicate entries in the Players table.
     */
    @GetMapping("/duplicates")
    public ResponseEntity<?> getDuplicateEmails() {
        List<String> duplicates = playerRepository.findDuplicateEmails();
        Map<String, Object> response = new HashMap<>();
        response.put("count", duplicates.size());
        response.put("duplicateEmails", duplicates);
        return ResponseEntity.ok(response);
    }

    /**
     * Deduplicates players.
     * 
     * @param dryRun if true (default), simulates the process and returns the preview report without saving changes.
     * @param email  optional email. If provided, deduplicates only this email. If omitted/null, runs batch-all for all duplicates.
     */
    @PostMapping("/deduplicate")
    public ResponseEntity<?> deduplicate(
            @RequestParam(name = "dryRun", defaultValue = "true") boolean dryRun,
            @RequestParam(name = "email", required = false) String email) {

        try {
            PlayerDeduplicationService.DeduplicationReport report;
            if (email != null && !email.trim().isEmpty()) {
                report = deduplicationService.deduplicateSingleEmail(email, dryRun);
            } else {
                report = deduplicationService.deduplicateAll(dryRun);
            }

            return ResponseEntity.ok(report);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", e.getClass().getSimpleName());
            errorResponse.put("message", e.getMessage());
            Throwable root = e;
            while (root.getCause() != null && root.getCause() != root) {
                root = root.getCause();
            }
            errorResponse.put("rootCause", root.getMessage());
            return ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }
}
