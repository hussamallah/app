package com.example.groundzero.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

/**
 * Single dark neo-terminal scheme (near-black canvas, elevated surfaces, domain-ready accents).
 * Defaults to dark regardless of system setting so the visual language stays consistent.
 *
 * **Accessibility note:** This app does not use a global viewport zoom-out (unlike some web `initialScale: 0.75`
 * results routes). Type and spacing stay at native scale for readability; use system font size if users need larger UI.
 */
private val GzDarkScheme = darkColorScheme(
    primary = DomainOpenness,
    onPrimary = Color(0xFF0F1115),
    primaryContainer = Color(0xFF2D2640),
    onPrimaryContainer = Color(0xFFE8E0FF),
    secondary = DomainConscientiousness,
    onSecondary = Color(0xFF0F1115),
    secondaryContainer = Color(0xFF163548),
    onSecondaryContainer = Color(0xFFC4E8FF),
    tertiary = DomainExtraversion,
    onTertiary = Color(0xFF0F1115),
    tertiaryContainer = Color(0xFF3D3518),
    onTertiaryContainer = Color(0xFFFFF3C4),
    background = GzCanvas,
    onBackground = GzTitle,
    surface = GzSurface,
    onSurface = GzTitle,
    surfaceVariant = GzSurfaceElevated,
    onSurfaceVariant = GzMuted,
    outline = GzOutline,
    outlineVariant = Color(0xFF232838),
    error = Color(0xFFFF6B6B),
    onError = Color(0xFF1A0505),
)

@Composable
fun GroundZeroTheme(
    @Suppress("UNUSED_PARAMETER") darkTheme: Boolean = true,
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = GzDarkScheme,
        typography = AppTypography,
        content = content,
    )
}
