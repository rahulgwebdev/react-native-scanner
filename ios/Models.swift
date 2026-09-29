//
//  Models.swift
//  react-native-scanner
//
//  Created for iOS barcode scanner implementation
//

import Foundation
import UIKit
import Vision

// MARK: - Barcode Format Enum

/// Supported barcode formats, mapped from React Native props
enum BarcodeFormat: String {
    case qrCode = "QR_CODE"
    case code128 = "CODE_128"
    case code39 = "CODE_39"
    case ean13 = "EAN_13"
    case ean8 = "EAN_8"
    case upcA = "UPC_A"
    case upcE = "UPC_E"
    case dataMatrix = "DATA_MATRIX"
    case pdf417 = "PDF_417"
    case aztec = "AZTEC"
    case itf = "ITF"
    case code93 = "CODE_93"
    case codabar = "CODABAR"

    /// Vision symbologies covered by this format.
    ///
    /// Several JS formats map to more than one symbology, because Vision splits
    /// variants that ML Kit and the JS API treat as a single format.
    var visionSymbologies: [VNBarcodeSymbology] {
        switch self {
        case .qrCode: return [.qr, .microQR]
        case .code128: return [.code128]
        case .code39: return [.code39, .code39Checksum, .code39FullASCII]
        case .code93: return [.code93, .code93i]
        case .codabar: return [.codabar]
        case .ean13: return [.ean13]
        case .ean8: return [.ean8]
        // Vision has no distinct UPC-A symbology: it reports UPC-A as EAN-13 with
        // a leading zero. Mapping UPC_A to .upce meant requesting UPC_A detected
        // nothing at all.
        case .upcA: return [.ean13]
        case .upcE: return [.upce]
        case .dataMatrix: return [.dataMatrix]
        case .pdf417: return [.pdf417, .microPDF417]
        case .aztec: return [.aztec]
        // .itf14 enforces 14 digits. Plain .i2of5 has no check digit and a
        // substring of a real code decodes as a valid code, so it is held to a
        // higher consensus bar in the verification layer.
        case .itf: return [.itf14, .i2of5, .i2of5Checksum]
        }
    }
    
    /// Map a Vision symbology back to the JS `BarcodeFormat` name.
    ///
    /// `VNBarcodeSymbology.rawValue` is an Apple identifier like
    /// "VNBarcodeSymbologyQR", which is not a member of the JS `BarcodeFormat`
    /// enum — emitting it directly broke the `BarcodeScannedEventPayload.format`
    /// contract the same way Android's raw integer did.
    ///
    /// `payload` is needed because Vision has no distinct UPC-A symbology: it
    /// reports UPC-A as a 13-digit EAN-13 with a leading zero. ML Kit reports
    /// those as UPC_A with 12 digits, so this normalizes iOS to match.
    static func jsFormatName(for symbology: VNBarcodeSymbology, payload: String) -> String {
        switch symbology {
        case .qr, .microQR: return "QR_CODE"
        case .aztec: return "AZTEC"
        case .dataMatrix: return "DATA_MATRIX"
        case .pdf417, .microPDF417: return "PDF_417"
        case .code128: return "CODE_128"
        case .code39, .code39Checksum, .code39FullASCII, .code39FullASCIIChecksum:
            return "CODE_39"
        case .code93, .code93i: return "CODE_93"
        case .codabar: return "CODABAR"
        case .ean8: return "EAN_8"
        case .ean13: return isUPCA(payload) ? "UPC_A" : "EAN_13"
        case .upce: return "UPC_E"
        case .itf14, .i2of5, .i2of5Checksum: return "ITF"
        default: return "UNKNOWN"
        }
    }

    /// Normalize a payload for the JS layer. Strips the EAN-13 leading zero from
    /// UPC-A codes so the emitted value is the 12 digits printed on the label,
    /// which is also what ML Kit returns.
    static func normalizePayload(_ payload: String, symbology: VNBarcodeSymbology) -> String {
        guard symbology == .ean13, isUPCA(payload) else { return payload }
        return String(payload.dropFirst())
    }

    /// An EAN-13 beginning with "0" is a UPC-A code; that prefix is the GS1
    /// allocation for the US/Canada, which is exactly the UPC-A range.
    private static func isUPCA(_ payload: String) -> Bool {
        return payload.count == 13
            && payload.hasPrefix("0")
            && payload.allSatisfy { $0.isNumber }
    }

