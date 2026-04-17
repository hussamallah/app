package com.example.groundzero.results

import android.app.Activity
import android.content.ClipData
import android.content.Context
import android.content.ContextWrapper
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Rect
import android.graphics.pdf.PdfDocument
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.View
import android.view.ViewGroup
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import androidx.core.content.FileProvider
import java.io.File
import java.io.FileOutputStream
import kotlin.math.ceil
import kotlin.math.max

private const val TAG = "ProfileReportShare"

enum class ProfileShareFormat {
    /** Full multi-page PDF (same layout as print; facets may continue on page 2+). */
    FullPdf,

    /** First page only as PNG — matches the first page of the PDF export. */
    FirstPageImage,
}

private fun shareDir(context: Context): File = File(context.cacheDir, "share").also { it.mkdirs() }

private tailrec fun Context.findActivity(): Activity? = when (this) {
    is Activity -> this
    is ContextWrapper -> baseContext.findActivity()
    else -> null
}

/**
 * Renders [html] in a [WebView] attached to the window (required for layout + draw), then shares a PDF or PNG.
 * Must be called on the main thread.
 */
fun shareProfileReportFromHtml(
    context: Context,
    html: String,
    format: ProfileShareFormat,
    onDone: (success: Boolean) -> Unit,
) {
    val main = Handler(Looper.getMainLooper())
    if (Looper.myLooper() != Looper.getMainLooper()) {
        main.post { shareProfileReportFromHtml(context, html, format, onDone) }
        return
    }

    val activity = context.findActivity()
    if (activity == null) {
        Log.e(TAG, "No Activity in context chain; cannot render WebView")
        onDone(false)
        return
    }

    val dm = activity.resources.displayMetrics
    val pageWidthPx = max(320, minOf(1080, (dm.widthPixels * 0.98f).toInt()))
    val pageHeightPx = max(400, (pageWidthPx * (842f / 595f)).toInt())

    val holder = FrameLayout(activity)
    holder.visibility = View.INVISIBLE

    // Activity context is required for WebView; must be in the view hierarchy for reliable layout/draw.
    val wv = WebView(activity)
    wv.setBackgroundColor(Color.WHITE)
    wv.settings.javaScriptEnabled = false
    wv.settings.loadWithOverviewMode = true
    wv.settings.useWideViewPort = true

    holder.addView(
        wv,
        FrameLayout.LayoutParams(pageWidthPx, pageHeightPx).apply {
            gravity = android.view.Gravity.TOP or android.view.Gravity.START
        },
    )
    activity.addContentView(
        holder,
        FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT,
        ),
    )

    var cleanedUp = false
    fun cleanup() {
        if (cleanedUp) return
        cleanedUp = true
        runCatching {
            (holder.parent as? ViewGroup)?.removeView(holder)
            wv.stopLoading()
            wv.destroy()
        }
    }

    fun finish(ok: Boolean) {
        cleanup()
        onDone(ok)
    }

    wv.webViewClient = object : WebViewClient() {
        override fun onPageFinished(view: WebView, url: String?) {
            view.post {
                val widthSpec = View.MeasureSpec.makeMeasureSpec(pageWidthPx, View.MeasureSpec.EXACTLY)
                val heightSpec = View.MeasureSpec.makeMeasureSpec(50_000, View.MeasureSpec.AT_MOST)
                view.measure(widthSpec, heightSpec)
                val measuredFull = max(view.measuredHeight, view.contentHeight)
                val totalH = max(measuredFull, pageHeightPx)
                val totalPages = max(1, ceil(totalH.toDouble() / pageHeightPx.toDouble()).toInt())

                view.postDelayed({
                    when (format) {
                        ProfileShareFormat.FirstPageImage ->
                            exportFirstPagePng(activity, view, pageWidthPx, pageHeightPx) { ok -> finish(ok) }
                        ProfileShareFormat.FullPdf ->
                            exportPagedPdf(activity, view, pageWidthPx, pageHeightPx, totalPages) { ok -> finish(ok) }
                    }
                }, 200)
            }
        }

        override fun onReceivedError(
            view: WebView,
            request: WebResourceRequest,
            error: WebResourceError,
        ) {
            if (request.isForMainFrame) {
                Log.e(TAG, "WebView error: ${error.description}")
                finish(false)
            }
        }
    }

    wv.loadDataWithBaseURL("https://localhost/", html, "text/html", "UTF-8", null)
}

