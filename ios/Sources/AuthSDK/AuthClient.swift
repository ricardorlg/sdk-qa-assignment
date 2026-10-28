import Foundation

public enum AuthError: Error, Equatable {
    case invalidCredentials, sessionExpired, notAuthenticated, serverError, networkError
}

public struct Session: Codable, Equatable, Sendable {
    public let accessToken: String
    public let refreshToken: String
    public let expiresAt: Date
}

/// Persistence boundary: in-memory for unit/contract tests, Keychain in the real SDK.
public protocol SessionStore: Sendable {
    func load() -> Session?
    func save(_ session: Session?)
}

public final class InMemorySessionStore: SessionStore, @unchecked Sendable {
    private let lock = NSLock()
    private var session: Session?
    public init() {}
    public func load() -> Session? { lock.withLock { session } }
    public func save(_ session: Session?) { lock.withLock { self.session = session } }
}

/// Minimal reference implementation of the auth module under test.
public actor AuthClient {
    private let baseURL: URL
    private let session: URLSession
    private let store: SessionStore
    private let timeout: TimeInterval
    private var refreshTask: Task<Void, Error>?

    public init(baseURL: URL, store: SessionStore = InMemorySessionStore(), session: URLSession = .shared, timeout: TimeInterval = 10) {
        self.baseURL = baseURL
        self.store = store
        self.session = session
        self.timeout = timeout
    }

    public var isAuthenticated: Bool { store.load() != nil }

    public var hasSession: Bool { store.load() != nil }

    public func login(username: String, password: String) async throws {
        try await requestToken(["grant_type": "password", "username": username, "password": password], onUnauthorized: .invalidCredentials)
    }

    public func getAccessToken() async throws -> String {
        guard let current = store.load() else { throw AuthError.notAuthenticated }
        if current.expiresAt > Date() { return current.accessToken }
        // Single-flight: actors are re-entrant at `await`, so concurrent callers must share one refresh.
        let task = refreshTask ?? Task {
            try await self.requestToken(["grant_type": "refresh_token", "refresh_token": current.refreshToken], onUnauthorized: .sessionExpired)
        }
        refreshTask = task
        defer { if refreshTask == task { refreshTask = nil } }
        try await task.value
        guard let refreshed = store.load() else { throw AuthError.notAuthenticated }
        return refreshed.accessToken
    }

    public func logout() {
        store.save(nil)
    }

    private func requestToken(_ params: [String: String], onUnauthorized: AuthError) async throws {
        var request = URLRequest(url: baseURL.appendingPathComponent("oauth/token"))
        request.httpMethod = "POST"
        request.timeoutInterval = timeout
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        var components = URLComponents()
        components.queryItems = params.map { URLQueryItem(name: $0.key, value: $0.value) }
        request.httpBody = components.percentEncodedQuery?.data(using: .utf8)

        let data: Data
        let response: URLResponse
        do { (data, response) = try await session.data(for: request) } catch { throw AuthError.networkError }
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        switch status {
        case 200:
            guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let access = json["access_token"] as? String,
                  let refresh = json["refresh_token"] as? String,
                  let ttl = json["expires_in"] as? Double else { throw AuthError.serverError }
            store.save(Session(accessToken: access, refreshToken: refresh, expiresAt: Date().addingTimeInterval(ttl)))
        case 400, 401:
            if onUnauthorized == .sessionExpired { logout() }
            throw onUnauthorized
        default:
            throw AuthError.serverError
        }
    }
}
