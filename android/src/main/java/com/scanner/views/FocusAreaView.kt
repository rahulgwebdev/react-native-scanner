package com.scanner.views

import android.content.Context
import android.graphics.*
import android.util.AttributeSet
import android.view.View
import com.scanner.FrameSize

// Separate overlay view for frame drawing
class FocusAreaView : View {
  private var enableFrame: Boolean = false
  private var borderColor: Int = Color.TRANSPARENT
  private var tintColor: Int = Color.BLACK
  private var frameSize: FrameSize = FrameSize.Square(300)
  private var positionX: Float = 50f // Default center (50%)
  private var positionY: Float = 50f // Default center (50%)
  var frameRect: RectF? = null
    private set

  constructor(context: Context) : super(context) {
    setWillNotDraw(false)
  }

  constructor(context: Context, attrs: AttributeSet?) : super(context, attrs) {
    setWillNotDraw(false)
  }

  constructor(context: Context, attrs: AttributeSet?, defStyleAttr: Int) : super(context, attrs, defStyleAttr) {
    setWillNotDraw(false)
  }

  override fun onDraw(canvas: Canvas) {
    super.onDraw(canvas)

    if (enableFrame) {
      drawFrame(canvas)
    }
  }

  private fun drawFrame(canvas: Canvas) {
    // Calculate position based on percentage (0-100)
    val centerX = (width * positionX / 100f)
    val centerY = (height * positionY / 100f)

    // Calculate frame dimensions based on frameSize type
    val currentFrameSize = frameSize // Local copy to avoid smart cast issues
    val (frameWidth, frameHeight) = when (currentFrameSize) {
      is FrameSize.Square -> {
        val density = context.resources.displayMetrics.density
        val size = currentFrameSize.size * density
        size to size
      }
      is FrameSize.Rectangle -> {
        val density = context.resources.displayMetrics.density
        val width = currentFrameSize.width * density
        val height = currentFrameSize.height * density
        width to height
      }
    }

    val frameHalfWidth = frameWidth / 2f
    val frameHalfHeight = frameHeight / 2f

    // Calculate frame rectangle with custom position
    frameRect = RectF(
      centerX - frameHalfWidth,
      centerY - frameHalfHeight,
      centerX + frameHalfWidth,
      centerY + frameHalfHeight
    )

    // Draw semi-transparent overlay
    val overlayPaint = Paint().apply {
      color = tintColor
      alpha = 128
    }

    // Draw overlay with transparent rectangle
    canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), overlayPaint)

    // Clear the frame area
    val clearPaint = Paint().apply {
      color = Color.TRANSPARENT
      xfermode = PorterDuffXfermode(PorterDuff.Mode.CLEAR)
    }
    canvas.drawRect(frameRect!!, clearPaint)

    // Draw frame border only if color is not transparent
    if (borderColor != Color.TRANSPARENT) {
      val borderPaint = Paint().apply {
        color = borderColor
        style = Paint.Style.STROKE
        strokeWidth = 4f
      }
      canvas.drawRect(frameRect!!, borderPaint)
    }
  }

  fun setEnableFrame(enable: Boolean) {
    enableFrame = enable
    invalidate()
  }

  fun setBorderColor(color: Int) {
    borderColor = color
    invalidate()
  }

  fun setTintColor(color: Int) {
    tintColor = color
    invalidate()
  }

  fun setFrameSize(size: FrameSize) {
    frameSize = size
    invalidate()
  }

  fun setPosition(x: Float, y: Float) {
    positionX = x.coerceIn(0f, 100f) // Clamp to 0-100 range
    positionY = y.coerceIn(0f, 100f) // Clamp to 0-100 range
    invalidate()
  }
}