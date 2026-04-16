package com.example.groundzero.results

import android.content.Intent
import android.print.PrintAttributes
import android.print.PrintManager
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.groundzero.assessment.ArchetypeCatalog
import com.example.groundzero.assessment.ArchetypeImage
import com.example.groundzero.assessment.BigFiveConstants
import com.example.groundzero.assessment.buildGzFullResultsJson
import com.example.groundzero.assessment.circuitForDomain
import com.example.groundzero.assessment.domainMeanFromScores
import com.example.groundzero.ui.OceanRadarChart
import com.example.groundzero.ui.theme.DomainAgreeableness
import com.example.groundzero.ui.theme.DomainConscientiousness
import com.example.groundzero.ui.theme.DomainExtraversion
import com.example.groundzero.ui.theme.DomainNeuroticism
import com.example.groundzero.ui.theme.DomainOpenness
import com.example.groundzero.ui.theme.GzCanvas
import com.example.groundzero.ui.theme.GzGlowingCard
import com.example.groundzero.ui.theme.GzGold
import com.example.groundzero.ui.theme.GzGoldGlow
import com.example.groundzero.ui.theme.GzMuted
import com.example.groundzero.ui.theme.GzOutline
import com.example.groundzero.ui.theme.GzSurface
import com.example.groundzero.ui.theme.GzSurfaceElevated
import com.example.groundzero.ui.theme.GzSystemLabel
import com.example.groundzero.ui.theme.GzTitle
import com.example.groundzero.ui.theme.domainAccent
import org.json.JSONArray
import org.json.JSONObject

private fun payloadsByDomain(resultsJson: String): Map<String, JSONObject> {
    if (resultsJson.isBlank()) return emptyMap()
    val arr = JSONArray(resultsJson)
    val out = linkedMapOf<String, JSONObject>()
    for (i in 0 until arr.length()) {
        val o = arr.getJSONObject(i)
        val d = o.optString("domain", "")
        if (d.isNotBlank() && d != "ARCH") out[d] = o.getJSONObject("payload")
    }
    return out
}

/** Build a short AI teaser from the top two extreme domains. */
private fun buildAiTeaser(domainOrder: List<String>, scores: Map<String, Map<String, Double>>): String {
    val means = domainOrder.map { it to domainMeanFromScores(scores, it) }
    val highest = means.maxByOrNull { it.second }
    val lowest = means.minByOrNull { it.second }
    val hLabel = BigFiveConstants.DOMAIN_LABELS[highest?.first] ?: highest?.first ?: "Openness"
    val lLabel = BigFiveConstants.DOMAIN_LABELS[lowest?.first] ?: lowest?.first ?: "Neuroticism"
    return "\"Your high $hLabel combined with lower $lLabel suggests a distinctive pattern — let's unpack what that means for how you operate.\""
}

private val SECTION_GRID = listOf(
    Triple("Circuits", "Cognitive patterns &\nfeedback loops", 1),
    Triple("Domains", "Life area breakdowns", 2),
    Triple("Facets", "30 trait sub-scores", 3),
    Triple("Tensions", "Conflicting trait pairs", 4),
)

/**
 * Redesigned results hub: archetype hero, radar + OCEAN bars, AI card, 2×2 grid, bottom action strip.
 */
