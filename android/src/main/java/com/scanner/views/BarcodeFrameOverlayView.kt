package com.scanner.views

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.util.AttributeSet
import android.view.View

class BarcodeFrameOverlayView : View {

  private var barcodeBoxes: List<RectF> = emptyList()
  private val paint = Paint().apply {
    color = Color.YELLOW
    style = Paint.Style.STROKE
    strokeWidth = 5f
  }

  constructor(context: Context) : super(context) {
    setWillNotDraw(false)
  }

  constructor(context: Context, attrs: AttributeSet?) : super(context, attrs) {
    setWillNotDraw(false)
  }

  constructor(context: Context, attrs: AttributeSet?, defStyleAttr: Int) : super(context, attrs, defStyleAttr) {
    setWillNotDraw(false)
  }

  fun setBarcodeBoxes(boxes: List<RectF>) {
    this.barcodeBoxes = boxes
    postInvalidate()
  }

  override fun onDraw(canvas: Canvas) {
    super.onDraw(canvas)
    for (box in barcodeBoxes) {
      canvas.drawRect(box, paint)
    }
  }
}
