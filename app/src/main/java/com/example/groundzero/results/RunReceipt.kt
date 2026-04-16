package com.example.groundzero.results

import java.security.MessageDigest

/** Client-side receipt like web fallback: `sha256Hex(stableStringify(results)).slice(0,24)`. */
fun sha256HexPrefix24(utf8: String): String {
    val digest = MessageDigest.getInstance("SHA-256").digest(utf8.toByteArray(Charsets.UTF_8))
    return digest.joinToString("") { b -> "%02x".format(b) }.take(24)
}