@Composable
fun FullResultsHub(
    bankVersion: String,
    domainOrder: List<String>,
    scores: Map<String, Map<String, Double>>,
    archetypeId: String?,
    onRestart: () -> Unit,
    onAiChat: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val clipboard = LocalClipboardManager.current
    val scoresSnap = remember(scores, archetypeId) { scores.mapValues { it.value.toMap() } }
    val resultsJson = remember(bankVersion, domainOrder, scoresSnap, archetypeId) {
        runCatching { buildGzFullResultsJson(bankVersion, domainOrder, scoresSnap, archetypeId) }
            .getOrElse { "[]" }
    }
    val runReceipt = remember(resultsJson) { sha256HexPrefix24(resultsJson) }
    val payloads = remember(resultsJson) {
        runCatching { payloadsByDomain(resultsJson) }.getOrElse { emptyMap() }
    }
    val tensionCards = remember(scoresSnap, domainOrder, context) {
        buildTensionCards(context.assets, domainOrder, scoresSnap)
    }
    val arch = archetypeId?.let { ArchetypeCatalog.get(it) }
    val tagline = archetypeId?.lowercase()?.let { ARCHETYPE_TAGLINES[it] } ?: arch?.hint.orEmpty()
    val domainMeans = remember(domainOrder, scoresSnap) {
        domainOrder.associateWith { domainMeanFromScores(scoresSnap, it) }
    }
    val aiTeaser = remember(domainOrder, scoresSnap) { buildAiTeaser(domainOrder, scoresSnap) }

    // which detail section is open (null = all closed)
    var openSection by remember { mutableStateOf<Int?>(null) }
    val hubScroll = rememberScrollState()

    Column(
        modifier
            .fillMaxWidth()
            .verticalScroll(hubScroll),
        verticalArrangement = Arrangement.spacedBy(0.dp),
    ) {

        // ─────────────────────────────────────────────────────────────────
        // 1. ARCHETYPE HERO — bird image left, name + tagline right
        // ─────────────────────────────────────────────────────────────────
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = GzSurface,
            shape = RoundedCornerShape(bottomStart = 28.dp, bottomEnd = 28.dp),
        ) {
            Column(Modifier.padding(horizontal = 20.dp, vertical = 20.dp)) {
                GzSystemLabel("// PERSONALITY TYPE")
                Spacer(Modifier.height(12.dp))
                Row(
                    Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    if (archetypeId != null) {
                        ArchetypeImage(
                            archetypeId = archetypeId,
                            modifier = Modifier
                                .size(90.dp)
                                .shadow(14.dp, RoundedCornerShape(18.dp), spotColor = GzGold.copy(0.3f)),
                            contentScale = ContentScale.Crop,
                        )
                    }
                    Column(Modifier.weight(1f)) {
                        Text(
                            text = arch?.title ?: archetypeId?.replaceFirstChar { it.uppercase() } ?: "Unknown",
                            style = MaterialTheme.typography.headlineSmall.copy(
                                fontWeight = FontWeight.Black,
                                color = GzTitle,
                            ),
                        )
                        Spacer(Modifier.height(4.dp))
                        Text(
                            text = arch?.desc ?: tagline,
                            style = MaterialTheme.typography.bodySmall.copy(
                                color = GzMuted,
                                lineHeight = 18.sp,
                            ),
                        )
                    }
                }
            }
        }

        Spacer(Modifier.height(20.dp))

        // ─────────────────────────────────────────────────────────────────
        // 2. RADAR + OCEAN BARS
        // ─────────────────────────────────────────────────────────────────
        Row(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            OceanRadarChart(
                domainMeans = domainMeans,
                size = 190.dp,
                modifier = Modifier,
            )
            Column(
                Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                val barData = listOf(
                    Triple("O", "Openness", DomainOpenness),
                    Triple("C", "Conscientiousness", DomainConscientiousness),
                    Triple("E", "Extraversion", DomainExtraversion),
                    Triple("A", "Agreeableness", DomainAgreeableness),
                    Triple("N", "Neuroticism", DomainNeuroticism),
                )
                barData.forEach { (key, label, color) ->
                    val mean = domainMeans[key] ?: 3.0
                    val pct = ((mean - 1.0) / 4.0 * 100).toInt().coerceIn(0, 100)
                    OceanBarRow(letter = key, label = label, pct = pct, color = color)
                }
            }
        }

        Spacer(Modifier.height(20.dp))

        // ─────────────────────────────────────────────────────────────────
        // 3. CORE INTELLIGENCE AI CARD
        // ─────────────────────────────────────────────────────────────────
        AiInsightCard(
            teaser = aiTeaser,
            onBeginSession = onAiChat,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
        )

        Spacer(Modifier.height(24.dp))

        // ─────────────────────────────────────────────────────────────────
        // 4. EXPLORE RESULTS label
        // ─────────────────────────────────────────────────────────────────
        GzSystemLabel(
            "// EXPLORE RESULTS",
            modifier = Modifier.padding(horizontal = 20.dp),
        )

        Spacer(Modifier.height(10.dp))

        // ─────────────────────────────────────────────────────────────────
        // 5. 2×2 SECTION GRID
        // ─────────────────────────────────────────────────────────────────
        Column(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                SectionGridCard(
                    title = "Circuits",
                    subtitle = "Cognitive patterns &\nfeedback loops",
                    isOpen = openSection == 1,
                    modifier = Modifier.weight(1f),
                    onClick = { openSection = if (openSection == 1) null else 1 },
                )
                SectionGridCard(
                    title = "Domains",
                    subtitle = "Life area\nbreakdowns",
                    isOpen = openSection == 2,
                    modifier = Modifier.weight(1f),
                    onClick = { openSection = if (openSection == 2) null else 2 },
                )
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                SectionGridCard(
                    title = "Facets",
                    subtitle = "30 trait\nsub-scores",
                    isOpen = openSection == 3,
                    modifier = Modifier.weight(1f),
                    onClick = { openSection = if (openSection == 3) null else 3 },
                )
                SectionGridCard(
                    title = "Tensions",
                    subtitle = "Conflicting\ntrait pairs",
                    isOpen = openSection == 4,
                    modifier = Modifier.weight(1f),
                    onClick = { openSection = if (openSection == 4) null else 4 },
                )
            }
        }

        // ─────────────────────────────────────────────────────────────────
        // 6. EXPANDED SECTION CONTENT
        // ─────────────────────────────────────────────────────────────────
        AnimatedVisibility(
            visible = openSection != null,
            enter = fadeIn(tween(380, easing = FastOutSlowInEasing)) +
                expandVertically(tween(380, easing = FastOutSlowInEasing)),
            exit = fadeOut(tween(220)) + shrinkVertically(),
        ) {
            Column(
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                when (openSection) {
                    1 -> CircuitsSection(domainOrder = domainOrder, scoresSnap = scoresSnap)
                    2 -> DomainsSection(domainOrder = domainOrder, payloads = payloads)
                    3 -> FacetsSection(domainOrder = domainOrder, payloads = payloads)
                    4 -> TensionsSection(tensionCards = tensionCards)
                }
            }
        }

        Spacer(Modifier.height(20.dp))

        // ─────────────────────────────────────────────────────────────────
        // 7. BOTTOM ACTION STRIP — PDF Report · Share Link · Raw Data
        // ─────────────────────────────────────────────────────────────────
        BottomActionStrip(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            onPdfReport = {
                generatePdfReport(context, archetypeId, arch?.title, tagline, domainOrder, domainMeans, runReceipt)
            },
            onShareLink = {
                context.startActivity(
                    Intent.createChooser(
                        Intent(Intent.ACTION_SEND).apply {
                            type = "text/plain"
                            putExtra(Intent.EXTRA_SUBJECT, "My Ground Zero results")
                            putExtra(
                                Intent.EXTRA_TEXT,
                                buildShareText(archetypeId, arch?.title, tagline, domainOrder, domainMeans, runReceipt),
                            )
                        },
                        "Share results",
                    ),
                )
            },
            onRawData = { clipboard.setText(AnnotatedString(resultsJson)) },
            onRestart = onRestart,
        )

        Spacer(Modifier.height(40.dp))
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-composables
// ─────────────────────────────────────────────────────────────────────────────

