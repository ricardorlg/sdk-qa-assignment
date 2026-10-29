package sdk.auth

import org.json.JSONArray
import org.json.JSONObject
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.DynamicTest
import org.junit.jupiter.api.TestFactory
import java.io.File
import java.util.concurrent.Executors
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse

/** Runs the shared contract scenarios (contracts/auth/scenarios.json) against the Kotlin AuthClient. */
class AuthContractTest {
    private val serverUrl = System.getenv("CONTRACT_SERVER_URL") ?: "http://127.0.0.1:8089"
    private val http = HttpClient.newHttpClient()

    private fun send(request: HttpRequest) = http.send(request, HttpResponse.BodyHandlers.ofString()).body()

    private fun recordedRequests(): JSONArray =
        JSONArray(send(HttpRequest.newBuilder(URI("$serverUrl/__requests")).GET().build()))

    @TestFactory
    fun contractScenarios(): List<DynamicTest> {
        val scenarios = File(System.getenv("CONTRACT_DIR")).walkTopDown()
            .filter { it.isFile && it.extension == "json" }.sortedBy { it.path }
            .flatMap { f -> JSONObject(f.readText()).getJSONArray("scenarios").let { a -> (0 until a.length()).map { a.getJSONObject(it) } } }
            .toList()
        check(scenarios.isNotEmpty()) { "no scenarios found in CONTRACT_DIR" }
        return scenarios.map { s -> DynamicTest.dynamicTest(s.getString("id")) { run(s) } }
    }

    /** Returns (token, errorName) for one step. */
    private fun perform(id: String, client: AuthClient, step: JSONObject): Pair<String?, String?> {
        try {
            when (val action = step.getString("action")) {
                "login" -> client.login(step.getString("username"), step.getString("password"))
                "getAccessToken" -> return client.getAccessToken() to null
                "logout" -> client.logout()
                else -> error("[$id] unknown action $action")
            }
        } catch (e: AuthException) {
            return null to e.error.name.replaceFirstChar { it.lowercase() }
        }
        return null to null
    }

    private fun check(id: String, step: JSONObject, result: Pair<String?, String?>) {
        val expect = step.getJSONObject("expect")
        assertEquals(expect.optString("error", null), result.second, "[$id] step ${step.getString("action")} error")
        if (expect.has("token")) assertEquals(expect.getString("token"), result.first, "[$id] token")
    }

    private fun run(s: JSONObject) {
        val id = s.getString("id")
        val body = JSONObject().put("responses", s.getJSONArray("tokenEndpointResponses")).toString()
        send(HttpRequest.newBuilder(URI("$serverUrl/__scenario")).POST(HttpRequest.BodyPublishers.ofString(body)).build())
        val timeoutMs = s.optJSONObject("clientConfig")?.optInt("timeoutMs", 10_000) ?: 10_000
        val client = AuthClient(serverUrl, timeoutMs = timeoutMs)

        val steps = s.getJSONArray("steps")
        for (i in 0 until steps.length()) {
            val step = steps.getJSONObject(i)
            if (step.getString("action") == "parallel") {
                val calls = step.getJSONArray("calls")
                val pool = Executors.newFixedThreadPool(calls.length())
                try {
                    val futures = (0 until calls.length()).map { n -> pool.submit<Pair<String?, String?>> { perform(id, client, calls.getJSONObject(n)) } }
                    futures.forEachIndexed { n, f -> check(id, calls.getJSONObject(n), f.get()) }
                } finally { pool.shutdown() }
            } else {
                check(id, step, perform(id, client, step))
            }
        }

        val final = s.getJSONObject("final")
        val requests = recordedRequests()
        assertEquals(final.getBoolean("authenticated"), client.isAuthenticated, "[$id] authenticated")
        assertEquals(final.getInt("tokenRequests"), requests.length(), "[$id] token requests")
        val last = requests.optJSONObject(requests.length() - 1)
        if (final.has("lastRequestGrantType")) assertEquals(final.getString("lastRequestGrantType"), last?.getString("grant_type"), "[$id] grant_type")
        if (final.has("lastRequestRefreshToken")) assertEquals(final.getString("lastRequestRefreshToken"), last?.getString("refresh_token"), "[$id] refresh_token")
    }
}
