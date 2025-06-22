import type { ViewProps } from 'react-native';
import { requireNativeComponent } from 'react-native';
import type {
  BarcodeScannedEventPayload,
  ScannerErrorEventPayload,
  OnLoadEventPayload,
  FrameSize,
  BarcodeFrameConfig,
} from './types';
import { BarcodeFormat } from './types';

export { BarcodeFormat } from './types';
export type {
  FrameSize,
  BarcodeFrameConfig,
  DeviceCameraInfo,
  CurrentCameraInfo,
  CameraInfo,
  CameraFacing,
} from './types';

// Export the camera info hook
export { useCameraInfo } from './hooks/useCameraInfo';
export type { UseCameraInfoReturn } from './hooks/useCameraInfo';

const ScannerViewNativeComponent = requireNativeComponent<{
  barcodeTypes?: BarcodeFormat[];
  barcodeFrameConfigs?: BarcodeFrameConfig[];
  enableFrame?: boolean;
  frameColor?: string;
  frameSize?: FrameSize;
  torch?: boolean;
  zoom?: number;
  pauseScanning?: boolean;
  onBarcodeScanned?: (event: {
    nativeEvent: BarcodeScannedEventPayload;
  }) => void;
  onScannerError?: (event: { nativeEvent: ScannerErrorEventPayload }) => void;
  onLoad?: (event: { nativeEvent: OnLoadEventPayload }) => void;
}>('ScannerView');

export interface ScannerViewProps extends ViewProps {
  // Barcode configuration
  barcodeTypes?: BarcodeFormat[];
  barcodeFrameConfigs?: BarcodeFrameConfig[];

  // Frame configuration
  enableFrame?: boolean;
  frameColor?: string;
  frameSize?: FrameSize;

  // Camera configuration
  torch?: boolean;
  zoom?: number;
  pauseScanning?: boolean;

  // Event handlers
  onBarcodeScanned?: (event: {
    nativeEvent: BarcodeScannedEventPayload;
  }) => void;
  onScannerError?: (event: { nativeEvent: ScannerErrorEventPayload }) => void;
  onLoad?: (event: { nativeEvent: OnLoadEventPayload }) => void;
}

export default function ScannerView(props: ScannerViewProps) {
  return <ScannerViewNativeComponent {...props} />;
}
