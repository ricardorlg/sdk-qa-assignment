package sdk.auth.ui

import android.content.Context
import android.content.Intent
import androidx.test.core.app.ActivityScenario
import androidx.test.core.app.ApplicationProvider
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.IdlingRegistry
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.action.ViewActions.closeSoftKeyboard
import androidx.test.espresso.action.ViewActions.typeText
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.json.JSONArray
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import sdk.auth.AuthClient
import sdk.auth.host.R
import java.net.HttpURLConnection
import java.net.URL

/**
 * SDK-native tests on a real emulator: UI + lifecycle. Backend is the same fake server used by the contract tests
 * (10.0.2.2 = host machine from the emulator). Not E2E: only the SDK is exercised, no app business flows.
 */
@RunWith(AndroidJUnit4::class)
class AuthLifecycleTest {
    private val baseUrl = "http://10.0.2.2:8089"
    private val context: Context = ApplicationProvider.getApplicationContext()

    @Before
    fun setUp() {
        IdlingRegistry.getInstance().register(LoginActivity.idling)
        PrefsSessionStore(context).save(null)
    }

    @After
    fun tearDown() {
        IdlingRegistry.getInstance().unregister(LoginActivity.idling)
    }

    private fun script(vararg responses: Pair<Int, String>) {
        val body = JSONObject().put("responses", JSONArray().apply {
            responses.forEach { (status, json) -> put(JSONObject().put("status", status).put("body", JSONObject(json))) }
        }).toString()
        val c = URL("$baseUrl/__scenario").openConnection() as HttpURLConnection
        c.requestMethod = "POST"; c.doOutput = true
        c.outputStream.use { it.write(body.toByteArray()) }
        assertEquals(200, c.responseCode)
    }

    private fun launch() = ActivityScenario.launch<LoginActivity>(
        Intent(context, LoginActivity::class.java).putExtra(LoginActivity.EXTRA_BASE_URL, baseUrl)
    )

    private fun signInThroughUi(user: String, pass: String) {
        onView(withId(R.id.auth_username)).perform(typeText(user), closeSoftKeyboard())
        onView(withId(R.id.auth_password)).perform(typeText(pass), closeSoftKeyboard())
        onView(withId(R.id.auth_login_button)).perform(click())
    }

    private val goodToken = """{"access_token":"a1","refresh_token":"r1","expires_in":3600}"""

    @Test
    fun signIn_showsSignedIn() {
        script(200 to goodToken)
        launch()
        onView(withId(R.id.auth_status)).check(matches(withText("Signed out")))
        signInThroughUi("user", "secret")
        onView(withId(R.id.auth_status)).check(matches(withText("Signed in")))
    }

    @Test
    fun invalidCredentials_showsErrorAndStaysSignedOut() {
        script(401 to """{"error":"invalid_grant"}""")
        launch()
        signInThroughUi("user", "bad")
        onView(withId(R.id.auth_status)).check(matches(withText("Error: InvalidCredentials")))
    }

    @Test
    fun session_survivesActivityRecreation() {
        script(200 to goodToken)
        val scenario = launch()
        signInThroughUi("user", "secret")
        onView(withId(R.id.auth_status)).check(matches(withText("Signed in")))

        scenario.recreate() // rotation / config change / system-initiated recreation
        onView(withId(R.id.auth_status)).check(matches(withText("Signed in")))
    }

    @Test
    fun session_survivesColdStart() {
        script(200 to goodToken)
        launch().use { signInThroughUi("user", "secret") }

        // Fresh client + fresh store instance == new process reading persisted state.
        val restarted = AuthClient(baseUrl, PrefsSessionStore(context))
        assertTrue(restarted.isAuthenticated)
        assertEquals("a1", restarted.getAccessToken())
    }
}
