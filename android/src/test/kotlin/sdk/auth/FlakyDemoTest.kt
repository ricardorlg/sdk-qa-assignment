package sdk.auth

import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.io.File

/**
 * DEMO ONLY: simulates a timing-dependent test. It fails on the first run in a fresh
 * workspace and passes on the next, like a race that loses once in a while.
 * Expected CI result: job green, but flagged FLAKY (summary + PR comment).
 */
class FlakyDemoTest {
    @Test
    fun tokenIsReadyWhenRequested_racesWithRefresh() {
        val marker = File(System.getProperty("java.io.tmpdir"), "sdk-flaky-demo.marker")
        val firstRun = !marker.exists()
        if (firstRun) marker.createNewFile() else marker.delete()
        assertTrue(!firstRun, "token was not ready yet (simulated race; passes when retried)")
    }
}
