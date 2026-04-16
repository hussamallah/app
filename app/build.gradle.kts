import java.io.File
import java.nio.charset.StandardCharsets

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
}

android {
    namespace = "com.example.groundzero"
    compileSdk {
        version = release(36) {
            minorApiLevel = 1
        }
    }

    defaultConfig {
        applicationId = "com.example.groundzero"
        minSdk = 24
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        // Avoid java.util.Properties for these keys (CRLF / odd chars on Windows can drop values).
        val localPropsFile = File(rootProject.projectDir, "local.properties")
        val (geminiKey, geminiModel) = readGeminiFromLocalProperties(localPropsFile)
        if (geminiKey.isBlank()) {
            logger.warn(
                "Ground Zero: GEMINI_API_KEY is empty. Gradle reads local.properties from disk only — " +
                    "save the file in your editor, then Build → Rebuild Project.",
            )
        }
        val escapedKey = geminiKey.replace("\\", "\\\\").replace("\"", "\\\"")
        val escapedModel = geminiModel.replace("\\", "\\\\").replace("\"", "\\\"")
        buildConfigField("String", "GEMINI_API_KEY", "\"$escapedKey\"")
        buildConfigField("String", "GEMINI_MODEL", "\"$escapedModel\"")
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)
    implementation(libs.material)
    implementation(libs.okhttp)
    implementation(libs.kotlinx.coroutines.android)
    debugImplementation(libs.androidx.compose.ui.tooling)
    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
}

/** Line-based parse so CRLF / Windows editors do not leave GEMINI_API_KEY empty in BuildConfig. */
fun readGeminiFromLocalProperties(file: File): Pair<String, String> {
    if (!file.exists()) return "" to "gemini-3.1-flash-lite-preview"
    var apiKey = ""
    var model = ""
    file.bufferedReader(StandardCharsets.UTF_8).useLines { lines ->
        for (raw in lines) {
            val line = raw.trim().trimEnd('\r')
            if (line.isEmpty() || line.startsWith("#") || line.startsWith("!")) continue
            val eq = line.indexOf('=')
            if (eq <= 0) continue
            val propKey = line.substring(0, eq).trim().trimEnd('\r')
            val value = line.substring(eq + 1).trim()
                .trimEnd('\r')
                .removeSurrounding("\"")
            when (propKey) {
                "GEMINI_API_KEY" -> apiKey = value
                "GEMINI_MODEL" -> model = value
            }
        }
    }
    val resolvedModel = if (model.isNotBlank()) model else "gemini-3.1-flash-lite-preview"
    return apiKey to resolvedModel
}