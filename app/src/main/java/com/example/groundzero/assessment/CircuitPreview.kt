package com.example.groundzero.assessment

import kotlin.math.max
import kotlin.math.min

/** Mirrors `getCircuitInfo` in GZFinalAssessment.tsx */
data class CircuitInfo(
    val name: String,
    val value: Double,
    val level: String,
    val description: String,
)

fun getCircuitInfo(
    name: String,
    value: Double,
): CircuitInfo {
    var level = "Medium"
    if (value > 0.33) level = "High"
    else if (value < -0.33) level = "Low"

    val description = when (name) {
        "Energy" -> when (level) {
            "High" -> "You are driven by a need for action and momentum, but you risk burnout if you don't build in recovery periods."
            "Low" -> "You conserve energy and prefer steady, sustainable rhythms. Make sure you're not missing opportunities for growth."
            else -> "Your energy flow is balanced."
        }
        "Clarity" -> when (level) {
            "High" -> "You are highly open to new ideas and experiences, which fuels your creativity."
            "Low" -> "You prefer concrete facts and familiar routines, providing stability."
            else -> "You balance imagination with practicality."
        }
        "Structure" -> when (level) {
            "High" -> "You are disciplined and organized, which helps you execute long-term plans."
            "Low" -> "You are flexible and spontaneous, able to adapt to changing circumstances."
            else -> "You can be organized when needed, but are not rigid."
        }
        "Bond" -> when (level) {
            "High" -> "You are cooperative and empathetic, which helps you build strong relationships."
            "Low" -> "You are independent and skeptical, which protects you from being taken advantage of."
            else -> "You are agreeable but maintain healthy boundaries."
        }
        "Drive" -> when (level) {
            "High" -> "You are emotionally stable and resilient, allowing you to pursue goals without being derailed by stress."
            "Low" -> "You are sensitive to stress, which can be a powerful motivator for change if channeled correctly."
            else -> "You experience a normal range of emotions, both positive and negative."
        }
        else -> ""
    }
    return CircuitInfo(name = "$name Circuit", value = value, level = level, description = description)
}

fun circuitForDomain(
    domain: String,
    domainMean: Double,
): CircuitInfo {
    val v = max(-1.0, min(1.0, (domainMean - 3.0) / 2.0))
    return when (domain) {
        "O" -> getCircuitInfo("Clarity", v)
        "C" -> getCircuitInfo("Structure", v)
        "E" -> getCircuitInfo("Energy", v)
        "A" -> getCircuitInfo("Bond", v)
        "N" -> getCircuitInfo("Drive", max(-1.0, min(1.0, (3.0 - domainMean) / 2.0)))
        else -> getCircuitInfo("Clarity", 0.0)
    }
}
