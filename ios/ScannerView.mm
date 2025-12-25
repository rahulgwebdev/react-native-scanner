#import "ScannerView.h"

#import <react/renderer/components/ScannerViewSpec/ComponentDescriptors.h>
#import <react/renderer/components/ScannerViewSpec/EventEmitters.h>
#import <react/renderer/components/ScannerViewSpec/Props.h>
#import <react/renderer/components/ScannerViewSpec/RCTComponentViewHelpers.h>

#import "RCTFabricComponentsPlugins.h"

// Import of the generated Swift header is not required because we use dynamic lookup (NSClassFromString).
// If you later want to statically reference Swift symbols, import "<ProductModuleName>-Swift.h" instead,
// where ProductModuleName matches your target's Packaging > Product Module Name.

using namespace facebook::react;

// No need to forward-declare ScannerViewImpl now, since we will use dynamic lookup at runtime.

@interface ScannerView () <RCTScannerViewViewProtocol>
@property (nonatomic, strong) UIView *scannerImpl;
@end

@implementation ScannerView

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
    return concreteComponentDescriptorProvider<ScannerViewComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
    if (self = [super initWithFrame:frame]) {
        static const auto defaultProps = std::make_shared<const ScannerViewProps>();
        _props = defaultProps;

        NSLog(@"[ScannerView] 🚀 Starting initialization...");
        
        // Initialize Swift implementation
        // Try with module name first (Scanner is the module name from Scanner.podspec)
        Class scannerImplClass = NSClassFromString(@"ScannerViewImpl");
        if (!scannerImplClass) {
            scannerImplClass = NSClassFromString(@"Scanner.ScannerViewImpl");
        }
        if (!scannerImplClass) {
            scannerImplClass = NSClassFromString(@"react_native_scanner.ScannerViewImpl");
        }
        
        if (scannerImplClass) {
            NSLog(@"[ScannerView] ✅ Found ScannerViewImpl class: %@", scannerImplClass);
            
            // Create instance
            _scannerImpl = [[scannerImplClass alloc] initWithFrame:CGRectZero];
            
            if (_scannerImpl) {
                NSLog(@"[ScannerView] ✅ ScannerViewImpl instance created successfully");
                
                // Try to set delegate using the property directly
                if ([_scannerImpl respondsToSelector:@selector(setDelegate:)]) {
                    [_scannerImpl performSelector:@selector(setDelegate:) withObject:self];
                    NSLog(@"[ScannerView] ✅ Delegate set successfully using setDelegate:");
                } else {
                    NSLog(@"[ScannerView] ⚠️ setDelegate: selector not found");
                }
                
                // IMPORTANT (Fabric): set the component's contentView to our Swift implementation.
                // Fabric will size `contentView` via `updateLayoutMetrics`, not necessarily via `layoutSubviews`.
                self.contentView = _scannerImpl;
                _scannerImpl.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
                _scannerImpl.frame = self.bounds;
                
                NSLog(@"[ScannerView] ✅ View hierarchy setup complete (contentView bounds: %@, scannerImpl frame: %@)", 
                      NSStringFromCGRect(self.contentView.bounds), 
                      NSStringFromCGRect(_scannerImpl.frame));
            } else {
                NSLog(@"[ScannerView] ❌ Failed to create ScannerViewImpl instance");
            }
        } else {
            NSLog(@"[ScannerView] ❌ ERROR: ScannerViewImpl class not found!");
            NSLog(@"[ScannerView] Tried: ScannerViewImpl, Scanner.ScannerViewImpl, react_native_scanner.ScannerViewImpl");
        }
    }

    return self;
}

- (void)updateLayoutMetrics:(LayoutMetrics const &)layoutMetrics oldLayoutMetrics:(LayoutMetrics const &)oldLayoutMetrics
{
    [super updateLayoutMetrics:layoutMetrics oldLayoutMetrics:oldLayoutMetrics];
    
    // Fabric layout updates flow through here. Ensure the Swift view always matches our bounds.
    if (_scannerImpl) {
        _scannerImpl.frame = self.bounds;
        NSLog(@"[ScannerView] 📏 updateLayoutMetrics - bounds: %@, scannerImpl frame: %@",
              NSStringFromCGRect(self.bounds),
              NSStringFromCGRect(_scannerImpl.frame));
    } else {
        NSLog(@"[ScannerView] 📏 updateLayoutMetrics - bounds: %@ (no scannerImpl yet)", NSStringFromCGRect(self.bounds));
    }
}

