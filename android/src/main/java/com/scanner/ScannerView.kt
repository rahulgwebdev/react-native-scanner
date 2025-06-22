package com.scanner

import android.content.Context
import android.graphics.*
import android.util.AttributeSet
import android.util.Log
import android.util.Size
import android.view.Surface
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.annotation.OptIn
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.uimanager.ThemedReactContext
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class ScannerView : FrameLayout {
  private var cameraProvider: ProcessCameraProvider? = null
  private var camera: androidx.camera.core.Camera? = null
  private var imageAnalyzer: ImageAnalysis? = null
  private var preview: Preview? = null
  private var cameraExecutor: ExecutorService = Executors.newSingleThreadExecutor()
  private var barcodeScanner = BarcodeScanning.getClient()
  private var previewView: PreviewView? = null
  private var overlayView: FrameOverlayView? = null

  // Frame configuration
  private var enableFrame: Boolean = false
  private var frameColor: Int = Color.WHITE
  private var frameSize: Int = 350 // Updated default frame size

  // React context for event emission
  private var reactContext: ThemedReactContext? = null

  private var zoom: Float = 1.0f
  private var torchEnabled: Boolean = false
  private var isScanningPaused: Boolean = false

  constructor(context: Context) : super(context) {
    initScannerView(context)
  }

  constructor(context: Context, attrs: AttributeSet?) : super(context, attrs) {
    initScannerView(context)
  }

  constructor(context: Context, attrs: AttributeSet?, defStyleAttr: Int) : super(
    context,
    attrs,
    defStyleAttr
  ) {
    initScannerView(context)
  }

  private fun initScannerView(context: Context) {
    if (context is ThemedReactContext) {
      reactContext = context
    }

    previewView = PreviewView(context).apply {
        layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
        scaleType = PreviewView.ScaleType.FILL_CENTER
        implementationMode = PreviewView.ImplementationMode.PERFORMANCE
        // setBackgroundColor(Color.RED) // Optional: for debugging layout
    }
    installHierarchyFitter(previewView!!)
    addView(previewView)

    // Create overlay view for frame drawing
    overlayView = FrameOverlayView(context).apply {
      layoutParams = LayoutParams(
        LayoutParams.MATCH_PARENT,
        LayoutParams.MATCH_PARENT
      )
    }
    addView(overlayView)
  }

  private fun installHierarchyFitter(view: ViewGroup) {
    if (context is ThemedReactContext) { // only react-native setup
      view.setOnHierarchyChangeListener(object : ViewGroup.OnHierarchyChangeListener{
        override fun onChildViewRemoved(parent: View?, child: View?) = Unit
        override fun onChildViewAdded(parent: View?, child: View?) {
          parent?.measure(
            View.MeasureSpec.makeMeasureSpec(measuredWidth, View.MeasureSpec.EXACTLY),
            View.MeasureSpec.makeMeasureSpec(measuredHeight, View.MeasureSpec.EXACTLY)
          )
          parent?.layout(0, 0, parent.measuredWidth, parent.measuredHeight)
        }
      })
    }
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    Log.d("ScannerView", "View attached to window, starting camera directly")
    startCamera()
  }

  override fun onDetachedFromWindow() {
    super.onDetachedFromWindow()
    stopCamera()
  }

  private fun startCamera() {
    Log.d("ScannerView", "Starting camera...")

    if (!hasCameraPermission()) {
      Log.e("ScannerView", "Camera permission not granted")
      return
    }

    val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
    cameraProviderFuture.addListener({
      try {
        cameraProvider = cameraProviderFuture.get()
        Log.d("ScannerView", "CameraProvider obtained")

        previewView?.post {
          Log.d("ScannerView", "Binding camera use cases on UI thread")
          bindCameraUseCases()
        }
      } catch (e: Exception) {
        Log.e("ScannerView", "Failed to initialize camera", e)
      }
//    }, ContextCompat.getMainExecutor(context))
    }, cameraExecutor)
  }

  private fun stopCamera() {
    cameraProvider?.unbindAll()
    cameraExecutor.shutdown()
    barcodeScanner.close()
  }

  private fun bindCameraUseCases() {
    val cameraProvider = cameraProvider ?: run {
      Log.e("ScannerView", "Camera provider not available for binding.")
      return
    }
    val lifecycleOwner = reactContext?.currentActivity as? LifecycleOwner ?: run {
      Log.e("ScannerView", "No LifecycleOwner available for binding.")
      return
    }

    // Unbind any previous use cases first
    cameraProvider.unbindAll()

    try {
      val surfaceProvider = previewView?.surfaceProvider
      if (surfaceProvider == null) {
        Log.e("ScannerView", "SurfaceProvider is null! Cannot bind.")
        return
      }

      // Preview
      preview = Preview.Builder()
        .setTargetRotation(previewView?.display?.rotation ?: Surface.ROTATION_0)
        .build()
        .also {
          it.setSurfaceProvider(surfaceProvider)
        }

      // Image Analysis
      imageAnalyzer = ImageAnalysis.Builder()
        .setTargetResolution(Size(1280, 720))
        .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
        .build()
        .also {
          it.setAnalyzer(cameraExecutor) { imageProxy ->
            processImage(imageProxy)
          }
        }

      // Select back camera as default
      val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA

      // Bind use cases to camera
      camera = cameraProvider.bindToLifecycle(
        lifecycleOwner,
        cameraSelector,
        preview,
        imageAnalyzer
      )

      // Set up torch and zoom
      camera?.cameraControl?.enableTorch(torchEnabled)
      setZoom(zoom)

    } catch (exc: Exception) {
      Log.e("ScannerView", "Use case binding failed", exc)
    }
  }

  @OptIn(ExperimentalGetImage::class)
  private fun processImage(imageProxy: ImageProxy) {
    try {
      // Skip processing if scanning is paused
      if (isScanningPaused) {
        imageProxy.close()
        return
      }

      val mediaImage = imageProxy.image
      if (mediaImage != null && previewView != null) {
        val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
        val transformationInfo = ImageAnalysisTransformationInfo(
          resolution = Size(imageProxy.width, imageProxy.height),
          rotationDegrees = imageProxy.imageInfo.rotationDegrees
        )

        barcodeScanner.process(image)
          .addOnSuccessListener { barcodes ->
            if (barcodes.isNotEmpty()) {
              val barcode = barcodes[0]
              val frame = overlayView?.frameRect
              val barcodeBox = barcode.boundingBox

              if (frame != null && barcodeBox != null) {
                val transformedBarcodeBox = transformBarcodeBoundingBox(barcodeBox, transformationInfo, previewView!!)
                if (frame.contains(transformedBarcodeBox)) {
                  Log.d("ScannerView", "Barcode detected inside frame: ${barcode.rawValue}")
                  isScanningPaused = true // Pause scanning to prevent multiple scans

                  val eventData = Arguments.createMap().apply {
                    putString("data", barcode.rawValue)
                    putString("format", barcode.format.toString())
                    putDouble("timestamp", System.currentTimeMillis().toDouble())
                  }

                  val ctx = reactContext
                  if (ctx is com.facebook.react.uimanager.ThemedReactContext) {
                    ctx.runOnUiQueueThread {
                      ctx
                        .getJSModule(com.facebook.react.uimanager.events.RCTEventEmitter::class.java)
                        .receiveEvent(this@ScannerView.id, "onBarcodeScanned", eventData)
                    }
                  }
                } else {
                    Log.d("ScannerView", "Barcode detected outside frame. Ignoring. Frame: $frame, Barcode box (transformed): $transformedBarcodeBox")
                }
              }
            }
          }
          .addOnFailureListener { e ->
            Log.e("ScannerView", "Barcode scanning failed", e)
          }
          .addOnCompleteListener {
            imageProxy.close()
          }
      } else {
        imageProxy.close()
      }
    } catch (e: Exception) {
      Log.e("ScannerView", "Error processing image", e)
      imageProxy.close()
    }
  }

  // Frame setter methods
  fun setEnableFrame(enable: Boolean) {
    enableFrame = enable
    overlayView?.setEnableFrame(enable)
  }

  fun setFrameColor(color: String) {
    try {
      frameColor = Color.parseColor(color)
      overlayView?.setFrameColor(frameColor)
    } catch (e: Exception) {
      Log.e("ScannerView", "Invalid color format: $color")
    }
  }

  fun setFrameSize(size: Int) {
    frameSize = size
    overlayView?.setFrameSize(size)
  }

  fun setZoom(zoom: Float) {
    this.zoom = zoom
    // Apply zoom, respecting the device's limits
    val zoomState = camera?.cameraInfo?.zoomState?.value
    if (zoomState != null) {
        val newZoom = zoom.coerceIn(zoomState.minZoomRatio, zoomState.maxZoomRatio)
        camera?.cameraControl?.setZoomRatio(newZoom)
        Log.d("ScannerView", "Setting zoom to $newZoom (requested $zoom)")
    } else {
        camera?.cameraControl?.setZoomRatio(zoom)
    }
  }

  fun setTorch(enabled: Boolean) {
    torchEnabled = enabled
    camera?.cameraControl?.enableTorch(enabled)
    Log.d("ScannerView", "Torch ${if (enabled) "enabled" else "disabled"}")
  }

  fun resumeScanning() {
    isScanningPaused = false
    Log.d("ScannerView", "Scanning resumed")
  }

  fun pauseScanning() {
    isScanningPaused = true
    Log.d("ScannerView", "Scanning paused")
  }

  private fun hasCameraPermission(): Boolean {
    return context.checkSelfPermission(android.Manifest.permission.CAMERA) == android.content.pm.PackageManager.PERMISSION_GRANTED
  }
}

