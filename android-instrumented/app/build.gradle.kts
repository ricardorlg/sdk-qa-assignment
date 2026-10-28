plugins {
    id("com.android.application")
}

android {
    namespace = "sdk.auth.host"
    compileSdk = 36

    defaultConfig {
        applicationId = "sdk.auth.host"
        minSdk = 26
        targetSdk = 36
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    // Core AuthClient is shared with the JVM contract project: one implementation, two test layers.
    sourceSets["main"].kotlin.directories.add("../../android/src/main/kotlin")
}

dependencies {
    implementation("androidx.test.espresso:espresso-idling-resource:3.6.1")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    androidTestImplementation("androidx.test:runner:1.6.2")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.6.1")
}
