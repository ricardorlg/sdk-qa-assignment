package sdk.auth

import org.json.JSONException
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

enum class AuthError { InvalidCredentials, SessionExpired, NotAuthenticated, ServerError, NetworkError }

class AuthException(val error: AuthError) : Exception(error.name)

data class Session(val accessToken: String, val refreshToken: String, val expiresAtMillis: Long)

/** Persistence boundary: in-memory for unit/contract tests, platform storage (Keystore-backed) in the real SDK. */
interface SessionStore {
    fun load(): Session?
    fun save(session: Session?)
}

class InMemorySessionStore : SessionStore {
    @Volatile private var session: Session? = null
    override fun load() = session
    override fun save(session: Session?) { this.session = session }
}

/** Minimal reference implementation of the auth module under test (mirrors the Swift AuthClient). */
class AuthClient(
    private val baseUrl: String,
    private val store: SessionStore = InMemorySessionStore(),
    private val timeoutMs: Int = 10_000,
) {
    val isAuthenticated: Boolean get() = store.load() != null
    private val refreshLock = Any()

    fun signIn(username: String, password: String) =
        requestToken(mapOf("grant_type" to "password", "username" to username, "password" to password), AuthError.InvalidCredentials)

    fun getAccessToken(): String {
        val session = store.load() ?: throw AuthException(AuthError.NotAuthenticated)
        if (session.expiresAtMillis > System.currentTimeMillis()) return session.accessToken
        // Single-flight: concurrent callers must not reuse the same refresh token.
        synchronized(refreshLock) {
            val current = store.load() ?: throw AuthException(AuthError.NotAuthenticated)
            if (current.expiresAtMillis > System.currentTimeMillis()) return current.accessToken
            requestToken(mapOf("grant_type" to "refresh_token", "refresh_token" to current.refreshToken), AuthError.SessionExpired)
            return store.load()!!.accessToken
        }
    }

    fun logout() = store.save(null)

    private fun requestToken(params: Map<String, String>, onUnauthorized: AuthError) {
        val form = params.entries.joinToString("&") { "${enc(it.key)}=${enc(it.value)}" }
        val connection = URL("$baseUrl/oauth/token").openConnection() as HttpURLConnection
        try {
            connection.requestMethod = "POST"
            connection.connectTimeout = timeoutMs
            connection.readTimeout = timeoutMs
            connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/x-www-form-urlencoded")
            connection.outputStream.use { it.write(form.toByteArray()) }
            when (connection.responseCode) {
                200 -> {
                    val session = try {
                        val json = JSONObject(connection.inputStream.bufferedReader().readText())
                        Session(
                            json.getString("access_token"),
                            json.getString("refresh_token"),
                            System.currentTimeMillis() + (json.getDouble("expires_in") * 1000).toLong(),
                        )
                    } catch (e: JSONException) {
                        throw AuthException(AuthError.ServerError)
                    }
                    store.save(session)
                }
                400, 401 -> {
                    if (onUnauthorized == AuthError.SessionExpired) logout()
                    throw AuthException(onUnauthorized)
                }
                else -> throw AuthException(AuthError.ServerError)
            }
        } catch (e: IOException) {
            throw AuthException(AuthError.NetworkError)
        } finally {
            connection.disconnect()
        }
    }

    private fun enc(s: String) = URLEncoder.encode(s, "UTF-8")
}
