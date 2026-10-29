package sdk.auth.ui

import android.app.Activity
import android.os.Bundle
import android.text.InputType
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import androidx.test.espresso.idling.CountingIdlingResource
import sdk.auth.AuthClient
import sdk.auth.AuthException
import sdk.auth.host.R
import java.util.concurrent.Executors

/** Minimal SDK-provided login screen. Host apps launch it; it renders state from the persisted session. */
class LoginActivity : Activity() {
    private lateinit var client: AuthClient
    private lateinit var status: TextView
    private val background = Executors.newSingleThreadExecutor()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val baseUrl = intent.getStringExtra(EXTRA_BASE_URL) ?: "http://10.0.2.2:8089"
        client = AuthClient(baseUrl, PrefsSessionStore(this))

        val username = EditText(this).apply { id = R.id.auth_username; hint = "Username" }
        val password = EditText(this).apply {
            id = R.id.auth_password; hint = "Password"
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
        }
        status = TextView(this).apply { id = R.id.auth_status }
        val login = Button(this).apply {
            id = R.id.auth_login_button; text = "Sign in"
            setOnClickListener { signIn(username.text.toString(), password.text.toString()) }
        }
        setContentView(LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
            addView(username); addView(password); addView(login); addView(status)
        })
        render()
    }

    private fun signIn(user: String, pass: String) {
        idling.increment()
        background.execute {
            val message = try {
                client.login(user, pass); "Signed in"
            } catch (e: AuthException) {
                "Error: ${e.error.name.replaceFirstChar { it.lowercase() }}"
            } catch (e: Exception) {
                "Error: ${e.javaClass.simpleName}"
            }
            runOnUiThread { status.text = message; idling.decrement() }
        }
    }

    private fun render() {
        status.text = if (client.isAuthenticated) "Signed in" else "Signed out"
    }

    companion object {
        const val EXTRA_BASE_URL = "baseUrl"
        // Lets Espresso wait for the background network call instead of sleeping.
        val idling = CountingIdlingResource("auth-login")
    }
}
