//
//  CoordinateTransformer.swift
//  react-native-scanner
//
//  Transforms coordinates between Vision and View coordinate spaces
//

import Foundation
import CoreGraphics
import AVFoundation

/// Utility for transforming coordinates between different spaces
class CoordinateTransformer: CoordinateTransformationProtocol {
    
    // MARK: - Public Static Methods
    
    /// Transform Vision framework coordinates to view coordinates
    /// - Parameters:
    ///   - visionRect: Rectangle in Vision coordinate space (normalized 0-1, bottom-left origin)
    ///   - viewSize: The size of the view
    ///   - previewLayer: The preview layer for additional transformation
    /// - Returns: Rectangle in view coordinate space (points, top-left origin)
    static func transformVisionRectToViewRect(_ visionRect: CGRect,
                                             viewSize: CGSize,
                                             previewLayer: AVCaptureVideoPreviewLayer?) -> CGRect {
        // Best-effort: when we have a previewLayer, use Apple's conversion.
        // Vision boundingBox is normalized (0-1) with origin at bottom-left.
        // AVCapture metadata normalized rect expects origin at top-left.
        if let layer = previewLayer {
            let metadataRect = CGRect(
                x: visionRect.minX,
                y: 1.0 - visionRect.minY - visionRect.height,
                width: visionRect.width,
                height: visionRect.height
            )
            return layer.layerRectConverted(fromMetadataOutputRect: metadataRect)
        }

        // Fallback (no previewLayer): approximate in view coords.
        // Step 1: Denormalize from 0-1 to view size
        var rect = denormalizeRect(visionRect, toSize: viewSize)
        // Step 2: Flip Y-axis (Vision uses bottom-left, UIKit uses top-left)
        rect = flipYAxis(rect, containerHeight: viewSize.height)
        return rect
    }
    
    /// Transform view coordinates to Vision framework coordinates
    /// - Parameters:
    ///   - viewRect: Rectangle in view coordinate space (points, top-left origin)
    ///   - viewSize: The size of the view
    ///   - previewLayer: The preview layer for additional transformation
    /// - Returns: Rectangle in Vision coordinate space (normalized 0-1, bottom-left origin)
    static func transformViewRectToVisionRect(_ viewRect: CGRect,
                                             viewSize: CGSize,
                                             previewLayer: AVCaptureVideoPreviewLayer?) -> CGRect {
        var rect = viewRect
        
        // Step 1: Account for video gravity if provided (reverse)
        if let _ = previewLayer {
            // Note: This is simplified; full implementation would reverse the video gravity transformation
            rect = viewRect
        }
        
        // Step 2: Flip Y-axis (UIKit to Vision)
        rect = flipYAxis(rect, containerHeight: viewSize.height)
        
        // Step 3: Normalize from view size to 0-1
        rect = normalizeRect(rect, fromSize: viewSize)
        
        return rect
    }
    
    // MARK: - Private Helper Methods
    
    /// Flip rectangle's Y-axis
    /// - Parameters:
    ///   - rect: Rectangle to flip
    ///   - containerHeight: Height of the container
    /// - Returns: Flipped rectangle
    private static func flipYAxis(_ rect: CGRect, containerHeight: CGFloat) -> CGRect {
        // Implementation: Flip from bottom-left to top-left origin or vice versa
        return CGRect(
            x: rect.minX,
            y: containerHeight - rect.maxY,
            width: rect.width,
            height: rect.height
        )
    }
    
    /// Denormalize rectangle from 0-1 to actual size
    /// - Parameters:
    ///   - normalizedRect: Normalized rectangle (0-1)
    ///   - size: Target size
    /// - Returns: Denormalized rectangle
    private static func denormalizeRect(_ normalizedRect: CGRect, toSize size: CGSize) -> CGRect {
        // Implementation: Scale from normalized to actual coordinates
        return CGRect(
            x: normalizedRect.minX * size.width,
            y: normalizedRect.minY * size.height,
            width: normalizedRect.width * size.width,
            height: normalizedRect.height * size.height
        )
    }
    
    /// Normalize rectangle from actual size to 0-1
    /// - Parameters:
    ///   - rect: Rectangle in actual coordinates
    ///   - size: Source size
    /// - Returns: Normalized rectangle (0-1)
    private static func normalizeRect(_ rect: CGRect, fromSize size: CGSize) -> CGRect {
        guard size.width > 0 && size.height > 0 else { return .zero }
        
        return CGRect(
            x: rect.minX / size.width,
            y: rect.minY / size.height,
            width: rect.width / size.width,
            height: rect.height / size.height
        )
    }
    
    /// Account for preview layer's video gravity transformation
    /// - Parameters:
    ///   - rect: Rectangle to transform
    ///   - previewLayer: The preview layer
    /// - Returns: Transformed rectangle
    private static func accountForVideoGravity(_ rect: CGRect,
                                              previewLayer: AVCaptureVideoPreviewLayer) -> CGRect {
        // Use the preview layer's built-in transformation if available
        // This accounts for ResizeAspectFill, ResizeAspect, etc.
        
        // For most cases with ResizeAspectFill, the rect is already correct
        // because we're working in the same coordinate space as the view
        
        // Advanced: Could use layerRectConverted(fromMetadataOutputRect:)
        // but that's for metadata coordinates, not Vision coordinates
        
        return rect
    }
}