@Composable
private fun OceanBarRow(
    letter: String,
    label: String,
    pct: Int,
    color: Color,
    modifier: Modifier = Modifier,
) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Row(
            Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    text = letter,
                    style = MaterialTheme.typography.labelSmall.copy(
                        color = color,
                        fontWeight = FontWeight.Bold,
                    ),
                )
                Text(
                    text = label,
                    style = MaterialTheme.typography.labelSmall.copy(color = GzMuted),
                )
            }
            Text(
                text = "$pct",
                style = MaterialTheme.typography.labelSmall.copy(
                    color = color,
                    fontWeight = FontWeight.SemiBold,
                ),
            )
        }
        LinearProgressIndicator(
            progress = { pct / 100f },
            modifier = Modifier
                .fillMaxWidth()
                .height(5.dp)
                .clip(RoundedCornerShape(999.dp)),
            color = color,
            trackColor = GzOutline,
        )
    }
}

@Composable
private fun AiInsightCard(
    teaser: String,
    onBeginSession: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier.shadow(18.dp, RoundedCornerShape(20.dp), spotColor = GzGold.copy(0.25f)),
        shape = RoundedCornerShape(20.dp),
        color = GzSurfaceElevated,
        border = BorderStroke(1.dp, GzGold.copy(alpha = 0.25f)),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                // Gold dot indicator
                Box(
                    Modifier
                        .size(32.dp)
                        .background(GzGold.copy(alpha = 0.15f), CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    Box(Modifier.size(10.dp).background(GzGold, CircleShape))
                }
                Column {
                    Text(
                        "Core Intelligence AI",
                        style = MaterialTheme.typography.titleSmall.copy(
                            color = GzGold,
                            fontWeight = FontWeight.SemiBold,
                        ),
                    )
                    Text(
                        "Profile loaded · Tuned to your scores",
                        style = MaterialTheme.typography.labelSmall.copy(color = GzMuted),
                    )
                }
            }
            Text(
                text = teaser,
                style = MaterialTheme.typography.bodySmall.copy(
                    color = GzTitle.copy(alpha = 0.80f),
                    lineHeight = 20.sp,
                    fontWeight = FontWeight.Normal,
                ),
            )
            // Begin session button
            Surface(
                onClick = onBeginSession,
                modifier = Modifier
                    .fillMaxWidth()
                    .shadow(10.dp, RoundedCornerShape(14.dp), spotColor = GzGoldGlow.copy(0.45f)),
                shape = RoundedCornerShape(14.dp),
                color = GzGold,
            ) {
                Row(
                    Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp, vertical = 14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(
                        "Begin session",
                        style = MaterialTheme.typography.titleSmall.copy(
                            color = GzCanvas,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 0.5.sp,
                        ),
                    )
                    Text(
                        "→",
                        style = MaterialTheme.typography.titleMedium.copy(
                            color = GzCanvas,
                            fontWeight = FontWeight.Black,
                        ),
                    )
                }
            }
        }
    }
}

