package com.tournamenttracker.backend.controller;

import com.tournamenttracker.backend.model.User;
import com.tournamenttracker.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api")
public class LoginController {

    @Autowired
    private UserRepository userRepository;

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody LoginRequest loginRequest) {
        Map<String, Object> response = new HashMap<>();
        
        if (loginRequest.getEmail() == null || loginRequest.getPassword() == null) {
            response.put("success", false);
            response.put("message", "login failed");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        Optional<User> userOpt = userRepository.findByEmail(loginRequest.getEmail());
        
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            // Credentials are stored in plain text as requested
            if (user.getPassword().equals(loginRequest.getPassword())) {
                response.put("success", true);
                response.put("message", "Login Successful");
                response.put("userName", user.getUserName());
                response.put("role", user.getRole());
                return ResponseEntity.ok(response);
            }
        }
        
        response.put("success", false);
        response.put("message", "login failed");
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
    }

    public static class LoginRequest {
        private String email;
        private String password;

        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }

        public String getPassword() {
            return password;
        }

        public void setPassword(String password) {
            this.password = password;
        }
    }
}
