import type { ViewProps } from 'react-native';
import type { HostComponent } from 'react-native';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';
import type {
  BubblingEventHandler,
  Double,
} from 'react-native/Libraries/Types/CodegenTypes';

export interface NativeProps extends ViewProps {
  barcodeTypes?: string[];

  /**
   * Focus area configuration (Android: drives overlay + optional filtering).
   * - `showOverlay` controls whether the scanning region is drawn.
   * - `enabled` controls whether scanning is restricted to that region.
   */
  focusArea?: {
    enabled?: boolean;
    showOverlay?: boolean;
    borderColor?: string;
    tintColor?: string;
    // NOTE: Codegen does not support mixed types (number OR object), so we always pass {width,height}.
    size?: {
      width: Double;
      height: Double;
    };
    position?: {
      x: Double; // 0-100
      y: Double; // 0-100
    };
  };

  /**
   * Barcode frames configuration (draw rectangles around detected barcodes).
   */
  barcodeFrames?: {
    enabled?: boolean;
    color?: string;
    onlyInFocusArea?: boolean;
  };

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

  onBarcodeScanned?: BubblingEventHandler<{
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
  }>;
  onScannerError?: BubblingEventHandler<{
    error: string;
    code: string;
  }>;
  onLoad?: BubblingEventHandler<{
    success: boolean;
    error?: string;
  }>;
}

export default codegenNativeComponent<NativeProps>(
  'ScannerView'
) as HostComponent<NativeProps>;
