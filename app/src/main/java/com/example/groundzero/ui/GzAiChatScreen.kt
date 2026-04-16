package com.example.groundzero.ui

import android.widget.Toast
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.BorderStroke
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
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.groundzero.ai.ChatTurn
import com.example.groundzero.ai.GeminiChatClient
import com.example.groundzero.ai.GroundZeroAiConfig
import com.example.groundzero.persistence.AiMessage
import com.example.groundzero.persistence.AiSession
import com.example.groundzero.persistence.GzAiChatStore
import com.example.groundzero.ui.theme.GzCanvas
import com.example.groundzero.ui.theme.GzGold
import com.example.groundzero.ui.theme.GzGoldGlow
import com.example.groundzero.ui.theme.GzMuted
import com.example.groundzero.ui.theme.GzOutline
import com.example.groundzero.ui.theme.GzSurface
import com.example.groundzero.ui.theme.GzSurfaceElevated
import com.example.groundzero.ui.theme.GzTitle
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.TimeUnit

private enum class ChatMode { Active, History }

@Composable
fun GzAiChatScreen(
    onClose: () -> Unit,
    apiKey: String,
    model: String,
    domainOrder: List<String>,
    scores: Map<String, Map<String, Double>>,
    archetypeId: String?,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val profileContext = remember(domainOrder, scores, archetypeId) {
        GroundZeroAiConfig.buildProfileContext(
            domainOrder = domainOrder,
            scores = scores,
            archetypeId = archetypeId,
        )
    }

    var mode by remember { mutableStateOf(ChatMode.Active) }
    var sessionId by remember { mutableStateOf(GzAiChatStore.newSessionId()) }
    var sessionCreatedMs by remember { mutableStateOf(System.currentTimeMillis()) }
    val messages = remember { mutableStateListOf<AiMessage>() }
    var input by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val listState = rememberLazyListState()
    var allSessions by remember { mutableStateOf(GzAiChatStore.loadAllSessions(context)) }

    fun saveCurrentSession() {
        if (messages.isEmpty()) return
        GzAiChatStore.saveSession(
            context,
            AiSession(id = sessionId, createdMs = sessionCreatedMs, messages = messages.toList()),
        )
        allSessions = GzAiChatStore.loadAllSessions(context)
    }

    fun loadSession(session: AiSession) {
        messages.clear()
        messages.addAll(session.messages)
        sessionId = session.id
        sessionCreatedMs = session.createdMs
        error = null
        mode = ChatMode.Active
    }

    fun startNewSession() {
        saveCurrentSession()
        sessionId = GzAiChatStore.newSessionId()
        sessionCreatedMs = System.currentTimeMillis()
        messages.clear()
        input = ""
        error = null
        mode = ChatMode.Active
    }

    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) listState.animateScrollToItem(messages.lastIndex)
    }

    BackHandler {
        when (mode) {
            ChatMode.History -> mode = ChatMode.Active
            ChatMode.Active -> { saveCurrentSession(); onClose() }
        }
    }

    Box(
        Modifier
            .fillMaxSize()
            .background(GzCanvas),
    ) {
        Column(
            Modifier
                .fillMaxSize()
                .imePadding(),
        ) {
            // ── Top bar ──────────────────────────────────────────────────────
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = GzSurface.copy(alpha = 0.96f),
                shadowElevation = 6.dp,
                tonalElevation = 2.dp,
                shape = RoundedCornerShape(bottomStart = 20.dp, bottomEnd = 20.dp),
            ) {
                Row(
                    Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    TextButton(
                        onClick = {
                            when (mode) {
                                ChatMode.History -> mode = ChatMode.Active
                                ChatMode.Active -> { saveCurrentSession(); onClose() }
                            }
                        },
                        modifier = Modifier.width(72.dp),
                    ) {
                        Text(
                            text = "Back",
                            style = MaterialTheme.typography.labelMedium.copy(
                                color = GzMuted,
                                letterSpacing = 0.3.sp,
                            ),
                        )
                    }

                    Column(
                        Modifier.weight(1f),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Text(
                            text = if (mode == ChatMode.History) "Core Intelligence History" else "Core Intelligence",
                            style = MaterialTheme.typography.titleMedium.copy(
                                color = GzGold,
                                fontWeight = FontWeight.SemiBold,
                            ),
                            textAlign = TextAlign.Center,
                        )
                        Text(
                            text = "Ground Zero",
                            style = MaterialTheme.typography.bodySmall.copy(color = GzMuted),
                            textAlign = TextAlign.Center,
                        )
                    }

                    if (mode == ChatMode.Active) {
                        TextButton(
                            onClick = {
                                allSessions = GzAiChatStore.loadAllSessions(context)
                                mode = ChatMode.History
                            },
                            modifier = Modifier.width(72.dp),
                        ) {
                            Text(
                                text = "History",
                                style = MaterialTheme.typography.labelMedium.copy(
                                    color = GzMuted,
                                    letterSpacing = 0.3.sp,
                                ),
                            )
                        }
                    } else {
                        TextButton(
                            onClick = { startNewSession() },
                            modifier = Modifier.width(72.dp),
                        ) {
                            Text(
                                text = "New",
                                style = MaterialTheme.typography.labelMedium.copy(
                                    color = GzMuted,
                                    letterSpacing = 0.3.sp,
                                ),
                            )
                        }
                    }
                }
            }

            // ── Body ─────────────────────────────────────────────────────────
            AnimatedContent(
                targetState = mode,
                transitionSpec = {
                    if (targetState == ChatMode.History) {
                        slideInHorizontally(tween(300)) { it } + fadeIn(tween(300)) togetherWith
                            slideOutHorizontally(tween(300)) { -it } + fadeOut(tween(200))
                    } else {
                        slideInHorizontally(tween(300)) { -it } + fadeIn(tween(300)) togetherWith
                            slideOutHorizontally(tween(300)) { it } + fadeOut(tween(200))
                    }
                },
                label = "chat_mode",
                modifier = Modifier.weight(1f),
            ) { currentMode ->
                when (currentMode) {
                    ChatMode.Active -> ActiveChatPane(
                        messages = messages.toList(),
                        listState = listState,
                        loading = loading,
                        error = error,
                        input = input,
                        apiKey = apiKey,
                        onInputChange = { input = it },
                        onSend = {
                            val text = input.trim()
                            if (text.isEmpty() || apiKey.isBlank()) return@ActiveChatPane
                            input = ""
                            error = null
                            messages.add(AiMessage(isUser = true, text = text))
                            loading = true
                            scope.launch {
                                runCatching {
                                    GeminiChatClient.generateReply(
                                        apiKey = apiKey,
                                        model = model,
                                        turns = messages.map { ChatTurn(it.isUser, it.text) },
                                        profileContext = profileContext,
                                    )
                                }.onSuccess { reply ->
                                    messages.add(AiMessage(isUser = false, text = reply))
                                    saveCurrentSession()
                                }.onFailure { e ->
                                    error = e.message ?: "Request failed"
                                }
                                loading = false
                            }
                        },
                    )
                    ChatMode.History -> HistoryPane(
                        sessions = allSessions,
                        currentSessionId = sessionId,
                        onLoadSession = { loadSession(it) },
                        onDeleteSession = {
                            GzAiChatStore.deleteSession(context, it)
                            allSessions = GzAiChatStore.loadAllSessions(context)
                        },
                    )
                }
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Active chat pane
// ─────────────────────────────────────────────────────────────────────────────

@Composable
private fun ActiveChatPane(
    messages: List<AiMessage>,
    listState: LazyListState,
    loading: Boolean,
    error: String?,
    input: String,
    apiKey: String,
    onInputChange: (String) -> Unit,
    onSend: () -> Unit,
) {
    Column(Modifier.fillMaxSize()) {
        LazyColumn(
            state = listState,
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth(),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            if (messages.isEmpty()) {
                item { EmptyChatPrompt(apiKey) }
            }
            itemsIndexed(messages, key = { i, _ -> i }) { _, msg ->
                MessageBubble(msg)
            }
            if (loading) {
                item { TypingIndicator() }
            }
        }

        error?.let { err ->
            Text(
                err,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.error,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
            )
        }

        ChatInputBar(
            value = input,
            enabled = !loading && apiKey.isNotBlank(),
            onValueChange = onInputChange,
            onSend = onSend,
        )
    }
}

@Composable
private fun MessageBubble(msg: AiMessage) {
    val clipboard = LocalClipboardManager.current
    val context = LocalContext.current
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (msg.isUser) Arrangement.End else Arrangement.Start,
    ) {
        if (msg.isUser) {
            Surface(
                shape = RoundedCornerShape(topStart = 18.dp, topEnd = 18.dp, bottomStart = 18.dp, bottomEnd = 4.dp),
                color = GzGold.copy(alpha = 0.13f),
                border = BorderStroke(1.dp, GzGold.copy(alpha = 0.30f)),
                modifier = Modifier.fillMaxWidth(0.80f),
            ) {
                Text(
                    text = msg.text,
                    style = MaterialTheme.typography.bodyMedium.copy(color = GzTitle),
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                )
            }
        } else {
            Column(
                modifier = Modifier.fillMaxWidth(0.90f),
                horizontalAlignment = Alignment.Start,
            ) {
                Row(
                    verticalAlignment = Alignment.Top,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Box(
                        Modifier
                            .width(3.dp)
                            .height(40.dp)
                            .background(GzGold.copy(alpha = 0.55f), RoundedCornerShape(2.dp)),
                    )
                    Spacer(Modifier.width(8.dp))
                    Surface(
                        shape = RoundedCornerShape(topStart = 4.dp, topEnd = 18.dp, bottomStart = 18.dp, bottomEnd = 18.dp),
                        color = GzSurfaceElevated,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(
                            text = msg.text,
                            style = MaterialTheme.typography.bodyMedium.copy(color = GzTitle),
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                        )
                    }
                }
                TextButton(
                    onClick = {
                        clipboard.setText(AnnotatedString(msg.text))
                        Toast.makeText(context, "Copied", Toast.LENGTH_SHORT).show()
                    },
                    contentPadding = PaddingValues(horizontal = 4.dp, vertical = 0.dp),
                    modifier = Modifier.padding(start = 11.dp, top = 2.dp),
                ) {
                    Text(
                        "Copy response",
                        style = MaterialTheme.typography.labelSmall.copy(
                            color = GzMuted,
                            letterSpacing = 0.5.sp,
                        ),
                    )
                }
            }
        }
    }
}

@Composable
private fun TypingIndicator() {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Box(
            Modifier
                .width(3.dp)
                .height(28.dp)
                .background(GzGold.copy(alpha = 0.55f), RoundedCornerShape(2.dp)),
        )
        Spacer(Modifier.width(8.dp))
        Surface(
            shape = RoundedCornerShape(4.dp, 18.dp, 18.dp, 18.dp),
            color = GzSurfaceElevated,
        ) {
            Row(
                Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                CircularProgressIndicator(
                    modifier = Modifier.size(14.dp),
                    color = GzGold,
                    strokeWidth = 2.dp,
                )
                Text(
                    "Thinking...",
                    style = MaterialTheme.typography.bodySmall.copy(color = GzGold),
                )
            }
        }
    }
}