    /// Get all supported formats
    static var allFormats: [BarcodeFormat] {
        return [.qrCode, .code128, .code39, .code93, .codabar, .ean13, .ean8,
                .upcA, .upcE, .dataMatrix, .pdf417, .aztec, .itf]
    }
}

// MARK: - Barcode Scan Strategy

/// Strategy for processing multiple detected barcodes
enum BarcodeScanStrategy: String {
    case one = "ONE"                    // Process only the first barcode
    case all = "ALL"                    // Process all detected barcodes
    case biggest = "BIGGEST"            // Process only the largest barcode by area
    case sortByBiggest = "SORT_BY_BIGGEST"  // Process all barcodes sorted by size
    
    static var defaultStrategy: BarcodeScanStrategy { .all }
}

// MARK: - Frame Size

/// Size configuration for focus area frame
enum FrameSize {
    case square(size: CGFloat)
    case rectangle(width: CGFloat, height: CGFloat)
    
    /// Get the CGSize representation
    var size: CGSize {
        switch self {
        case .square(let size):
            return CGSize(width: size, height: size)
        case .rectangle(let width, let height):
            return CGSize(width: width, height: height)
        }
    }
    
    /// Create from React Native prop (number or object)
    static func from(value: Any) -> FrameSize {
        if let number = value as? NSNumber {
            return .square(size: CGFloat(number.doubleValue))
        } else if let dict = value as? [String: Any],
                  let width = dict["width"] as? NSNumber,
                  let height = dict["height"] as? NSNumber {
            return .rectangle(width: CGFloat(width.doubleValue), height: CGFloat(height.doubleValue))
        }
        return .square(size: 300) // Default
    }
}

// MARK: - Focus Area Configuration

/// Configuration for the focus area overlay
struct FocusAreaConfig {
    var enabled: Bool               // Whether to restrict scanning to focus area only
    var showOverlay: Bool           // Whether to draw the focus area overlay
    var size: FrameSize            // Size of the focus area
    var borderColor: UIColor       // Color of the focus area border
    var tintColor: UIColor         // Color of the semi-transparent overlay
    var position: CGPoint          // Position as percentage (0-100)
    
    /// Default configuration
    static var defaultConfig: FocusAreaConfig {
        return FocusAreaConfig(
            enabled: false,
            showOverlay: false,
            size: .square(size: 300),
            borderColor: .clear,
            tintColor: UIColor.black.withAlphaComponent(0.5),
            position: CGPoint(x: 50, y: 50)
        )
    }
    
    /// Create from React Native prop dictionary
    static func from(dict: [String: Any]) -> FocusAreaConfig {
        var config = defaultConfig
        
        if let enabled = dict["enabled"] as? Bool {
            config.enabled = enabled
        }
        
        if let showOverlay = dict["showOverlay"] as? Bool {
            config.showOverlay = showOverlay
        }
        
        if let sizeValue = dict["size"] {
            config.size = FrameSize.from(value: sizeValue)
        }
        
        if let borderColorStr = dict["borderColor"] as? String {
            config.borderColor = UIColor(hexString: borderColorStr)
        }
        
        if let tintColorStr = dict["tintColor"] as? String {
            // Match Android behavior: tintColor is treated as a base color with 50% opacity
            // unless the user explicitly supplies an 8-digit ARGB value.
            let trimmed = tintColorStr.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
            let parsed = UIColor(hexString: tintColorStr)
            if trimmed.count == 8 {
                // ARGB includes alpha; respect it.
                config.tintColor = parsed
            } else {
                // Force semi-transparent overlay like Android (alpha ~ 0.5)
                config.tintColor = parsed.withAlphaComponent(0.5)
            }
        }
        
        if let positionDict = dict["position"] as? [String: Any],
           let x = positionDict["x"] as? NSNumber,
           let y = positionDict["y"] as? NSNumber {
            config.position = CGPoint(x: CGFloat(x.doubleValue), y: CGFloat(y.doubleValue))
        }
        
        return config
    }
}

// MARK: - Barcode Frames Configuration

/// Configuration for barcode frame visualization
struct BarcodeFramesConfig {
    var enabled: Bool               // Whether to draw frames around detected barcodes
    var color: UIColor             // Color of barcode frames
    var onlyInFocusArea: Bool      // Only show frames for barcodes in focus area
    
