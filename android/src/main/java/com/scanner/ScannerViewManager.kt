package com.scanner

import android.graphics.Color
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.uimanager.events.RCTModernEventEmitter
import com.facebook.react.viewmanagers.ScannerViewManagerInterface
import com.facebook.react.viewmanagers.ScannerViewManagerDelegate

@ReactModule(name = ScannerViewManager.NAME)
class ScannerViewManager : SimpleViewManager<ScannerView>(),
  ScannerViewManagerInterface<ScannerView> {
  private val mDelegate: ViewManagerDelegate<ScannerView> = ScannerViewManagerDelegate(this)

  override fun getDelegate(): ViewManagerDelegate<ScannerView> {
    return mDelegate
  }
  override fun getName(): String {
    return NAME
  }

  public override fun createViewInstance(context: ThemedReactContext): ScannerView {
    return ScannerView(context)
  }

  // Barcode configuration
  @ReactProp(name = "barcodeTypes")
  override fun setBarcodeTypes(view: ScannerView?, types: ReadableArray?) {
    if (types != null) {
      val typeList = mutableListOf<String>()
      for (i in 0 until types.size()) {
        typeList.add(types.getString(i) ?: "")
      }
      Log.d("ScannerViewManager", "Barcode types set: $typeList")
      // Note: The actual barcode type filtering would be implemented in ScannerView
      // For now, ML Kit will detect all supported barcode types
    }
  }

  // Focus area configuration
  @ReactProp(name = "focusArea")
  override fun setFocusArea(view: ScannerView?, focusArea: ReadableMap?) {
    if (focusArea != null) {
      val enabled = focusArea.getBoolean("enabled")
      val showOverlay = focusArea.getBoolean("showOverlay")
      val borderColor = focusArea.getString("borderColor")
      val tintColor = focusArea.getString("tintColor")
      val size = focusArea.getDynamic("size")
      val position = focusArea.getMap("position")

      // Set focus area properties
      view?.setFocusAreaEnabled(enabled)
      view?.setEnableFrame(showOverlay)

      if (borderColor != null) {
        view?.setBorderColor(borderColor)
      }

      if (tintColor != null) {
        view?.setTintColor(tintColor)
      }

      if (position != null) {
        val x = position.getDouble("x").toFloat()
        val y = position.getDouble("y").toFloat()
        view?.setPosition(x, y)
      }

      if (size != null) {
        val frameSize: FrameSize = when {
          size.type == ReadableType.Number -> FrameSize.Square(size.asInt())
          size.type == ReadableType.Map -> {
            val frameSizeMap = size.asMap()
            val width = frameSizeMap?.getInt("width") ?: 0
            val height = frameSizeMap?.getInt("height") ?: 0
            FrameSize.Rectangle(width, height)
          }
          else -> FrameSize.Square(300) // Default
        }
        view?.setFrameSize(frameSize)
      }

      Log.d("ScannerViewManager", "Focus area configured: enabled=$enabled, showOverlay=$showOverlay, borderColor=$borderColor, tintColor=$tintColor, position=$position")
    }
  }

  // Barcode frames configuration
  @ReactProp(name = "barcodeFrames")
  override fun setBarcodeFrames(view: ScannerView?, barcodeFrames: ReadableMap?) {
    if (barcodeFrames != null) {
      val enabled = barcodeFrames.getBoolean("enabled") ?: false
      val color = barcodeFrames.getString("color")
      val onlyInFocusArea = barcodeFrames.getBoolean("onlyInFocusArea") ?: false

      // Set barcode frames properties
      view?.setBarcodeFramesEnabled(enabled)
      view?.setShowBarcodeFramesOnlyInFrame(onlyInFocusArea)

      if (color != null) {
        view?.setBarcodeFramesColor(color)
      }

      Log.d("ScannerViewManager", "Barcode frames configured: enabled=$enabled, onlyInFocusArea=$onlyInFocusArea, color=$color")
    }
  }

  // Torch control
  @ReactProp(name = "torch")
  override fun setTorch(view: ScannerView, value: Boolean) {
    view.setTorch(value)
  }

  // Event handlers
  @ReactProp(name = "onBarcodeScanned")
   fun setOnBarcodeScanned(view: ScannerView?, onBarcodeScanned: Boolean?) {
    // This prop is used to register the event handler
    // The actual event emission happens in ScannerView.processImage()
    Log.d("ScannerViewManager", "onBarcodeScanned event handler registered")
  }

  @ReactProp(name = "onScannerError")
  fun setOnScannerError(view: ScannerView?, onScannerError: Boolean?) {
    // This prop is used to register the event handler
    Log.d("ScannerViewManager", "onScannerError event handler registered")
  }

  @ReactProp(name = "onLoad")
  fun setOnLoad(view: ScannerView?, onLoad: Boolean?) {
    // This prop is used to register the event handler
    Log.d("ScannerViewManager", "onLoad event handler registered")
  }

  @ReactProp(name = "zoom")
  override fun setZoom(view: ScannerView?, zoom: Double) {
    view?.setZoom(zoom.toFloat())
  }

  @ReactProp(name = "pauseScanning")
  override fun setPauseScanning(view: ScannerView, value: Boolean) {
    if (value) {
      view.pauseScanning()
    } else {
      view.resumeScanning()
    }
  }

  @ReactProp(name = "barcodeScanStrategy")
  override fun setBarcodeScanStrategy(view: ScannerView?, strategy: String?) {
    view?.setBarcodeScanStrategy(strategy ?: "ALL")
  }

  @ReactProp(name = "keepScreenOn")
  override fun setKeepScreenOn(view: ScannerView, value: Boolean) {
    view.setKeepScreenOnEnabled(value)
  }

  @ReactProp(name = "barcodeEmissionInterval")
  override fun setBarcodeEmissionInterval(view: ScannerView?, interval: Double) {
    Log.d("ScannerViewManager", "📊 [@ReactProp] barcodeEmissionInterval received: $interval")

    // WithDefault<Double, 0.5> in TypeScript means codegen handles the default automatically
    // If negative, clamp to 0 (minimum value)
    // If 0, disable debouncing
    // Otherwise, use the provided value (0 or positive)
    val actualInterval = if (interval < 0) {
      Log.d("ScannerViewManager", "📊 Clamping negative interval ($interval) to 0.0 (minimum)")
      0.0 // Negative values clamped to 0 (minimum)
    } else {
      if (interval == 0.0) {
        Log.d("ScannerViewManager", "📊 Using interval: ${interval}s (explicitly set to 0, will disable debouncing)")
      } else {
        Log.d("ScannerViewManager", "📊 Using interval: ${interval}s")
      }
      interval // Use provided value (0 or positive)
    }
    Log.d("ScannerViewManager", "📊 Final interval to set: ${actualInterval}s")
    view?.setBarcodeEmissionInterval(actualInterval)
  }

  companion object {
    const val NAME = "ScannerView"
  }

  override fun getExportedCustomBubblingEventTypeConstants(): MutableMap<String, Any> {
    val map = mutableMapOf<String, Any>()
    map["onBarcodeScanned"] = mapOf(
      "phasedRegistrationNames" to mapOf(
        "bubbled" to "onBarcodeScanned"
      )
    )
    map["onLoad"] = mapOf(
      "phasedRegistrationNames" to mapOf(
        "bubbled" to "onLoad"
      )
    )
    map["onScannerError"] = mapOf(
      "phasedRegistrationNames" to mapOf(
        "bubbled" to "onScannerError"
      )
    )
    return map
  }
}

// Data classes for frame configuration
sealed class FrameSize {
  data class Square(val size: Int) : FrameSize()
  data class Rectangle(val width: Int, val height: Int) : FrameSize()
}