@Composable
private fun SectionGridCard(
    title: String,
    subtitle: String,
    isOpen: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    Surface(
        onClick = onClick,
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        color = if (isOpen) GzSurfaceElevated else GzSurface,
        border = BorderStroke(
            width = if (isOpen) 1.5.dp else 1.dp,
            color = if (isOpen) MaterialTheme.colorScheme.primary.copy(0.6f) else GzOutline,
        ),
    ) {
        Column(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 14.dp),
        ) {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top,
            ) {
                GzSystemLabel("SECTION")
                Text(
                    if (isOpen) "▾" else "›",
                    style = MaterialTheme.typography.bodySmall.copy(
                        color = if (isOpen) MaterialTheme.colorScheme.primary else GzMuted,
                    ),
                )
            }
            Spacer(Modifier.height(6.dp))
            Text(
                title,
                style = MaterialTheme.typography.titleSmall.copy(
                    color = if (isOpen) MaterialTheme.colorScheme.primary else GzTitle,
                    fontWeight = FontWeight.SemiBold,
                ),
            )
            Spacer(Modifier.height(4.dp))
            Text(
                subtitle,
                style = MaterialTheme.typography.bodySmall.copy(
                    color = GzMuted,
                    lineHeight = 16.sp,
                ),
            )
        }
    }
}

