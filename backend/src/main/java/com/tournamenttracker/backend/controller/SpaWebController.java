package com.tournamenttracker.backend.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class SpaWebController {

    /**
     * Forwards known frontend Single Page Application (SPA) routes to index.html
     * so that direct browser navigation or page refreshes do not result in a 404.
     */
    @GetMapping(value = {
        "/tour-details",
        "/create-tournament",
        "/edit-tournament",
        "/divisions",
        "/players",
        "/matches",
        "/add-result",
        "/standings",
        "/courts",
        "/admin-players",
        "/home"
    })
    public String forwardSpaRoutes() {
        return "forward:/index.html";
    }
}
