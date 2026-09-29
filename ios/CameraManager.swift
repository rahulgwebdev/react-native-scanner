//
//  CameraManager.swift
//  react-native-scanner
//
//  Manages AVFoundation camera operations
//

import AVFoundation
import UIKit

/// Manages camera session, input, and output
class CameraManager: NSObject, CameraControlProtocol {
    
    // MARK: - Public Properties
    
    /// Delegate for camera events
    weak var delegate: CameraManagerDelegate?
    
    /// The preview layer for displaying camera feed
    private(set) var previewLayer: AVCaptureVideoPreviewLayer?
    
    // MARK: - Private Properties
    
    /// Main capture session
    private let captureSession: AVCaptureSession
    
    /// Background queue for camera operations
    private let sessionQueue: DispatchQueue
    
    /// Video data output for frame capture
    private var videoDataOutput: AVCaptureVideoDataOutput?
    
    /// Current camera device
    private var currentDevice: AVCaptureDevice?
    
    /// Current camera input
    private var currentInput: AVCaptureDeviceInput?
    
    /// Whether the session is running
    private var isSessionRunning: Bool

    /// Whether the session has been configured at least once
    private var isSessionConfigured: Bool = false

    // Desired settings (can be set before camera is configured/running)
    private var desiredTorchEnabled: Bool = false
    private var desiredTorchLevel: Float = 1.0
    private var desiredZoomLevel: CGFloat = 1.0
    
    /// Observer for subject area change (refocus when scene changes, like native Camera app)
    private var subjectAreaObserver: NSObjectProtocol?

    /// Observer for device rotation, so capture and preview stay in one coordinate space
    private var orientationObserver: NSObjectProtocol?
    
    // MARK: - Initialization
    
    override init() {
        self.captureSession = AVCaptureSession()
        self.sessionQueue = DispatchQueue(label: "com.scanner.camera.session")
        self.isSessionRunning = false
        
        super.init()
    }
    
    // MARK: - CameraControlProtocol Methods
    
    /// Start the camera session
    func startCamera() {
        checkCameraPermission { [weak self] granted in
            guard let self = self, granted else {
                let error = NSError(domain: "CameraManager", code: 1,
                                  userInfo: [NSLocalizedDescriptionKey: "Camera permission denied"])
                DispatchQueue.main.async {
                    self?.delegate?.cameraManagerDidFail(self!, error: error)
                }
                return
            }
            
            self.sessionQueue.async {
                if !self.isSessionConfigured {
                    self.configureCaptureSession()
                    self.isSessionConfigured = true
                }
                if !self.captureSession.isRunning {
                    self.captureSession.startRunning()
                    self.isSessionRunning = true
                }

                // Apply settings after session is running (native camera app behavior)
                self.applyZoom()
                self.applyTorch()
                self.setupFocusAndExposure()
                self.updateVideoOrientation()
                
                DispatchQueue.main.async {
                    self.delegate?.cameraManagerDidStart(self)
                }
            }
        }
    }
    
    /// Stop the camera session
    func stopCamera() {
        unregisterSubjectAreaChangeObserver()
        sessionQueue.async { [weak self] in
            guard let self = self, self.isSessionRunning else { return }
            
            // Always turn torch off when stopping camera to avoid leaving hardware active.
            self.forceTorchOff()

            if self.captureSession.isRunning {
                self.captureSession.stopRunning()
            }
            self.isSessionRunning = false
        }
    }
    
    /// Set torch/flashlight state
    /// - Parameter enabled: Whether torch should be enabled
    func setTorch(enabled: Bool) {
        desiredTorchEnabled = enabled
        print("[CameraManager] Torch requested: \(enabled)")
        sessionQueue.async { [weak self] in
            self?.applyTorch()
        }
    }
    
    /// Set zoom level
    /// - Parameter level: The zoom level (clamped to device limits)
    func setZoom(level: CGFloat) {
        desiredZoomLevel = level
        sessionQueue.async { [weak self] in
            self?.applyZoom()
        }
    }
    
    /// Set focus and exposure point of interest for better scanning of small barcodes/QR codes.
    /// Call this after the camera has started (e.g. when focus area is known).
    /// - Parameters:
    ///   - normalizedX: X in range 0...1 (0.5 = center)
    ///   - normalizedY: Y in range 0...1 (0.5 = center)
    func setFocusPointOfInterest(normalizedX: CGFloat, normalizedY: CGFloat) {
        sessionQueue.async { [weak self] in
            self?.applyFocusPointOfInterest(normalizedX: normalizedX, normalizedY: normalizedY)
        }
    }
    