    /// Default configuration
    static var defaultConfig: BarcodeFramesConfig {
        return BarcodeFramesConfig(
            enabled: false,
            color: .yellow,
            onlyInFocusArea: false
        )
    }
    
    /// Create from React Native prop dictionary
    static func from(dict: [String: Any]) -> BarcodeFramesConfig {
        var config = defaultConfig
        
        if let enabled = dict["enabled"] as? Bool {
            config.enabled = enabled
        }
        
        if let colorStr = dict["color"] as? String {
            config.color = UIColor(hexString: colorStr)
        }
        
        if let onlyInFocusArea = dict["onlyInFocusArea"] as? Bool {
            config.onlyInFocusArea = onlyInFocusArea
        }
        
        return config
    }
}

// MARK: - Barcode Detection Result

/// Detected barcode information
struct BarcodeDetectionResult {
    let data: String                    // The scanned barcode data
    let format: String                  // The format of the barcode
    let timestamp: TimeInterval        // Timestamp when scanned (milliseconds)
    let boundingBox: CGRect?           // Bounding box in view coordinates
    let area: CGFloat?                 // Area of the barcode
    
    /// Convert to dictionary for React Native event
    func toDictionary() -> [String: Any] {
        var dict: [String: Any] = [
            "data": data,
            "format": format,
            "timestamp": timestamp
        ]
        
        if let box = boundingBox {
            dict["boundingBox"] = [
                "left": box.minX,
                "top": box.minY,
                "right": box.maxX,
                "bottom": box.maxY
            ]
        }
        
        if let area = area {
            dict["area"] = area
        }
        
        return dict
    }
    
    /// Create from Vision barcode observation
    static func from(observation: VNBarcodeObservation, 
                    boundingBox: CGRect? = nil,
                    format: String? = nil) -> BarcodeDetectionResult? {
        guard let rawPayload = observation.payloadStringValue else { return nil }

        let payloadString = BarcodeFormat.normalizePayload(rawPayload, symbology: observation.symbology)
        let detectedFormat = format ?? BarcodeFormat.jsFormatName(
            for: observation.symbology,
            payload: rawPayload
        )
        let timestamp = Date().timeIntervalSince1970 * 1000 // Convert to milliseconds
        
        let area = boundingBox.map { $0.width * $0.height }
        
        return BarcodeDetectionResult(
            data: payloadString,
            format: detectedFormat,
            timestamp: timestamp,
            boundingBox: boundingBox,
            area: area
        )
    }
}

// MARK: - Barcode Frame Data

/// Data for a single barcode frame
struct BarcodeFrame {
    let rect: CGRect
    var lastSeenTime: Date
    
    init(rect: CGRect, lastSeenTime: Date = Date()) {
        self.rect = rect
        self.lastSeenTime = lastSeenTime
    }
}

// MARK: - Scanner Error

/// Error information for scanner errors
struct ScannerError {
    let error: String
    let code: String
    
    /// Convert to dictionary for React Native event
    func toDictionary() -> [String: Any] {
        return [
            "error": error,
            "code": code
        ]
    }
    
    /// Common error codes
    enum ErrorCode: String {
        case cameraPermissionDenied = "CAMERA_PERMISSION_DENIED"
        case cameraInitializationFailed = "CAMERA_INITIALIZATION_FAILED"
        case cameraNotAvailable = "CAMERA_NOT_AVAILABLE"
        case barcodeDetectionFailed = "BARCODE_DETECTION_FAILED"
        case unknown = "UNKNOWN_ERROR"
    }
    
    /// Create from error code
    static func from(code: ErrorCode, message: String) -> ScannerError {
        return ScannerError(error: message, code: code.rawValue)
    }
}

// MARK: - Load Event

/// Load event payload
struct LoadEventPayload {
    let success: Bool
    let error: String?
    
    /// Convert to dictionary for React Native event
    func toDictionary() -> [String: Any] {
        var dict: [String: Any] = ["success": success]
        if let error = error {
            dict["error"] = error
        }
        return dict
    }
}

// MARK: - UIColor Extension

extension UIColor {
    /// Create UIColor from hex string
    convenience init(hexString: String) {
        let hex = hexString.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        
        self.init(
            red: CGFloat(r) / 255,
            green: CGFloat(g) / 255,
            blue: CGFloat(b) / 255,
            alpha: CGFloat(a) / 255
        )
    }
}

