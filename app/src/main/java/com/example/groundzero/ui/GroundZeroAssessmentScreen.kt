package com.example.groundzero.ui

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.ProgressIndicatorDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.example.groundzero.BuildConfig
import com.example.groundzero.assessment.ArchRulesEngine
import com.example.groundzero.assessment.ArchetypeBlurb
import com.example.groundzero.assessment.ArchetypeCatalog
import com.example.groundzero.assessment.ArchetypeImage
import com.example.groundzero.assessment.AssessmentBank
import com.example.groundzero.assessment.BigFiveConstants
import com.example.groundzero.results.FullResultsHub
import com.example.groundzero.assessment.FacetItem
import com.example.groundzero.persistence.GzSavedRunStore
import com.example.groundzero.assessment.loadArchRules
import com.example.groundzero.assessment.loadBank
import com.example.groundzero.ui.theme.GzCanvas
import com.example.groundzero.ui.theme.GzGlassTopBar
import com.example.groundzero.ui.theme.GzGlowingCard
import com.example.groundzero.ui.theme.GzPrimaryButton
import com.example.groundzero.ui.theme.GzSystemLabel
import com.example.groundzero.ui.theme.domainAccent

private enum class Step {
    Bin,
    Likert,
    Arch,
    Done,
}

private val LikertMap: Map<Int, Double> = mapOf(5 to 1.0, 4 to 2.0, 3 to 2.5, 2 to 3.0, 1 to 3.5)

