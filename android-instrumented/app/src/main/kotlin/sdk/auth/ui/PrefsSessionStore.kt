package sdk.auth.ui

import android.content.Context
import sdk.auth.Session
import sdk.auth.SessionStore

/**
 * Demo store backed by SharedPreferences. A production SDK would encrypt with Android Keystore;
 * lifecycle behaviour (survives recreation / cold start) is what the instrumented tests verify.
 */
class PrefsSessionStore(context: Context) : SessionStore {
    private val prefs = context.applicationContext.getSharedPreferences("auth_session", Context.MODE_PRIVATE)

    override fun load(): Session? {
        val access = prefs.getString("access", null) ?: return null
        val refresh = prefs.getString("refresh", null) ?: return null
        return Session(access, refresh, prefs.getLong("expires", 0))
    }

    override fun save(session: Session?) {
        prefs.edit().apply {
            if (session == null) clear() else {
                putString("access", session.accessToken)
                putString("refresh", session.refreshToken)
                putLong("expires", session.expiresAtMillis)
            }
        }.commit()
    }
}
