// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "AuthSDK",
    platforms: [.macOS(.v12), .iOS(.v15)],
    products: [.library(name: "AuthSDK", targets: ["AuthSDK"])],
    targets: [
        .target(name: "AuthSDK"),
        .testTarget(name: "AuthContractTests", dependencies: ["AuthSDK"]),
    ]
)
