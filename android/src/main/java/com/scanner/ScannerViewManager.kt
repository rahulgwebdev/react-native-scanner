package com.scanner

import android.graphics.Color
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.uimanager.events.RCTModernEventEmitter

@ReactModule(name = ScannerViewManager.NAME)
class ScannerViewManager : SimpleViewManager<ScannerView>() {

  override fun getName(): String {
    return NAME
  }

  public override fun createViewInstance(context: ThemedReactContext): ScannerView {
    return ScannerView(context)
  }

  // Barcode configuration
  @ReactProp(name = "barcodeTypes")
  fun setBarcodeTypes(view: ScannerView?, types: ReadableArray?) {
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

  @ReactProp(name = "barcodeFrameConfigs")
  fun setBarcodeFrameConfigs(view: ScannerView?, configs: ReadableArray?) {
    if (configs != null) {
      val configList = mutableListOf<BarcodeFrameConfig>()
      for (i in 0 until configs.size()) {
        val config = configs.getMap(i)
        if (config != null) {
          val format = config.getString("format") ?: ""
          val frameSize = config.getDynamic("frameSize")
          val frameColor = config.getString("frameColor")
          
          val size: FrameSize = when {
            frameSize.type == ReadableType.Number -> FrameSize.Square(frameSize.asInt())
            frameSize.type == ReadableType.Map -> {
              val frameSizeMap = frameSize.asMap()
              val width = frameSizeMap.getInt("width")
              val height = frameSizeMap.getInt("height")
              FrameSize.Rectangle(width, height)
            }
            else -> FrameSize.Square(350) // Default
          }
          
          configList.add(BarcodeFrameConfig(format, size, frameColor))
        }
      }
      view?.setBarcodeFrameConfigs(configList)
      Log.d("ScannerViewManager", "Barcode frame configs set: $configList")
    }
  }

  // Frame configuration
  @ReactProp(name = "enableFrame")
  fun setEnableFrame(view: ScannerView?, enable: Boolean?) {
    view?.setEnableFrame(enable ?: false)
  }

  @ReactProp(name = "frameColor")
  fun setFrameColor(view: ScannerView?, color: String?) {
    if (color != null) {
      view?.setFrameColor(color)
    }
  }

  @ReactProp(name = "frameSize")
  fun setFrameSize(view: ScannerView?, frameSize: Dynamic?) {
    if (frameSize != null) {
      val size: FrameSize = when {
        frameSize.type == ReadableType.Number -> FrameSize.Square(frameSize.asInt())
        frameSize.type == ReadableType.Map -> {
          val frameSizeMap = frameSize.asMap()
          val width = frameSizeMap.getInt("width")
          val height = frameSizeMap.getInt("height")
          FrameSize.Rectangle(width, height)
        }
        else -> FrameSize.Square(350) // Default
      }
      view?.setFrameSize(size)
    }
  }

  // Torch control
  @ReactProp(name = "torch")
  fun setTorch(view: ScannerView?, enabled: Boolean?) {
    view?.setTorch(enabled ?: false)
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

  // // Legacy prop for backward compatibility
  // @ReactProp(name = "color")
  // fun setColor(view: ScannerView?, color: String?) {
  //   // This is kept for backward compatibility but doesn't affect the scanner
  //   Log.w("ScannerViewManager", "setColor is deprecated. Use frameColor instead.")
  // }

  @ReactProp(name = "zoom")
  fun setZoom(view: ScannerView?, zoom: Double) {
    view?.setZoom(zoom.toFloat())
  }

  @ReactProp(name = "pauseScanning")
  fun setPauseScanning(view: ScannerView?, pause: Boolean?) {
    if (pause == true) {
      view?.pauseScanning()
    } else {
      view?.resumeScanning()
    }
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
    // Add more events here if needed
    return map
  }
}

// Data classes for frame configuration
sealed class FrameSize {
  data class Square(val size: Int) : FrameSize()
  data class Rectangle(val width: Int, val height: Int) : FrameSize()
}

data class BarcodeFrameConfig(
  val format: String,
  val frameSize: FrameSize,
  val frameColor: String? = null
)