private data class ImageAnalysisTransformationInfo(
  val resolution: Size,
  val rotationDegrees: Int
)

private fun transformBarcodeBoundingBox(
  barcodeBoundingBox: Rect,
  imageAnalysisInfo: ImageAnalysisTransformationInfo,
  previewView: View
): RectF {
  // Get image analysis resolution and rotation
  val imageWidth = imageAnalysisInfo.resolution.width
  val imageHeight = imageAnalysisInfo.resolution.height
  val imageRotation = imageAnalysisInfo.rotationDegrees

  // Adjust for rotation
  val (rotatedWidth, rotatedHeight) = if (imageRotation == 90 || imageRotation == 270) {
    imageHeight to imageWidth
  } else {
    imageWidth to imageHeight
  }

  // Get preview view dimensions
  val viewWidth = previewView.width
  val viewHeight = previewView.height

  // Calculate scale factors
  val scaleX = viewWidth.toFloat() / rotatedWidth
  val scaleY = viewHeight.toFloat() / rotatedHeight
  val scale = maxOf(scaleX, scaleY) // For FILL_CENTER

  // Calculate offsets
  val offsetX = (viewWidth - rotatedWidth * scale) / 2
  val offsetY = (viewHeight - rotatedHeight * scale) / 2

  // Transform the bounding box
  val transformedRect = RectF(barcodeBoundingBox)
  transformedRect.left = transformedRect.left * scale + offsetX
  transformedRect.top = transformedRect.top * scale + offsetY
  transformedRect.right = transformedRect.right * scale + offsetX
  transformedRect.bottom = transformedRect.bottom * scale + offsetY

  return transformedRect
}