- (void)prepareForRecycle
{
    [super prepareForRecycle];
    NSLog(@"[ScannerView] prepareForRecycle called");
}

- (void)mountChildComponentView:(UIView<RCTComponentViewProtocol> *)childComponentView index:(NSInteger)index
{
    [super mountChildComponentView:childComponentView index:index];
    NSLog(@"[ScannerView] mountChildComponentView called at index: %ld", (long)index);
}

- (void)finalizeUpdates:(RNComponentViewUpdateMask)updateMask
{
    [super finalizeUpdates:updateMask];
    NSLog(@"[ScannerView] 🔄 finalizeUpdates - frame: %@, bounds: %@", NSStringFromCGRect(self.frame), NSStringFromCGRect(self.bounds));
    
    // Force layout when we have a valid frame
    if (self.bounds.size.width > 0 && self.bounds.size.height > 0) {
        if (_scannerImpl) {
            _scannerImpl.frame = self.contentView.bounds;
            NSLog(@"[ScannerView] 🔧 Force updated scannerImpl frame in finalizeUpdates: %@", NSStringFromCGRect(_scannerImpl.frame));
        }
    }
}

- (void)layoutSubviews
{
    [super layoutSubviews];
    
    NSLog(@"[ScannerView] 📐 layoutSubviews - contentView bounds: %@", NSStringFromCGRect(self.contentView.bounds));
    
    // Update the scanner impl frame to match contentView bounds
    if (_scannerImpl) {
        _scannerImpl.frame = self.contentView.bounds;
        NSLog(@"[ScannerView] Updated scannerImpl frame to: %@", NSStringFromCGRect(_scannerImpl.frame));
    }
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps
{
    const auto &oldViewProps = *std::static_pointer_cast<ScannerViewProps const>(_props);
    const auto &newViewProps = *std::static_pointer_cast<ScannerViewProps const>(props);

    if (!_scannerImpl) {
        [super updateProps:props oldProps:oldProps];
        return;
    }

    // Barcode types
    if (oldViewProps.barcodeTypes != newViewProps.barcodeTypes) {
        NSMutableArray *formats = [NSMutableArray new];
        for (const auto &format : newViewProps.barcodeTypes) {
            [formats addObject:[NSString stringWithUTF8String:format.c_str()]];
        }
        [_scannerImpl performSelector:@selector(setBarcodeTypes:) withObject:formats];
    }

    // Focus area (overlay + optional filtering)
    auto focusAreaChanged = (
        oldViewProps.focusArea.enabled != newViewProps.focusArea.enabled ||
        oldViewProps.focusArea.showOverlay != newViewProps.focusArea.showOverlay ||
        oldViewProps.focusArea.borderColor != newViewProps.focusArea.borderColor ||
        oldViewProps.focusArea.tintColor != newViewProps.focusArea.tintColor ||
        oldViewProps.focusArea.size.width != newViewProps.focusArea.size.width ||
        oldViewProps.focusArea.size.height != newViewProps.focusArea.size.height ||
        oldViewProps.focusArea.position.x != newViewProps.focusArea.position.x ||
        oldViewProps.focusArea.position.y != newViewProps.focusArea.position.y
    );
    if (focusAreaChanged) {
        NSMutableDictionary *focusAreaDict = [NSMutableDictionary dictionary];

        [focusAreaDict setObject:@(newViewProps.focusArea.enabled) forKey:@"enabled"];
        [focusAreaDict setObject:@(newViewProps.focusArea.showOverlay) forKey:@"showOverlay"];

        if (!newViewProps.focusArea.borderColor.empty()) {
            [focusAreaDict setObject:[NSString stringWithUTF8String:newViewProps.focusArea.borderColor.c_str()] forKey:@"borderColor"];
        }
        if (!newViewProps.focusArea.tintColor.empty()) {
            [focusAreaDict setObject:[NSString stringWithUTF8String:newViewProps.focusArea.tintColor.c_str()] forKey:@"tintColor"];
        }

        // size: either number or {width,height}
        if (newViewProps.focusArea.size.width > 0 || newViewProps.focusArea.size.height > 0) {
            if (newViewProps.focusArea.size.width == newViewProps.focusArea.size.height) {
                [focusAreaDict setObject:@(newViewProps.focusArea.size.width) forKey:@"size"];
            } else {
                [focusAreaDict setObject:@{
                    @"width": @(newViewProps.focusArea.size.width),
                    @"height": @(newViewProps.focusArea.size.height)
                } forKey:@"size"];
            }
        }

        // position: {x,y} in 0-100
        // Android defaults to 50/50 when position isn't provided.
        // Codegen initializes missing nested fields to 0.0, so we only forward position when non-zero.
        // Note: this means explicitly setting {x:0,y:0} from JS is not representable with this heuristic.
        if (newViewProps.focusArea.position.x != 0.0 || newViewProps.focusArea.position.y != 0.0) {
            [focusAreaDict setObject:@{
                @"x": @(newViewProps.focusArea.position.x),
                @"y": @(newViewProps.focusArea.position.y)
            } forKey:@"position"];
        }

        if ([_scannerImpl respondsToSelector:@selector(configureFocusArea:)]) {
            [_scannerImpl performSelector:@selector(configureFocusArea:) withObject:focusAreaDict];
        }
    }

    // Barcode frames overlay
    auto barcodeFramesChanged = (
        oldViewProps.barcodeFrames.enabled != newViewProps.barcodeFrames.enabled ||
        oldViewProps.barcodeFrames.onlyInFocusArea != newViewProps.barcodeFrames.onlyInFocusArea ||
        oldViewProps.barcodeFrames.color != newViewProps.barcodeFrames.color
    );
    if (barcodeFramesChanged) {
        NSMutableDictionary *barcodeFramesDict = [NSMutableDictionary dictionary];
        [barcodeFramesDict setObject:@(newViewProps.barcodeFrames.enabled) forKey:@"enabled"];
        [barcodeFramesDict setObject:@(newViewProps.barcodeFrames.onlyInFocusArea) forKey:@"onlyInFocusArea"];

        if (!newViewProps.barcodeFrames.color.empty()) {
            [barcodeFramesDict setObject:[NSString stringWithUTF8String:newViewProps.barcodeFrames.color.c_str()] forKey:@"color"];
        }

        if ([_scannerImpl respondsToSelector:@selector(configureBarcodeFrames:)]) {
            [_scannerImpl performSelector:@selector(configureBarcodeFrames:) withObject:barcodeFramesDict];
        }
    }

    // Torch
    if (oldViewProps.torch != newViewProps.torch) {
        NSNumber *torchValue = @(newViewProps.torch);
        [_scannerImpl performSelector:@selector(setTorchEnabled:) withObject:torchValue];
    }

    // Zoom
    if (oldViewProps.zoom != newViewProps.zoom) {
        NSNumber *zoomValue = @(newViewProps.zoom);
        [_scannerImpl performSelector:@selector(setZoomLevel:) withObject:zoomValue];
    }

    // Pause scanning
    if (oldViewProps.pauseScanning != newViewProps.pauseScanning) {
        NSNumber *pauseValue = @(newViewProps.pauseScanning);
        [_scannerImpl performSelector:@selector(setPauseScanning:) withObject:pauseValue];
    }

    // Barcode scan strategy
    if (oldViewProps.barcodeScanStrategy != newViewProps.barcodeScanStrategy) {
        NSString *strategy = [NSString stringWithUTF8String:newViewProps.barcodeScanStrategy.c_str()];
        if ([_scannerImpl respondsToSelector:@selector(setBarcodeScanStrategy:)]) {
            [_scannerImpl performSelector:@selector(setBarcodeScanStrategy:) withObject:strategy];
        }
    }

    // Keep screen on
    if (oldViewProps.keepScreenOn != newViewProps.keepScreenOn) {
        NSNumber *keepScreenOnValue = @(newViewProps.keepScreenOn);
        if ([_scannerImpl respondsToSelector:@selector(setKeepScreenOn:)]) {
            [_scannerImpl performSelector:@selector(setKeepScreenOn:) withObject:keepScreenOnValue];
        }
    }

    // Barcode emission interval
    if (oldViewProps.barcodeEmissionInterval != newViewProps.barcodeEmissionInterval) {
        NSNumber *intervalValue = @(newViewProps.barcodeEmissionInterval);
        if ([_scannerImpl respondsToSelector:@selector(setBarcodeEmissionInterval:)]) {
            [_scannerImpl performSelector:@selector(setBarcodeEmissionInterval:) withObject:intervalValue];
        }
    }

    [super updateProps:props oldProps:oldProps];
}

// MARK: - ScannerViewDelegate (implemented via performSelector to avoid Swift header dependency)

- (void)scannerDidDetectBarcodes:(NSArray<NSDictionary *> *)barcodes
{
    if (_eventEmitter) {
        auto scannerEventEmitter = std::static_pointer_cast<const ScannerViewEventEmitter>(_eventEmitter);
        
        std::vector<ScannerViewEventEmitter::OnBarcodeScannedBarcodes> barcodesVector;
        barcodesVector.reserve(barcodes.count);
        for (NSDictionary *barcode in barcodes) {
            ScannerViewEventEmitter::OnBarcodeScannedBarcodes item{};
            NSString *dataStr = barcode[@"data"];
            NSString *formatStr = barcode[@"format"];
            NSNumber *timestampNum = barcode[@"timestamp"];
            
            item.data = dataStr ? std::string([dataStr UTF8String]) : std::string();
            item.format = formatStr ? std::string([formatStr UTF8String]) : std::string();
            item.timestamp = timestampNum ? [timestampNum doubleValue] : 0.0;
            
            // boundingBox is required by codegen; fill with zeros if missing
            ScannerViewEventEmitter::OnBarcodeScannedBarcodesBoundingBox bbox{};
            NSDictionary *box = barcode[@"boundingBox"];
            if (box) {
                bbox.left = [box[@"left"] doubleValue];
                bbox.top = [box[@"top"] doubleValue];
                bbox.right = [box[@"right"] doubleValue];
                bbox.bottom = [box[@"bottom"] doubleValue];
            } else {
                bbox.left = 0.0;
                bbox.top = 0.0;
                bbox.right = 0.0;
                bbox.bottom = 0.0;
            }
            item.boundingBox = bbox;
            
            // area is required by codegen; default to 0 if absent
            NSNumber *areaNum = barcode[@"area"];
            item.area = areaNum ? [areaNum doubleValue] : 0.0;
            
            barcodesVector.push_back(std::move(item));
        }
        
        ScannerViewEventEmitter::OnBarcodeScanned event = {
            .barcodes = std::move(barcodesVector)
        };
        
        scannerEventEmitter->onBarcodeScanned(event);
    }
}

- (void)scannerDidEncounterError:(NSDictionary<NSString *,id> *)error
{
    if (_eventEmitter) {
        auto scannerEventEmitter = std::static_pointer_cast<const ScannerViewEventEmitter>(_eventEmitter);
        
        ScannerViewEventEmitter::OnScannerError event = {
            .error = std::string([[error objectForKey:@"error"] UTF8String]),
            .code = std::string([[error objectForKey:@"code"] UTF8String])
        };
        
        scannerEventEmitter->onScannerError(event);
    }
}

- (void)scannerDidLoad:(NSDictionary<NSString *,id> *)info
{
    if (_eventEmitter) {
        auto scannerEventEmitter = std::static_pointer_cast<const ScannerViewEventEmitter>(_eventEmitter);
        
        ScannerViewEventEmitter::OnLoad event = {
            .success = [[info objectForKey:@"success"] boolValue],
            .error = info[@"error"] ? std::string([[info objectForKey:@"error"] UTF8String]) : ""
        };
        
        scannerEventEmitter->onLoad(event);
    }
}

Class<RCTComponentViewProtocol> ScannerViewCls(void)
{
    return ScannerView.class;
}

@end
