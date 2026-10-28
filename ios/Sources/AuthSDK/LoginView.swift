import SwiftUI

/// Minimal SDK-provided login screen. Renders from the persisted session, so it survives relaunch.
@MainActor
public final class LoginViewModel: ObservableObject {
    @Published public var username = ""
    @Published public var password = ""
    @Published public private(set) var status: String

    private let client: AuthClient

    public init(client: AuthClient) {
        self.client = client
        self.status = "Signed out"
        Task { await refreshStatus() }
    }

    func refreshStatus() async {
        status = await client.isAuthenticated ? "Signed in" : "Signed out"
    }

    public func signIn() async {
        do {
            try await client.login(username: username, password: password)
            status = "Signed in"
        } catch let error as AuthError {
            status = "Error: \(error)"
        } catch {
            status = "Error: network"
        }
    }
}

public struct LoginView: View {
    @StateObject private var model: LoginViewModel

    public init(client: AuthClient) {
        _model = StateObject(wrappedValue: LoginViewModel(client: client))
    }

    public var body: some View {
        VStack(spacing: 12) {
            TextField("Username", text: $model.username)
                #if os(iOS)
                .textInputAutocapitalization(.never)
                #endif
                .accessibilityIdentifier("auth_username")
            SecureField("Password", text: $model.password)
                .accessibilityIdentifier("auth_password")
            Button("Sign in") { Task { await model.signIn() } }
                .accessibilityIdentifier("auth_login_button")
            Text(model.status).accessibilityIdentifier("auth_status")
        }
        .padding()
        .textFieldStyle(.roundedBorder)
    }
}
