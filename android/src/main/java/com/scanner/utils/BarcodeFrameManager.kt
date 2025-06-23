package com.scanner.utils

import android.graphics.RectF
import android.util.Log
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit

/**
 * Manages barcode frames with efficient cleanup scheduling.
 * Only schedules cleanup when there are active frames to monitor.
 */
class BarcodeFrameManager {
  companion object {
    private const val FRAME_TIMEOUT_MS = 1000L // 1 second timeout
    private const val CLEANUP_DELAY_MS = 1000L // 1 second delay before cleanup
    const val TAG = "BarcodeFrameManager"
  }

  // Thread-safe map to store active barcode frames
  private val activeBarcodeFrames = ConcurrentHashMap<String, BarcodeFrame>()

  // Executor for cleanup scheduling
  private val cleanupExecutor: ScheduledExecutorService =
    Executors.newSingleThreadScheduledExecutor()

  // Current cleanup task (if any)
  private var currentCleanupTask: java.util.concurrent.ScheduledFuture<*>? = null

  // Callback to update the display
  private var onFramesChanged: (() -> Unit)? = null

  /**
   * Data class representing a barcode frame with its position and last seen time
   */
  data class BarcodeFrame(
    val rect: RectF,
    val lastSeenTime: Long
  )

  /**
   * Set callback to be called when frames change
   */
  fun setOnFramesChangedListener(listener: () -> Unit) {
    onFramesChanged = listener
  }

  /**
   * Update barcode frames with new detections
   */
  fun updateBarcodeFrames(barcodeFrames: Map<String, RectF>) {
    val currentTime = System.currentTimeMillis()
    val currentBarcodeValues = mutableSetOf<String>()

    // Update existing frames or add new ones
    barcodeFrames.forEach { (barcodeValue, rect) ->
      currentBarcodeValues.add(barcodeValue)
      activeBarcodeFrames[barcodeValue] = BarcodeFrame(
        rect = rect,
        lastSeenTime = currentTime
      )
    }

    // Remove frames for barcodes no longer visible
    val framesToRemove = activeBarcodeFrames.keys.filter { it !in currentBarcodeValues }
    framesToRemove.forEach { barcodeValue ->
      activeBarcodeFrames.remove(barcodeValue)
    }

    // Schedule cleanup if we have frames and no cleanup is currently scheduled
    if (activeBarcodeFrames.isNotEmpty() && currentCleanupTask?.isDone != false) {
      scheduleCleanup()
    }

    // Notify display update
    onFramesChanged?.invoke()
  }

  /**
   * Get current active frames for display
   */
  fun getActiveFrames(): List<RectF> {
    return activeBarcodeFrames.values.map { it.rect }
  }

  /**
   * Get count of active frames
   */
//    fun getActiveFrameCount(): Int {
//        return activeBarcodeFrames.size
//    }

  /**
   * Schedule cleanup of stale frames
   */
  private fun scheduleCleanup() {
    // Cancel any existing cleanup task
    currentCleanupTask?.cancel(false)

    // Schedule new cleanup task
    currentCleanupTask = cleanupExecutor.schedule({
      cleanupStaleFrames()
    }, CLEANUP_DELAY_MS, TimeUnit.MILLISECONDS)

    Log.d(TAG, "Scheduled cleanup in ${CLEANUP_DELAY_MS}ms for ${activeBarcodeFrames.size} frames")
  }

  /**
   * Clean up stale frames and reschedule if needed
   */
  private fun cleanupStaleFrames() {
    val currentTime = System.currentTimeMillis()
    val framesToRemove = mutableListOf<String>()

    activeBarcodeFrames.forEach { (barcodeValue, frame) ->
      if (currentTime - frame.lastSeenTime > FRAME_TIMEOUT_MS) {
        framesToRemove.add(barcodeValue)
      }
    }

    if (framesToRemove.isNotEmpty()) {
      framesToRemove.forEach { barcodeValue ->
        activeBarcodeFrames.remove(barcodeValue)
      }

      Log.d(TAG, "Removed ${framesToRemove.size} stale barcode frames")
      onFramesChanged?.invoke()
    }

    // Reschedule cleanup if there are still frames to monitor
    if (activeBarcodeFrames.isNotEmpty()) {
      scheduleCleanup()
    } else {
      Log.d(TAG, "No more frames to monitor, stopping cleanup")
    }
  }

  /**
   * Clear all frames immediately
   */
  fun clearAllFrames() {
    val frameCount = activeBarcodeFrames.size
    activeBarcodeFrames.clear()
    currentCleanupTask?.cancel(false)

    if (frameCount > 0) {
      Log.d(TAG, "Cleared all $frameCount barcode frames")
      onFramesChanged?.invoke()
    }
  }

  /**
   * Shutdown the manager and cleanup resources
   */
  fun shutdown() {
    currentCleanupTask?.cancel(false)
    cleanupExecutor.shutdown()
    try {
      if (!cleanupExecutor.awaitTermination(1, TimeUnit.SECONDS)) {
        cleanupExecutor.shutdownNow()
      }
    } catch (e: InterruptedException) {
      cleanupExecutor.shutdownNow()
      Thread.currentThread().interrupt()
    }
    Log.d(TAG, "BarcodeFrameManager shutdown complete")
  }

}