    /// Check if torch is available
    /// - Returns: True if torch is available
    func isTorchAvailable() -> Bool {
        return currentDevice?.hasTorch ?? false
    }
    
    /// Get the preview layer for displaying camera feed
    /// - Returns: The AVCaptureVideoPreviewLayer
    func getPreviewLayer() -> AVCaptureVideoPreviewLayer? {
        // Implementation: Return preview layer
        return previewLayer
    }
    
    // MARK: - Private Setup Methods
    
    /// Configure the capture session
    private func configureCaptureSession() {
        captureSession.beginConfiguration()
        // Prefer full HD for sharper small barcode/QR capture when supported (e.g. iPhone 15)
        if captureSession.canSetSessionPreset(.hd1920x1080) {
            captureSession.sessionPreset = .hd1920x1080
            print("[CameraManager] Session preset: hd1920x1080")
        } else {
            captureSession.sessionPreset = .high
            print("[CameraManager] Session preset: high")
        }
        
        // Setup camera input
        guard setupCameraInput() else {
            captureSession.commitConfiguration()
            return
        }
        
        // Setup video output
        guard setupVideoOutput() else {
            captureSession.commitConfiguration()
            return
        }
        
        captureSession.commitConfiguration()

        // Apply desired settings once input/output are configured
        applyZoom()
        applyTorch()
        
        // Setup preview layer on main thread
        DispatchQueue.main.async { [weak self] in
            self?.setupPreviewLayer()
        }
    }
    
    /// Setup camera input
    /// - Returns: True if setup successful
    @discardableResult
    private func setupCameraInput() -> Bool {
        guard let device = getDefaultCameraDevice() else {
            print("[CameraManager] No camera device available")
            return false
        }

        // Bias autofocus towards near objects (ideal for barcodes/QR codes held close to camera).
        // Must be configured before adding the device to an active session to be effective.
        lockDeviceForConfiguration(device) { device in
            if device.isAutoFocusRangeRestrictionSupported {
                device.autoFocusRangeRestriction = .near
                print("[CameraManager] ✅ Auto-focus range restriction set to NEAR")
            }
        }

        do {
            let input = try AVCaptureDeviceInput(device: device)
            
            if captureSession.canAddInput(input) {
                captureSession.addInput(input)
                currentDevice = device
                currentInput = input
                print("[CameraManager] Camera input added successfully")
                return true
            } else {
                print("[CameraManager] Cannot add camera input to session")
                return false
            }
        } catch {
            print("[CameraManager] Error creating camera input: \(error)")
            return false
        }
    }

    // MARK: - Apply desired settings

    private func applyTorch() {
        guard let device = currentDevice else {
            print("[CameraManager] ⚠️ applyTorch: no currentDevice yet")
            return
        }
        guard device.hasTorch else {
            print("[CameraManager] ⚠️ applyTorch: device hasTorch=false (\(device.localizedName))")
            return
        }

        print("[CameraManager] applyTorch -> desired=\(desiredTorchEnabled) device=\(device.localizedName) position=\(device.position.rawValue) currentMode=\(device.torchMode.rawValue) active=\(device.isTorchActive)")

        lockDeviceForConfiguration(device) { device in
            if self.desiredTorchEnabled {
                if device.isTorchModeSupported(.on) {
                    do {
                        try device.setTorchModeOn(level: self.desiredTorchLevel)
                        print("[CameraManager] ✅ Torch ON applied via setTorchModeOn(level:) on \(device.localizedName)")
                    } catch {
                        // Fallback
                        device.torchMode = .on
                        print("[CameraManager] ⚠️ Torch ON fallback (setTorchModeOn failed: \(error.localizedDescription))")
                    }
                } else {
                    device.torchMode = .on
                    print("[CameraManager] ⚠️ Torch ON fallback (mode .on not supported??) on \(device.localizedName)")
                }
            } else {
                if device.isTorchModeSupported(.off) {
                    device.torchMode = .off
                    print("[CameraManager] ✅ Torch OFF applied on \(device.localizedName)")
                } else {
                    device.torchMode = .off
                    print("[CameraManager] ⚠️ Torch OFF fallback (mode .off not supported??) on \(device.localizedName)")
                }
            }
        }

        print("[CameraManager] applyTorch done -> mode=\(device.torchMode.rawValue) active=\(device.isTorchActive)")
    }

