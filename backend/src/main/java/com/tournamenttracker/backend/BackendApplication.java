package com.tournamenttracker.backend;

import com.tournamenttracker.backend.model.Player;
import com.tournamenttracker.backend.repository.PlayerRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

import java.util.List;

@SpringBootApplication
public class BackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(BackendApplication.class, args);
	}

	@Bean
	public CommandLineRunner normalizeExistingEmails(PlayerRepository playerRepository) {
		return args -> {
			try {
				List<Player> players = playerRepository.findAll();
				boolean changed = false;
				for (Player p : players) {
					if (p.getEmail() != null) {
						String lower = p.getEmail().trim().toLowerCase();
						if (!lower.equals(p.getEmail())) {
							p.setEmail(lower);
							changed = true;
						}
					}
				}
				if (changed) {
					playerRepository.saveAll(players);
					System.out.println("[BackendApplication] Normalized existing player emails to lowercase.");
				}
			} catch (Exception e) {
				System.err.println("[BackendApplication] Could not normalize existing emails: " + e.getMessage());
			}
		};
	}

}
