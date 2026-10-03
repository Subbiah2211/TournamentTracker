package com.tournamenttracker.backend;

import com.tournamenttracker.backend.model.*;
import com.tournamenttracker.backend.repository.*;
import com.tournamenttracker.backend.service.PlayerDeduplicationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class PlayerDeduplicationServiceTest {

    @Mock
    private PlayerRepository playerRepository;

    @Mock
    private ParticipantRepository participantRepository;

    @Mock
    private MatchRepository matchRepository;

    @Mock
    private TeamPlayerRepository teamPlayerRepository;

    @Mock
    private ResultRepository resultRepository;

    @Mock
    private MatchPlayerOverrideRepository matchPlayerOverrideRepository;

    @InjectMocks
    private PlayerDeduplicationService deduplicationService;

    private Player primaryPlayer;
    private Player duplicatePlayer;

    @BeforeEach
    public void setup() {
        primaryPlayer = new Player();
        primaryPlayer.setId(12L);
        primaryPlayer.setFirstName("Aaron");
        primaryPlayer.setLastName("Byron");
        primaryPlayer.setEmail("aaron.byron@tracker.com");

        duplicatePlayer = new Player();
        duplicatePlayer.setId(45L);
        duplicatePlayer.setFirstName("Aaron");
        duplicatePlayer.setLastName("Byron");
        duplicatePlayer.setEmail("aaron.byron@tracker.com");
    }

    @Test
    public void testDryRun_DoesNotModifyDatabase() {
        when(playerRepository.findDuplicateEmails()).thenReturn(List.of("aaron.byron@tracker.com"));
        when(playerRepository.findAllByEmailIgnoreCase("aaron.byron@tracker.com"))
                .thenReturn(new ArrayList<>(List.of(primaryPlayer, duplicatePlayer)));

        Participant dupPart = new Participant(2, "Singles", 45L, "Aaron Byron");
        dupPart.setId(10L);
        when(participantRepository.findAllByPlayerTeamIdAndType(45L, "Singles")).thenReturn(List.of(dupPart));
        when(participantRepository.findByPlayerTeamIdAndTypeAndDivisionId(12L, "Singles", 2)).thenReturn(Optional.empty());

        Result result = new Result();
        result.setId(34L);
        result.setMatchId(5L);
        result.setLastEditedByPlayerId(45L);
        when(resultRepository.findByLastEditedByPlayerId(45L)).thenReturn(List.of(result));

        TeamPlayer tp = new TeamPlayer(3L, 45L);
        tp.setId(56L);
        when(teamPlayerRepository.findByPlayerId(45L)).thenReturn(List.of(tp));
        when(teamPlayerRepository.findByTeamIdAndPlayerId(3L, 12L)).thenReturn(Optional.empty());

        when(matchPlayerOverrideRepository.findByAbsentPlayerId(45L)).thenReturn(Collections.emptyList());
        when(matchPlayerOverrideRepository.findBySubPlayerId(45L)).thenReturn(Collections.emptyList());

        PlayerDeduplicationService.DeduplicationReport report = deduplicationService.deduplicateAll(true);

        assertTrue(report.isDryRun());
        assertEquals(1, report.getTotalDuplicateEmailsFound());
        assertEquals(1, report.getTotalDuplicatesProcessed());
        assertEquals(1, report.getSummary().get("participantsUpdated"));
        assertEquals(1, report.getSummary().get("resultsUpdated"));
        assertEquals(1, report.getSummary().get("teamPlayersUpdated"));
        assertEquals(1, report.getSummary().get("playersDeprecated"));

        // Verify NO save or delete operations were performed in dryRun mode
        verify(playerRepository, never()).save(any());
        verify(participantRepository, never()).save(any());
        verify(participantRepository, never()).delete(any());
        verify(resultRepository, never()).save(any());
        verify(teamPlayerRepository, never()).save(any());
        verify(teamPlayerRepository, never()).delete(any());
        verify(matchRepository, never()).save(any());
        verify(matchPlayerOverrideRepository, never()).save(any());
        verify(matchPlayerOverrideRepository, never()).delete(any());
    }

    @Test
    public void testActualDeduplication_UpdatesAllEntitiesAndDeprecatesDuplicate() {
        when(playerRepository.findDuplicateEmails()).thenReturn(List.of("aaron.byron@tracker.com"));
        when(playerRepository.findAllByEmailIgnoreCase("aaron.byron@tracker.com"))
                .thenReturn(new ArrayList<>(List.of(primaryPlayer, duplicatePlayer)));

        Participant dupPart = new Participant(2, "Singles", 45L, "Aaron Byron");
        dupPart.setId(10L);
        when(participantRepository.findAllByPlayerTeamIdAndType(45L, "Singles")).thenReturn(List.of(dupPart));
        when(participantRepository.findByPlayerTeamIdAndTypeAndDivisionId(12L, "Singles", 2)).thenReturn(Optional.empty());

        Result result = new Result();
        result.setId(34L);
        result.setMatchId(5L);
        result.setLastEditedByPlayerId(45L);
        when(resultRepository.findByLastEditedByPlayerId(45L)).thenReturn(List.of(result));

        TeamPlayer tp = new TeamPlayer(3L, 45L);
        tp.setId(56L);
        when(teamPlayerRepository.findByPlayerId(45L)).thenReturn(List.of(tp));
        when(teamPlayerRepository.findByTeamIdAndPlayerId(3L, 12L)).thenReturn(Optional.empty());

        when(matchPlayerOverrideRepository.findByAbsentPlayerId(45L)).thenReturn(Collections.emptyList());
        when(matchPlayerOverrideRepository.findBySubPlayerId(45L)).thenReturn(Collections.emptyList());

        PlayerDeduplicationService.DeduplicationReport report = deduplicationService.deduplicateAll(false);

        assertFalse(report.isDryRun());
        assertEquals(1, report.getTotalDuplicateEmailsFound());
        assertEquals(1, report.getTotalDuplicatesProcessed());

        // Verify saves performed with migrated values
        assertEquals(12L, dupPart.getPlayerTeamId());
        verify(participantRepository).save(dupPart);

        assertEquals(12L, result.getLastEditedByPlayerId());
        verify(resultRepository).save(result);

        assertEquals(12L, tp.getPlayerId());
        verify(teamPlayerRepository).save(tp);

        assertEquals("aaron.byron@tracker.com_deprecated_45", duplicatePlayer.getEmail());
        assertTrue(duplicatePlayer.getLastName().contains("(DEPRECATED)"));
        verify(playerRepository).saveAndFlush(duplicatePlayer);
    }

    @Test
    public void testParticipantCollision_MergesMatchesAndDeletesDuplicateParticipant() {
        when(playerRepository.findAllByEmailIgnoreCase("aaron.byron@tracker.com"))
                .thenReturn(new ArrayList<>(List.of(primaryPlayer, duplicatePlayer)));

        Participant primaryPart = new Participant(2, "Singles", 12L, "Aaron Byron");
        primaryPart.setId(99L);
        primaryPart.setWon(3L);
        primaryPart.setMatchesPlayed(3L);

        Participant dupPart = new Participant(2, "Singles", 45L, "Aaron Byron");
        dupPart.setId(10L);
        dupPart.setWon(2L);
        dupPart.setMatchesPlayed(2L);

        when(participantRepository.findAllByPlayerTeamIdAndType(45L, "Singles")).thenReturn(List.of(dupPart));
        when(participantRepository.findByPlayerTeamIdAndTypeAndDivisionId(12L, "Singles", 2)).thenReturn(Optional.of(primaryPart));

        Match match = new Match();
        match.setMatchId(77L);
        match.setParticipant1(10L);
        match.setParticipant2(20L);
        when(matchRepository.findByParticipant1OrParticipant2(10L, 10L)).thenReturn(List.of(match));

        PlayerDeduplicationService.DeduplicationReport report = deduplicationService.deduplicateSingleEmail("aaron.byron@tracker.com", false);

        assertEquals(1, report.getSummary().get("participantsMerged"));
        assertEquals(1, report.getSummary().get("matchesReassigned"));

        // Match participant reassigned to primary participant
        assertEquals(99L, match.getParticipant1());
        verify(matchRepository).save(match);

        // Stats merged into primary participant
        assertEquals(5L, primaryPart.getMatchesPlayed());
        assertEquals(5L, primaryPart.getWon());
        verify(participantRepository).save(primaryPart);

        // Duplicate participant deleted
        verify(participantRepository).delete(dupPart);
    }

    @Test
    public void testTeamPlayerCollision_DeletesRedundantTeamPlayer() {
        when(playerRepository.findAllByEmailIgnoreCase("aaron.byron@tracker.com"))
                .thenReturn(new ArrayList<>(List.of(primaryPlayer, duplicatePlayer)));

        TeamPlayer dupTp = new TeamPlayer(5L, 45L);
        dupTp.setId(88L);
        when(teamPlayerRepository.findByPlayerId(45L)).thenReturn(List.of(dupTp));

        TeamPlayer existingPrimaryTp = new TeamPlayer(5L, 12L);
        existingPrimaryTp.setId(77L);
        when(teamPlayerRepository.findByTeamIdAndPlayerId(5L, 12L)).thenReturn(Optional.of(existingPrimaryTp));

        PlayerDeduplicationService.DeduplicationReport report = deduplicationService.deduplicateSingleEmail("aaron.byron@tracker.com", false);

        assertEquals(1, report.getSummary().get("teamPlayersDeduplicated"));
        verify(teamPlayerRepository).delete(dupTp);
        verify(teamPlayerRepository, never()).save(dupTp);
    }

    @Test
    public void testSelfSubstitutionOverride_DeletesOverride() {
        when(playerRepository.findAllByEmailIgnoreCase("aaron.byron@tracker.com"))
                .thenReturn(new ArrayList<>(List.of(primaryPlayer, duplicatePlayer)));

        MatchPlayerOverride override = new MatchPlayerOverride();
        override.setId(101L);
        override.setMatchId(44L);
        override.setAbsentPlayerId(45L);
        override.setSubPlayerId(12L); // primary player was sub for duplicate player

        when(matchPlayerOverrideRepository.findByAbsentPlayerId(45L)).thenReturn(List.of(override));
        when(matchPlayerOverrideRepository.findBySubPlayerId(45L)).thenReturn(Collections.emptyList());

        PlayerDeduplicationService.DeduplicationReport report = deduplicationService.deduplicateSingleEmail("aaron.byron@tracker.com", false);

        assertEquals(1, report.getSummary().get("matchPlayerOverridesRemoved"));
        verify(matchPlayerOverrideRepository).delete(override);
        verify(matchPlayerOverrideRepository, never()).save(override);
    }
}