@Composable
private fun BottomActionStrip(
    modifier: Modifier = Modifier,
    onPdfReport: () -> Unit,
    onShareLink: () -> Unit,
    onRawData: () -> Unit,
    onRestart: () -> Unit,
) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            StripButton("PDF Report", Modifier.weight(1f), onPdfReport)
            StripButton("Share Link", Modifier.weight(1f), onShareLink)
            StripButton("Raw Data", Modifier.weight(1f), onRawData)
        }
        TextButton(
            onClick = onRestart,
            modifier = Modifier.fillMaxWidth(),
            contentPadding = PaddingValues(vertical = 10.dp),
        ) {
            Text(
                "Restart assessment",
                style = MaterialTheme.typography.bodySmall.copy(color = GzMuted),
            )
        }
    }
}

@Composable
private fun StripButton(label: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    OutlinedButton(
        onClick = onClick,
        modifier = modifier.height(42.dp),
        shape = RoundedCornerShape(12.dp),
        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp),
        border = BorderStroke(1.dp, GzOutline),
        colors = ButtonDefaults.outlinedButtonColors(contentColor = GzMuted),
    ) {
        Text(label, style = MaterialTheme.typography.labelSmall.copy(letterSpacing = 0.3.sp))
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Section detail composables (existing content, keep as-is)
// ─────────────────────────────────────────────────────────────────────────────

@Composable
private fun CircuitsSection(domainOrder: List<String>, scoresSnap: Map<String, Map<String, Double>>) {
    Text(EXISTENTIAL_CIRCUITS_TOOLTIP, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    Spacer(Modifier.height(6.dp))
    for (d in domainOrder) {
        val mean = domainMeanFromScores(scoresSnap, d)
        val c = circuitForDomain(d, mean)
        GzGlowingCard(domainKey = d, modifier = Modifier.fillMaxWidth()) {
            Text(c.name, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
            GzSystemLabel("LEVEL // ${c.level}")
            Spacer(Modifier.height(4.dp))
            Text(c.description, style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun DomainsSection(domainOrder: List<String>, payloads: Map<String, JSONObject>) {
    for (d in domainOrder) {
        val p = payloads[d] ?: continue
        val s = buildDomainSummary(d, p)
        GzGlowingCard(domainKey = d, modifier = Modifier.fillMaxWidth()) {
            Text(BigFiveConstants.DOMAIN_LABELS[d] ?: d, style = MaterialTheme.typography.titleMedium)
            Text("Overall: ${s.levelKey} — ${s.levelMeaning}", style = MaterialTheme.typography.bodySmall)
            Text("Domain average: ${s.domainMeanLine}", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Medium)
            if (s.strengthsBullets.isNotEmpty()) {
                Spacer(Modifier.height(8.dp))
                GzSystemLabel("STRONG LEVERS")
                s.strengthsBullets.forEach { (n, t) -> Text("• $n: $t", style = MaterialTheme.typography.bodySmall) }
            }
            if (s.midsBullets.isNotEmpty()) {
                Spacer(Modifier.height(8.dp))
                GzSystemLabel("WORKABLE LEVERS")
                s.midsBullets.forEach { (n, t) -> Text("• $n: $t", style = MaterialTheme.typography.bodySmall) }
            }
            if (s.developmentBullets.isNotEmpty()) {
                Spacer(Modifier.height(8.dp))
                GzSystemLabel("DEVELOPMENT LEVERS")
                s.developmentBullets.forEach { (n, t) -> Text("• $n: $t", style = MaterialTheme.typography.bodySmall) }
            }
        }
    }
}

@Composable
private fun FacetsSection(domainOrder: List<String>, payloads: Map<String, JSONObject>) {
    var expanded by remember { mutableStateOf(setOf<String>()) }
    for (d in domainOrder) {
        val p = payloads[d] ?: continue
        val final = p.optJSONObject("final") ?: JSONObject()
        val aPct = final.optJSONObject("A_pct") ?: JSONObject()
        val bucket = final.optJSONObject("bucket") ?: JSONObject()
        val aRaw = p.optJSONObject("phase2")?.optJSONObject("A_raw") ?: JSONObject()
        GzGlowingCard(domainKey = d, modifier = Modifier.fillMaxWidth()) {
            Text(BigFiveConstants.DOMAIN_LABELS[d] ?: d, style = MaterialTheme.typography.titleSmall)
            GzSystemLabel("// TAP ROW FOR FULL READ")
            Spacer(Modifier.height(4.dp))
            for (f in BigFiveConstants.canonicalFacets(d)) {
                val raw = if (aRaw.has(f)) aRaw.getDouble(f) else 3.0
                val pct = if (aPct.has(f)) aPct.getDouble(f) else 0.0
                val b = bucket.optString(f, "Medium")
                val key = "$d::$f"
                val long = facetInterpretation(d, f, b)
                val summary = long?.let { firstSentence(it) } ?: "$f — ${"%.2f".format(raw)} raw, ${"%.0f".format(pct)}%, $b"
                val open = expanded.contains(key)
                Surface(
                    onClick = { expanded = expanded.toMutableSet().apply { if (open) remove(key) else add(key) } },
                    shape = RoundedCornerShape(14.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f),
                    modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                ) {
                    Column(Modifier.padding(horizontal = 12.dp, vertical = 10.dp)) {
                        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text(f, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                                Text(summary, style = MaterialTheme.typography.bodySmall)
                            }
                            Text(if (open) "▾" else "▸", style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        AnimatedVisibility(
                            visible = open,
                            enter = fadeIn(tween(480, easing = FastOutSlowInEasing)) + expandVertically(animationSpec = tween(480, easing = FastOutSlowInEasing)),
                            exit = fadeOut(tween(240)) + shrinkVertically(),
                        ) {
                            Column(Modifier.padding(top = 8.dp)) {
                                long?.let { Text(it, style = MaterialTheme.typography.bodySmall); Spacer(Modifier.height(6.dp)) }
                                GzSystemLabel("METRICS")
                                Text("Raw ${"%.2f".format(raw)} · ${"%.0f".format(pct)}% · bucket $b", style = MaterialTheme.typography.labelMedium)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun TensionsSection(tensionCards: List<TensionCard>) {
    Text(CONFLICT_PAGE_TITLE, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
    Spacer(Modifier.height(4.dp))
    Text(CONFLICT_PAGE_INTRO, style = MaterialTheme.typography.bodySmall)
    Spacer(Modifier.height(8.dp))
    if (tensionCards.isEmpty()) {
        Text("Conflict catalog could not be loaded.", style = MaterialTheme.typography.bodySmall)
    } else {
        tensionCards.forEach { c ->
            GzGlowingCard(domainKey = null, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(26.dp)) {
                Text(c.title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                val lt = c.leftTrait; val rt = c.rightTrait; val lp = c.leftPct; val rp = c.rightPct
                if (lt != null && rt != null && lp != null && rp != null) {
                    Spacer(Modifier.height(4.dp))
                    Text("$lt · $rt", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(Modifier.height(6.dp))
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Column(Modifier.weight(1f)) {
                            Text(lt, style = MaterialTheme.typography.labelSmall)
                            LinearProgressIndicator(progress = { lp.coerceIn(0, 100) / 100f }, modifier = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(999.dp)))
                        }
                        Column(Modifier.weight(1f)) {
                            Text(rt, style = MaterialTheme.typography.labelSmall)
                            LinearProgressIndicator(progress = { rp.coerceIn(0, 100) / 100f }, modifier = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(999.dp)))
                        }
                    }
                }
                Spacer(Modifier.height(6.dp))
                Text(c.explanation, style = MaterialTheme.typography.bodySmall)
                if (c.friction.isNotBlank()) { Spacer(Modifier.height(6.dp)); Text(c.friction, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                if (c.howBothTrue.isNotBlank()) { Spacer(Modifier.height(8.dp)); GzSystemLabel("HOW CAN BOTH BE TRUE?"); Text(c.howBothTrue, style = MaterialTheme.typography.bodySmall) }
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Share text builder
// ─────────────────────────────────────────────────────────────────────────────

private fun buildShareText(
    archetypeId: String?,
    archTitle: String?,
    tagline: String,
    domainOrder: List<String>,
    domainMeans: Map<String, Double>,
    receipt: String,
): String = buildString {
    appendLine("Ground Zero Personality Results")
    appendLine("================================")
    appendLine("Type: ${archTitle ?: archetypeId ?: "Unknown"}")
    appendLine(tagline)
    appendLine()
    appendLine("OCEAN Scores:")
    domainOrder.forEach { d ->
        val label = BigFiveConstants.DOMAIN_LABELS[d] ?: d
        val mean = domainMeans[d] ?: 3.0
        val pct = ((mean - 1.0) / 4.0 * 100).toInt().coerceIn(0, 100)
        appendLine("  $label: $pct%")
    }
    appendLine()
    appendLine("Run receipt: $receipt")
    appendLine("Generated by Ground Zero app")
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF Report via Android PrintManager + WebView
// ─────────────────────────────────────────────────────────────────────────────

private fun generatePdfReport(
    context: android.content.Context,
    archetypeId: String?,
    archTitle: String?,
    tagline: String,
    domainOrder: List<String>,
    domainMeans: Map<String, Double>,
    receipt: String,
) {
    val html = buildPdfHtml(archetypeId, archTitle, tagline, domainOrder, domainMeans, receipt)
    val webView = WebView(context)
    webView.webViewClient = object : WebViewClient() {
        override fun onPageFinished(view: WebView, url: String) {
            val printManager = context.getSystemService(android.content.Context.PRINT_SERVICE) as PrintManager
            val jobName = "Ground_Zero_Results_${archetypeId ?: "profile"}"
            val printAdapter = view.createPrintDocumentAdapter(jobName)
            printManager.print(
                jobName,
                printAdapter,
                PrintAttributes.Builder()
                    .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                    .setResolution(PrintAttributes.Resolution("pdf", "pdf", 600, 600))
                    .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                    .build(),
            )
        }
    }
    webView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null)
}

private fun buildPdfHtml(
    archetypeId: String?,
    archTitle: String?,
    tagline: String,
    domainOrder: List<String>,
    domainMeans: Map<String, Double>,
    receipt: String,
): String {
    val domainRows = domainOrder.joinToString("") { d ->
        val label = BigFiveConstants.DOMAIN_LABELS[d] ?: d
        val mean = domainMeans[d] ?: 3.0
        val pct = ((mean - 1.0) / 4.0 * 100).toInt().coerceIn(0, 100)
        val colorMap = mapOf("O" to "#8B7CF6", "C" to "#38BDF8", "E" to "#FBBF24", "A" to "#4ADE80", "N" to "#F472B6")
        val color = colorMap[d] ?: "#94A3B8"
        """
        <tr>
          <td style="padding:8px 12px;font-weight:600;">$label</td>
          <td style="padding:8px 12px;">
            <div style="background:#1C2130;border-radius:6px;height:10px;width:100%;overflow:hidden;">
              <div style="background:$color;height:100%;width:$pct%;border-radius:6px;"></div>
            </div>
          </td>
          <td style="padding:8px 12px;font-weight:700;color:$color;">$pct</td>
        </tr>
        """
    }
    return """
    <!DOCTYPE html><html><head><meta charset="UTF-8"/>
    <style>
      body{font-family:sans-serif;background:#0F1115;color:#F4F6FA;margin:0;padding:32px;}
      h1{font-size:28px;margin:0 0 4px;}
      .tagline{color:#8B95A8;font-size:14px;margin-bottom:24px;}
      .label{font-size:11px;letter-spacing:2px;color:#8B95A8;text-transform:uppercase;}
      table{width:100%;border-collapse:collapse;margin-top:16px;}
      .receipt{color:#8B95A8;font-size:11px;margin-top:32px;}
      .gold{color:#FFBB00;}
    </style></head><body>
    <div class="label">// PERSONALITY TYPE</div>
    <h1>${archTitle ?: archetypeId?.replaceFirstChar { it.uppercaseChar() } ?: "Unknown"}</h1>
    <div class="tagline">$tagline</div>
    <div class="label">// OCEAN SCORES</div>
    <table>$domainRows</table>
    <div class="receipt">Run receipt: $receipt · Ground Zero</div>
    </body></html>
    """.trimIndent()
}
