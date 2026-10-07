plugins { id("com.android.application") }
android {
    namespace = "dev.polyreader.app"
    compileSdk = 34
    buildFeatures { buildConfig = true }
    defaultConfig {
        applicationId = "dev.polyreader.app"
        minSdk = 29
        targetSdk = 34
        versionCode = 12
        versionName = "0.4.7"
    }
    buildTypes { getByName("release") { isMinifyEnabled = false } }
    packaging { jniLibs { useLegacyPackaging = true } }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
