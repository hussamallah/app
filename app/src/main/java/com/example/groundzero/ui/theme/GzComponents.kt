package com.example.groundzero.ui.theme

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

val GzCardShape = RoundedCornerShape(22.dp)
val GzCardShapeLarge = RoundedCornerShape(28.dp)

fun gzContentEnterTransition() = tween<Float>(durationMillis = 520, easing = FastOutSlowInEasing)
fun gzContentExitTransition() = tween<Float>(durationMillis = 380, easing = FastOutSlowInEasing)

@Composable
fun GzSystemLabel(
    text: String,
    modifier: Modifier = Modifier,
) {
    Text(
        text = text.uppercase(),
        style = MaterialTheme.typography.labelSmall,
        modifier = modifier,
    )
}

@Composable
fun GzGlowingCard(
    domainKey: String?,
    modifier: Modifier = Modifier,
    shape: RoundedCornerShape = GzCardShape,
    elevation: Dp = 10.dp,
    cardContent: @Composable ColumnScope.() -> Unit,
) {
    val accent = domainAccent(domainKey)
    val base = MaterialTheme.colorScheme.surface
    Surface(
        modifier = modifier
            .shadow(
                elevation = elevation,
                shape = shape,
                ambientColor = accent.copy(alpha = 0.22f),
                spotColor = accent.copy(alpha = 0.38f),
            ),
        shape = shape,
        color = base,
        border = BorderStroke(1.dp, accent.copy(alpha = 0.35f)),
        tonalElevation = 0.dp,
    ) {
        Column(
            Modifier.padding(horizontal = 18.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
            content = cardContent,
        )
    }
}

/** Fixed escape: high-contrast strip that stays readable over scrolling content (glass-lite: solid translucent). */
@Composable
fun GzGlassTopBar(
    title: String,
    onMenuClick: (() -> Unit)? = null,
    actions: (@Composable RowScope.() -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        color = MaterialTheme.colorScheme.surface.copy(alpha = 0.92f),
        tonalElevation = 3.dp,
        shadowElevation = 4.dp,
        shape = RoundedCornerShape(bottomStart = 20.dp, bottomEnd = 20.dp),
    ) {
        Column(
            Modifier
                .fillMaxWidth()
                .padding(start = 16.dp, end = 16.dp, top = 10.dp, bottom = if (actions != null) 8.dp else 10.dp),
        ) {
            Box(Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier.align(Alignment.Center),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    GzSystemLabel("GROUND ZERO OS")
                    Text(title, style = MaterialTheme.typography.titleSmall)
                }
                if (onMenuClick != null) {
                    TextButton(
                        onClick = onMenuClick,
                        modifier = Modifier
                            .align(Alignment.CenterEnd)
                            .height(48.dp),
                    ) {
                        GzSystemLabel("MENU")
                    }
                }
            } 
            if (actions != null) {
                Spacer(Modifier.height(6.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    content = actions,
                )
            }
        }
    }
}

/**
 * Hero AI entry point — gold pulsing glow, bold, full-width. The main event on the results screen.
 */
@Composable
fun GzAiHeroBanner(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val infiniteTransition = rememberInfiniteTransition(label = "ai_glow")
    val glowAlpha by infiniteTransition.animateFloat(
        initialValue = 0.45f,
        targetValue = 0.85f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1100, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "glow_alpha",
    )
    val elevationAnim by infiniteTransition.animateFloat(
        initialValue = 12f,
        targetValue = 28f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1100, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "elevation_anim",
    )

    Surface(
        onClick = onClick,
        modifier = modifier
            .fillMaxWidth()
            .shadow(
                elevation = elevationAnim.dp,
                shape = RoundedCornerShape(24.dp),
                ambientColor = GzGold.copy(alpha = glowAlpha * 0.6f),
                spotColor = GzGoldGlow.copy(alpha = glowAlpha),
            ),
        shape = RoundedCornerShape(24.dp),
        color = GzCanvas,
        border = BorderStroke(
            width = 2.dp,
            color = GzGold.copy(alpha = glowAlpha),
        ),
        tonalElevation = 0.dp,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 18.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Text(
                text = "✦  CHAT WITH THE CORE INTELLIGENCE AI  ✦",
                style = MaterialTheme.typography.titleLarge.copy(
                    fontWeight = FontWeight.Black,
                    letterSpacing = 2.sp,
                    color = GzGold,
                ),
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(2.dp))
            Text(
                text = "Your profile is loaded",
                style = MaterialTheme.typography.labelSmall.copy(
                    color = GzGold.copy(alpha = 0.65f),
                    letterSpacing = 1.sp,
                ),
                textAlign = TextAlign.Center,
            )
        }
    }
}

@Composable
fun GzPrimaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Button(
        onClick = onClick,
        modifier = modifier
            .fillMaxWidth()
            .height(48.dp),
        shape = RoundedCornerShape(16.dp),
        elevation = ButtonDefaults.buttonElevation(defaultElevation = 6.dp, pressedElevation = 2.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = MaterialTheme.colorScheme.primary,
            contentColor = MaterialTheme.colorScheme.onPrimary,
        ),
    ) {
        Text(text, style = MaterialTheme.typography.labelLarge.copy(fontFamily = FontFamily.SansSerif))
    }
}
