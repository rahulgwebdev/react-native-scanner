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

// Re-export the native component and event types

export { default as ScannerView } from './ScannerViewNativeComponent';
export * from './ScannerViewNativeComponent';

// Export event types for better TypeScript inference
// These are the wrapped NativeSyntheticEvent types that users should use in their handlers
export type {
  BarcodeScannedEvent,
  ScannerErrorEvent,
  OnLoadEvent,
} from './ScannerViewNativeComponent';