    private func forceTorchOff() {
        guard let device = currentDevice, device.hasTorch else { return }
        lockDeviceForConfiguration(device) { device in
            if device.isTorchModeSupported(.off) {
                device.torchMode = .off
            } else {
                device.torchMode = .off
            }
        }
    }

    private func applyZoom() {
        guard let device = currentDevice else { return }
        lockDeviceForConfiguration(device) { device in
            let clampedZoom = min(max(self.desiredZoomLevel, device.minAvailableVideoZoomFactor),
                                  device.maxAvailableVideoZoomFactor)
            device.videoZoomFactor = clampedZoom
        }
    }
    
    // MARK: - Focus and Exposure (for small barcode/QR scanning)
    
    /// Enable continuous autofocus and continuous auto-exposure (native Camera app behavior).
    /// Applied after the session is running so the device is fully active.
    private func setupFocusAndExposure() {
        guard let device = currentDevice else { return }
        lockDeviceForConfiguration(device) { device in
            // Continuous autofocus: camera keeps refocusing so small codes stay sharp
            if device.isFocusModeSupported(.continuousAutoFocus) {
                device.focusMode = .continuousAutoFocus
                print("[CameraManager] ✅ Continuous autofocus enabled")
            } else if device.isFocusModeSupported(.autoFocus) {
                device.focusMode = .autoFocus
                print("[CameraManager] ✅ Auto focus enabled (continuous not supported)")
            }
            // Continuous auto-exposure: adapts to lighting for better small code readability
            if device.isExposureModeSupported(.continuousAutoExposure) {
                device.exposureMode = .continuousAutoExposure
                print("[CameraManager] ✅ Continuous auto-exposure enabled")
            }
            // Default focus point at center (device coords); overridden by setFocusPointOfInterest
            let center = CGPoint(x: 0.5, y: 0.5)
            if device.isFocusPointOfInterestSupported && device.isFocusModeSupported(.continuousAutoFocus) {
                device.focusPointOfInterest = center
            }
            if device.isExposurePointOfInterestSupported && device.isExposureModeSupported(.continuousAutoExposure) {
                device.exposurePointOfInterest = center
            }
            // Native Camera behavior: refocus when scene changes (lighting, movement, etc.)
            if device.isSubjectAreaChangeMonitoringEnabled == false {
                device.isSubjectAreaChangeMonitoringEnabled = true
                print("[CameraManager] ✅ Subject area change monitoring enabled")
            }
        }
        // Observe scene changes and re-apply continuous focus (like native Camera app)
        registerSubjectAreaChangeObserverIfNeeded()
    }
    
    /// When the scene changes, re-apply continuous focus so the camera refocuses.
    private func registerSubjectAreaChangeObserverIfNeeded() {
        guard subjectAreaObserver == nil else { return }
        subjectAreaObserver = NotificationCenter.default.addObserver(
            forName: .AVCaptureDeviceSubjectAreaDidChange,
            object: currentDevice,
            queue: .main
        ) { [weak self] _ in
            self?.sessionQueue.async {
                self?.reapplyContinuousFocus()
            }
        }
        print("[CameraManager] Subject area change observer registered")
    }
    
    private func unregisterSubjectAreaChangeObserver() {
        if let observer = subjectAreaObserver {
            NotificationCenter.default.removeObserver(observer)
            subjectAreaObserver = nil
            print("[CameraManager] Subject area change observer removed")
        }
    }
    
    /// Re-apply continuous focus and exposure (called when scene changes).
    private func reapplyContinuousFocus() {
        guard let device = currentDevice else { return }
        lockDeviceForConfiguration(device) { device in
            if device.isFocusModeSupported(.continuousAutoFocus) {
                device.focusMode = .continuousAutoFocus
            }
            if device.isExposureModeSupported(.continuousAutoExposure) {
                device.exposureMode = .continuousAutoExposure
            }
        }
    }
    
    /// Set focus and exposure point of interest (e.g. center of focus area) so the camera
    /// prioritizes that region. The inputs are expected to already be in device coordinates
    /// (0,0 = top-left, 1,1 = bottom-right) as returned by AVCaptureVideoPreviewLayer helpers.
    private func applyFocusPointOfInterest(normalizedX: CGFloat, normalizedY: CGFloat) {
        guard let device = currentDevice else { return }
        let devicePoint = CGPoint(x: normalizedX, y: normalizedY)
        lockDeviceForConfiguration(device) { device in
            if device.isFocusPointOfInterestSupported {
                device.focusPointOfInterest = devicePoint
                if device.isFocusModeSupported(.continuousAutoFocus) {
                    device.focusMode = .continuousAutoFocus
                }
            }
            if device.isExposurePointOfInterestSupported {
                device.exposurePointOfInterest = devicePoint
                if device.isExposureModeSupported(.continuousAutoExposure) {
                    device.exposureMode = .continuousAutoExposure
                }
            }
            print("[CameraManager] Focus point of interest set (view: \(normalizedX), \(normalizedY) → device: \(devicePoint.x), \(devicePoint.y))")
        }
    }
    
