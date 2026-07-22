package com.tournamenttracker.backend.controller;

import com.tournamenttracker.backend.model.Tournament;
import com.tournamenttracker.backend.repository.TournamentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.ArrayList;
import java.util.Map;
import java.util.HashMap;
import java.time.LocalDate;

@RestController
@RequestMapping("/api")
public class TournamentController {

    @Value("${app.frontend.base-url}")
    private String frontendBaseUrl;

    /**
     * Derives the frontend base URL from the incoming HTTP request.
     *
     * Cloud Run (and most reverse proxies) terminate TLS at the edge and
     * forward the real public scheme/host via:
     *   X-Forwarded-Proto  → "https"
     *   X-Forwarded-Host   → "myapp-xyz-uc.a.run.app"
     *
     * Without reading these headers, request.getScheme() returns "http"
     * (the internal container protocol) and getServerName() returns the
     * container's internal hostname — producing a broken localhost URL.
     *
     * Falls back to the direct request values in local dev (no proxy headers).
     * Falls back to the configured property as a last resort.
     */
    private String resolveBaseUrl(HttpServletRequest request) {
        if (request != null) {
            // Prefer forwarded headers set by Cloud Run / load balancer
            String forwardedProto = request.getHeader("X-Forwarded-Proto");
            String forwardedHost  = request.getHeader("X-Forwarded-Host");

            String scheme = (forwardedProto != null && !forwardedProto.isBlank())
                ? forwardedProto.trim().split(",")[0].trim()   // take first if comma-list
                : request.getScheme();

            String host = (forwardedHost != null && !forwardedHost.isBlank())
                ? forwardedHost.trim().split(",")[0].trim()    // take first if comma-list
                : request.getServerName();

            int port = request.getServerPort();

            // For standard ports (80/443) we omit the port entirely
            boolean isDefaultPort = ("https".equals(scheme) && port == 443)
                                 || ("http".equals(scheme)  && port == 80);

            // When proxied, the port is irrelevant — the public URL has no port
            boolean isProxied = forwardedProto != null;

            if (isProxied || isDefaultPort) {
                return scheme + "://" + host;
            }
            return scheme + "://" + host + ":" + port;
        }
        // Last resort: use configured property
        return frontendBaseUrl;
    }

    @Autowired
    private TournamentRepository tournamentRepository;

    @GetMapping("/tournaments")
    public List<Tournament> getTournaments(@RequestParam(value = "status", required = false) String status) {
        // Dynamic status updates based on date conditions
        LocalDate today = LocalDate.now();
        List<Tournament> all = tournamentRepository.findAll();
        for (Tournament t : all) {
            boolean updated = false;
            String originalStatus = t.getStatus();
            String currentStatus = originalStatus != null ? originalStatus.trim().toLowerCase() : "";

            // Normalize in-memory if casing was different
            if (originalStatus != null && !originalStatus.equals(currentStatus)) {
                t.setStatus(currentStatus);
                updated = true;
            }

            if (currentStatus.isEmpty()) {
                // Determine status based on dates
                if (t.getStartDate() != null && t.getStartDate().isAfter(today)) {
                    currentStatus = "upcoming";
                } else if (t.getEndDate() != null && t.getEndDate().isBefore(today)) {
                    currentStatus = "completed";
                } else {
                    currentStatus = "active";
                }
                t.setStatus(currentStatus);
                updated = true;
            }

            if ("active".equals(currentStatus)) {
                if (t.getEndDate() != null && t.getEndDate().isBefore(today)) {
                    t.setStatus("completed");
                    updated = true;
                }
            } else if ("upcoming".equals(currentStatus)) {
                if (t.getStartDate() != null && !t.getStartDate().isAfter(today)) {
                    // Transition to completed if end date has passed, otherwise active
                    if (t.getEndDate() != null && t.getEndDate().isBefore(today)) {
                        t.setStatus("completed");
                    } else {
                        t.setStatus("active");
                    }
                    updated = true;
                }
            }

            if (updated) {
                tournamentRepository.save(t);
            }
        }

        if (status != null) {
            return tournamentRepository.findByStatus(status.trim().toLowerCase());
        }
        return tournamentRepository.findAll();
    }

