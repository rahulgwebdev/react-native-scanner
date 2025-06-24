import type { ViewProps } from 'react-native';
import type { HostComponent } from 'react-native';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';
import type {
  BubblingEventHandler,
  Double,
} from 'react-native/Libraries/Types/CodegenTypes';
// import type { FrameSize } from './types';

export interface NativeProps extends ViewProps {
  barcodeTypes?: string[];
  enableFrame?: boolean;
  frameColor?: string;
  // frameSize?: FrameSize; // Will be handled as ReadableMap in native code
  showBarcodeFramesOnlyInFrame?: boolean;
  torch?: boolean;
  zoom?: Double;
  pauseScanning?: boolean;
  onBarcodeScanned?: BubblingEventHandler<{
    data: string;
    format: string;
    timestamp: Double;
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
