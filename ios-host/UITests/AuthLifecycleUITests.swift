import XCTest

/// SDK-native tests on a real simulator: UI + lifecycle. Backend is the same fake server used by the contract tests.
/// Not E2E: only the SDK's own screen is exercised, no app business flows.
final class AuthLifecycleUITests: XCTestCase {
    private let serverURL = URL(string: "http://127.0.0.1:8089")!
    private let goodToken: [String: Any] = ["access_token": "a1", "refresh_token": "r1", "expires_in": 3600]

    override func setUp() {
        continueAfterFailure = false
    }

    private func script(_ responses: [(Int, [String: Any])]) throws {
        var req = URLRequest(url: serverURL.appendingPathComponent("__scenario"))
        req.httpMethod = "POST"
        req.httpBody = try JSONSerialization.data(withJSONObject: ["responses": responses.map { ["status": $0.0, "body": $0.1] }])
        let done = expectation(description: "scenario scripted")
        URLSession.shared.dataTask(with: req) { _, _, _ in done.fulfill() }.resume()
        wait(for: [done], timeout: 5)
    }

    private func launchFreshApp() -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["-reset-session"]
        app.launch()
        return app
    }

    private func signIn(_ app: XCUIApplication, user: String, password: String) {
        let userField = app.textFields["auth_username"]
        XCTAssertTrue(userField.waitForExistence(timeout: 5))
        userField.tap(); userField.typeText(user)
        let passField = app.secureTextFields["auth_password"]
        passField.tap(); passField.typeText(password)
        app.buttons["auth_login_button"].tap()
    }

    private func assertStatus(_ app: XCUIApplication, _ text: String, file: StaticString = #filePath, line: UInt = #line) {
        let status = app.staticTexts["auth_status"]
        let matches = NSPredicate(format: "label == %@", text)
        let result = XCTWaiter.wait(for: [expectation(for: matches, evaluatedWith: status)], timeout: 5)
        XCTAssertEqual(result, .completed, "expected status '\(text)', got '\(status.label)'", file: file, line: line)
    }

    func testSignIn_showsSignedIn() throws {
        try script([(200, goodToken)])
        let app = launchFreshApp()
        assertStatus(app, "Signed out")
        signIn(app, user: "user", password: "secret")
        assertStatus(app, "Signed in")
    }

    func testInvalidCredentials_showsErrorAndStaysSignedOut() throws {
        try script([(401, ["error": "invalid_grant"])])
        let app = launchFreshApp()
        signIn(app, user: "user", password: "bad")
        assertStatus(app, "Error: invalidCredentials")
    }

    func testSession_survivesBackgroundAndForeground() throws {
        try script([(200, goodToken)])
        let app = launchFreshApp()
        signIn(app, user: "user", password: "secret")
        assertStatus(app, "Signed in")

        XCUIDevice.shared.press(.home)
        app.activate()
        assertStatus(app, "Signed in")
    }

    func testSession_survivesAppTerminationAndRelaunch() throws {
        try script([(200, goodToken)])
        let app = launchFreshApp()
        signIn(app, user: "user", password: "secret")
        assertStatus(app, "Signed in")

        app.terminate()
        app.launchArguments = [] // relaunch WITHOUT resetting the Keychain
        app.launch()
        assertStatus(app, "Signed in")
    }
}
