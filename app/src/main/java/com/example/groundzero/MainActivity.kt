package com.example.groundzero

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.systemBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.example.groundzero.ui.GroundZeroAssessmentScreen
import com.example.groundzero.ui.theme.GroundZeroTheme
import com.example.groundzero.ui.theme.GzCanvas

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            GroundZeroTheme {
                Surface(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(GzCanvas)
                        .windowInsetsPadding(WindowInsets.systemBars),
                    color = MaterialTheme.colorScheme.background,
                ) {
                    GroundZeroAssessmentScreen()
                }
            }
        }
    }
}
