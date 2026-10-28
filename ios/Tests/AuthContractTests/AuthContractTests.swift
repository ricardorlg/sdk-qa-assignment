import Foundation
import Testing
@testable import AuthSDK

/// Runs the shared contract scenarios (contracts/**/*.json) against the Swift AuthClient, one test per scenario.
struct Scenario: Sendable, CustomTestStringConvertible {
    let id: String
    let json: Data
    var testDescription: String { id }
    var object: [String: Any] { try! JSONSerialization.jsonObject(with: json) as! [String: Any] }

    static func loadAll() -> [Scenario] {
        let dir = ProcessInfo.processInfo.environment["CONTRACT_DIR"] ?? "../contracts"
        let files = (FileManager.default.enumerator(atPath: dir)?.allObjects as? [String] ?? [])
            .filter { $0.hasSuffix(".json") }.sorted()
        return files.flatMap { file -> [Scenario] in
            let data = try! Data(contentsOf: URL(fileURLWithPath: dir).appendingPathComponent(file))
            let root = try! JSONSerialization.jsonObject(with: data) as! [String: Any]
            return (root["scenarios"] as! [[String: Any]]).map {
                Scenario(id: $0["id"] as! String, json: try! JSONSerialization.data(withJSONObject: $0))
            }
        }
    }
}

private let serverURL = URL(string: ProcessInfo.processInfo.environment["CONTRACT_SERVER_URL"] ?? "http://127.0.0.1:8089")!

private func post(_ path: String, _ body: [String: Any]) async throws {
    var req = URLRequest(url: serverURL.appendingPathComponent(path))
    req.httpMethod = "POST"
    req.httpBody = try JSONSerialization.data(withJSONObject: body)
    _ = try await URLSession.shared.data(for: req)
}

private func recordedRequests() async throws -> [[String: String]] {
    let (data, _) = try await URLSession.shared.data(from: serverURL.appendingPathComponent("__requests"))
    return try JSONSerialization.jsonObject(with: data) as! [[String: String]]
}

private func errorName(_ error: Error) -> String {
    switch error as? AuthError {
    case .invalidCredentials: return "invalidCredentials"
    case .sessionExpired: return "sessionExpired"
    case .notAuthenticated: return "notAuthenticated"
    case .serverError: return "serverError"
    case .networkError: return "networkError"
    case nil: return "unknown(\(error))"
    }
}

private func perform(_ id: String, _ client: AuthClient, _ step: [String: Any]) async -> (token: String?, failure: String?) {
    let action = step["action"] as! String
    do {
        switch action {
        case "login": try await client.login(username: step["username"] as! String, password: step["password"] as! String)
        case "getAccessToken": return (try await client.getAccessToken(), nil)
        case "logout": await client.logout()
        default: Issue.record("[\(id)] unknown action \(action)")
        }
    } catch { return (nil, errorName(error)) }
    return (nil, nil)
}

private func check(_ id: String, _ step: [String: Any], _ result: (token: String?, failure: String?)) {
    let expect = step["expect"] as! [String: Any]
    let action = step["action"] as! String
    #expect(result.failure == expect["error"] as? String, "[\(id)] step \(action): error")
    if let expected = expect["token"] as? String { #expect(result.token == expected, "[\(id)] step \(action): token") }
}

// Scenarios share one fake server, so they must not run in parallel.
@Suite(.serialized)
struct AuthContractTests {
    @Test(arguments: Scenario.loadAll())
    func contract(_ scenario: Scenario) async throws {
        let s = scenario.object
        let id = scenario.id
        try await post("__scenario", ["responses": s["tokenEndpointResponses"]!])
        let timeoutMs = (s["clientConfig"] as? [String: Any])?["timeoutMs"] as? Double ?? 10_000
        let client = AuthClient(baseURL: serverURL, timeout: timeoutMs / 1000)

        for step in s["steps"] as! [[String: Any]] {
            if step["action"] as? String == "parallel" {
                let calls = step["calls"] as! [[String: Any]]
                let results = await withTaskGroup(of: (Int, (token: String?, failure: String?)).self) { group in
                    for (i, call) in calls.enumerated() { group.addTask { (i, await perform(id, client, call)) } }
                    var out = [(token: String?, failure: String?)](repeating: (nil, nil), count: calls.count)
                    for await (i, r) in group { out[i] = r }
                    return out
                }
                for (i, call) in calls.enumerated() { check(id, call, results[i]) }
            } else {
                check(id, step, await perform(id, client, step))
            }
        }

        let final = s["final"] as! [String: Any]
        #expect(await client.isAuthenticated == final["authenticated"] as? Bool, "[\(id)] authenticated")
        let requests = try await recordedRequests()
        #expect(requests.count == final["tokenRequests"] as? Int, "[\(id)] token requests")
        if let grant = final["lastRequestGrantType"] as? String { #expect(requests.last?["grant_type"] == grant, "[\(id)] grant_type") }
        if let rt = final["lastRequestRefreshToken"] as? String { #expect(requests.last?["refresh_token"] == rt, "[\(id)] refresh_token") }
    }
}