@Composable
private fun EmptyChatPrompt(apiKey: String) {
    Column(
        Modifier
            .fillMaxWidth()
            .padding(vertical = 48.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Text("✦", style = MaterialTheme.typography.headlineSmall.copy(color = GzGold))
        Text(
            "Chat with the Core Intelligence AI",
            style = MaterialTheme.typography.titleMedium.copy(
                color = GzGold,
                fontWeight = FontWeight.SemiBold,
            ),
            textAlign = TextAlign.Center,
        )
        Text(
            "Your full profile is loaded.\nAsk anything about your personality,\nbehaviors, or growth areas.",
            style = MaterialTheme.typography.bodySmall.copy(color = GzMuted, lineHeight = 20.sp),
            textAlign = TextAlign.Center,
        )
        if (apiKey.isBlank()) {
            Spacer(Modifier.height(4.dp))
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = MaterialTheme.colorScheme.error.copy(alpha = 0.10f),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.error.copy(alpha = 0.35f)),
                modifier = Modifier.padding(horizontal = 24.dp),
            ) {
                Text(
                    "Add GEMINI_API_KEY to local.properties, then Build → Rebuild Project.",
                    style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.error),
                    modifier = Modifier.padding(12.dp),
                    textAlign = TextAlign.Center,
                )
            }
        }
    }
}

