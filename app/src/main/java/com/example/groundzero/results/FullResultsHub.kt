package com.example.groundzero.results

import android.widget.Toast
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
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.example.groundzero.assessment.ArchRulesEngine
import com.example.groundzero.assessment.ArchetypeCatalog
import com.example.groundzero.assessment.ArchetypeImage
import com.example.groundzero.assessment.BigFiveConstants
import com.example.groundzero.assessment.buildGzFullResultsJson
import com.example.groundzero.assessment.domainMeanFromScores
import com.example.groundzero.assessment.loadArchRules
import com.example.groundzero.assessment.loadArchetypesAtlas
import com.example.groundzero.assessment.loadBank
import com.example.groundzero.compat.CompatibilityBundle
import com.example.groundzero.compat.buildGZProfile
import com.example.groundzero.compat.computeCompatibility
import com.example.groundzero.persistence.GzSavedRunStore
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

enum class ResultsTopAction {
    ShareReport,
    RunId,
    AnswerCode,
}

/**
 * Redesigned results hub: archetype hero, radar + OCEAN bars, AI card, explore sections, bottom action strip.
 */
@Composable
fun FullResultsHub(
    bankVersion: String,
    domainOrder: List<String>,
    scores: Map<String, Map<String, Double>>,
    archetypeId: String?,
    onRestart: () -> Unit,
    onAiChat: () -> Unit,
    pendingTopAction: ResultsTopAction? = null,
    onTopActionHandled: () -> Unit = {},
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val clipboard = LocalClipboardManager.current
    val scoresSnap = remember(scores, archetypeId) { scores.mapValues { it.value.toMap() } }
    val resultsJson = remember(bankVersion, domainOrder, scoresSnap, archetypeId) {
        runCatching { buildGzFullResultsJson(bankVersion, domainOrder, scoresSnap, archetypeId) }
            .getOrElse { "[]" }
    }
    // Fingerprint of canonical results JSON (all domain/facet scores + archetype). Distinct answer paths → distinct IDs.
    val runReceipt = remember(resultsJson) { sha256HexPrefix24(resultsJson) }
    val payloads = remember(resultsJson) {
        runCatching { payloadsByDomain(resultsJson) }.getOrElse { emptyMap() }
    }
    val tensionCards = remember(scoresSnap, domainOrder, context) {
        buildTensionCards(context.assets, domainOrder, scoresSnap)
    }
    val arch = archetypeId?.let { ArchetypeCatalog.get(it) }
    val archetypeAtlas = remember(context) {
        runCatching { loadArchetypesAtlas(context.assets) }.getOrElse { emptyMap() }
    }
    val atlasEntry = archetypeId?.lowercase()?.let { archetypeAtlas[it] }
    val psychologyProfileText = atlasEntry?.psychologicalProfile.orEmpty().ifBlank { arch?.hint.orEmpty() }
    val domainMeans = remember(domainOrder, scoresSnap) {
        domainOrder.associateWith { domainMeanFromScores(scoresSnap, it) }
    }
    val aiTeaser = remember(domainOrder, scoresSnap) { buildAiTeaser(domainOrder, scoresSnap) }

    // which detail section is open (null = all closed)
    var openSection by remember { mutableStateOf<Int?>(null) }
    var showRestartConfirm by remember { mutableStateOf(false) }
    var showRunIdDialog by remember { mutableStateOf(false) }
    var showAnswerCodeDialog by remember { mutableStateOf(false) }
    var answerCodeText by remember { mutableStateOf("") }
    var showShareReportDialog by remember { mutableStateOf(false) }
    var showCompatibilityPasteDialog by remember { mutableStateOf(false) }
    var compatibilityPasteText by remember { mutableStateOf("") }
    var compatibilityError by remember { mutableStateOf<String?>(null) }
    var compatibilityResult by remember { mutableStateOf<CompatibilityBundle?>(null) }
    var showAtlasDetailDialog by remember { mutableStateOf(false) }
    var atlasDetailTitle by remember { mutableStateOf("") }
    var atlasDetailBody by remember { mutableStateOf("") }
    /** Keeps last result when the dialog closes (does not clear [compatibilityResult]). */
    var showCompatResult by remember { mutableStateOf(false) }
    val hubScroll = rememberScrollState()

    val bankAndRules = remember {
        runCatching {
            loadBank(context.assets) to loadArchRules(context.assets)
        }.getOrNull()
    }

    fun triggerGenerateAnswerCode() {
        val pair = bankAndRules
        if (pair == null) {
            Toast.makeText(context, "Could not load assessment bank.", Toast.LENGTH_SHORT).show()
            return
        }
        val (bank, archRules) = pair
        val saved = GzSavedRunStore.loadCompatible(context.applicationContext, bankVersion, domainOrder)
        if (saved?.facetOutcomes == null || saved.facetOutcomes.size != 30) {
            answerCodeText = ""
            Toast.makeText(
                context,
                "Answer codes need a fresh completion with this app version. Restart and finish the assessment once.",
                Toast.LENGTH_LONG,
            ).show()
            return
        }
        answerCodeText = runCatching {
            AnswerCodeCodec.encode(
                bank,
                archRules.archetypes,
                saved.facetOutcomes,
                saved.archPickLeft0Right1,
            )
        }.getOrElse { e ->
            Toast.makeText(context, e.message ?: "Could not build code", Toast.LENGTH_LONG).show()
            ""
        }
        if (answerCodeText.isNotBlank()) showAnswerCodeDialog = true
    }

    LaunchedEffect(pendingTopAction) {
        when (pendingTopAction) {
            ResultsTopAction.ShareReport -> showShareReportDialog = true
            ResultsTopAction.RunId -> showRunIdDialog = true
            ResultsTopAction.AnswerCode -> triggerGenerateAnswerCode()
            null -> Unit
        }
        if (pendingTopAction != null) onTopActionHandled()
    }

    Box(modifier.fillMaxWidth()) {
        Column(
            Modifier
                .fillMaxWidth()
                .verticalScroll(hubScroll),
            verticalArrangement = Arrangement.spacedBy(0.dp),
        ) {

        // ─────────────────────────────────────────────────────────────────
        // 1. ARCHETYPE HERO — portrait + psychology profile (from archetypes_atlas.json)
        // ─────────────────────────────────────────────────────────────────
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = GzSurface,
            shape = RoundedCornerShape(bottomStart = 28.dp, bottomEnd = 28.dp),
        ) {
            Column(Modifier.padding(horizontal = 16.dp, vertical = 12.dp)) {
                GzSystemLabel("// PERSONALITY TYPE")
                Spacer(Modifier.height(8.dp))
                // Image + title/description side by side
                Row(
                    Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.Top,
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    if (archetypeId != null) {
                        ArchetypeHeroPortrait(archetypeId = archetypeId)
                    }
                    Column(Modifier.weight(1f)) {
                        Text(
                            text = arch?.title ?: archetypeId?.replaceFirstChar { it.uppercase() } ?: "Unknown",
                            style = MaterialTheme.typography.headlineSmall.copy(
                                fontWeight = FontWeight.Black,
                                color = GzTitle,
                            ),
                        )
                        Spacer(Modifier.height(2.dp))
                        Text(
                            text = psychologyProfileText,
                            style = MaterialTheme.typography.bodySmall.copy(
                                color = GzMuted,
                                lineHeight = 16.sp,
                            ),
                            maxLines = 4,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                }
                // 3 atlas buttons as a full-width row below, filling the empty space
                Spacer(Modifier.height(10.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    AtlasDetailButton(
                        label = "Origin",
                        modifier = Modifier.weight(1f),
                        enabled = !atlasEntry?.origin.isNullOrBlank(),
                        onClick = {
                            atlasDetailTitle = "Origin"
                            atlasDetailBody = atlasEntry?.origin.orEmpty()
                            showAtlasDetailDialog = true
                        },
                    )
                    AtlasDetailButton(
                        label = "Inner Conflict",
                        modifier = Modifier.weight(1f),
                        enabled = !atlasEntry?.innerConflict.isNullOrBlank(),
                        onClick = {
                            atlasDetailTitle = "Inner Conflict"
                            atlasDetailBody = atlasEntry?.innerConflict.orEmpty()
                            showAtlasDetailDialog = true
                        },
                    )
                    AtlasDetailButton(
                        label = "Field Presence",
                        modifier = Modifier.weight(1f),
                        enabled = !atlasEntry?.fieldPresence.isNullOrBlank(),
                        onClick = {
                            atlasDetailTitle = "Field Presence"
                            atlasDetailBody = atlasEntry?.fieldPresence.orEmpty()
                            showAtlasDetailDialog = true
                        },
                    )
                }
            }
        }

        Spacer(Modifier.height(10.dp))

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
                size = 142.dp,
                modifier = Modifier,
            )
            Column(
                Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(7.dp),
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

        Spacer(Modifier.height(12.dp))
        HorizontalDivider(
            modifier = Modifier.padding(horizontal = 16.dp),
            color = GzOutline.copy(alpha = 0.55f),
        )
        Spacer(Modifier.height(12.dp))

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
        // 4. QUICK ACTION CARDS (under AI card)
        // ─────────────────────────────────────────────────────────────────
        Row(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            SectionGridCard(
                label = "Compatibility Report",
                isOpen = false,
                labelColor = Color(0xFFE85D8E),
                premium = true,
                showCachedBadge = compatibilityResult != null,
                modifier = Modifier.fillMaxWidth(),
                onClick = {
                    if (compatibilityResult != null) {
                        showCompatResult = true
                    } else {
                        compatibilityPasteText = ""
                        compatibilityError = null
                        showCompatibilityPasteDialog = true
                    }
                },
            )
        }
        Spacer(Modifier.height(8.dp))
        Row(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            SectionGridCard(
                label = "Domain",
                isOpen = openSection == 1,
                textSizeOffsetSp = 3,
                modifier = Modifier.weight(1f).height(60.dp),
                onClick = { openSection = if (openSection == 1) null else 1 },
            )
            SectionGridCard(
                label = "Full report",
                isOpen = openSection == 2,
                textSizeOffsetSp = 3,
                modifier = Modifier.weight(1f).height(60.dp),
                onClick = { openSection = if (openSection == 2) null else 2 },
            )
            SectionGridCard(
                label = "Core tensions",
                isOpen = openSection == 3,
                textSizeOffsetSp = 3,
                modifier = Modifier.weight(1f).height(60.dp),
                onClick = { openSection = if (openSection == 3) null else 3 },
            )
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
                    1 -> DomainsSection(domainOrder = domainOrder, payloads = payloads)
                    2 -> FacetsSection(domainOrder = domainOrder, payloads = payloads)
                    3 -> TensionsSection(tensionCards = tensionCards)
                }
            }
        }

        Spacer(Modifier.height(20.dp))

        // ─────────────────────────────────────────────────────────────────
        // 7. BOTTOM ACTION STRIP — Share report · Run ID
        // ─────────────────────────────────────────────────────────────────
        BottomActionStrip(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            onRestart = { showRestartConfirm = true },
        )

        Spacer(Modifier.height(40.dp))
        }

        if (showShareReportDialog) {
            AlertDialog(
                onDismissRequest = { showShareReportDialog = false },
                title = {
                    Text(
                        "Share report",
                        style = MaterialTheme.typography.titleLarge,
                    )
                },
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(
                            "PDF includes all pages (facets may continue on page 2). Image is the first page only.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Spacer(Modifier.height(8.dp))
                        TextButton(
                            onClick = {
                                showShareReportDialog = false
                                Toast.makeText(context, "Preparing PDF…", Toast.LENGTH_SHORT).show()
                                val html = buildShareableReportHtml(
                                    context,
                                    archetypeId,
                                    arch?.title,
                                    arch?.desc,
                                    psychologyProfileText,
                                    domainOrder,
                                    domainMeans,
                                    scoresSnap,
                                    aiTeaser,
                                    runReceipt,
                                )
                                shareProfileReportFromHtml(context, html, ProfileShareFormat.FullPdf) { ok ->
                                    if (!ok) Toast.makeText(context, "Could not create PDF", Toast.LENGTH_SHORT).show()
                                }
                            },
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text("PDF — full report")
                        }
                        TextButton(
                            onClick = {
                                showShareReportDialog = false
                                Toast.makeText(context, "Preparing image…", Toast.LENGTH_SHORT).show()
                                val html = buildShareableReportHtml(
                                    context,
                                    archetypeId,
                                    arch?.title,
                                    arch?.desc,
                                    psychologyProfileText,
                                    domainOrder,
                                    domainMeans,
                                    scoresSnap,
                                    aiTeaser,
                                    runReceipt,
                                )
                                shareProfileReportFromHtml(context, html, ProfileShareFormat.FirstPageImage) { ok ->
                                    if (!ok) Toast.makeText(context, "Could not create image", Toast.LENGTH_SHORT).show()
                                }
                            },
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text("Image — first page only")
                        }
                    }
                },
                confirmButton = {
                    TextButton(onClick = { showShareReportDialog = false }) {
                        Text("Cancel")
                    }
                },
            )
        }

        if (showAtlasDetailDialog) {
            AlertDialog(
                onDismissRequest = { showAtlasDetailDialog = false },
                title = { Text(atlasDetailTitle, style = MaterialTheme.typography.titleLarge) },
                text = {
                    Text(
                        text = atlasDetailBody.ifBlank { "No atlas text found for this section." },
                        style = MaterialTheme.typography.bodyMedium,
                    )
                },
                confirmButton = {
                    TextButton(onClick = { showAtlasDetailDialog = false }) {
                        Text("Close")
                    }
                },
            )
        }

        if (showRunIdDialog) {
            AlertDialog(
                onDismissRequest = { showRunIdDialog = false },
                title = {
                    Text(
                        "Run ID",
                        style = MaterialTheme.typography.titleLarge,
                    )
                },
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text(
                            "This ID fingerprints your full result payload (all facet scores and type). Different answers produce a different ID.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Text(
                            runReceipt,
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontFamily = FontFamily.Monospace,
                                fontWeight = FontWeight.Medium,
                            ),
                            color = GzTitle,
                        )
                        TextButton(
                            onClick = {
                                clipboard.setText(AnnotatedString(runReceipt))
                                Toast.makeText(context, "Run ID copied", Toast.LENGTH_SHORT).show()
                            },
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text("Copy")
                        }
                    }
                },
                confirmButton = {
                    TextButton(onClick = { showRunIdDialog = false }) {
                        Text("Done")
                    }
                },
            )
        }

        if (showAnswerCodeDialog && answerCodeText.isNotBlank()) {
            AlertDialog(
                onDismissRequest = { showAnswerCodeDialog = false },
                title = {
                    Text(
                        "Answer code",
                        style = MaterialTheme.typography.titleLarge,
                    )
                },
                text = {
                    Column(
                        modifier = Modifier.verticalScroll(rememberScrollState()),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        Text(
                            "Share this code so someone else can compare compatibility on the same assessment version. It encodes your answers (not just a fingerprint).",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Text(
                            answerCodeText,
                            style = MaterialTheme.typography.bodySmall.copy(
                                fontFamily = FontFamily.Monospace,
                                fontWeight = FontWeight.Normal,
                            ),
                            color = GzTitle,
                        )
                        TextButton(
                            onClick = {
                                clipboard.setText(AnnotatedString(answerCodeText))
                                Toast.makeText(context, "Answer code copied", Toast.LENGTH_SHORT).show()
                            },
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text("Copy")
                        }
                    }
                },
                confirmButton = {
                    TextButton(onClick = { showAnswerCodeDialog = false }) {
                        Text("Done")
                    }
                },
            )
        }

        if (showCompatibilityPasteDialog) {
            Dialog(onDismissRequest = {
                showCompatibilityPasteDialog = false
                compatibilityError = null
            }) {
                Surface(
                    shape = RoundedCornerShape(24.dp),
                    color = Color(0xFF180D1A),
                    border = BorderStroke(1.5.dp, Color(0xFFFF5F9C).copy(alpha = 0.55f)),
                    modifier = Modifier
                        .fillMaxWidth()
                        .shadow(
                            elevation = 24.dp,
                            shape = RoundedCornerShape(24.dp),
                            ambientColor = Color(0x55FF4F8B),
                            spotColor = Color(0x99FF4F8B),
                        ),
                ) {
                    Column(
                        Modifier
                            .fillMaxWidth()
                            .padding(24.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                    ) {
                        // ── Header ──
                        Row(
                            Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            Column {
                                Text(
                                    text = "★★★★★",
                                    color = Color(0xFFFFD166),
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                )
                                Text(
                                    text = "Compatibility Report",
                                    style = MaterialTheme.typography.titleLarge.copy(
                                        fontWeight = FontWeight.Black,
                                        color = Color.White,
                                    ),
                                )
                            }
                            Surface(
                                shape = RoundedCornerShape(999.dp),
                                color = Color(0xFFFF5F9C).copy(alpha = 0.18f),
                                border = BorderStroke(1.dp, Color(0xFFFF5F9C)),
                            ) {
                                Text(
                                    text = "PREMIUM",
                                    style = MaterialTheme.typography.labelSmall.copy(
                                        color = Color(0xFFFF9CBD),
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Bold,
                                    ),
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                                )
                            }
                        }

                        Text(
                            "Analyze interpersonal dynamics. Discover points of harmony and friction between you and another person.",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFFBBAFBF),
                        )

                        // ── Price + unlock CTA ──
                        Surface(
                            shape = RoundedCornerShape(16.dp),
                            color = Color(0xFF2A1020),
                            border = BorderStroke(1.dp, Color(0xFFFFD166).copy(alpha = 0.3f)),
                        ) {
                            Column(
                                Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 16.dp, vertical = 14.dp),
                                verticalArrangement = Arrangement.spacedBy(12.dp),
                            ) {
                                Row(
                                    Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Text(
                                        "One-time unlock",
                                        style = MaterialTheme.typography.bodyMedium.copy(
                                            color = Color(0xFFBBAFBF),
                                        ),
                                    )
                                    Text(
                                        "\$1.49",
                                        style = MaterialTheme.typography.titleMedium.copy(
                                            color = Color(0xFFFFD166),
                                            fontWeight = FontWeight.Black,
                                            fontSize = 22.sp,
                                        ),
                                    )
                                }
                                Button(
                                    onClick = {
                                        Toast.makeText(context, "Purchase flow coming soon", Toast.LENGTH_SHORT).show()
                                    },
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(12.dp),
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = Color(0xFFFFD166),
                                        contentColor = Color(0xFF0D0D0D),
                                    ),
                                ) {
                                    Text(
                                        "Unlock for \$1.49",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 15.sp,
                                    )
                                }
                            }
                        }

                        // ── Divider "or" ──
                        Row(
                            Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            HorizontalDivider(Modifier.weight(1f), color = Color(0xFF3A2A3F))
                            Text(
                                "or",
                                style = MaterialTheme.typography.labelSmall,
                                color = Color(0xFF6B5B73),
                            )
                            HorizontalDivider(Modifier.weight(1f), color = Color(0xFF3A2A3F))
                        }

                        // ── Paste code section ──
                        Text(
                            "Already have an answer code?",
                            style = MaterialTheme.typography.labelSmall.copy(
                                color = Color(0xFF9A8AA0),
                            ),
                        )
                        OutlinedTextField(
                            value = compatibilityPasteText,
                            onValueChange = {
                                compatibilityPasteText = it
                                compatibilityError = null
                            },
                            modifier = Modifier.fillMaxWidth(),
                            placeholder = { Text("You need an answer code") },
                            minLines = 2,
                            maxLines = 5,
                        )
                        compatibilityError?.let { err ->
                            Text(
                                err,
                                color = MaterialTheme.colorScheme.error,
                                style = MaterialTheme.typography.bodySmall,
                            )
                        }

                        // ── Bottom row ──
                        Row(
                            Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.End,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            TextButton(onClick = {
                                showCompatibilityPasteDialog = false
                                compatibilityError = null
                            }) {
                                Text("Cancel", color = Color(0xFF9A8AA0))
                            }
                            Spacer(Modifier.width(8.dp))
                            TextButton(
                                enabled = compatibilityPasteText.isNotBlank(),
                                onClick = {
                                    val pair = bankAndRules
                                    if (pair == null) {
                                        compatibilityError = "Could not load assessment data."
                                        return@TextButton
                                    }
                                    val (bank, archRules) = pair
                                    val w = archetypeId
                                    if (w.isNullOrBlank()) {
                                        compatibilityError = "Your archetype is missing; restart the assessment."
                                        return@TextButton
                                    }
                                    val decoded = runCatching {
                                        AnswerCodeCodec.decode(compatibilityPasteText.trim(), bank, archRules.archetypes)
                                    }.getOrElse { e ->
                                        compatibilityError = e.message ?: "Invalid code"
                                        return@TextButton
                                    }
                                    val localProfile = buildGZProfile(w, scoresSnap)
                                    val partnerProfile = buildGZProfile(decoded.archetypeId, decoded.scores)
                                    compatibilityResult = computeCompatibility(localProfile, partnerProfile)
                                    showCompatibilityPasteDialog = false
                                    compatibilityPasteText = ""
                                    compatibilityError = null
                                    showCompatResult = true
                                },
                            ) {
                                Text("Compare", color = Color(0xFFFF9CBD))
                            }
                        }
                    }
                }
            }
        }

        val compatDialogBundle = compatibilityResult
        if (compatDialogBundle != null && showCompatResult) {
            AlertDialog(
                onDismissRequest = { showCompatResult = false },
                title = {
                    Text(
                        "Ground Zero Compatibility Report",
                        style = MaterialTheme.typography.titleLarge,
                    )
                },
                text = {
                    val scroll = rememberScrollState()
                    val bundle = compatDialogBundle
                    val compat = bundle.compat
                    val presc = bundle.prescriptions
                    Column(
                        modifier = Modifier
                            .heightIn(max = 580.dp)
                            .verticalScroll(scroll),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        // ── Overall header ──────────────────────────────────
                        Text(
                            "Deterministic · Reproducible",
                            style = MaterialTheme.typography.labelSmall,
                            color = GzMuted,
                        )
                        val o = compat.overall
                        Text(
                            "Overall: ${o.scorePct}% · ${o.band}",
                            style = MaterialTheme.typography.titleMedium,
                            color = GzTitle,
                        )
                        Text(
                            o.rationale.joinToString(" · ").ifBlank { "—" },
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )

                        // ── Narrative ───────────────────────────────────────
                        Surface(
                            color = GzSurfaceElevated,
                            shape = RoundedCornerShape(12.dp),
                            border = BorderStroke(1.dp, GzOutline.copy(alpha = 0.4f)),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text(
                                bundle.narrative,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurface,
                                modifier = Modifier.padding(12.dp),
                            )
                        }

                        Text(
                            "ARCHETYPE DYNAMIC",
                            style = MaterialTheme.typography.labelMedium.copy(
                                letterSpacing = 1.2.sp,
                                color = MaterialTheme.colorScheme.primary,
                            ),
                        )
                        Text(
                            bundle.archetypePairing,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )

                        Text(
                            CompatibilityReportCopy.howItWorksIntro,
                            style = MaterialTheme.typography.bodySmall,
                            color = GzMuted,
                        )

                        HorizontalDivider(color = GzOutline.copy(alpha = 0.45f))

                        // ── Domain synergy ──────────────────────────────────
                        Text(
                            "DOMAIN SYNERGY",
                            style = MaterialTheme.typography.labelMedium.copy(
                                letterSpacing = 1.2.sp,
                                color = MaterialTheme.colorScheme.primary,
                            ),
                        )
                        listOf("O", "C", "E", "A", "N").forEach { key ->
                            val e = compat.domains[key] ?: return@forEach
                            val label = BigFiveConstants.DOMAIN_LABELS[key] ?: key
                            val synergyColor = when (e.synergy) {
                                "Tension" -> MaterialTheme.colorScheme.error.copy(alpha = 0.85f)
                                "Watch" -> GzGold
                                "Align" -> MaterialTheme.colorScheme.primary
                                else -> GzTitle
                            }
                            Row(
                                Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text(
                                    "$label ($key)",
                                    style = MaterialTheme.typography.titleSmall,
                                    color = GzTitle,
                                )
                                Text(
                                    "${e.scorePct.toInt()}% · ${e.synergy}",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = synergyColor,
                                )
                            }
                            Text(
                                CompatibilityReportCopy.domainSynergyParagraph(key, e.synergy),
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            LinearProgressIndicator(
                                progress = { (e.scorePct / 100f).toFloat() },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(5.dp)
                                    .clip(RoundedCornerShape(999.dp)),
                                color = synergyColor,
                                trackColor = GzOutline,
                            )
                            Spacer(Modifier.height(6.dp))
                        }

                        HorizontalDivider(color = GzOutline.copy(alpha = 0.45f))

                        // ── Key dynamics ────────────────────────────────────
                        Text(
                            "KEY DYNAMICS",
                            style = MaterialTheme.typography.labelMedium.copy(
                                letterSpacing = 1.2.sp,
                                color = MaterialTheme.colorScheme.primary,
                            ),
                        )
                        Text(
                            CompatibilityReportCopy.keyDynamicsIntro,
                            style = MaterialTheme.typography.bodySmall,
                            color = GzMuted,
                        )

                        // Alignment highlights
                        Surface(
                            color = GzSurfaceElevated.copy(alpha = 0.85f),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Column(
                                Modifier.padding(12.dp),
                                verticalArrangement = Arrangement.spacedBy(6.dp),
                            ) {
                                Text(
                                    "Alignment highlights",
                                    style = MaterialTheme.typography.titleSmall,
                                    color = MaterialTheme.colorScheme.primary,
                                )
                                val alignPairs = compat.facets.alignPairs.take(4)
                                if (alignPairs.isEmpty()) {
                                    Text(
                                        CompatibilityReportCopy.alignmentHighlightsLine(emptyList()),
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                } else {
                                    alignPairs.forEachIndexed { idx, ap ->
                                        if (idx > 0) {
                                            HorizontalDivider(
                                                color = GzOutline.copy(alpha = 0.35f),
                                                modifier = Modifier.padding(vertical = 4.dp),
                                            )
                                        }
                                        Text(
                                            ap.facet.substringAfter(":"),
                                            style = MaterialTheme.typography.labelMedium,
                                            color = GzTitle,
                                        )
                                        Text(
                                            CompatibilityReportCopy.facetAlignDescription(ap.facet),
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                    }
                                }
                            }
                        }

                        // Conflict zone — all pairs with individual descriptions
                        Surface(
                            color = GzSurfaceElevated.copy(alpha = 0.85f),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Column(
                                Modifier.padding(12.dp),
                                verticalArrangement = Arrangement.spacedBy(10.dp),
                            ) {
                                Text(
                                    "Conflict zone",
                                    style = MaterialTheme.typography.titleSmall,
                                    color = MaterialTheme.colorScheme.error.copy(alpha = 0.85f),
                                )
                                val conflictPairs = compat.facets.conflictPairs
                                if (conflictPairs.isEmpty()) {
                                    Text(
                                        "No significant facet conflicts found.",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                } else {
                                    conflictPairs.take(4).forEachIndexed { idx, cp ->
                                        if (idx > 0) {
                                            HorizontalDivider(
                                                color = GzOutline.copy(alpha = 0.3f),
                                                modifier = Modifier.padding(vertical = 2.dp),
                                            )
                                        }
                                        val facetShort = cp.facet.substringAfter(":")
                                        Text(
                                            facetShort,
                                            style = MaterialTheme.typography.labelMedium,
                                            color = GzTitle,
                                        )
                                        Text(
                                            CompatibilityReportCopy.facetConflictDescription(cp.facet),
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                        Row(
                                            Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                        ) {
                                            Text(
                                                "You: ${if (cp.a >= 4.0) "High" else "Low"}",
                                                style = MaterialTheme.typography.labelSmall,
                                                color = GzMuted,
                                            )
                                            Text(
                                                "Them: ${if (cp.b >= 4.0) "High" else "Low"}",
                                                style = MaterialTheme.typography.labelSmall,
                                                color = GzMuted,
                                            )
                                        }
                                    }
                                    val topOverride = presc.overrides.firstOrNull()
                                    if (topOverride != null) {
                                        HorizontalDivider(
                                            color = GzOutline.copy(alpha = 0.3f),
                                            modifier = Modifier.padding(vertical = 2.dp),
                                        )
                                        Text(
                                            "Top guardrail: ${topOverride.id}",
                                            style = MaterialTheme.typography.labelSmall,
                                            color = GzGold,
                                        )
                                        Text(
                                            topOverride.why,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                    }
                                }
                            }
                        }

                        HorizontalDivider(color = GzOutline.copy(alpha = 0.45f))

                        // ── Playbooks ───────────────────────────────────────
                        Text(
                            "PLAYBOOKS YOU TWO CAN USE",
                            style = MaterialTheme.typography.labelMedium.copy(
                                letterSpacing = 1.2.sp,
                                color = MaterialTheme.colorScheme.primary,
                            ),
                        )
                        Text(
                            CompatibilityReportCopy.playbooksIntro,
                            style = MaterialTheme.typography.bodySmall,
                            color = GzMuted,
                        )
                        if (presc.overrides.isEmpty() && presc.routines.isEmpty()) {
                            Text(
                                "Your profiles suggest a natural alignment that doesn't require specific playbooks. Continue with open communication.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        } else {
                            presc.overrides.forEach { p ->
                                Surface(
                                    color = GzSurfaceElevated,
                                    shape = RoundedCornerShape(10.dp),
                                    modifier = Modifier.fillMaxWidth(),
                                ) {
                                    Column(Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                        Text(
                                            p.id,
                                            style = MaterialTheme.typography.labelMedium,
                                            color = GzGold,
                                        )
                                        Text(
                                            p.why,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                    }
                                }
                            }
                            presc.routines.forEach { r ->
                                Surface(
                                    color = GzSurfaceElevated,
                                    shape = RoundedCornerShape(10.dp),
                                    modifier = Modifier.fillMaxWidth(),
                                ) {
                                    Column(Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                        Text(
                                            r.name,
                                            style = MaterialTheme.typography.labelMedium,
                                            color = GzGold,
                                        )
                                        Text(
                                            r.spec,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                    }
                                }
                            }
                        }

                        HorizontalDivider(color = GzOutline.copy(alpha = 0.45f))

                        // ── Scenarios ───────────────────────────────────────
                        Text(
                            "SCENARIOS",
                            style = MaterialTheme.typography.labelMedium.copy(
                                letterSpacing = 1.2.sp,
                                color = MaterialTheme.colorScheme.primary,
                            ),
                        )
                        Text(
                            CompatibilityReportCopy.scenariosIntro,
                            style = MaterialTheme.typography.bodySmall,
                            color = GzMuted,
                        )
                        val scen = presc.scenarios
                        if (scen.work.isEmpty() && scen.relationship.isEmpty()) {
                            Text(
                                "No specific high-risk scenarios were flagged based on your compatibility profile.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        } else {
                            scen.work.forEach { s ->
                                Text(
                                    "· Work: $s",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            scen.relationship.forEach { s ->
                                Text(
                                    "· Relationship: $s",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }

                        val compatHtml = remember(bundle) { buildCompatibilityReportHtml(bundle) }
                        HorizontalDivider(color = GzOutline.copy(alpha = 0.45f))
                        Row(
                            Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            TextButton(
                                onClick = {
                                    shareProfileReportFromHtml(context, compatHtml, ProfileShareFormat.FullPdf) { ok ->
                                        Toast.makeText(
                                            context,
                                            if (ok) "PDF ready to share" else "Could not create PDF",
                                            Toast.LENGTH_SHORT,
                                        ).show()
                                    }
                                },
                            ) {
                                Text("Share PDF")
                            }
                            TextButton(
                                onClick = {
                                    shareProfileReportFromHtml(context, compatHtml, ProfileShareFormat.FirstPageImage) { ok ->
                                        Toast.makeText(
                                            context,
                                            if (ok) "Image ready to share" else "Could not create image",
                                            Toast.LENGTH_SHORT,
                                        ).show()
                                    }
                                },
                            ) {
                                Text("Share Image")
                            }
                        }
                    }
                },
                confirmButton = {
                    TextButton(onClick = { showCompatResult = false }) {
                        Text("Close")
                    }
                },
            )
        }

        if (showRestartConfirm) {
            AlertDialog(
                onDismissRequest = { showRestartConfirm = false },
                title = {
                    Text(
                        "Restart assessment?",
                        style = MaterialTheme.typography.titleLarge,
                    )
                },
                text = {
                    Text(
                        "Are you sure? Restarting deletes all saved assessment data and results on this device. Your AI chat history is kept.",
                        style = MaterialTheme.typography.bodyMedium,
                    )
                },
                confirmButton = {
                    TextButton(
                        onClick = {
                            showRestartConfirm = false
                            onRestart()
                        },
                    ) {
                        Text("Restart")
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showRestartConfirm = false }) {
                        Text("Cancel")
                    }
                },
            )
        }
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
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Row(
                Modifier.weight(1f),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Text(
                    text = letter,
                    style = MaterialTheme.typography.labelSmall.copy(
                        color = color,
                        fontWeight = FontWeight.Bold,
                    ),
                )
                Text(
                    text = label,
                    modifier = Modifier.weight(1f),
                    style = MaterialTheme.typography.labelSmall.copy(
                        color = GzMuted,
                        fontSize = 10.sp,
                        letterSpacing = 0.sp,
                        lineHeight = 12.sp,
                    ),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
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
    label: String,
    isOpen: Boolean,
    textSizeOffsetSp: Int = 0,
    labelColor: Color? = null,
    premium: Boolean = false,
    modifier: Modifier = Modifier,
    showCachedBadge: Boolean = false,
    onClick: () -> Unit,
) {
    Surface(
        onClick = onClick,
        modifier = if (premium) {
            modifier.shadow(
                elevation = 12.dp,
                shape = RoundedCornerShape(16.dp),
                ambientColor = Color(0x66FF4F8B),
                spotColor = Color(0x99FF4F8B),
            )
        } else {
            modifier
        },
        shape = RoundedCornerShape(16.dp),
        color = if (isOpen) {
            GzSurfaceElevated
        } else if (premium) {
            Color(0xFF2A1020)
        } else {
            GzSurface
        },
        border = BorderStroke(
            width = if (premium) 2.dp else if (isOpen) 1.5.dp else 1.dp,
            color = when {
                premium -> Color(0xFFFF5F9C)
                isOpen -> MaterialTheme.colorScheme.primary.copy(0.6f)
                else -> GzOutline
            },
        ),
    ) {
        Column(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 10.dp, vertical = 12.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Row(
                    modifier = Modifier.weight(1f),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    if (showCachedBadge) {
                        Box(
                            Modifier
                                .size(8.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.primary),
                        )
                    }
                    Text(
                        label,
                        style = MaterialTheme.typography.labelSmall.copy(
                            color = if (isOpen) {
                                MaterialTheme.colorScheme.primary
                            } else if (premium) {
                                Color(0xFFFF9CBD)
                            } else {
                                labelColor ?: GzTitle
                            },
                            fontWeight = if (premium) FontWeight.SemiBold else FontWeight.Medium,
                            fontSize = (12 + textSizeOffsetSp).sp,
                            lineHeight = 14.sp,
                        ),
                        maxLines = 3,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                if (premium) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        Text(
                            text = "★★★★★",
                            style = MaterialTheme.typography.labelSmall.copy(
                                color = Color(0xFFFFD166),
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                            ),
                        )
                        Surface(
                            shape = RoundedCornerShape(999.dp),
                            color = Color(0xFFFF5F9C).copy(alpha = 0.18f),
                            border = BorderStroke(1.dp, Color(0xFFFF5F9C)),
                        ) {
                            Text(
                                text = "PREMIUM",
                                style = MaterialTheme.typography.labelSmall.copy(
                                    color = Color(0xFFFF9CBD),
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                ),
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun BottomActionStrip(
    modifier: Modifier = Modifier,
    onRestart: () -> Unit,
) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(8.dp)) {
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
        Text(
            label,
            style = MaterialTheme.typography.labelSmall.copy(letterSpacing = 0.3.sp),
            textAlign = TextAlign.Center,
            maxLines = 2,
        )
    }
}

@Composable
private fun AtlasDetailButton(
    label: String,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    onClick: () -> Unit,
) {
    Surface(
        onClick = onClick,
        modifier = modifier.height(38.dp),
        enabled = enabled,
        shape = RoundedCornerShape(10.dp),
        color = if (enabled) MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f) else GzSurface,
        tonalElevation = if (enabled) 2.dp else 0.dp,
        shadowElevation = if (enabled) 4.dp else 0.dp,
        border = BorderStroke(
            width = if (enabled) 1.4.dp else 1.dp,
            color = if (enabled) MaterialTheme.colorScheme.primary.copy(alpha = 0.45f) else GzOutline,
        ),
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall.copy(
                fontSize = 11.sp,
                lineHeight = 12.sp,
                fontWeight = FontWeight.SemiBold,
            ),
            color = if (enabled) MaterialTheme.colorScheme.onSurface else GzMuted,
            textAlign = TextAlign.Center,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 4.dp),
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Section detail composables
// ─────────────────────────────────────────────────────────────────────────────

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
                                // Preview line when collapsed, or always if there is no long-read (no duplicate with expanded body)
                                if (!open || long == null) {
                                    Text(summary, style = MaterialTheme.typography.bodySmall)
                                }
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

/**
 * Gold radial halo clipped to rounded corners (no Material elevation shadow, which reads square).
 * Slightly larger frame than the portrait so light shows in the margin around the art.
 */
@Composable
private fun ArchetypeHeroPortrait(
    archetypeId: String,
) {
    val density = LocalDensity.current
    val frameSize = 78.dp
    val imageSize = 72.dp
    val glowShape = RoundedCornerShape(14.dp)
    val brush = remember(frameSize, density) {
        val wPx = with(density) { frameSize.toPx() }
        val hPx = with(density) { frameSize.toPx() }
        Brush.radialGradient(
            colors = listOf(
                GzGold.copy(0.44f),
                GzGold.copy(0.12f),
                Color.Transparent,
            ),
            center = Offset(wPx / 2f, hPx / 2f),
            radius = maxOf(wPx, hPx) * 0.58f,
        )
    }
    Box(
        modifier = Modifier
            .size(frameSize)
            .clip(glowShape)
            .background(brush = brush, shape = glowShape),
        contentAlignment = Alignment.Center,
    ) {
        ArchetypeImage(
            archetypeId = archetypeId,
            modifier = Modifier.size(imageSize),
            contentScale = ContentScale.Crop,
        )
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF Report via Android PrintManager + WebView
// ─────────────────────────────────────────────────────────────────────────────

private fun archetypeImageBase64(context: android.content.Context, archetypeId: String?): String? {
    if (archetypeId == null) return null
    return runCatching {
        val key = when (archetypeId.lowercase()) {
            "sentinel" -> "the_axis"
            else -> archetypeId.lowercase().replace('-', '_')
        }
        val resId = context.resources.getIdentifier(key, "drawable", context.packageName)
        if (resId == 0) return null
        val bmp = android.graphics.BitmapFactory.decodeResource(context.resources, resId) ?: return null
        val out = java.io.ByteArrayOutputStream()
        bmp.compress(android.graphics.Bitmap.CompressFormat.PNG, 92, out)
        android.util.Base64.encodeToString(out.toByteArray(), android.util.Base64.NO_WRAP)
    }.getOrNull()
}

private fun buildShareableReportHtml(
    context: android.content.Context,
    archetypeId: String?,
    archTitle: String?,
    archDesc: String?,
    tagline: String,
    domainOrder: List<String>,
    domainMeans: Map<String, Double>,
    scores: Map<String, Map<String, Double>>,
    aiTeaser: String,
    receipt: String,
): String {
    val imgBase64 = archetypeImageBase64(context, archetypeId)
    return buildPdfHtml(archetypeId, archTitle, archDesc, tagline, domainOrder, domainMeans, scores, aiTeaser, imgBase64, receipt)
}

private fun htmlEscapeForPdf(s: String): String = s
    .replace("&", "&amp;")
    .replace("<", "&lt;")
    .replace(">", "&gt;")
    .replace("\"", "&quot;")

private fun appendFacetDomainColumn(sb: StringBuilder, d: String, scores: Map<String, Map<String, Double>>, colorMap: Map<String, String>) {
    val label = BigFiveConstants.DOMAIN_LABELS[d] ?: d
    val color = colorMap[d] ?: "#94A3B8"
    sb.append("""<div style="margin-bottom:16px;"><div style="font-size:9px;letter-spacing:2px;color:$color;text-transform:uppercase;margin-bottom:8px;">$label</div>""")
    for (f in BigFiveConstants.canonicalFacets(d)) {
        val key = BigFiveConstants.toCanonicalFacet(d, f)
        val raw = scores[d]?.get(key) ?: 3.0
        val pct = ((raw - 1.0) / 4.0 * 100).toInt().coerceIn(0, 100)
        val bucket = ArchRulesEngine.facetToBucket(raw)
        val interp = facetInterpretation(d, f, bucket.name)
        val textBlock = interp?.let { htmlEscapeForPdf(it) }.orEmpty()
        val fEsc = htmlEscapeForPdf(f)
        sb.append("""<div style="margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid #1C2130;">
          <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-bottom:5px;">
            <span style="font-size:11px;font-weight:700;color:#E8EBF2;">$fEsc</span>
            <span style="font-size:11px;font-weight:800;color:$color;white-space:nowrap;">$pct%</span>
          </div>""")
        if (textBlock.isNotEmpty()) {
            sb.append("""<div style="font-size:10px;color:#C0C8D8;line-height:1.55;">$textBlock</div>""")
        }
        sb.append("</div>")
    }
    sb.append("</div>")
}

private fun buildRadarSvg(domainOrder: List<String>, domainMeans: Map<String, Double>): String {
    val size = 200
    val cx = size / 2.0
    val cy = size / 2.0
    val maxR = size * 0.34
    val labelR = maxR + 16.0
    val keys = listOf("O", "C", "E", "A", "N")
    val colors = mapOf("O" to "#8B7CF6", "C" to "#38BDF8", "E" to "#FBBF24", "A" to "#4ADE80", "N" to "#F472B6")

    fun angle(i: Int) = (-Math.PI / 2 + 2 * Math.PI * i / keys.size)
    fun px(r: Double, i: Int) = cx + r * kotlin.math.cos(angle(i))
    fun py(r: Double, i: Int) = cy + r * kotlin.math.sin(angle(i))

    val sb = StringBuilder()
    sb.append("""<svg xmlns="http://www.w3.org/2000/svg" width="$size" height="$size" viewBox="0 0 $size $size">""")
    sb.append("""<rect width="$size" height="$size" rx="12" fill="#141824"/>""")

    // Grid rings
    for (ring in 1..3) {
        val r = maxR * ring / 3.0
        val pts = keys.indices.joinToString(" ") { "${px(r, it)},${py(r, it)}" }
        val alpha = if (ring == 3) "0.45" else "0.2"
        val sw = if (ring == 3) "1.2" else "0.7"
        sb.append("""<polygon points="$pts" fill="none" stroke="#3A4460" stroke-opacity="$alpha" stroke-width="$sw"/>""")
    }
    // Spokes
    for (i in keys.indices) {
        sb.append("""<line x1="$cx" y1="$cy" x2="${px(maxR, i)}" y2="${py(maxR, i)}" stroke="#3A4460" stroke-opacity="0.3" stroke-width="0.8"/>""")
    }
    // Filled polygon
    val userPts = keys.indices.joinToString(" ") { i ->
        val norm = (((domainMeans[keys[i]] ?: 3.0) - 1.0) / 4.0).coerceIn(0.0, 1.0)
        "${px(maxR * norm, i)},${py(maxR * norm, i)}"
    }
    sb.append("""<polygon points="$userPts" fill="#8B7CF6" fill-opacity="0.18" stroke="#8B7CF6" stroke-opacity="0.85" stroke-width="2.2"/>""")
    // Dots + labels
    for (i in keys.indices) {
        val norm = (((domainMeans[keys[i]] ?: 3.0) - 1.0) / 4.0).coerceIn(0.0, 1.0)
        val dotX = px(maxR * norm, i)
        val dotY = py(maxR * norm, i)
        val color = colors[keys[i]] ?: "#94A3B8"
        sb.append("""<circle cx="$dotX" cy="$dotY" r="5" fill="$color"/>""")
        sb.append("""<circle cx="$dotX" cy="$dotY" r="2.5" fill="#141824"/>""")
        val lx = px(labelR, i)
        val ly = py(labelR, i)
        sb.append("""<text x="$lx" y="${ly + 4}" text-anchor="middle" font-size="11" font-weight="bold" font-family="monospace" fill="$color">${keys[i]}</text>""")
    }
    sb.append("</svg>")
    return sb.toString()
}

private fun escapeHtml(s: String): String =
    s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\"", "&quot;")

private fun buildCompatibilityReportHtml(bundle: CompatibilityBundle): String {
    val compat = bundle.compat
    val presc = bundle.prescriptions
    val colorMap = mapOf("O" to "#8B7CF6", "C" to "#38BDF8", "E" to "#FBBF24", "A" to "#4ADE80", "N" to "#F472B6")
    val o = compat.overall
    val narrativeEsc = escapeHtml(bundle.narrative)
    val pairingEsc = escapeHtml(bundle.archetypePairing)
    val rationaleEsc = escapeHtml(o.rationale.joinToString(" · ").ifBlank { "—" })

    val domainRows = listOf("O", "C", "E", "A", "N").mapNotNull { key ->
        val e = compat.domains[key] ?: return@mapNotNull null
        val label = BigFiveConstants.DOMAIN_LABELS[key] ?: key
        val pct = e.scorePct.toInt().coerceIn(0, 100)
        val color = colorMap[key] ?: "#94A3B8"
        val syn = escapeHtml(e.synergy)
        val para = escapeHtml(CompatibilityReportCopy.domainSynergyParagraph(key, e.synergy))
        """<tr>
          <td style="padding:7px 12px;font-weight:600;color:#F4F6FA;width:150px;">${escapeHtml(label)}</td>
          <td style="padding:7px 12px;">
            <div style="font-size:11px;color:#8B95A8;margin-bottom:4px;">$pct% · $syn</div>
            <div style="background:#1C2130;border-radius:5px;height:9px;overflow:hidden;">
              <div style="background:$color;height:100%;width:$pct%;border-radius:5px;"></div>
            </div>
            <div style="font-size:12px;color:#C0C8D8;line-height:1.55;margin-top:8px;">$para</div>
          </td>
        </tr>"""
    }.joinToString("")

    val alignHtml = buildString {
        val pairs = compat.facets.alignPairs.take(4)
        if (pairs.isEmpty()) {
            append(
                """<p style="font-size:12px;color:#C0C8D8;line-height:1.55;">${escapeHtml(
                    CompatibilityReportCopy.alignmentHighlightsLine(emptyList()),
                )}</p>""",
            )
        } else {
            pairs.forEach { ap ->
                val name = escapeHtml(ap.facet.substringAfter(":"))
                val desc = escapeHtml(CompatibilityReportCopy.facetAlignDescription(ap.facet))
                append("""<div style="margin-bottom:12px;border-left:2px solid #38BDF8;padding-left:10px;">""")
                append("""<div style="font-weight:600;color:#F4F6FA;font-size:12px;">$name</div>""")
                append("""<div style="font-size:12px;color:#C0C8D8;line-height:1.55;margin-top:4px;">$desc</div>""")
                append("</div>")
            }
        }
    }

    val conflictHtml = buildString {
        val cps = compat.facets.conflictPairs
        if (cps.isEmpty()) {
            append("""<p style="font-size:12px;color:#C0C8D8;">No significant facet conflicts found.</p>""")
        } else {
            cps.forEach { cp ->
                val name = escapeHtml(cp.facet.substringAfter(":"))
                val desc = escapeHtml(CompatibilityReportCopy.facetConflictDescription(cp.facet))
                val you = if (cp.a >= 4.0) "High" else "Low"
                val them = if (cp.b >= 4.0) "High" else "Low"
                append("""<div style="margin-bottom:14px;border-left:2px solid #F87171;padding-left:10px;">""")
                append("""<div style="font-weight:600;color:#F4F6FA;font-size:12px;">$name</div>""")
                append("""<div style="font-size:12px;color:#C0C8D8;line-height:1.55;margin-top:4px;">$desc</div>""")
                append("""<div style="font-size:11px;color:#8B95A8;margin-top:6px;">You: $you · Them: $them</div>""")
                append("</div>")
            }
        }
    }

    val overridesHtml = presc.overrides.joinToString("") { p ->
        """<div style="background:#1A1F2E;border:1px solid rgba(212,175,55,0.25);border-radius:10px;padding:10px 12px;margin-bottom:8px;">
          <div style="font-weight:600;color:#D4AF37;font-size:12px;">${escapeHtml(p.id)}</div>
          <div style="font-size:12px;color:#C0C8D8;line-height:1.55;margin-top:4px;">${escapeHtml(p.why)}</div>
        </div>"""
    }

    val routinesHtml = presc.routines.joinToString("") { r ->
        """<div style="background:#1A1F2E;border:1px solid rgba(212,175,55,0.25);border-radius:10px;padding:10px 12px;margin-bottom:8px;">
          <div style="font-weight:600;color:#D4AF37;font-size:12px;">${escapeHtml(r.name)}</div>
          <div style="font-size:12px;color:#C0C8D8;line-height:1.55;margin-top:4px;">${escapeHtml(r.spec)}</div>
        </div>"""
    }

    val playbooksBody =
        if (presc.overrides.isEmpty() && presc.routines.isEmpty()) {
            """<p style="font-size:12px;color:#C0C8D8;line-height:1.55;">${escapeHtml(
                "Your profiles suggest a natural alignment that doesn't require specific playbooks. Continue with open communication.",
            )}</p>"""
        } else {
            overridesHtml + routinesHtml
        }

    val scen = presc.scenarios
    val scenariosBody = buildString {
        if (scen.work.isEmpty() && scen.relationship.isEmpty()) {
            append(
                """<p style="font-size:12px;color:#C0C8D8;">${escapeHtml(
                    "No specific high-risk scenarios were flagged based on your compatibility profile.",
                )}</p>""",
            )
        } else {
            scen.work.forEach { s ->
                append("""<p style="font-size:12px;color:#C0C8D8;line-height:1.55;">· Work: ${escapeHtml(s)}</p>""")
            }
            scen.relationship.forEach { s ->
                append("""<p style="font-size:12px;color:#C0C8D8;line-height:1.55;">· Relationship: ${escapeHtml(s)}</p>""")
            }
        }
    }

    return """<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#0F1115;color:#F4F6FA;padding:28px;}
  .gzmark{font-size:10px;letter-spacing:3px;color:#D4AF37;text-transform:uppercase;margin-bottom:20px;}
  h1{font-size:22px;font-weight:800;color:#F4F6FA;margin-bottom:8px;}
  .section-label{font-size:9px;letter-spacing:2.5px;color:#8B95A8;text-transform:uppercase;margin:18px 0 8px 0;}
  .divider{border:none;border-top:1px solid #1C2130;margin:18px 0;}
  table{width:100%;border-collapse:collapse;}
</style></head><body>

<div class="gzmark">Ground Zero // Compatibility Report</div>

<h1>Overall: ${o.scorePct}% · ${escapeHtml(o.band)}</h1>
<p style="font-size:12px;color:#8B95A8;line-height:1.5;margin-bottom:14px;">$rationaleEsc</p>

<div class="section-label">// Narrative</div>
<p style="font-size:12px;color:#C0C8D8;line-height:1.65;">$narrativeEsc</p>

<div class="section-label">// Archetype dynamic</div>
<p style="font-size:12px;color:#C0C8D8;line-height:1.65;">$pairingEsc</p>

<hr class="divider"/>

<div class="section-label">// Domain synergy</div>
<table>$domainRows</table>

<hr class="divider"/>

<div class="section-label">// Alignment highlights</div>
$alignHtml

<hr class="divider"/>

<div class="section-label">// Conflict zone</div>
$conflictHtml

<hr class="divider"/>

<div class="section-label">// Playbooks</div>
$playbooksBody

<hr class="divider"/>

<div class="section-label">// Scenarios</div>
$scenariosBody

</body></html>""".trimIndent()
}

private fun buildPdfHtml(
    archetypeId: String?,
    archTitle: String?,
    archDesc: String?,
    tagline: String,
    domainOrder: List<String>,
    domainMeans: Map<String, Double>,
    scores: Map<String, Map<String, Double>>,
    aiTeaser: String,
    imgBase64: String?,
    receipt: String,
): String {
    val colorMap = mapOf("O" to "#8B7CF6", "C" to "#38BDF8", "E" to "#FBBF24", "A" to "#4ADE80", "N" to "#F472B6")

    // OCEAN domain bar rows
    val domainRows = domainOrder.joinToString("") { d ->
        val label = BigFiveConstants.DOMAIN_LABELS[d] ?: d
        val mean = domainMeans[d] ?: 3.0
        val pct = ((mean - 1.0) / 4.0 * 100).toInt().coerceIn(0, 100)
        val color = colorMap[d] ?: "#94A3B8"
        """<tr>
          <td style="padding:7px 12px;font-weight:600;color:#F4F6FA;width:150px;">$label</td>
          <td style="padding:7px 12px;">
            <div style="background:#1C2130;border-radius:5px;height:9px;overflow:hidden;">
              <div style="background:$color;height:100%;width:$pct%;border-radius:5px;"></div>
            </div>
          </td>
          <td style="padding:7px 12px;font-weight:700;color:$color;width:38px;text-align:right;">$pct</td>
        </tr>"""
    }

    // 30 facets grouped by domain — two columns; each facet shows name, %, and interpretation text
    val facetColsHtml = buildString {
        append("""<div style="display:flex;gap:16px;">""")
        append("""<div style="flex:1;">""")
        for (d in domainOrder.take(3)) {
            appendFacetDomainColumn(this, d, scores, colorMap)
        }
        append("</div>")
        append("""<div style="flex:1;">""")
        for (d in domainOrder.drop(3)) {
            appendFacetDomainColumn(this, d, scores, colorMap)
        }
        append("</div></div>")
    }

    val radarSvg = buildRadarSvg(domainOrder, domainMeans)
    val imgHtml = if (imgBase64 != null) {
        """<img src="data:image/png;base64,$imgBase64" style="width:110px;height:110px;object-fit:cover;border-radius:18px;box-shadow:0 0 28px rgba(212,175,55,0.3);display:block;margin:0 auto 12px;" alt="${archTitle ?: ""}"/>"""
    } else ""
    val teaserClean = aiTeaser.trim('"')
    val displayTitle = archTitle ?: archetypeId?.replaceFirstChar { it.uppercaseChar() } ?: "Unknown"

    return """<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#0F1115;color:#F4F6FA;padding:28px;}
  .gzmark{font-size:10px;letter-spacing:3px;color:#D4AF37;text-transform:uppercase;margin-bottom:20px;}
  .hero{text-align:center;margin-bottom:22px;}
  h1{font-size:26px;font-weight:800;color:#F4F6FA;letter-spacing:0.3px;margin-bottom:4px;}
  .tagline{color:#8B95A8;font-size:12px;margin-bottom:8px;}
  .arch-desc{color:#C0C8D8;font-size:12px;line-height:1.55;max-width:480px;margin:0 auto;}
  .section-label{font-size:9px;letter-spacing:2.5px;color:#8B95A8;text-transform:uppercase;margin-bottom:8px;}
  .mid-row{display:flex;gap:20px;align-items:flex-start;margin-bottom:20px;}
  .radar-wrap{flex-shrink:0;}
  .bars-wrap{flex:1;}
  table{width:100%;border-collapse:collapse;}
  .ai-card{background:#1A1F2E;border:1px solid rgba(212,175,55,0.3);border-radius:12px;padding:14px 16px;margin-bottom:20px;}
  .ai-label{font-size:9px;letter-spacing:2px;color:#D4AF37;text-transform:uppercase;margin-bottom:7px;}
  .ai-text{font-size:12px;line-height:1.65;color:#E0E5F0;}
  .divider{border:none;border-top:1px solid #1C2130;margin:18px 0;}
  .footer{padding-top:12px;margin-top:4px;display:flex;align-items:center;justify-content:space-between;}
  .footer-brand{font-size:9px;letter-spacing:2px;color:#D4AF37;text-transform:uppercase;}
  .footer-receipt{font-size:9px;color:#4B5563;}
</style></head><body>

<div class="gzmark">Ground Zero // Profile Report</div>

<div class="hero">
  $imgHtml
  <h1>$displayTitle</h1>
  <div class="tagline">$tagline</div>
  ${if (!archDesc.isNullOrBlank()) """<div class="arch-desc">$archDesc</div>""" else ""}
</div>

<div class="section-label">// Core Intelligence Read</div>
<div class="ai-card">
  <div class="ai-label">Profile Analysis</div>
  <div class="ai-text">$teaserClean</div>
</div>

<div class="mid-row">
  <div class="radar-wrap">
    <div class="section-label">// OCEAN Radar</div>
    $radarSvg
  </div>
  <div class="bars-wrap">
    <div class="section-label">// OCEAN Scores</div>
    <table>$domainRows</table>
  </div>
</div>

<hr class="divider"/>

<div class="section-label">// 30 Facet Scores</div>
$facetColsHtml

<div class="footer">
  <div class="footer-brand">Powered by Core Intelligence AI</div>
  <div class="footer-receipt">Receipt: ${receipt.take(16)} &nbsp;·&nbsp; Ground Zero</div>
</div>

</body></html>""".trimIndent()
}
