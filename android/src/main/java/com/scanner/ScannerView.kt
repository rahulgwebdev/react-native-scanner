package com.scanner

import android.content.Context
import android.graphics.*
import android.util.AttributeSet
import android.util.Log
import android.util.Rational
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
import com.facebook.react.uimanager.ThemedReactContext
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import com.scanner.utils.BarcodeFrameManager
import com.scanner.views.FrameOverlayView
import com.scanner.views.BarcodeFrameOverlayView
import androidx.core.graphics.toColorInt
import com.facebook.react.uimanager.events.RCTEventEmitter

class ScannerView : FrameLayout {
  companion object {
    const val TAG = "ScannerView"
  }

  private var cameraProvider: ProcessCameraProvider? = null
  private var camera: androidx.camera.core.Camera? = null
  private var imageAnalyzer: ImageAnalysis? = null
  private var preview: Preview? = null
  private var cameraExecutor: ExecutorService = Executors.newSingleThreadExecutor()
  private var barcodeScanner = BarcodeScanning.getClient()
  private var previewView: PreviewView? = null
  private var overlayView: FrameOverlayView? = null
  private var barcodeFrameOverlayView: BarcodeFrameOverlayView? = null

  // Frame configuration
  private var enableFrame: Boolean = false
  private var frameColor: Int = Color.WHITE
  private var frameSize: FrameSize = FrameSize.Square(300)
  private var barcodeFrameConfigs: List<BarcodeFrameConfig> = emptyList()
  private var showBarcodeFramesOnlyInFrame: Boolean = false

  // React context for event emission
  private var reactContext: ThemedReactContext? = null

  private var zoom: Float = 1.0f
  private var torchEnabled: Boolean = false
  private var isScanningPaused: Boolean = false

  // Throttling
  private var throttleMs: Int = 300
  private var lastScannedBarcodeValue: String? = null
  private var lastScannedBarcodeTimestamp: Long = 0

  // Barcode frame management
  private val barcodeFrameManager = BarcodeFrameManager()

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

    // Create overlay view for barcode frame drawing
    barcodeFrameOverlayView = BarcodeFrameOverlayView(context).apply {
      layoutParams = LayoutParams(
        LayoutParams.MATCH_PARENT,
        LayoutParams.MATCH_PARENT
      )
    }
    addView(barcodeFrameOverlayView)