    /// Setup video output
    /// - Returns: True if setup successful
    @discardableResult
    private func setupVideoOutput() -> Bool {
        let output = AVCaptureVideoDataOutput()
        output.setSampleBufferDelegate(self, queue: sessionQueue)
        output.videoSettings = [
            kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA
        ]
        output.alwaysDiscardsLateVideoFrames = true
        
        if captureSession.canAddOutput(output) {
            captureSession.addOutput(output)
            videoDataOutput = output
            print("[CameraManager] Video output added successfully")
            return true
        } else {
            print("[CameraManager] Cannot add video output to session")
            return false
        }
    }
    
    // MARK: - Video Orientation
    //
    // Capture buffers, the preview layer and Vision must all share one coordinate
    // space. They previously did not: the video-data-output connection was never
    // configured, so in portrait the buffers arrived in landscape sensor
    // orientation while `AVCaptureVideoPreviewLayer`'s metadata space is portrait.
    // Vision's normalized rects were then fed through
    // `layerRectConverted(fromMetadataOutputRect:)`, which effectively swapped X
    // and Y — so the focus-area containment test checked the wrong region and
    // barcode frames were drawn in the wrong place.
    //
    // Rotating at the connection costs a per-frame transform, but it buys a single
    // unambiguous coordinate model shared by capture, preview, detection and ROI
    // cropping. Leaving the buffers native and passing a matching
    // `CGImagePropertyOrientation` to Vision is cheaper, but reintroduces an
    // orientation mapping table that is easy to get wrong in exactly this way.

    /// Read the interface orientation on the main thread, then apply it to the
    /// capture connections on the session queue.
    func updateVideoOrientation() {
        let apply: (UIInterfaceOrientation) -> Void = { [weak self] interfaceOrientation in
            self?.sessionQueue.async {
                self?.applyVideoOrientation(interfaceOrientation)
            }
        }

        if Thread.isMainThread {
            apply(Self.currentInterfaceOrientation())
        } else {
            DispatchQueue.main.async { apply(Self.currentInterfaceOrientation()) }
        }
    }

    private func applyVideoOrientation(_ interfaceOrientation: UIInterfaceOrientation) {
        let connections: [AVCaptureConnection] = [
            videoDataOutput?.connection(with: .video),
            previewLayer?.connection
        ].compactMap { $0 }

        guard !connections.isEmpty else { return }

        for connection in connections {
            if #available(iOS 17.0, *) {
                let angle = Self.videoRotationAngle(for: interfaceOrientation)
                if connection.isVideoRotationAngleSupported(angle) {
                    connection.videoRotationAngle = angle
                }
            } else {
                let orientation = Self.videoOrientation(for: interfaceOrientation)
                if connection.isVideoOrientationSupported {
                    connection.videoOrientation = orientation
                }
            }
        }

