package com.example.groundzero.ui.theme

import androidx.compose.ui.graphics.Color

/** Near-black canvas (#0f1115 family) — not pure black. */
val GzCanvas = Color(0xFF0F1115)
val GzSurface = Color(0xFF161922)
val GzSurfaceElevated = Color(0xFF1C2130)
val GzOutline = Color(0xFF2A3142)
val GzMuted = Color(0xFF8B95A8)
val GzTitle = Color(0xFFF4F6FA)

/** Domain accents (border / glow / chips). */
val DomainOpenness = Color(0xFF8B7CF6)
val DomainConscientiousness = Color(0xFF38BDF8)
val DomainExtraversion = Color(0xFFFBBF24)
val DomainAgreeableness = Color(0xFF4ADE80)
val DomainNeuroticism = Color(0xFFF472B6)

fun domainAccent(domainKey: String?): Color = when (domainKey) {
    "O" -> DomainOpenness
    "C" -> DomainConscientiousness
    "E" -> DomainExtraversion
    "A" -> DomainAgreeableness
    "N" -> DomainNeuroticism
    else -> Color(0xFF94A3B8)
}

/** AI Coach accent — gold spectrum. */
val GzGold = Color(0xFFFFBB00)
val GzGoldDeep = Color(0xFFB8860B)
val GzGoldGlow = Color(0xFFFFD700)

val Ink = Color(0xFF0F172A)
val Mist = Color(0xFFF1F5F9)
val AccentViolet = Color(0xFF6366F1)
val AccentTeal = Color(0xFF14B8A6)
val AccentAmber = Color(0xFFF59E0B)
val SurfaceCard = Color(0xFFFFFFFF)
val OutlineSoft = Color(0xFFE2E8F0)
