import type { StyleProp, ViewStyle } from 'react-native';

// Barcode format enum
export enum BarcodeFormat {
  QR_CODE = 'QR_CODE',
  CODE_128 = 'CODE_128',
  CODE_39 = 'CODE_39',
  EAN_13 = 'EAN_13',
  EAN_8 = 'EAN_8',
  UPC_A = 'UPC_A',
  UPC_E = 'UPC_E',
  DATA_MATRIX = 'DATA_MATRIX',
  PDF_417 = 'PDF_417',
  AZTEC = 'AZTEC',
  ITF = 'ITF',
}

// Barcode scan strategy enum
export enum BarcodeScanStrategy {
  ONE = 'ONE',
  ALL = 'ALL',
  BIGGEST = 'BIGGEST',
  SORT_BY_BIGGEST = 'SORT_BY_BIGGEST',
}

// Frame size configuration - can be a number (square) or object (rectangle)
export type FrameSize = number | { width: number; height: number };

// Focus area configuration
export type FocusAreaConfig = {
  /**
   * Whether to restrict scanning to focus area only
   * @default false
   */
  enabled?: boolean;
  /**
   * Size of the focus area
   * @default 300
   */
  size?: FrameSize;
  /**
   * Color of the focus area border
   * @default transparent (no border) when not provided
   */
  borderColor?: string;
  /**
   * Color of the semi-transparent overlay (tint) around the focus area
   * @default '#000000' with 50% opacity when not provided
   */
  tintColor?: string;
  /**
   * Whether to draw the focus area overlay
   * @default false
   */
  showOverlay?: boolean;
  /**
   * Position of the focus area (percentage from 0-100)
   * @default center (50, 50) when not provided
   */
  position?: {
    x: number;
    y: number;
  };
};

// Barcode frame configuration
export type BarcodeFramesConfig = {
  enabled?: boolean; // Whether to draw frames around detected barcodes
  color?: string; // Color of barcode frames
  onlyInFocusArea?: boolean; // Only show frames for barcodes in focus area
};

// Camera information types
export type CameraFacing = 'front' | 'back' | 'unknown';

export type ZoomRange = {
  min: number;
  max: number;
};

export type CameraInfo = {
  id: string;
  facing: CameraFacing;
  sensorOrientation: number;
  minFocusDistance: number;
  hasFlash: boolean;
  isMacroCamera: boolean;
  zoomMin: number;
  zoomMax: number;
  focalLengths: string[];
  aeModes: string[];
  afModes: string[];
};

export type DeviceCameraInfo = {
  cameras: CameraInfo[];
  defaultBackCamera: string;
  defaultFrontCamera: string;
};

export type CurrentCameraInfo = {
  status: string;
  message: string;
  // Additional properties when camera is bound
  currentZoom?: number;
  isTorchEnabled?: boolean;
  focusMode?: string;
};

// Barcode scanned event payload
export type BarcodeScannedEventPayload = {
  data: string;
  format: BarcodeFormat;
  timestamp: number;
  boundingBox?: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
  area?: number;
};

// Scanner error event payload
export type ScannerErrorEventPayload = {
  error: string;
  code: string;
};

// On load event payload (for camera initialization)
export type OnLoadEventPayload = {
  success: boolean;
  error?: string;
};

// Event types
export type CameraNativeModuleEvents = {
  onBarcodeScanned: (params: BarcodeScannedEventPayload) => void;
  onScannerError: (params: ScannerErrorEventPayload) => void;
  onLoad: (params: OnLoadEventPayload) => void;
};

// Props interface for the scanner view
export type CameraNativeModuleViewProps = {
  // Barcode configuration
  barcodeTypes?: BarcodeFormat[];

  // Focus area configuration
  focusArea?: FocusAreaConfig;

  // Barcode frame configuration
  barcodeFrames?: BarcodeFramesConfig;

  // Camera configuration
  torch?: boolean;
  zoom?: number;
  pauseScanning?: boolean;
  keepScreenOn?: boolean;

  // Event handlers
  onBarcodeScanned?: (event: {
    nativeEvent: BarcodeScannedEventPayload;
  }) => void;
  onScannerError?: (event: { nativeEvent: ScannerErrorEventPayload }) => void;
  onLoad?: (event: { nativeEvent: OnLoadEventPayload }) => void;

  // Styling
  style?: StyleProp<ViewStyle>;
};

// Method invokers for controlling the scanner
export type CameraNativeModuleMethods = {
  toggleTorch: () => Promise<boolean>;
  startScanning: () => Promise<void>;
  stopScanning: () => Promise<void>;
  isTorchAvailable: () => Promise<boolean>;
};