private fun captureViewport(webView: WebView, w: Int, h: Int): Bitmap {
    val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
    val c = Canvas(bmp)
    c.drawColor(Color.WHITE)
    webView.draw(c)
    return bmp
}

private fun exportFirstPagePng(
    activity: Activity,
    view: WebView,
    pageWidthPx: Int,
    pageHeightPx: Int,
    onDone: (Boolean) -> Unit,
) {
    try {
        view.scrollTo(0, 0)
        view.postDelayed({
            try {
                val bmp = captureViewport(view, pageWidthPx, pageHeightPx)
                val file = File(shareDir(activity), "gz_report_p1_${System.currentTimeMillis()}.png")
                FileOutputStream(file).use { os -> bmp.compress(Bitmap.CompressFormat.PNG, 92, os) }
                bmp.recycle()
                val launched = launchShareIntent(activity, file, "image/png")
                onDone(launched)
            } catch (e: Exception) {
                Log.e(TAG, "exportFirstPagePng", e)
                onDone(false)
            }
        }, 120)
    } catch (e: Exception) {
        Log.e(TAG, "exportFirstPagePng", e)
        onDone(false)
    }
}

private fun exportPagedPdf(
    activity: Activity,
    view: WebView,
    pageWidthPx: Int,
    pageHeightPx: Int,
    totalPages: Int,
    onDone: (Boolean) -> Unit,
) {
    val pdf = PdfDocument()
    var pageIdx = 0

    fun step() {
        if (pageIdx >= totalPages) {
            try {
                val file = File(shareDir(activity), "gz_report_${System.currentTimeMillis()}.pdf")
                FileOutputStream(file).use { out -> pdf.writeTo(out) }
                pdf.close()
                val launched = launchShareIntent(activity, file, "application/pdf")
                onDone(launched)
            } catch (e: Exception) {
                Log.e(TAG, "exportPagedPdf write", e)
                runCatching { pdf.close() }
                onDone(false)
            }
            return
        }
        view.scrollTo(0, pageIdx * pageHeightPx)
        view.postDelayed({
            try {
                val bmp = captureViewport(view, pageWidthPx, pageHeightPx)
                val pageInfo = PdfDocument.PageInfo.Builder(595, 842, pageIdx + 1).create()
                val page = pdf.startPage(pageInfo)
                page.canvas.drawColor(Color.WHITE)
                page.canvas.drawBitmap(bmp, null, Rect(0, 0, 595, 842), null)
                bmp.recycle()
                pdf.finishPage(page)
                pageIdx++
                step()
            } catch (e: Exception) {
                Log.e(TAG, "exportPagedPdf page $pageIdx", e)
                runCatching { pdf.close() }
                onDone(false)
            }
        }, 120)
    }
    step()
}

private fun launchShareIntent(activity: Activity, file: File, mime: String): Boolean {
    if (!file.exists() || file.length() == 0L) {
        Log.e(TAG, "Share file missing or empty: ${file.absolutePath}")
        return false
    }
    return try {
        val uri = FileProvider.getUriForFile(
            activity,
            "${activity.packageName}.fileprovider",
            file,
        )
        val send = Intent(Intent.ACTION_SEND).apply {
            type = mime
            putExtra(Intent.EXTRA_STREAM, uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            clipData = ClipData.newUri(activity.contentResolver, "Ground Zero report", uri)
        }
        val chooser = Intent.createChooser(send, "Share report")
        chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        activity.startActivity(chooser)
        true
    } catch (e: Exception) {
        Log.e(TAG, "launchShareIntent", e)
        false
    }
}
