package com.example.groundzero.assessment

import android.content.Context
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp

/**
 * Mirrors web archetype meta (`title`, `img` like `/sovereign.png`, `desc` flight copy) + short hint for taglines.
 *
 * **Images:** PNGs from the web `public/` folder are mirrored into `res/drawable-nodpi/` (lowercase id;
 * hyphens in ids use underscores, e.g. `the_axis.png`). Sentinel uses `the_axis` (same asset as web `the-axis.png`).
 * [ArchetypeImage] loads them via `R.drawable`. If a drawable is missing, a letter placeholder is shown.
 */
data class ArchetypeBlurb(
    val title: String,
    val desc: String,
    val hint: String,
)

object ArchetypeCatalog {
    private val byId = mapOf(
        "sovereign" to ArchetypeBlurb(
            title = "Sovereign",
            desc = "I rise in direct ascent, wings locked, owning the sky. Nothing above me but the sun itself.",
            hint = "Lead with structure, authority, and decisive pace",
        ),
        "rebel" to ArchetypeBlurb(
            title = "Rebel",
            desc = "I twist through air in erratic bursts, sharp turns breaking every pattern mid-flight. Order means nothing to me.",
            hint = "Break constraints; favor independence over consensus",
        ),
        "visionary" to ArchetypeBlurb(
            title = "Visionary",
            desc = "I carve long arcs forward, eyes set on horizons no one else has seen yet. My body lives in tomorrow's wind.",
            hint = "Invent through ideas; pull toward unseen horizons",
        ),
        "navigator" to ArchetypeBlurb(
            title = "Navigator",
            desc = "I glide across endless distances, adjusting course through every crosswind. Storm or calm, I find the way.",
            hint = "Guide through change; adjust course with people",
        ),
        "guardian" to ArchetypeBlurb(
            title = "Guardian",
            desc = "I circle wide, watching, shielding the formation. Approach with peace and I stay graceful; threaten and I rise fierce.",
            hint = "Protect the formation; push momentum when needed",
        ),
        "seeker" to ArchetypeBlurb(
            title = "Seeker",
            desc = "I dive with piercing precision, cutting through veils and illusions. What lies beneath is mine to uncover.",
            hint = "Cut through noise; dig for the underlying truth",
        ),
        "architect" to ArchetypeBlurb(
            title = "Architect",
            desc = "I climb in measured steps, every angle chosen, every strand reinforced. My flight builds as much as it moves.",
            hint = "Design and build systems; deliberate and precise",
        ),
        "spotlight" to ArchetypeBlurb(
            title = "Spotlight",
            desc = "I spiral upward, radiant, all eyes pulled to my shimmer. Flight is my stage, the sky my mirror.",
            hint = "Energize the room; pull focus and lift morale",
        ),
        "diplomat" to ArchetypeBlurb(
            title = "Diplomat",
            desc = "I weave gently through the currents, smoothing turbulence, easing the path of those beside me.",
            hint = "Smooth turbulence; connect through empathy",
        ),
        "partner" to ArchetypeBlurb(
            title = "Partner",
            desc = "I fly in water if not in sky, always wing-to-wing, never breaking from the one I've chosen.",
            hint = "Stabilize the group; keep the lane steady",
        ),
        "provider" to ArchetypeBlurb(
            title = "Provider",
            desc = "I lift with strength enough for others, carrying their weight in my draft. My currents are never just for me.",
            hint = "Carry the load; reliability for others",
        ),
        "catalyst" to ArchetypeBlurb(
            title = "Catalyst",
            desc = "I explode off the air in impossible speed, scattering stillness, igniting motion where none existed.",
            hint = "Scatter stillness; ignite motion where none existed",
        ),
        "vessel" to ArchetypeBlurb(
            title = "Vessel",
            desc = "I stroke the air in slow, deliberate movements, each motion refined, each landing an act of grace.",
            hint = "Move with grace; keep peace and composure",
        ),
        "sentinel" to ArchetypeBlurb(
            title = "Sentinel",
            desc = "I hold position at the edge of the storm, every feather braced, every sensor calibrated. I do not leave my post.",
            hint = "Hold the line; vigilance is the strategy",
        ),
    )

    fun get(id: String): ArchetypeBlurb =
        byId[id] ?: ArchetypeBlurb(title = id.replaceFirstChar { it.uppercase() }, desc = "", hint = "")

    fun drawableResId(context: Context, id: String): Int {
        val key = when (id.lowercase()) {
            "sentinel" -> "the_axis"
            else -> id.lowercase().replace('-', '_')
        }
        return context.resources.getIdentifier(key, "drawable", context.packageName)
    }
}

@Composable
fun ArchetypeImage(
    archetypeId: String,
    modifier: Modifier = Modifier,
    contentDescription: String? = null,
    /** Use [ContentScale.Crop] in tight cards so `public/` art fills the frame without letterboxing. */
    contentScale: ContentScale = ContentScale.Fit,
) {
    val ctx = LocalContext.current
    val resId = remember(archetypeId) { ArchetypeCatalog.drawableResId(ctx, archetypeId) }
    val label = ArchetypeCatalog.get(archetypeId).title
    if (resId != 0) {
        Image(
            painter = painterResource(resId),
            contentDescription = contentDescription ?: label,
            modifier = modifier.clip(RoundedCornerShape(12.dp)),
            contentScale = contentScale,
        )
    } else {
        Box(
            modifier
                .clip(RoundedCornerShape(12.dp))
                .background(MaterialTheme.colorScheme.surfaceVariant),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = label.take(2).uppercase(),
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}
