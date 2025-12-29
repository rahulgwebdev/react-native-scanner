import {
  codegenNativeComponent,
  type ViewProps,
  type NativeSyntheticEvent,
} from 'react-native';
import type {
  DirectEventHandler,
  Double,
} from 'react-native/Libraries/Types/CodegenTypesNamespace';

// Define codegen types locally (no longer exported from react-native in 0.83)

// Event payload types for better TypeScript inference
export interface BarcodeScannedEventPayload {
  barcodes: {
    data: string;
    format: string;
    timestamp: Double;
    boundingBox?: {
      left: Double;
      top: Double;
      right: Double;
      bottom: Double;
    };
    area?: Double;
  }[];
}

export interface ScannerErrorEventPayload {
  error: string;
  code: string;
}

export interface OnLoadEventPayload {
  success: boolean;
  error?: string;
}

// Event types for use in handlers
export type BarcodeScannedEvent =
  NativeSyntheticEvent<BarcodeScannedEventPayload>;
export type ScannerErrorEvent = NativeSyntheticEvent<ScannerErrorEventPayload>;
export type OnLoadEvent = NativeSyntheticEvent<OnLoadEventPayload>;

// Nested object types for better codegen compatibility
export interface FocusAreaSize {
  width: Double;
  height: Double;
}

export interface FocusAreaPosition {
  x: Double; // 0-100
  y: Double; // 0-100
}

export interface FocusAreaConfig {
  enabled?: boolean;
  showOverlay?: boolean;
  borderColor?: string;
  tintColor?: string;
  // NOTE: Codegen does not support mixed types (number OR object), so we always pass {width,height}.
  size?: FocusAreaSize;
  position?: FocusAreaPosition;
}

export interface BarcodeFramesConfig {
  enabled?: boolean;
  color?: string;
  onlyInFocusArea?: boolean;
}

export interface BoundingBox {
  left: Double;
  top: Double;
  right: Double;
  bottom: Double;
}

export interface BarcodeData {
  data: string;
  format: string;
  timestamp: Double;
  boundingBox?: BoundingBox;
  area?: Double;
}

export interface NativeProps extends ViewProps {
  barcodeTypes?: string[];

  /**
   * Focus area configuration (Android: drives overlay + optional filtering).
   * - `showOverlay` controls whether the scanning region is drawn.
   * - `enabled` controls whether scanning is restricted to that region.
   */
  focusArea?: FocusAreaConfig;

  /**
   * Barcode frames configuration (draw rectangles around detected barcodes).
   */
  barcodeFrames?: BarcodeFramesConfig;

  torch?: boolean;
  zoom?: Double;
  pauseScanning?: boolean;

  barcodeScanStrategy?: string;
  keepScreenOn?: boolean;

  /**
   * Minimum interval (in seconds) between barcode emission events.
   * Prevents rapid duplicate detections. Set to 0 to disable debouncing.
   * @default 0.5
   */
  barcodeEmissionInterval?: Double;

  onBarcodeScanned?: DirectEventHandler<BarcodeScannedEventPayload>;
  onScannerError?: DirectEventHandler<ScannerErrorEventPayload>;
  onLoad?: DirectEventHandler<OnLoadEventPayload>;
}

export default codegenNativeComponent<NativeProps>('ScannerView');
