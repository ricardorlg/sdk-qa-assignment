import SwiftUI
import AuthSDK

@main
struct AuthHostApp: App {
    private let client: AuthClient

    init() {
        let store = KeychainSessionStore()
        // Test hook: start each UI test from a clean Keychain, but not on a relaunch within a test.
        if CommandLine.arguments.contains("-reset-session") { store.save(nil) }
        client = AuthClient(
            baseURL: URL(string: ProcessInfo.processInfo.environment["AUTH_BASE_URL"] ?? "http://127.0.0.1:8089")!,
            store: store
        )
    }

    var body: some Scene {
        WindowGroup { LoginView(client: client) }
    }
}
