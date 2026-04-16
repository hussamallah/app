package com.example.groundzero.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.TextMeasurer
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.groundzero.ui.theme.DomainAgreeableness
import com.example.groundzero.ui.theme.DomainConscientiousness
import com.example.groundzero.ui.theme.DomainExtraversion
import com.example.groundzero.ui.theme.DomainNeuroticism
import com.example.groundzero.ui.theme.DomainOpenness
import com.example.groundzero.ui.theme.GzOutline
import com.example.groundzero.ui.theme.GzSurface
import kotlin.math.cos
import kotlin.math.sin

private val OCEAN_KEYS = listOf("O", "C", "E", "A", "N")
private val OCEAN_LABELS = listOf("O", "C", "E", "A", "N")
private val OCEAN_COLORS = listOf(
    DomainOpenness,
    DomainConscientiousness,
    DomainExtraversion,
    DomainAgreeableness,
    DomainNeuroticism,
)

/**
 * Pentagon radar chart for the 5 OCEAN domains.
 * [domainMeans] is a map of domain key → mean score on the 1–5 scale.
 * The chart normalises them to 0–1 for drawing (1 = score 5, 0 = score 1).
 */
@Composable
fun OceanRadarChart(
    domainMeans: Map<String, Double>,
    modifier: Modifier = Modifier,
    size: Dp = 200.dp,
) {
    val textMeasurer = rememberTextMeasurer()
    Canvas(modifier = modifier.size(size)) {
        val cx = this.size.width / 2f
        val cy = this.size.height / 2f
        val maxRadius = (minOf(this.size.width, this.size.height) / 2f) * 0.68f
        val labelRadius = maxRadius + 22f

        // ── Grid rings (3 rings at 33 %, 66 %, 100 %) ──────────────────────
        for (ring in 1..3) {
            val r = maxRadius * ring / 3f
            val ringPath = Path()
            for (i in OCEAN_KEYS.indices) {
                val angle = vertexAngle(i, OCEAN_KEYS.size)
                val pt = polarOffset(cx, cy, r, angle)
                if (i == 0) ringPath.moveTo(pt.x, pt.y) else ringPath.lineTo(pt.x, pt.y)
            }
            ringPath.close()
            drawPath(ringPath, color = GzOutline.copy(alpha = if (ring == 3) 0.45f else 0.22f), style = Stroke(width = if (ring == 3) 1.2f else 0.7f))
        }

        // ── Spoke lines ──────────────────────────────────────────────────────
        for (i in OCEAN_KEYS.indices) {
            val angle = vertexAngle(i, OCEAN_KEYS.size)
            val end = polarOffset(cx, cy, maxRadius, angle)
            drawLine(color = GzOutline.copy(alpha = 0.30f), start = Offset(cx, cy), end = end, strokeWidth = 0.8f)
        }

        // ── Filled polygon (user scores) ─────────────────────────────────────
        val filledPath = Path()
        val strokePath = Path()
        OCEAN_KEYS.forEachIndexed { i, key ->
            val raw = domainMeans[key] ?: 3.0
            val norm = ((raw - 1.0) / 4.0).coerceIn(0.0, 1.0).toFloat()
            val angle = vertexAngle(i, OCEAN_KEYS.size)
            val pt = polarOffset(cx, cy, maxRadius * norm, angle)
            if (i == 0) { filledPath.moveTo(pt.x, pt.y); strokePath.moveTo(pt.x, pt.y) }
            else { filledPath.lineTo(pt.x, pt.y); strokePath.lineTo(pt.x, pt.y) }
        }
        filledPath.close()
        strokePath.close()
        drawPath(filledPath, color = Color(0xFF8B7CF6).copy(alpha = 0.22f))
        drawPath(strokePath, color = Color(0xFF8B7CF6).copy(alpha = 0.80f), style = Stroke(width = 2.2f))

        // ── Vertex dots (colored per domain) ────────────────────────────────
        OCEAN_KEYS.forEachIndexed { i, key ->
            val raw = domainMeans[key] ?: 3.0
            val norm = ((raw - 1.0) / 4.0).coerceIn(0.0, 1.0).toFloat()
            val angle = vertexAngle(i, OCEAN_KEYS.size)
            val pt = polarOffset(cx, cy, maxRadius * norm, angle)
            drawCircle(color = OCEAN_COLORS[i], radius = 5f, center = pt)
            drawCircle(color = GzSurface, radius = 2.5f, center = pt)
        }

        // ── Labels ───────────────────────────────────────────────────────────
        OCEAN_LABELS.forEachIndexed { i, label ->
            val angle = vertexAngle(i, OCEAN_KEYS.size)
            val pt = polarOffset(cx, cy, labelRadius, angle)
            drawDomainLabel(textMeasurer, label, pt, OCEAN_COLORS[i])
        }
    }
}

private fun vertexAngle(index: Int, total: Int): Float {
    // Start at top (-π/2) and go clockwise
    return ((-Math.PI / 2) + (2 * Math.PI * index / total)).toFloat()
}

private fun polarOffset(cx: Float, cy: Float, r: Float, angle: Float): Offset =
    Offset(cx + r * cos(angle), cy + r * sin(angle))

private fun DrawScope.drawDomainLabel(
    measurer: TextMeasurer,
    label: String,
    center: Offset,
    color: Color,
) {
    val style = TextStyle(
        fontSize = 11.sp,
        fontWeight = FontWeight.Bold,
        fontFamily = FontFamily.Monospace,
        color = color,
    )
    val result = measurer.measure(label, style)
    drawText(
        textLayoutResult = result,
        topLeft = Offset(center.x - result.size.width / 2f, center.y - result.size.height / 2f),
    )
}
