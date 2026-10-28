plugins {
    kotlin("jvm") version "2.2.20"
    id("org.jetbrains.kotlinx.binary-compatibility-validator") version "0.17.0"
}

repositories { mavenCentral() }

dependencies {
    testImplementation(platform("org.junit:junit-bom:5.11.3"))
    testImplementation("org.junit.jupiter:junit-jupiter")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
    implementation("org.json:json:20240303")
}

kotlin { jvmToolchain(21) }

tasks.test {
    useJUnitPlatform()
    environment("CONTRACT_DIR", file("../contracts").absolutePath)
    testLogging { events("passed", "failed"); showStandardStreams = true }
}