    // Set up barcode frame manager
    setupBarcodeFrameManager()
  }

  private fun setupBarcodeFrameManager() {
    barcodeFrameManager.setOnFramesChangedListener {
      // Update the overlay view with current frames
      val currentFrames = barcodeFrameManager.getActiveFrames()
      barcodeFrameOverlayView?.setBarcodeBoxes(currentFrames)
    }
  }

  private fun installHierarchyFitter(view: ViewGroup) {
    if (context is ThemedReactContext) { // only react-native setup
      view.setOnHierarchyChangeListener(object : OnHierarchyChangeListener {
        override fun onChildViewRemoved(parent: View?, child: View?) = Unit
        override fun onChildViewAdded(parent: View?, child: View?) {
          parent?.measure(
            MeasureSpec.makeMeasureSpec(measuredWidth, MeasureSpec.EXACTLY),
            MeasureSpec.makeMeasureSpec(measuredHeight, MeasureSpec.EXACTLY)
          )
          parent?.layout(0, 0, parent.measuredWidth, parent.measuredHeight)
        }
      })
    }
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    Log.d(TAG, "View attached to window, starting camera directly")
    startCamera()
  }

  override fun onDetachedFromWindow() {
    super.onDetachedFromWindow()
    stopCamera()
    barcodeFrameManager.shutdown()
  }

  private fun startCamera() {
    Log.d(TAG, "Starting camera...")

    if (!hasCameraPermission()) {
      Log.e(TAG, "Camera permission not granted")
      return
    }

    val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
    cameraProviderFuture.addListener({
      try {
        cameraProvider = cameraProviderFuture.get()
        Log.d(TAG, "CameraProvider obtained")

        previewView?.post {
          Log.d(TAG, "Binding camera use cases on UI thread")
          bindCameraUseCases()
        }
      } catch (e: Exception) {
        Log.e(TAG, "Failed to initialize camera", e)
      }
//    }, ContextCompat.getMainExecutor(context))
    }, cameraExecutor)
  }

  private fun stopCamera() {
    camera?.cameraControl?.cancelFocusAndMetering()
    cameraProvider?.unbindAll()
    cameraExecutor.shutdown()
    barcodeScanner.close()

    Log.e(TAG, "Camera stopped.")
  }

  private fun bindCameraUseCases() {
    val cameraProvider = cameraProvider ?: run {
      Log.e(TAG, "Camera provider not available for binding.")
      return
    }
    val lifecycleOwner = reactContext?.currentActivity as? LifecycleOwner ?: run {
      Log.e(TAG, "No LifecycleOwner available for binding.")
      return
    }

    // Unbind any previous use cases first
    cameraProvider.unbindAll()

    try {
      val surfaceProvider = previewView?.surfaceProvider
      if (surfaceProvider == null) {
        Log.e(TAG, "SurfaceProvider is null! Cannot bind.")
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
//        .setTargetResolution(Size(1280, 720)) // review this later if needed
        .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
        .build()
        .also {
          it.setAnalyzer(cameraExecutor) { imageProxy ->
            processImage(imageProxy)
          }
        }

      // Select back camera as default
      val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA

      // Create a ViewPort that matches the PreviewView
      val viewPort = ViewPort.Builder(
        Rational(previewView!!.width, previewView!!.height),
        previewView!!.display.rotation
      )
        .setScaleType(ViewPort.FILL_CENTER) // or FIT_CENTER as needed
        .build()

      // Create a UseCaseGroup with the ViewPort
      val useCaseGroup = UseCaseGroup.Builder()
        .addUseCase(preview!!)
        .addUseCase(imageAnalyzer!!)
        .setViewPort(viewPort)
        .build()

      // Bind use cases to camera
      camera = cameraProvider.bindToLifecycle(
        lifecycleOwner,
        cameraSelector,
        useCaseGroup
      )

      // Set up torch and zoom
      camera?.cameraControl?.enableTorch(torchEnabled)
      setZoom(zoom)

      // Set up auto-focus on frame center
      setupAutoFocusOnFrame()

    } catch (exc: Exception) {
      Log.e(TAG, "Use case binding failed", exc)
    }
  }

  private fun setupAutoFocusOnFrame() {
    if (!enableFrame) return

    val frame = overlayView?.frameRect ?: return
    val centerX = frame.centerX()
    val centerY = frame.centerY()

    val viewWidth = previewView?.width ?: return
    val viewHeight = previewView?.height ?: return

    val normalizedX = centerX / viewWidth
    val normalizedY = centerY / viewHeight

    val meteringPointFactory = previewView?.meteringPointFactory ?: return
    val afPoint = meteringPointFactory.createPoint(normalizedX, normalizedY)

    val focusAction = FocusMeteringAction.Builder(afPoint, FocusMeteringAction.FLAG_AF)
      .disableAutoCancel() // Optional: maintain focus
      .build()

    camera?.cameraControl?.startFocusAndMetering(focusAction)
      ?.addListener({
        Log.d(TAG, "Auto-focus to frame center triggered")
      }, ContextCompat.getMainExecutor(context))
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
            // Update barcode frames for all detected barcodes
            updateBarcodeFrames(barcodes, transformationInfo)

            // Process barcode detection for the main scanning logic
            if (barcodes.isNotEmpty()) {
              val barcode = barcodes[0]
              val frame = overlayView?.frameRect
              val barcodeBox = barcode.boundingBox

              if (frame != null && barcodeBox != null && !isScanningPaused) {
                val currentTime = System.currentTimeMillis()
                val barcodeValue = barcode.rawValue
                // Log.d("ScannerView throttleMs", throttleMs.toString());
                // Check throttling first to avoid expensive frame.contains check
                if (barcodeValue == lastScannedBarcodeValue && currentTime - lastScannedBarcodeTimestamp < throttleMs) {
                  // Same barcode within throttle period, skip
                  return@addOnSuccessListener
                }

                // Update throttling state
                lastScannedBarcodeValue = barcodeValue
                lastScannedBarcodeTimestamp = currentTime
                Log.d("ScannerView", "Barcode detected inside frame: $barcodeValue")

                val transformedBarcodeBox =
                  transformBarcodeBoundingBox(barcodeBox, transformationInfo, previewView!!)
                if (frame.contains(transformedBarcodeBox)) {


                  val eventData = Arguments.createMap().apply {
                    putString("data", barcode.rawValue)
                    putString("format", barcode.format.toString())
                    putDouble("timestamp", System.currentTimeMillis().toDouble())
                  }

                  val ctx = reactContext
                  if (ctx is ThemedReactContext) {
                    ctx.runOnUiQueueThread {
                      ctx
                        .getJSModule(RCTEventEmitter::class.java)
                        .receiveEvent(this@ScannerView.id, "onBarcodeScanned", eventData)
                    }
                  }
                } else {
                  Log.d(
                    "ScannerView",
                    "Barcode detected outside frame. Ignoring. Frame: $frame, Barcode box (transformed): $transformedBarcodeBox"
                  )
                }
              }
            }
          }
          .addOnFailureListener { e ->
            Log.e(TAG, "Barcode scanning failed", e)
          }
          .addOnCompleteListener {
            imageProxy.close()
          }
      } else {
        imageProxy.close()
      }
    } catch (e: Exception) {
      Log.e(TAG, "Error processing image", e)
      imageProxy.close()
    }
  }

  // Frame setter methods
  fun setEnableFrame(enable: Boolean) {
    enableFrame = enable
    overlayView?.setEnableFrame(enable)

    // Update focus when frame is toggled
    if (camera != null) {
      setupAutoFocusOnFrame()
    }
  }

  fun setFrameColor(color: String) {
    try {
      frameColor = color.toColorInt()
      overlayView?.setFrameColor(frameColor)
    } catch (e: Exception) {
      Log.e(TAG, "Invalid color format: $color")
    }
  }

  fun setFrameSize(size: FrameSize) {
    frameSize = size
    overlayView?.setFrameSize(size)
  }

  fun setBarcodeFrameConfigs(configs: List<BarcodeFrameConfig>) {
    barcodeFrameConfigs = configs
    overlayView?.setBarcodeFrameConfigs(configs)
  }

  fun setShowBarcodeFramesOnlyInFrame(showOnlyInFrame: Boolean) {
    showBarcodeFramesOnlyInFrame = showOnlyInFrame
    Log.d(TAG, "Show barcode frames only in frame: $showOnlyInFrame")
  }

  fun setZoom(zoom: Float) {
    this.zoom = zoom
    // Apply zoom, respecting the device's limits
    val zoomState = camera?.cameraInfo?.zoomState?.value
    if (zoomState != null) {
      val newZoom = zoom.coerceIn(zoomState.minZoomRatio, zoomState.maxZoomRatio)
      camera?.cameraControl?.setZoomRatio(newZoom)
      Log.d(TAG, "Setting zoom to $newZoom (requested $zoom)")
    } else {
      camera?.cameraControl?.setZoomRatio(zoom)
    }
  }

  fun setTorch(enabled: Boolean) {
    torchEnabled = enabled
    camera?.cameraControl?.enableTorch(enabled)
    Log.d(TAG, "Torch ${if (enabled) "enabled" else "disabled"}")
  }

  fun resumeScanning() {
    isScanningPaused = false
    Log.d(TAG, "Scanning resumed")
  }

  fun pauseScanning() {
    isScanningPaused = true
    // Clear all barcode frames when pausing
    barcodeFrameManager.clearAllFrames()
    Log.d(TAG, "Scanning paused")
  }

  fun setThrottleMs(milliseconds: Int) {
    throttleMs = milliseconds
  }

  private fun hasCameraPermission(): Boolean {
    return context.checkSelfPermission(android.Manifest.permission.CAMERA) == android.content.pm.PackageManager.PERMISSION_GRANTED
  }

  private fun updateBarcodeFrames(
    barcodes: List<Barcode>,
    transformationInfo: ImageAnalysisTransformationInfo
  ) {
    val barcodeFrames = mutableMapOf<String, RectF>()

    barcodes.forEach { barcode ->
      val barcodeValue = barcode.rawValue ?: return@forEach
      val boundingBox = barcode.boundingBox ?: return@forEach

      val transformedRect = transformBarcodeBoundingBox(
        boundingBox,
        transformationInfo,
        previewView!!
      )

      // If showBarcodeFramesOnlyInFrame is true, only include frames within the overlay frame
      if (showBarcodeFramesOnlyInFrame && enableFrame) {
        val frame = overlayView?.frameRect
        if (frame != null && frame.contains(transformedRect)) {
          barcodeFrames[barcodeValue] = transformedRect
        }
      } else {
        // Show all barcode frames
        barcodeFrames[barcodeValue] = transformedRect
      }
    }

    // Update frames using the manager
    barcodeFrameManager.updateBarcodeFrames(barcodeFrames)
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