@Composable
private fun ChatInputBar(
    value: String,
    enabled: Boolean,
    onValueChange: (String) -> Unit,
    onSend: () -> Unit,
) {
    val canSend = enabled && value.isNotBlank()
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = GzSurface,
        shadowElevation = 10.dp,
        tonalElevation = 2.dp,
        shape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.Bottom,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            OutlinedTextField(
                value = value,
                onValueChange = onValueChange,
                modifier = Modifier.weight(1f),
                enabled = enabled,
                placeholder = {
                    Text(
                        "Message Core Intelligence…",
                        style = MaterialTheme.typography.bodyMedium.copy(color = GzMuted),
                    )
                },
                singleLine = false,
                maxLines = 5,
                shape = RoundedCornerShape(16.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = GzGold.copy(alpha = 0.65f),
                    unfocusedBorderColor = GzOutline,
                    focusedContainerColor = GzSurfaceElevated,
                    unfocusedContainerColor = GzSurfaceElevated,
                    cursorColor = GzGold,
                ),
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                keyboardActions = KeyboardActions(onSend = { onSend() }),
                textStyle = MaterialTheme.typography.bodyMedium.copy(color = GzTitle),
            )

            Surface(
                onClick = onSend,
                enabled = canSend,
                shape = CircleShape,
                color = if (canSend) GzGold else GzOutline,
                modifier = Modifier
                    .size(48.dp)
                    .then(
                        if (canSend) Modifier.shadow(16.dp, CircleShape, spotColor = GzGoldGlow.copy(0.55f))
                        else Modifier,
                    ),
            ) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(
                        "▶",
                        style = MaterialTheme.typography.titleMedium.copy(
                            color = if (canSend) GzCanvas else GzMuted,
                            fontWeight = FontWeight.Black,
                        ),
                    )
                }
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// History pane
// ─────────────────────────────────────────────────────────────────────────────