@Composable
fun GroundZeroAssessmentScreen(modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val bank: AssessmentBank? = remember {
        runCatching { loadBank(context.assets) }.getOrNull()
    }
    val archRules = remember {
        runCatching { loadArchRules(context.assets) }.getOrNull()
    }

    if (bank == null || archRules == null) {
        Column(
            modifier = modifier
                .fillMaxSize()
                .padding(24.dp),
            verticalArrangement = Arrangement.Center,
        ) {
            Text(
                "Could not load assessment data (bank or rules).",
                color = MaterialTheme.colorScheme.error,
            )
        }
        return
    }

    val total = bank.facetList.size
    val totalWithArchetype = total + 3

    val initialSaved = remember(bank) {
        GzSavedRunStore.loadCompatible(context.applicationContext, bank.version, bank.domainOrder)
    }

    var idx by remember(initialSaved) {
        mutableIntStateOf(if (initialSaved != null) total else 0)
    }
    var step by remember(initialSaved) {
        mutableStateOf(if (initialSaved != null) Step.Done else Step.Bin)
    }
    val scores = remember(bank.domainOrder, initialSaved) {
        mutableMapOf<String, MutableMap<String, Double>>().apply {
            bank.domainOrder.forEach { d ->
                put(d, initialSaved?.scores?.get(d)?.toMutableMap() ?: mutableMapOf())
            }
        }
    }

    var archWinner by remember(initialSaved) {
        mutableStateOf(initialSaved?.archetypeId)
    }
    var archPair by remember { mutableStateOf<Pair<String, String>?>(null) }

    var showMainMenu by remember { mutableStateOf(false) }
    var showAiChat by remember { mutableStateOf(false) }

    fun advanceAfterAnswer() {
        if (idx + 1 < total) {
            idx += 1
            step = Step.Bin
        } else {
            val domains = ArchRulesEngine.buildDomains(
                scores.mapValues { it.value.mapValues { e -> e.value } },
            )
            val ids = ArchRulesEngine.selectCandidateIds(archRules.archetypes, domains)
            when (ids.size) {
                0 -> {
                    archWinner = archRules.archetypes.firstOrNull()?.id
                    step = Step.Done
                }
                1 -> {
                    archWinner = ids[0]
                    step = Step.Done
                }
                else -> {
                    archPair = ids[0] to ids[1]
                    step = Step.Arch
                }
            }
        }
    }

    fun setFacetScore(item: FacetItem, value: Double) {
        val d = item.domain
        val key = BigFiveConstants.toCanonicalFacet(d, item.facet)
        scores.getOrPut(d) { mutableMapOf() }[key] = value
    }

    fun restartRun() {
        GzSavedRunStore.clear(context.applicationContext)
        idx = 0
        step = Step.Bin
        archWinner = null
        archPair = null
        scores.values.forEach { it.clear() }
    }

    LaunchedEffect(step, archWinner) {
        if (step != Step.Done) return@LaunchedEffect
        GzSavedRunStore.save(
            context.applicationContext,
            bank.version,
            bank.domainOrder,
            scores.mapValues { it.value.toMap() },
            archWinner,
        )
    }

    val current = bank.facetList.getOrNull(idx)
    val progress = when (step) {
        Step.Done -> total + 3
        Step.Arch -> total + 1
        else -> idx
    }
    val progressFraction = progress.coerceAtMost(totalWithArchetype) / totalWithArchetype.toFloat()
    val mainScroll = rememberScrollState()
    val barDomain = when {
        step == Step.Done || step == Step.Arch -> null
        else -> current?.domain
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(GzCanvas),
    ) {
        Column(Modifier.fillMaxSize()) {
            GzGlassTopBar(
                title = when (step) {
                    Step.Arch -> "ARCHETYPE RESOLUTION"
                    Step.Done -> "RESULTS // LIVE"
                    else -> "CORE VECTORS"
                },
                onMenuClick = { showMainMenu = true },
            )
            AnimatedContent(
                targetState = step to idx,
                transitionSpec = {
                    fadeIn(tween(520, easing = FastOutSlowInEasing)) togetherWith
                        fadeOut(tween(380, easing = FastOutSlowInEasing))
                },
                label = "gz",
                modifier = Modifier
                    .weight(1f, fill = true)
                    .fillMaxWidth(),
            ) { (s, _) ->
                val scrollable =
                    if (s == Step.Done) Modifier else Modifier.verticalScroll(mainScroll)
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .then(scrollable)
                        .padding(horizontal = 20.dp, vertical = 12.dp),
                ) {
                    GzSystemLabel(
                        when (s) {
                            Step.Arch -> "// PHASE — ARCHETYPE"
                            Step.Done -> "// PHASE — COMPLETE"
                            else -> "// PHASE — CORE"
                        },
                    )
                    if (current != null && s != Step.Arch && s != Step.Done) {
                        Spacer(Modifier.height(6.dp))
                        Text(
                            text = BigFiveConstants.DOMAIN_LABELS[current.domain] ?: current.domain,
                            style = MaterialTheme.typography.labelLarge,
                            color = domainAccent(current.domain),
                        )
                    }
                    Spacer(Modifier.height(10.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        GzSystemLabel("PROGRESS")
                        GzSystemLabel("$progress / $totalWithArchetype")
                    }
                    Spacer(Modifier.height(6.dp))
                    LinearProgressIndicator(
                        progress = { progressFraction },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(8.dp)
                            .clip(RoundedCornerShape(999.dp)),
                        color = domainAccent(barDomain),
                        trackColor = MaterialTheme.colorScheme.surfaceVariant,
                        strokeCap = ProgressIndicatorDefaults.LinearStrokeCap,
                    )
                    Spacer(Modifier.height(20.dp))

                    when (s) {
                        Step.Bin -> if (current != null) {
                            BinStep(
                                domainKey = current.domain,
                                prompt = current.binQ,
                                onNo = { step = Step.Likert },
                                onYes = {
                                    setFacetScore(current, 4.0)
                                    advanceAfterAnswer()
                                },
                                onYup = {
                                    setFacetScore(current, 5.0)
                                    advanceAfterAnswer()
                                },
                            )
                        }

                        Step.Likert -> if (current != null) {
                            LikertStep(
                                domainKey = current.domain,
                                prompt = current.likQ,
                                onPick = { likert1to5 ->
                                    val final = LikertMap[likert1to5] ?: 2.0
                                    setFacetScore(current, final)
                                    advanceAfterAnswer()
                                },
                                onBack = { step = Step.Bin },
                            )
                        }

                        Step.Arch -> {
                            val pair = archPair
                            if (pair != null) {
                                ArchPickStep(
                                    leftId = pair.first,
                                    rightId = pair.second,
                                    onPick = { id ->
                                        archWinner = id
                                        step = Step.Done
                                    },
                                )
                            }
                        }

                        Step.Done -> {
                            val w = archWinner
                            FullResultsHub(
                                modifier = Modifier
                                    .weight(1f, fill = true)
                                    .fillMaxWidth(),
                                bankVersion = bank.version,
                                domainOrder = bank.domainOrder,
                                scores = scores.mapValues { it.value.toMap() },
                                archetypeId = w,
                                onRestart = { restartRun() },
                                onAiChat = { showAiChat = true },
                            )
                        }
                    }
                }
            }
        }

        AnimatedVisibility(
            visible = showAiChat,
            enter = slideInVertically(tween(380)) { it } + fadeIn(tween(380)),
            exit = slideOutVertically(tween(300)) { it } + fadeOut(tween(280)),
            modifier = Modifier.fillMaxSize(),
        ) {
            GzAiChatScreen(
                onClose = { showAiChat = false },
                apiKey = BuildConfig.GEMINI_API_KEY,
                model = BuildConfig.GEMINI_MODEL,
                domainOrder = bank.domainOrder,
                scores = scores.mapValues { it.value.toMap() },
                archetypeId = archWinner,
            )
        }

        if (showMainMenu) {
            AlertDialog(
                onDismissRequest = { showMainMenu = false },
                title = { Text("Main menu") },
                text = {
                    Text(
                        "Your last completed results stay on this device until you restart the assessment. Restart clears saved answers and results.",
                        style = MaterialTheme.typography.bodySmall,
                    )
                },
                confirmButton = {
                    TextButton(
                        onClick = {
                            restartRun()
                            showMainMenu = false
                        },
                    ) { Text("Restart assessment") }
                },
                dismissButton = {
                    TextButton(onClick = { showMainMenu = false }) { Text("Cancel") }
                },
            )
        }
    }
}

