package com.scanner

import android.content.Context
import android.content.pm.PackageManager
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.Manifest
import android.util.Log
import androidx.camera.core.CameraSelector
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

// Removed @ReactModule annotation for compatibility
class CameraInfoModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

  private val cameraExecutor: ExecutorService = Executors.newSingleThreadExecutor()
  private var cameraProvider: ProcessCameraProvider? = null

  override fun getName(): String = NAME

  @ReactMethod
  fun getCameraInfo(promise: Promise) {
    try {
      // Check camera permission first
      if (!hasCameraPermission()) {
        promise.reject("PERMISSION_ERROR", "Camera permission not granted")
        return
      }

      val cameraManager = reactApplicationContext.getSystemService(Context.CAMERA_SERVICE) as CameraManager
      val cameraArray = Arguments.createArray()
      
      // Check if camera list is available
      if (cameraManager.cameraIdList.isEmpty()) {
        promise.reject("NO_CAMERAS_ERROR", "No cameras found on device")
        return
      }
      
      // Collect all camera info first, then deduplicate
      val allCameras = mutableListOf<Pair<String, CameraCharacteristics>>()
      
      for (cameraId in cameraManager.cameraIdList) {
        try {
          val characteristics = cameraManager.getCameraCharacteristics(cameraId)
          allCameras.add(cameraId to characteristics)
        } catch (e: Exception) {
          Log.w("CameraInfoModule", "Failed to get characteristics for camera $cameraId", e)
          continue
        }
      }
      
      // Deduplicate cameras based on characteristics
      val uniqueCameras = deduplicateCameras(allCameras)
      
      // Create camera info maps for unique cameras
      for ((cameraId, characteristics) in uniqueCameras) {
        val cameraInfo = createCameraInfoMap(cameraId, characteristics)
        cameraArray.pushMap(cameraInfo)
      }
      
      // If no cameras were successfully processed, return error
      if (cameraArray.size() == 0) {
        promise.reject("CAMERA_ACCESS_ERROR", "Failed to access any camera characteristics")
        return
      }
      
      val result = Arguments.createMap().apply {
        putArray("cameras", cameraArray)
        putString("defaultBackCamera", getDefaultBackCameraId(cameraManager))
        putString("defaultFrontCamera", getDefaultFrontCameraId(cameraManager))
      }
      
      promise.resolve(result)
    } catch (e: Exception) {
      Log.e("CameraInfoModule", "Error getting camera info", e)
      promise.reject("CAMERA_INFO_ERROR", "Failed to get camera information: ${e.message}", e)
    }
  }

  @ReactMethod
  fun getCurrentCameraInfo(promise: Promise) {
    try {
      val cameraProviderFuture = ProcessCameraProvider.getInstance(reactApplicationContext)
      cameraProviderFuture.addListener({
        try {
          cameraProvider = cameraProviderFuture.get()
          val cameraInfo = getCurrentCameraCapabilities()
          promise.resolve(cameraInfo)
        } catch (e: Exception) {
          Log.e("CameraInfoModule", "Error getting current camera info", e)
          promise.reject("CURRENT_CAMERA_ERROR", "Failed to get current camera info", e)
        }
      }, ContextCompat.getMainExecutor(reactApplicationContext))
    } catch (e: Exception) {
      Log.e("CameraInfoModule", "Error initializing camera provider", e)
      promise.reject("CAMERA_PROVIDER_ERROR", "Failed to initialize camera provider", e)
    }
  }

  private fun hasCameraPermission(): Boolean {
    return reactApplicationContext.checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
  }

  private fun createCameraInfoMap(cameraId: String, characteristics: CameraCharacteristics): WritableMap {
    val lensFacing = characteristics.get(CameraCharacteristics.LENS_FACING)
    val sensorOrientation = characteristics.get(CameraCharacteristics.SENSOR_ORIENTATION) ?: 0
    val minFocusDistance = characteristics.get(CameraCharacteristics.LENS_INFO_MINIMUM_FOCUS_DISTANCE)
    val availableFocalLengths = characteristics.get(CameraCharacteristics.LENS_INFO_AVAILABLE_FOCAL_LENGTHS)
    val availableAeModes = characteristics.get(CameraCharacteristics.CONTROL_AE_AVAILABLE_MODES)
    val availableAfModes = characteristics.get(CameraCharacteristics.CONTROL_AF_AVAILABLE_MODES)
    val flashAvailable = characteristics.get(CameraCharacteristics.FLASH_INFO_AVAILABLE) ?: false
    
    // Determine if this is a macro camera
    val isMacroCamera = isMacroCamera(characteristics)
    
    // Get zoom range
    val maxZoom = characteristics.get(CameraCharacteristics.SCALER_AVAILABLE_MAX_DIGITAL_ZOOM) ?: 1.0f
    val minZoom = 1.0f // Digital zoom typically starts at 1.0
    
    return Arguments.createMap().apply {
      putString("id", cameraId)
      putString("facing", when (lensFacing) {
        CameraCharacteristics.LENS_FACING_FRONT -> "front"
        CameraCharacteristics.LENS_FACING_BACK -> "back"
        else -> "unknown"
      })
      putInt("sensorOrientation", sensorOrientation)
      putDouble("minFocusDistance", minFocusDistance?.toDouble() ?: -1.0)
      putBoolean("hasFlash", flashAvailable)
      putBoolean("isMacroCamera", isMacroCamera)
      
      // Add zoom range as separate properties
      putDouble("zoomMin", minZoom.toDouble())
      putDouble("zoomMax", maxZoom.toDouble())
      
      // Convert arrays to supported types for React Native
      putArray("focalLengths", availableFocalLengths?.let { lengths ->
        val stringArray = lengths.map { it.toString() }.toTypedArray()
        Arguments.fromArray(stringArray)
      } ?: Arguments.createArray())
      
      putArray("aeModes", availableAeModes?.let { modes ->
        val stringArray = modes.map { it.toString() }.toTypedArray()
        Arguments.fromArray(stringArray)
      } ?: Arguments.createArray())
      
      putArray("afModes", availableAfModes?.let { modes ->
        val stringArray = modes.map { it.toString() }.toTypedArray()
        Arguments.fromArray(stringArray)
      } ?: Arguments.createArray())
    }
  }

  private fun isMacroCamera(characteristics: CameraCharacteristics): Boolean {
    val minFocusDistance = characteristics.get(CameraCharacteristics.LENS_INFO_MINIMUM_FOCUS_DISTANCE)
    val availableFocalLengths = characteristics.get(CameraCharacteristics.LENS_INFO_AVAILABLE_FOCAL_LENGTHS)
    
    // Macro cameras typically have very small minimum focus distance
    val hasCloseFocus = minFocusDistance != null && minFocusDistance < 0.5f
    
    // Macro cameras often have specific focal lengths
    val hasMacroFocalLength = availableFocalLengths?.any { it < 3.0f } == true
    
    return hasCloseFocus || hasMacroFocalLength
  }

  private fun deduplicateCameras(cameras: List<Pair<String, CameraCharacteristics>>): List<Pair<String, CameraCharacteristics>> {
    val uniqueCameras = mutableListOf<Pair<String, CameraCharacteristics>>()
    val seenCharacteristics = mutableSetOf<String>()
    
    for ((cameraId, characteristics) in cameras) {
      // Create a unique key based on camera characteristics
      val key = createCameraKey(characteristics)
      
      if (!seenCharacteristics.contains(key)) {
        seenCharacteristics.add(key)
        uniqueCameras.add(cameraId to characteristics)
      } else {
        Log.d("CameraInfoModule", "Skipping duplicate camera: $cameraId")
      }
    }
    
    return uniqueCameras
  }

  private fun createCameraKey(characteristics: CameraCharacteristics): String {
    val lensFacing = characteristics.get(CameraCharacteristics.LENS_FACING) ?: -1
    val sensorOrientation = characteristics.get(CameraCharacteristics.SENSOR_ORIENTATION) ?: 0
    val minFocusDistance = characteristics.get(CameraCharacteristics.LENS_INFO_MINIMUM_FOCUS_DISTANCE)
    val availableFocalLengths = characteristics.get(CameraCharacteristics.LENS_INFO_AVAILABLE_FOCAL_LENGTHS)
    val flashAvailable = characteristics.get(CameraCharacteristics.FLASH_INFO_AVAILABLE) ?: false
    
    // Create a unique key based on physical characteristics
    val focalLengthsStr = availableFocalLengths?.joinToString(",") ?: ""
    val minFocusStr = minFocusDistance?.toString() ?: "null"
    
    return "$lensFacing-$sensorOrientation-$minFocusStr-$focalLengthsStr-$flashAvailable"
  }

  private fun getDefaultBackCameraId(cameraManager: CameraManager): String {
    for (cameraId in cameraManager.cameraIdList) {
      try {
        val characteristics = cameraManager.getCameraCharacteristics(cameraId)
        val lensFacing = characteristics.get(CameraCharacteristics.LENS_FACING)
        if (lensFacing == CameraCharacteristics.LENS_FACING_BACK) {
          return cameraId
        }
      } catch (e: Exception) {
        Log.w("CameraInfoModule", "Failed to get characteristics for camera $cameraId", e)
        continue
      }
    }
    return cameraManager.cameraIdList.firstOrNull() ?: ""
  }

  private fun getDefaultFrontCameraId(cameraManager: CameraManager): String {
    for (cameraId in cameraManager.cameraIdList) {
      try {
        val characteristics = cameraManager.getCameraCharacteristics(cameraId)
        val lensFacing = characteristics.get(CameraCharacteristics.LENS_FACING)
        if (lensFacing == CameraCharacteristics.LENS_FACING_FRONT) {
          return cameraId
        }
      } catch (e: Exception) {
        Log.w("CameraInfoModule", "Failed to get characteristics for camera $cameraId", e)
        continue
      }
    }
    return ""
  }

  private fun getCurrentCameraCapabilities(): WritableMap {
    // This would be called when a camera is already bound
    // For now, return basic info
    return Arguments.createMap().apply {
      putString("status", "camera_bound")
      putString("message", "Camera capabilities available when camera is bound")
    }
  }

  override fun onCatalystInstanceDestroy() {
    super.onCatalystInstanceDestroy()
    cameraExecutor.shutdown()
  }

  companion object {
    const val NAME = "CameraInfoModule"
  }
} 