@Composable
private fun HistoryPane(
    sessions: List<AiSession>,
    currentSessionId: String,
    onLoadSession: (AiSession) -> Unit,
    onDeleteSession: (String) -> Unit,
) {
    if (sessions.isEmpty()) {
        Column(
            Modifier
                .fillMaxSize()
                .padding(40.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Text("✦", style = MaterialTheme.typography.headlineSmall.copy(color = GzGold))
            Spacer(Modifier.height(16.dp))
            Text(
                "No past chats yet",
                style = MaterialTheme.typography.titleMedium.copy(
                    color = GzGold,
                    fontWeight = FontWeight.SemiBold,
                ),
            )
            Spacer(Modifier.height(8.dp))
            Text(
                "Your conversations will appear here\nafter you send your first message.",
                style = MaterialTheme.typography.bodySmall.copy(color = GzMuted),
                textAlign = TextAlign.Center,
            )
        }
        return
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        item {
            Text(
                text = "${sessions.size} saved chats",
                style = MaterialTheme.typography.bodySmall.copy(color = GzMuted),
            )
            Spacer(Modifier.height(4.dp))
        }
        itemsIndexed(sessions, key = { _, s -> s.id }) { _, session ->
            val isCurrent = session.id == currentSessionId
            Surface(
                onClick = { onLoadSession(session) },
                shape = RoundedCornerShape(16.dp),
                color = if (isCurrent) GzGold.copy(alpha = 0.09f) else GzSurfaceElevated,
                border = BorderStroke(
                    width = if (isCurrent) 1.5.dp else 1.dp,
                    color = if (isCurrent) GzGold.copy(alpha = 0.60f) else GzOutline,
                ),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Row(
                    Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 14.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(
                        Modifier
                            .width(3.dp)
                            .height(44.dp)
                            .background(
                                if (isCurrent) GzGold else GzGold.copy(alpha = 0.30f),
                                RoundedCornerShape(2.dp),
                            ),
                    )
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text(
                            session.title,
                            style = MaterialTheme.typography.bodyMedium.copy(
                                color = if (isCurrent) GzGold else GzTitle,
                                fontWeight = if (isCurrent) FontWeight.SemiBold else FontWeight.Normal,
                            ),
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Spacer(Modifier.height(4.dp))
                        Text(
                            "${session.messageCount} messages · ${relativeTime(session.lastMs)}",
                            style = MaterialTheme.typography.labelSmall.copy(color = GzMuted),
                        )
                    }
                    TextButton(
                        onClick = { onDeleteSession(session.id) },
                        contentPadding = PaddingValues(0.dp),
                        modifier = Modifier.size(36.dp),
                    ) {
                        Text("✕", style = MaterialTheme.typography.bodySmall.copy(color = GzMuted))
                    }
                }
            }
        }
    }
}

private fun relativeTime(ms: Long): String {
    val diff = System.currentTimeMillis() - ms
    val minutes = TimeUnit.MILLISECONDS.toMinutes(diff)
    val hours = TimeUnit.MILLISECONDS.toHours(diff)
    val days = TimeUnit.MILLISECONDS.toDays(diff)
    return when {
        minutes < 2 -> "Just now"
        minutes < 60 -> "${minutes}m ago"
        hours < 24 -> "${hours}h ago"
        days == 1L -> "Yesterday"
        days < 7 -> "${days}d ago"
        else -> SimpleDateFormat("MMM d", Locale.getDefault()).format(Date(ms))
    }
}