@Composable
private fun BinStep(
    domainKey: String,
    prompt: String,
    onNo: () -> Unit,
    onYes: () -> Unit,
    onYup: () -> Unit,
) {
    GzGlowingCard(domainKey = domainKey, modifier = Modifier.fillMaxWidth()) {
        Text(prompt, style = MaterialTheme.typography.bodyLarge)
    }
    Spacer(Modifier.height(16.dp))
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        GzPrimaryButton(text = "No", onClick = onNo)
        GzPrimaryButton(text = "Yes", onClick = onYes)
        GzPrimaryButton(text = "Yup, that's always me", onClick = onYup)
    }
}

@Composable
private fun LikertStep(
    domainKey: String,
    prompt: String,
    onPick: (Int) -> Unit,
    onBack: () -> Unit,
) {
    val ratings = listOf(
        "Strongly Disagree" to 1,
        "Disagree" to 2,
        "Neutral" to 3,
        "Agree" to 4,
        "Strongly Agree" to 5,
    )
    GzGlowingCard(domainKey = domainKey, modifier = Modifier.fillMaxWidth()) {
        Text(prompt, style = MaterialTheme.typography.bodyLarge)
    }
    Spacer(Modifier.height(16.dp))
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        ratings.forEach { (label, v) ->
            Button(
                onClick = { onPick(v) },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant,
                    contentColor = MaterialTheme.colorScheme.onSurface,
                ),
                elevation = ButtonDefaults.buttonElevation(defaultElevation = 2.dp),
            ) { Text(label, style = MaterialTheme.typography.bodyMedium) }
        }
    }
    Spacer(Modifier.height(12.dp))
    OutlinedButton(
        onClick = onBack,
        modifier = Modifier
            .fillMaxWidth()
            .height(48.dp),
        shape = RoundedCornerShape(16.dp),
        colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.onSurfaceVariant),
    ) { Text("Back") }
}

@Composable
private fun ArchPickStep(
    leftId: String,
    rightId: String,
    onPick: (String) -> Unit,
) {
    val L = ArchetypeCatalog.get(leftId)
    val R = ArchetypeCatalog.get(rightId)
    Text(
        "Based on your profile, we matched you with ${L.title} and ${R.title}. Now choose which one represents you.",
        style = MaterialTheme.typography.bodyMedium,
        textAlign = TextAlign.Center,
        modifier = Modifier.fillMaxWidth(),
    )
    Spacer(Modifier.height(16.dp))
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        ArchCard(Modifier.weight(1f), leftId, L) { onPick(leftId) }
        ArchCard(Modifier.weight(1f), rightId, R) { onPick(rightId) }
    }
}

@Composable
private fun ArchCard(modifier: Modifier, archetypeId: String, meta: ArchetypeBlurb, onClick: () -> Unit) {
    Card(
        onClick = onClick,
        modifier = modifier,
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = CardDefaults.outlinedCardBorder(),
    ) {
        Column(
            Modifier.padding(14.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            ArchetypeImage(
                archetypeId = archetypeId,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(100.dp),
                contentScale = ContentScale.Crop,
            )
            Spacer(Modifier.height(10.dp))
            Text(meta.title, style = MaterialTheme.typography.titleSmall)
            Spacer(Modifier.height(8.dp))
            Text(meta.desc, style = MaterialTheme.typography.bodySmall, textAlign = TextAlign.Center)
        }
    }
}