        print("[CameraManager] ✅ Video orientation applied for interface orientation \(interfaceOrientation.rawValue)")
    }

    private static func currentInterfaceOrientation() -> UIInterfaceOrientation {
        let scene = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first { $0.activationState == .foregroundActive }
            ?? UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first

        let orientation = scene?.interfaceOrientation ?? .portrait
        return orientation == .unknown ? .portrait : orientation
    }

    /// Clockwise rotation, in degrees, from the camera's native landscape-right.
    private static func videoRotationAngle(for orientation: UIInterfaceOrientation) -> CGFloat {
        switch orientation {
        case .portrait:            return 90
        case .portraitUpsideDown:  return 270
        case .landscapeLeft:       return 180
        case .landscapeRight:      return 0
        default:                   return 90
        }
    }

    /// Note the landscape cases: `UIInterfaceOrientation` and
    /// `AVCaptureVideoOrientation` share names but not raw values, so this maps by
    /// name rather than by `rawValue`.
    private static func videoOrientation(for orientation: UIInterfaceOrientation) -> AVCaptureVideoOrientation {
        switch orientation {
        case .portrait:            return .portrait
        case .portraitUpsideDown:  return .portraitUpsideDown
        case .landscapeLeft:       return .landscapeLeft
        case .landscapeRight:      return .landscapeRight
        default:                   return .portrait
        }
    }

    private func registerOrientationObserverIfNeeded() {
        guard orientationObserver == nil else { return }
        orientationObserver = NotificationCenter.default.addObserver(
            forName: UIDevice.orientationDidChangeNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.updateVideoOrientation()
        }
    }

    private func unregisterOrientationObserver() {
        if let observer = orientationObserver {
            NotificationCenter.default.removeObserver(observer)
            orientationObserver = nil
        }
    }

    /// Setup preview layer
    private func setupPreviewLayer() {
        let preview = AVCaptureVideoPreviewLayer(session: captureSession)
        preview.videoGravity = .resizeAspectFill
        previewLayer = preview
        print("[CameraManager] Preview layer created")

        // Preview and capture connections must be rotated together, or their
        // coordinate spaces diverge again.
        registerOrientationObserverIfNeeded()
        updateVideoOrientation()
    }
    
    // MARK: - Camera Configuration
    
    /// Get the default camera device (back camera)
    /// - Returns: The camera device or nil
    private func getDefaultCameraDevice() -> AVCaptureDevice? {
        // Prefer the physical wide‑angle back camera for barcode scanning.
        // Using the virtual multi‑camera (e.g. builtInTripleCamera) on newer iPhones
        // can cause macro / close‑range focus issues for small barcodes.
        if let wideBack = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back) {
            print("[CameraManager] ✅ Using back wide‑angle camera: \(wideBack.localizedName)")
            return wideBack
        }

        // Fallback: look for any other back camera with torch (dual, telephoto, etc.)
        let deviceTypes: [AVCaptureDevice.DeviceType] = [
            .builtInDualCamera,
            .builtInDualWideCamera,
            .builtInTelephotoCamera,
            .builtInUltraWideCamera,
        ]

        let discovery = AVCaptureDevice.DiscoverySession(
            deviceTypes: deviceTypes,
            mediaType: .video,
            position: .back
        )

        if let torchBack = discovery.devices.first(where: { $0.hasTorch }) {
            print("[CameraManager] ✅ Using fallback back camera with torch: \(torchBack.localizedName)")
            return torchBack
        }

        if let anyBack = discovery.devices.first {
            print("[CameraManager] ⚠️ Back camera found but hasTorch=false: \(anyBack.localizedName)")
            return anyBack
        }

        // Fallback to any available video device
        print("[CameraManager] ⚠️ No back camera available, using default(for: .video)")
        if let device = AVCaptureDevice.default(for: .video) {
            print("[CameraManager] Default camera position: \(device.position.rawValue) - \(device.localizedName) (hasTorch=\(device.hasTorch))")
            return device
        }

        print("[CameraManager] ❌ No camera device available!")
        return nil
    }
    
    /// Check camera permissions
    /// - Parameter completion: Callback with permission status
    private func checkCameraPermission(completion: @escaping (Bool) -> Void) {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            completion(true)
            
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { granted in
                completion(granted)
            }
            
        case .denied, .restricted:
            print("[CameraManager] Camera permission denied or restricted")
            completion(false)
            
        @unknown default:
            completion(false)
        }
    }
    
    // MARK: - Helper Methods
    
    /// Lock device for configuration
    /// - Parameter device: The device to lock
    /// - Parameter configurator: Configuration block
    private func lockDeviceForConfiguration(_ device: AVCaptureDevice,
                                           configurator: (AVCaptureDevice) -> Void) {
        do {
            try device.lockForConfiguration()
            configurator(device)
            device.unlockForConfiguration()
        } catch {
            print("[CameraManager] Failed to lock device for configuration: \(error)")
        }
    }
    
    deinit {
        unregisterSubjectAreaChangeObserver()
        unregisterOrientationObserver()
        stopCamera()
        print("[CameraManager] Deinitialized")
    }
}

// MARK: - AVCaptureVideoDataOutputSampleBufferDelegate

extension CameraManager: AVCaptureVideoDataOutputSampleBufferDelegate {
    func captureOutput(_ output: AVCaptureOutput,
                      didOutput sampleBuffer: CMSampleBuffer,
                      from connection: AVCaptureConnection) {
        // Forward sample buffer to delegate for processing
        delegate?.cameraManager(self, didOutput: sampleBuffer)
    }
    
    func captureOutput(_ output: AVCaptureOutput,
                      didDrop sampleBuffer: CMSampleBuffer,
                      from connection: AVCaptureConnection) {
        // Optionally log dropped frames for debugging
        // print("[CameraManager] Dropped frame")
    }
}