// Separate overlay view for frame drawing
class FrameOverlayView : View {
  private var enableFrame: Boolean = false
  private var frameColor: Int = Color.WHITE
  private var frameSize: Int = 350 // Updated default frame size
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
    val centerX = width / 2f
    val centerY = height / 2f

    // Option 1: Convert logical pixels to physical pixels using device density
    val density = context.resources.displayMetrics.density
    val frameSizePhysical = (frameSize * density)

    // Option 2: Make frame size relative to screen (uncomment to use)
    // val screenSize = minOf(width, height)
    // val frameSizePhysical = (screenSize * frameSize / 100f).toInt()

    val frameHalfSize = frameSizePhysical / 2f

    // Calculate frame rectangle
    frameRect = RectF(
      centerX - frameHalfSize,
      centerY - frameHalfSize,
      centerX + frameHalfSize,
      centerY + frameHalfSize
    )

    // Draw semi-transparent overlay
    val overlayPaint = Paint().apply {
      color = Color.BLACK
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

    // Draw frame border
    val borderPaint = Paint().apply {
      color = frameColor
      style = Paint.Style.STROKE
      strokeWidth = 4f
    }
    canvas.drawRect(frameRect!!, borderPaint)
  }

  fun setEnableFrame(enable: Boolean) {
    enableFrame = enable
    invalidate()
  }

  fun setFrameColor(color: Int) {
    frameColor = color
    invalidate()
  }

  fun setFrameSize(size: Int) {
    frameSize = size
    invalidate()
  }
}
