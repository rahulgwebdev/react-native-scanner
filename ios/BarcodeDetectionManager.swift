//
//  BarcodeDetectionManager.swift
//  react-native-scanner
//
//  Manages barcode detection using Vision framework
//

import Foundation
import Vision
import AVFoundation

/// Manages barcode detection using Vision framework
class BarcodeDetectionManager: NSObject, BarcodeScannerProtocol {
    
    // MARK: - Public Properties
    
    /// Delegate for detection events
    weak var delegate: BarcodeDetectionDelegate?
    
    // MARK: - Private Properties
    
    /// Supported barcode symbologies
    private var supportedSymbologies: [VNBarcodeSymbology]
    
    /// Scan strategy
    private var scanStrategy: BarcodeScanStrategy
    
    /// Whether scanning is paused
    private var scanningPaused: Bool
    
    /// Background queue for detection
    private let detectionQueue: DispatchQueue

    /// Guards against queueing frames faster than they can be decoded.
    private let detectionStateLock = NSLock()
    private var isDetecting: Bool = false

    /// Every symbology this library can decode.
    ///
    /// The default is deliberately "everything": operators in the field do not
    /// know barcode types, they scan whatever is printed on the equipment.
    /// Accuracy is defended in the verification layer (per-format consensus
    /// tiers, checksums, edge-touch rejection) rather than by narrowing this set.
    ///
    /// Integrators who DO know their formats should pass `barcodeTypes` — a
    /// smaller set is faster and reduces cross-symbology confusion.
    /// Deliberately excludes MSI Plessey and the GS1 DataBar family: ML Kit has no
    /// counterpart, so supporting them on iOS alone would mean a label that scans
    /// on one platform and not the other. Platform parity outranks raw coverage
    /// for a cross-platform library.
    static let allSymbologies: [VNBarcodeSymbology] = [
        .qr, .microQR, .aztec, .dataMatrix, .pdf417, .microPDF417,
        .code128, .code39, .code39Checksum, .code39FullASCII,
        .code93, .code93i,
        .ean8, .ean13, .upce,
        .itf14, .i2of5, .i2of5Checksum,
        .codabar
    ]

    
    // MARK: - Initialization
    
    override init() {
        // Default: all supported formats
        self.supportedSymbologies = BarcodeDetectionManager.allSymbologies
        self.scanStrategy = .defaultStrategy
        self.scanningPaused = false
        self.detectionQueue = DispatchQueue(label: "com.scanner.detection")
        
        super.init()
    }
    
    // MARK: - Public Methods
    
    /// Detect barcodes in a sample buffer
    /// - Parameter sampleBuffer: The sample buffer to analyze
    func detectBarcodes(in sampleBuffer: CMSampleBuffer) {
        guard !scanningPaused else { return }
        
        guard let pixelBuffer = getPixelBuffer(from: sampleBuffer) else {
            return
        }
        
        let request = createDetectionRequest()
        let orientation = getImageOrientation(from: sampleBuffer)
        
        let handler = VNImageRequestHandler(cvPixelBuffer: pixelBuffer,
                                           orientation: orientation,
                                           options: [:])
        
        detectionQueue.async { [weak self] in
            do {
                try handler.perform([request])
            } catch {
                print("[BarcodeDetectionManager] Detection failed: \(error)")
                DispatchQueue.main.async {
                    self?.delegate?.barcodeDetectionManager(self!, didFailWith: error)
                }
            }
        }
    }
    
    /// Detect barcodes in a CMSampleBuffer with completion
    /// - Parameters:
    ///   - sampleBuffer: The sample buffer to analyze
    ///   - completion: Completion handler with observations
    /// - Note: `completion` runs only for frames that are actually decoded.
    ///   Frames dropped because a detection is already in flight do not call back,
    ///   so callers never see a spurious empty result (which would clear the
    ///   on-screen barcode frames and cause flicker).
    func detectBarcodes(in sampleBuffer: CMSampleBuffer,
                       completion: @escaping ([VNBarcodeObservation]) -> Void) {
        guard !scanningPaused else {
            completion([])
            return
        }
        
        guard let pixelBuffer = getPixelBuffer(from: sampleBuffer) else {
            completion([])
            return
        }

        // `alwaysDiscardsLateVideoFrames` only drops at the output stage. Once a
        // frame is dispatched onto the serial detection queue it is committed, so
        // without this guard frames pile up unbounded and we decode stale ones
        // long after the camera has moved on.
        detectionStateLock.lock()
        if isDetecting {
            detectionStateLock.unlock()
            return
        }
        isDetecting = true
        detectionStateLock.unlock()

        let finish: ([VNBarcodeObservation]) -> Void = { [weak self] observations in
            guard let self = self else { return }
            self.detectionStateLock.lock()
            self.isDetecting = false
            self.detectionStateLock.unlock()
            completion(observations)
        }
        
        let request = VNDetectBarcodesRequest { request, error in
            if let error = error {
                print("[BarcodeDetectionManager] Detection error: \(error)")
                finish([])
                return
            }
            
            guard let results = request.results as? [VNBarcodeObservation] else {
                finish([])
                return
            }
            
            finish(results)
        }
        
        request.symbologies = supportedSymbologies
        
        let orientation = getImageOrientation(from: sampleBuffer)
        let handler = VNImageRequestHandler(cvPixelBuffer: pixelBuffer,
                                           orientation: orientation,
                                           options: [:])
        
        detectionQueue.async {
            do {
                try handler.perform([request])
            } catch {
                print("[BarcodeDetectionManager] Detection failed: \(error)")
                finish([])
            }
        }
    }
    
