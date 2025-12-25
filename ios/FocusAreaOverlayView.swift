//
//  FocusAreaOverlayView.swift
//  react-native-scanner
//
//  Overlay view for focus area visualization
//

import UIKit

/// View that draws the focus area overlay with semi-transparent tint and clear center
class FocusAreaOverlayView: UIView, FocusAreaProtocol {
    
    // MARK: - Public Properties
    
    /// Whether the overlay is visible
    var isOverlayVisible: Bool = false {
        didSet { setNeedsDisplay() }
    }
    
    /// Border color for the focus area
    var borderColor: UIColor = .clear {
        didSet { setNeedsDisplay() }
    }
    
    /// Tint color for the overlay (semi-transparent).
    /// Use a custom property name to avoid clashing with UIView.tintColor.
    var overlayTintColor: UIColor = UIColor.black.withAlphaComponent(0.5) {
        didSet { setNeedsDisplay() }
    }
    
    /// Size of the focus area frame
    var frameSize: CGSize = CGSize(width: 300, height: 300) {
        didSet { setNeedsDisplay() }
    }
    
    /// Position of the focus area (percentage 0-100)
    var position: CGPoint = CGPoint(x: 50, y: 50) {
        didSet { setNeedsDisplay() }
    }
    
    /// The calculated frame rectangle in view coordinates
    private(set) var frameRect: CGRect = .zero

    // MARK: - Layers (more reliable than draw/blend modes)

    private let overlayLayer = CAShapeLayer()
    private let borderLayer = CAShapeLayer()
    
    // MARK: - Initialization
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupView()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupView()
    }
    
    private func setupView() {
        // Implementation: Configure view properties
        backgroundColor = .clear
        isUserInteractionEnabled = false
        isOpaque = false

        overlayLayer.fillRule = .evenOdd
        overlayLayer.fillColor = overlayTintColor.cgColor
        overlayLayer.isHidden = true
        layer.addSublayer(overlayLayer)

        borderLayer.fillColor = UIColor.clear.cgColor
        borderLayer.strokeColor = borderColor.cgColor
        borderLayer.lineWidth = 4.0
        borderLayer.isHidden = true
        layer.addSublayer(borderLayer)
    }
    
    // MARK: - Layer Updates

    private func updateLayers() {
        frameRect = calculateFrameRect()

        // Overlay cutout path (even-odd fill)
        let path = UIBezierPath(rect: bounds)
        path.append(UIBezierPath(rect: frameRect))

        overlayLayer.frame = bounds
        overlayLayer.path = path.cgPath
        overlayLayer.fillColor = overlayTintColor.cgColor
        overlayLayer.isHidden = !isOverlayVisible

        // Border path
        borderLayer.frame = bounds
        borderLayer.path = UIBezierPath(rect: frameRect).cgPath
        borderLayer.strokeColor = borderColor.cgColor
        borderLayer.isHidden = (!isOverlayVisible) || (borderColor == .clear)
    }
    
    /// Calculate the focus area frame rectangle
    /// - Returns: The calculated frame rectangle
    private func calculateFrameRect() -> CGRect {
        // Calculate center position based on percentage
        let centerX = bounds.width * (position.x / 100.0)
        let centerY = bounds.height * (position.y / 100.0)
        
        // Create rectangle centered at calculated position
        let rect = CGRect(
            x: centerX - frameSize.width / 2,
            y: centerY - frameSize.height / 2,
            width: frameSize.width,
            height: frameSize.height
        )
        
        return rect
    }
    
    // MARK: - Layout
    
    override func layoutSubviews() {
        super.layoutSubviews()
        updateLayers()
    }
    
    // MARK: - FocusAreaProtocol Methods
    
    /// Update focus area configuration
    /// - Parameter config: The new configuration
    func updateFocusArea(config: FocusAreaConfig) {
        isOverlayVisible = config.showOverlay
        borderColor = config.borderColor
        overlayTintColor = config.tintColor
        frameSize = config.size.size
        position = config.position

        updateLayers()
    }
    
    /// Get the current focus area frame in view coordinates
    /// - Returns: The focus area rectangle
    func getFocusAreaFrame() -> CGRect? {
        // Return the frame rect regardless of overlay visibility.
        // Overlay visibility controls drawing; filtering should depend on FocusAreaConfig.enabled.
        return frameRect.isEmpty ? nil : frameRect
    }
    
    /// Check if a point is within the focus area
    /// - Parameter point: The point to check
    /// - Returns: True if the point is within the focus area
    func isPointInFocusArea(_ point: CGPoint) -> Bool {
        return frameRect.contains(point)
    }
    
    /// Check if a rectangle intersects or is contained in the focus area
    /// - Parameter rect: The rectangle to check
    /// - Returns: True if the rectangle intersects or is contained
    func isRectInFocusArea(_ rect: CGRect) -> Bool {
        // Match Android behavior: require barcode box to be fully inside the focus frame.
        return frameRect.contains(rect)
    }
}
