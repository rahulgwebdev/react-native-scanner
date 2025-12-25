package com.scanner

import android.content.Context
import android.graphics.*
import android.os.PowerManager
import android.util.AttributeSet
import android.util.Log
import android.util.Rational
import android.util.Size
import android.view.Surface
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.FrameLayout
import androidx.annotation.OptIn
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.camera.camera2.interop.Camera2CameraControl
import androidx.camera.camera2.interop.CaptureRequestOptions
import android.hardware.camera2.CaptureRequest
import kotlin.math.max
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
import com.scanner.views.FocusAreaView
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
  private var overlayView: FocusAreaView? = null
  private var barcodeFrameOverlayView: BarcodeFrameOverlayView? = null

  // Frame configuration
  private var enableFrame: Boolean = false
  private var borderColor: Int = Color.TRANSPARENT
  private var tintColor: Int = Color.BLACK
  private var frameSize: FrameSize = FrameSize.Square(300)
  private var positionX: Float = 50f // Default center (50%)
  private var positionY: Float = 50f // Default center (50%)
  private var showBarcodeFramesOnlyInFrame: Boolean = false

  // Focus area and barcode frames configuration
  private var focusAreaEnabled: Boolean = false
  private var barcodeFramesEnabled: Boolean = false
  private var barcodeFramesColor: Int = Color.RED

  // React context for event emission
  private var reactContext: ThemedReactContext? = null

  private var zoom: Float = 1.0f
  private var torchEnabled: Boolean = false
  private var isScanningPaused: Boolean = false

  // Barcode scan strategy
  private var barcodeScanStrategy: String = "ALL"

  // Barcode frame management
  private val barcodeFrameManager = BarcodeFrameManager()

  // Wake lock and screen keep-awake
  private var wakeLock: PowerManager.WakeLock? = null
  private var keepScreenOn: Boolean = true

  // Debounce mechanism to prevent multiple rapid barcode detections
  private var lastBarcodeEmissionTime: Long = 0
  private var barcodeEmissionDebounceInterval: Long = 500 // Default 500ms debounce

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

    // Initialize wake lock
    initializeWakeLock()

    previewView = PreviewView(context).apply {
      layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
      scaleType = PreviewView.ScaleType.FILL_CENTER
      implementationMode = PreviewView.ImplementationMode.PERFORMANCE
      // setBackgroundColor(Color.RED) // Optional: for debugging layout
    }
    installHierarchyFitter(previewView!!)
    addView(previewView)

    // Create overlay view for frame drawing
    overlayView = FocusAreaView(context).apply {
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

  private fun initializeWakeLock() {
    val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
    wakeLock = powerManager.newWakeLock(
      PowerManager.SCREEN_BRIGHT_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP,
      "ScannerView::WakeLock"
    )
    wakeLock?.setReferenceCounted(false)
  }

  private fun acquireWakeLock() {
    if (keepScreenOn && wakeLock?.isHeld == false) {
      wakeLock?.acquire()
      Log.d(TAG, "Wake lock acquired")
    }
  }

  private fun releaseWakeLock() {
    if (wakeLock?.isHeld == true) {
      wakeLock?.release()
      Log.d(TAG, "Wake lock released")
    }
  }

  private fun updateKeepScreenOn(keepOn: Boolean) {
    keepScreenOn = keepOn
    if (keepOn) {
      // Set FLAG_KEEP_SCREEN_ON on the activity window
      val activity = reactContext?.currentActivity
      activity?.window?.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
      acquireWakeLock()
    } else {
      // Remove FLAG_KEEP_SCREEN_ON from the activity window
      val activity = reactContext?.currentActivity
      activity?.window?.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
      releaseWakeLock()
    }
    Log.d(TAG, "Keep screen on: $keepOn")
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
    
    // Ensure wake lock is released when view is destroyed
    releaseWakeLock()
  }

  private fun startCamera() {
    Log.d(TAG, "Starting camera...")

    if (!hasCameraPermission()) {
      Log.e(TAG, "Camera permission not granted")
      return
    }

    // Acquire wake lock when camera starts
    updateKeepScreenOn(true)

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

    // Release wake lock when camera stops
    updateKeepScreenOn(false)

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

      // Set up continuous autofocus for better barcode scanning
      setupContinuousAutoFocus()

      // Set up auto-focus on frame center (if focus area is enabled)
      setupAutoFocusOnFrame()

    } catch (exc: Exception) {
      Log.e(TAG, "Use case binding failed", exc)
    }
  }

  /**
   * Set up continuous autofocus mode for better barcode scanning.
   * This enables AF_MODE_CONTINUOUS_PICTURE which continuously adjusts focus,
   * making it much easier to scan barcodes at different distances.
   */
  private fun setupContinuousAutoFocus() {
    try {
      val camera2Control = camera?.cameraControl?.let { 
        Camera2CameraControl.from(it) 
      } ?: run {
        Log.w(TAG, "Camera2CameraControl not available")
        return
      }

      // Enable continuous autofocus mode
      camera2Control.captureRequestOptions = CaptureRequestOptions.Builder()
        .setCaptureRequestOption<Int>(
          CaptureRequest.CONTROL_AF_MODE,
          CaptureRequest.CONTROL_AF_MODE_CONTINUOUS_PICTURE
        )
        .build()

      Log.d(TAG, "✅ Continuous autofocus enabled (AF_MODE_CONTINUOUS_PICTURE)")
    } catch (e: Exception) {
      Log.e(TAG, "Failed to setup continuous autofocus", e)
    }
  }

  /**
   * Set up autofocus on the focus area frame center.
   * This provides additional focus assistance when a focus area is defined.
   */
  private fun setupAutoFocusOnFrame() {
    if (!enableFrame) {
      // Even without focus area overlay, trigger autofocus on screen center
      triggerAutoFocusOnCenter()
      return
    }

    val frame = overlayView?.frameRect ?: run {
      triggerAutoFocusOnCenter()
      return
    }
    
    val centerX = frame.centerX()
    val centerY = frame.centerY()

    val viewWidth = previewView?.width ?: return
    val viewHeight = previewView?.height ?: return

    val normalizedX = centerX / viewWidth
    val normalizedY = centerY / viewHeight

    triggerAutoFocusAt(normalizedX, normalizedY)
  }

  /**
   * Trigger autofocus at screen center (useful when no focus area is defined)
   */
  private fun triggerAutoFocusOnCenter() {
    triggerAutoFocusAt(0.5f, 0.5f)
  }

  /**
   * Trigger autofocus at a specific normalized point (0.0-1.0)
   */
  private fun triggerAutoFocusAt(normalizedX: Float, normalizedY: Float) {
    val meteringPointFactory = previewView?.meteringPointFactory ?: return
    val afPoint = meteringPointFactory.createPoint(normalizedX, normalizedY)

    val focusAction = FocusMeteringAction.Builder(afPoint, FocusMeteringAction.FLAG_AF)
      .setAutoCancelDuration(2, java.util.concurrent.TimeUnit.SECONDS) // Auto-cancel after 2 seconds
      .build()

    camera?.cameraControl?.startFocusAndMetering(focusAction)
      ?.addListener({
        Log.d(TAG, "Auto-focus triggered at ($normalizedX, $normalizedY)")
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
            // Process barcode detection for the main scanning logic
            if (barcodes.isNotEmpty() && !isScanningPaused) {
              val processedBarcodes = processBarcodesAccordingToStrategy(barcodes, transformationInfo)

              // Update barcode frames for processed barcodes (filtered)
              updateBarcodeFrames(processedBarcodes, transformationInfo)

              if (processedBarcodes.isNotEmpty()) {
                val currentTime = System.currentTimeMillis()
                val timeSinceLastEmission = currentTime - lastBarcodeEmissionTime

                // Debounce: Prevent rapid duplicate emissions
                // If we've emitted recently (within debounce interval), skip this emission
                // This prevents multiple alerts when pauseScanning is set but detection callbacks are still in flight
                if (timeSinceLastEmission < barcodeEmissionDebounceInterval) {
                  Log.d(TAG, "⏭️ Skipping barcode emission (debounced, last emission was ${timeSinceLastEmission}ms ago)")
                  return@addOnSuccessListener
                }

                lastBarcodeEmissionTime = currentTime

                // Create array of barcode events
                val barcodeEvents = Arguments.createArray()
                processedBarcodes.forEach { barcode ->
                  val eventData = Arguments.createMap().apply {
                    putString("data", barcode.rawValue)
                    putString("format", barcode.format.toString())
                    putDouble("timestamp", System.currentTimeMillis().toDouble())

                    // Add bounding box if available
                    barcode.boundingBox?.let { box ->
                      val boundingBoxData = Arguments.createMap().apply {
                        putDouble("left", box.left.toDouble())
                        putDouble("top", box.top.toDouble())
                        putDouble("right", box.right.toDouble())
                        putDouble("bottom", box.bottom.toDouble())
                      }
                      putMap("boundingBox", boundingBoxData)

                      // Calculate area
                      val area = (box.right - box.left) * (box.bottom - box.top)
                      putDouble("area", area.toDouble())
                    }
                  }
                  barcodeEvents.pushMap(eventData)
                }

                val ctx = reactContext
                if (ctx is ThemedReactContext) {
                  ctx.runOnUiQueueThread {
                    val eventData = Arguments.createMap().apply {
                      putArray("barcodes", barcodeEvents)
                    }
                    ctx.getJSModule(RCTEventEmitter::class.java)
                      .receiveEvent(this@ScannerView.id, "onBarcodeScanned", eventData)
                    Log.d(TAG, "✅ Barcode emitted (debounced)")
                  }
                }
              }
            } else {
              // TODO: Review this part later
              // Clear barcode frames when no barcodes are detected or scanning is paused
             // updateBarcodeFrames(emptyList(), transformationInfo)
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

  fun setBorderColor(color: String) {
    try {
      borderColor = color.toColorInt()
      overlayView?.setBorderColor(borderColor)
    } catch (e: Exception) {
      Log.e(TAG, "Invalid color format: $color")
    }
  }

  fun setTintColor(color: String) {
    try {
      tintColor = color.toColorInt()
      overlayView?.setTintColor(tintColor)
    } catch (e: Exception) {
      Log.e(TAG, "Invalid color format: $color")
    }
  }

  fun setFrameSize(size: FrameSize) {
    frameSize = size
    overlayView?.setFrameSize(size)
  }

  fun setShowBarcodeFramesOnlyInFrame(showOnlyInFrame: Boolean) {
    showBarcodeFramesOnlyInFrame = showOnlyInFrame
    Log.d(TAG, "Show barcode frames only in frame: $showOnlyInFrame")
  }

  // Focus area configuration methods
  fun setFocusAreaEnabled(enabled: Boolean) {
    focusAreaEnabled = enabled
    Log.d(TAG, "Focus area enabled: $enabled")
  }

  // Barcode frames configuration methods
  fun setBarcodeFramesEnabled(enabled: Boolean) {
    barcodeFramesEnabled = enabled
    Log.d(TAG, "Barcode frames enabled: $enabled")
  }

  fun setBarcodeFramesColor(color: String) {
    try {
      barcodeFramesColor = color.toColorInt()
      Log.d(TAG, "Barcode frames color set: $color")
    } catch (e: Exception) {
      Log.e(TAG, "Invalid barcode frames color format: $color")
    }
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
    // Reset debounce timer when resuming to allow immediate detection
    lastBarcodeEmissionTime = 0
    Log.d(TAG, "Scanning resumed")
  }

  fun pauseScanning() {
    isScanningPaused = true
    // Clear all barcode frames when pausing
    barcodeFrameManager.clearAllFrames()
    // Reset debounce timer when pausing to prevent stale emissions
    lastBarcodeEmissionTime = 0
    Log.d(TAG, "Scanning paused")
  }

  fun setBarcodeEmissionInterval(intervalSeconds: Double) {
    // Convert seconds to milliseconds, ensure non-negative
    barcodeEmissionDebounceInterval = max(0, (intervalSeconds * 1000).toLong())
    Log.d(TAG, "Barcode emission interval set to: ${barcodeEmissionDebounceInterval}ms")
  }

  fun setBarcodeScanStrategy(strategy: String) {
    barcodeScanStrategy = strategy
    Log.d(TAG, "Barcode scan strategy set to: $strategy")
  }

  fun setPosition(x: Float, y: Float) {
    positionX = x.coerceIn(0f, 100f) // Clamp to 0-100 range
    positionY = y.coerceIn(0f, 100f) // Clamp to 0-100 range
    overlayView?.setPosition(positionX, positionY)
    Log.d(TAG, "Focus area position set to: x=$positionX%, y=$positionY%")
  }

  fun setKeepScreenOnEnabled(keepOn: Boolean) {
    updateKeepScreenOn(keepOn)
  }

  private fun hasCameraPermission(): Boolean {
    return context.checkSelfPermission(android.Manifest.permission.CAMERA) == android.content.pm.PackageManager.PERMISSION_GRANTED
  }

  private fun updateBarcodeFrames(
    barcodes: List<Barcode>,
    transformationInfo: ImageAnalysisTransformationInfo
  ) {
    // Only update barcode frames if they are enabled
    if (!barcodeFramesEnabled) {
      return
    }

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

  private fun processBarcodesAccordingToStrategy(
    barcodes: List<Barcode>,
    transformationInfo: ImageAnalysisTransformationInfo
  ): List<Barcode> {
    if (barcodes.isEmpty()) return emptyList()

    // Filter barcodes based on focus area if enabled
    val filteredBarcodes = if (focusAreaEnabled) {
      val frame = overlayView?.frameRect
      if (frame != null) {
        barcodes.filter { barcode ->
          barcode.boundingBox?.let { box ->
            val transformedBox = transformBarcodeBoundingBox(box, transformationInfo, previewView!!)
            frame.contains(transformedBox)
          } ?: false
        }
      } else {
        barcodes
      }
    } else {
      barcodes
    }

    if (filteredBarcodes.isEmpty()) return emptyList()

    // Apply strategy
    return when (barcodeScanStrategy) {
      "ONE" -> {
        listOf(filteredBarcodes[0])
      }
      "BIGGEST" -> {
        val barcodeWithArea = filteredBarcodes.mapNotNull { barcode ->
          barcode.boundingBox?.let { box ->
            val area = (box.right - box.left) * (box.bottom - box.top)
            barcode to area
          }
        }
        if (barcodeWithArea.isNotEmpty()) {
          val biggest = barcodeWithArea.maxByOrNull { it.second }
          listOf(biggest!!.first)
        } else {
          listOf(filteredBarcodes[0])
        }
      }
      "SORT_BY_BIGGEST" -> {
        val barcodeWithArea = filteredBarcodes.mapNotNull { barcode ->
          barcode.boundingBox?.let { box ->
            val area = (box.right - box.left) * (box.bottom - box.top)
            barcode to area
          }
        }
        if (barcodeWithArea.isNotEmpty()) {
          barcodeWithArea.sortedByDescending { it.second }.map { it.first }
        } else {
          filteredBarcodes
        }
      }
      "ALL" -> filteredBarcodes
      else -> filteredBarcodes // Default to ALL
    }
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
