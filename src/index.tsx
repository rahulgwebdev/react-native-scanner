import type { ViewProps } from 'react-native';
import ScannerViewNativeComponent from './ScannerViewNativeComponent';
import type {
  BarcodeScannedEventPayload,
  ScannerErrorEventPayload,
  OnLoadEventPayload,
  FocusAreaConfig,
  BarcodeFramesConfig,
} from './types';
import { BarcodeFormat, BarcodeScanStrategy } from './types';

export { BarcodeFormat, BarcodeScanStrategy } from './types';
export type {
  FrameSize,
  FocusAreaConfig,
  BarcodeFramesConfig,
  BarcodeScannedEventPayload,
  ScannerErrorEventPayload,
  OnLoadEventPayload,
  DeviceCameraInfo,
  CurrentCameraInfo,
  CameraInfo,
  CameraFacing,
} from './types';

// Export the camera info hook
export { useCameraInfo } from './hooks/useCameraInfo';
export type { UseCameraInfoReturn } from './hooks/useCameraInfo';

/**
 * @deprecated Use the new Fabric component instead
 */
// const ScannerViewNativeComponent = requireNativeComponent<{
//   barcodeTypes?: BarcodeFormat[];
//   focusArea?: FocusAreaConfig;
//   barcodeFrames?: BarcodeFramesConfig;
//   torch?: boolean;
//   zoom?: number;
//   pauseScanning?: boolean;
//   barcodeScanStrategy?: BarcodeScanStrategy;
//   keepScreenOn?: boolean;
//   onBarcodeScanned?: (event: {
//     nativeEvent: { barcodes: BarcodeScannedEventPayload[] };
//   }) => void;
//   onScannerError?: (event: { nativeEvent: ScannerErrorEventPayload }) => void;
//   onLoad?: (event: { nativeEvent: OnLoadEventPayload }) => void;
// }>('ScannerView');

export interface ScannerViewProps extends ViewProps {
  /**
   * Array of barcode formats to scan for.
   * If not specified, all supported formats will be scanned.
   */
  barcodeTypes?: BarcodeFormat[];

  /**
   * Configuration for the focus area overlay.
   * Defines the visual indicator for where the scanner should focus.
   */
  focusArea?: FocusAreaConfig;

  /**
   * Configuration for barcode frame overlays.
   * Defines visual indicators that appear when barcodes are detected.
   */
  barcodeFrames?: BarcodeFramesConfig;

  /**
   * Controls the camera torch/flashlight.
   * @default false
   */
  torch?: boolean;

  /**
   * Controls the camera zoom level.
   * Values typically range from 1.0 (no zoom) to higher values for zoomed in view.
   * @default 1.0
   */
  zoom?: number;

  /**
   * Pauses or resumes barcode scanning.
   * When true, the scanner will not process barcode detection.
   * @default false
   */
  pauseScanning?: boolean;

  /**
   * Strategy for processing multiple detected barcodes.
   * - ONE: Process only the first barcode detected
   * - ALL: Process all detected barcodes
   * - BIGGEST: Process only the largest barcode by area
   * - SORT_BY_BIGGEST: Process all barcodes sorted by size (largest first)
   * @default BarcodeScanStrategy.ALL
   */
  barcodeScanStrategy?: BarcodeScanStrategy;

  /**
   * Controls whether the screen should stay on while the camera is active.
   * When true, prevents the device from auto-locking the screen.
   * @default true
   */
  keepScreenOn?: boolean;

  /**
   * Minimum interval (in seconds) between barcode emission events.
   * Prevents rapid duplicate detections when pauseScanning is set.
   * Set to 0 to disable debouncing.
   * @default 0.5
   */
  barcodeEmissionInterval?: number;

  /**
   * Callback function triggered when a barcode is successfully scanned.
   * Provides the scanned barcode data and metadata.
   */
  onBarcodeScanned?: (event: {
    nativeEvent: { barcodes: BarcodeScannedEventPayload[] };
  }) => void;

  /**
   * Callback function triggered when a scanner error occurs.
   * Provides error details and context.
   */
  onScannerError?: (event: { nativeEvent: ScannerErrorEventPayload }) => void;

  /**
   * Callback function triggered when the scanner view is loaded and ready.
   * Provides camera information and initialization status.
   */
  onLoad?: (event: { nativeEvent: OnLoadEventPayload }) => void;
}

export default function ScannerView(props: ScannerViewProps) {
  // Map the props to match the native component interface
  const {
    onBarcodeScanned,
    onScannerError,
    onLoad,
    barcodeTypes,
    focusArea,
    barcodeFrames,
    barcodeScanStrategy,
    keepScreenOn,
    ...restProps
  } = props;

  const nativeProps = {
    ...restProps,
    barcodeTypes: barcodeTypes?.map(String),

    // --- IMPORTANT: codegen does NOT support mixed types for focusArea.size.
    // Our public API supports number | {width,height}, so we normalize to {width,height}.
    focusArea: focusArea
      ? {
          enabled: focusArea.enabled,
          showOverlay: focusArea.showOverlay,
          borderColor: focusArea.borderColor,
          tintColor: focusArea.tintColor,
          size:
            typeof focusArea.size === 'number'
              ? { width: focusArea.size, height: focusArea.size }
              : focusArea.size,
          position: focusArea.position,
        }
      : undefined,

    barcodeFrames: barcodeFrames
      ? {
          enabled: barcodeFrames.enabled,
          color: barcodeFrames.color,
          onlyInFocusArea: barcodeFrames.onlyInFocusArea,
        }
      : undefined,

    barcodeScanStrategy: barcodeScanStrategy
      ? barcodeScanStrategy.toString()
      : undefined,

    keepScreenOn: keepScreenOn,

    barcodeEmissionInterval: props.barcodeEmissionInterval,

    onBarcodeScanned: onBarcodeScanned
      ? (event: any) => {
          // Convert native event to typed event
          const typedEvent = {
            nativeEvent: {
              barcodes: event.nativeEvent.barcodes.map((barcode: any) => ({
                ...barcode,
                format: barcode.format as BarcodeFormat,
              })),
            },
          };
          onBarcodeScanned(typedEvent);
        }
      : undefined,
    onScannerError: onScannerError
      ? (event: any) => onScannerError(event)
      : undefined,
    onLoad: onLoad ? (event: any) => onLoad(event) : undefined,
  };

  return <ScannerViewNativeComponent {...nativeProps} />;
}