    @GetMapping("/tournaments/{id}")
    public ResponseEntity<Tournament> getTournamentById(@PathVariable Long id) {
        return tournamentRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/tournaments")
    public ResponseEntity<Tournament> createTournament(@RequestBody Tournament tournament,
                                                       HttpServletRequest request) {
        if (tournament.getTitle() == null || tournament.getTitle().trim().isEmpty() ||
            tournament.getStartDate() == null || tournament.getEndDate() == null ||
            tournament.getOrganizer() == null || tournament.getOrganizer().trim().isEmpty() ||
            tournament.getEmail() == null || tournament.getEmail().trim().isEmpty() ||
            tournament.getPhone() == null || tournament.getPhone().trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        // Normalize status
        if (tournament.getStatus() == null || tournament.getStatus().trim().isEmpty()) {
            LocalDate today = LocalDate.now();
            if (tournament.getStartDate().isAfter(today)) {
                tournament.setStatus("upcoming");
            } else if (tournament.getEndDate().isBefore(today)) {
                tournament.setStatus("completed");
            } else {
                tournament.setStatus("active");
            }
        } else {
            tournament.setStatus(tournament.getStatus().trim().toLowerCase());
        }

        // Save first to get the generated ID
        Tournament saved = tournamentRepository.save(tournament);

        // Autogenerate URL: derive base from the actual request so it works in
        // local dev AND in Cloud Run without needing FRONTEND_BASE_URL configured.
        String baseUrl = resolveBaseUrl(request);
        String autogeneratedUrl = baseUrl + "/#/matches?tournamentId=" + saved.getId();
        saved.setUrl(autogeneratedUrl);

        // Save again to store the URL
        saved = tournamentRepository.save(saved);

        return ResponseEntity.ok(saved);
    }

    @PutMapping("/tournaments/{id}")
    public ResponseEntity<Tournament> updateTournament(@PathVariable Long id,
                                                       @RequestBody Tournament tournamentDetails,
                                                       HttpServletRequest request) {
        return tournamentRepository.findById(id).map(existingTournament -> {
            existingTournament.setTitle(tournamentDetails.getTitle());
            existingTournament.setDescription(tournamentDetails.getDescription());
            existingTournament.setStartDate(tournamentDetails.getStartDate());
            existingTournament.setEndDate(tournamentDetails.getEndDate());
            existingTournament.setStartTime(tournamentDetails.getStartTime());
            existingTournament.setEndTime(tournamentDetails.getEndTime());
            existingTournament.setOrganizer(tournamentDetails.getOrganizer());
            existingTournament.setEmail(tournamentDetails.getEmail());
            existingTournament.setPhone(tournamentDetails.getPhone());
            existingTournament.setThumbnail(tournamentDetails.getThumbnail());

            // Normalize status
            if (tournamentDetails.getStatus() == null || tournamentDetails.getStatus().trim().isEmpty()) {
                LocalDate today = LocalDate.now();
                if (tournamentDetails.getStartDate() != null && tournamentDetails.getStartDate().isAfter(today)) {
                    existingTournament.setStatus("upcoming");
                } else if (tournamentDetails.getEndDate() != null && tournamentDetails.getEndDate().isBefore(today)) {
                    existingTournament.setStatus("completed");
                } else {
                    existingTournament.setStatus("active");
                }
            } else {
                existingTournament.setStatus(tournamentDetails.getStatus().trim().toLowerCase());
            }

            if (existingTournament.getUrl() == null || existingTournament.getUrl().isEmpty()) {
                String baseUrl = resolveBaseUrl(request);
                existingTournament.setUrl(baseUrl + "/#/matches?tournamentId=" + id);
            }

            Tournament updated = tournamentRepository.save(existingTournament);
            return ResponseEntity.ok(updated);
        }).orElse(ResponseEntity.notFound().build());
    }

    @Autowired
    private javax.sql.DataSource dataSource;

    @GetMapping("/tournaments-raw")
    public ResponseEntity<?> getTournamentsRaw() {
        List<Map<String, Object>> results = new ArrayList<>();
        try (java.sql.Connection conn = dataSource.getConnection();
             java.sql.Statement stmt = conn.createStatement();
             java.sql.ResultSet rs = stmt.executeQuery("SELECT id, title, status, start_date, end_date FROM \"Tournaments\"")) {
            while (rs.next()) {
                Map<String, Object> row = new HashMap<>();
                row.put("id", rs.getLong("id"));
                row.put("title", rs.getString("title"));
                row.put("status", rs.getString("status"));
                row.put("startDate", rs.getString("start_date"));
                row.put("endDate", rs.getString("end_date"));
                results.add(row);
            }
        } catch (Exception e) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.status(500).body(err);
        }
        return ResponseEntity.ok(results);
    }
}