    // MARK: - BarcodeScannerProtocol Methods
    
    /// Pause barcode scanning
    func pauseScanning() {
        scanningPaused = true
        detectionStateLock.lock()
        isDetecting = false
        detectionStateLock.unlock()
        print("[BarcodeDetectionManager] Scanning paused")
    }
    
    /// Resume barcode scanning
    func resumeScanning() {
        scanningPaused = false
        print("[BarcodeDetectionManager] Scanning resumed")
    }
    
    /// Check if scanning is paused
    /// - Returns: True if scanning is paused
    func isScanningPaused() -> Bool {
        // Implementation: Return paused state
        return scanningPaused
    }
    
    /// Set the barcode formats to detect
    /// - Parameter formats: Array of barcode formats
    func setBarcodeFormats(_ formats: [BarcodeFormat]) {
        if formats.isEmpty {
            // If empty, use all supported formats
            supportedSymbologies = BarcodeDetectionManager.allSymbologies
        } else {
            // flatMap: one JS format can map to several Vision symbologies
            // (e.g. CODE_39 covers the plain, checksum and full-ASCII variants).
            supportedSymbologies = Array(Set(formats.flatMap { $0.visionSymbologies }))
        }
        print("[BarcodeDetectionManager] Barcode formats updated: \(supportedSymbologies)")
    }
    
    /// Set the scan strategy
    /// - Parameter strategy: The scan strategy to use
    func setScanStrategy(_ strategy: BarcodeScanStrategy) {
        scanStrategy = strategy
        print("[BarcodeDetectionManager] Scan strategy set to: \(strategy.rawValue)")
    }
    
    // MARK: - Private Methods
    
    /// Create a barcode detection request
    /// - Returns: Configured VNDetectBarcodesRequest
    private func createDetectionRequest() -> VNDetectBarcodesRequest {
        let request = VNDetectBarcodesRequest { [weak self] request, error in
            self?.handleDetectionResults(request: request, error: error)
        }
        
        request.symbologies = supportedSymbologies
        
        return request
    }
    
    /// Process detection results
    /// - Parameters:
    ///   - request: The completed request
    ///   - error: Any error that occurred
    private func handleDetectionResults(request: VNRequest, error: Error?) {
        if let error = error {
            print("[BarcodeDetectionManager] Detection error: \(error)")
            DispatchQueue.main.async { [weak self] in
                guard let self = self else { return }
                self.delegate?.barcodeDetectionManager(self, didFailWith: error)
            }
            return
        }
        
        guard let results = request.results as? [VNBarcodeObservation] else {
            return
        }
        
        // Filter out barcodes without valid payload
        let validBarcodes = results.filter { $0.payloadStringValue != nil }
        
        if !validBarcodes.isEmpty {
            DispatchQueue.main.async { [weak self] in
                guard let self = self else { return }
                self.delegate?.barcodeDetectionManager(self, didDetect: validBarcodes)
            }
        }
    }
    
    /// Get pixel buffer from sample buffer
    /// - Parameter sampleBuffer: The sample buffer
    /// - Returns: Pixel buffer or nil
    private func getPixelBuffer(from sampleBuffer: CMSampleBuffer) -> CVPixelBuffer? {
        return CMSampleBufferGetImageBuffer(sampleBuffer)
    }
    
    /// Get image orientation from sample buffer
    /// - Parameter sampleBuffer: The sample buffer
    /// - Returns: CGImagePropertyOrientation
    private func getImageOrientation(from sampleBuffer: CMSampleBuffer) -> CGImagePropertyOrientation {
        // `.up` is correct because CameraManager rotates the video-data-output
        // connection to match the interface orientation, so buffers arrive already
        // upright. Vision's normalized rects therefore land in the same space as
        // the preview layer's metadata rects, which is what
        // CoordinateTransformer relies on.
        //
        // If that connection rotation is ever removed, this must become a real
        // device-orientation mapping or the focus-area test silently targets the
        // wrong region again.
        return .up
    }
}

