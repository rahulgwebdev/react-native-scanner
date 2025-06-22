import { useState, useEffect, useCallback, useMemo } from 'react';
import CameraInfoModule from '../CameraInfoModule';
import type {
  DeviceCameraInfo,
  CurrentCameraInfo,
  CameraInfo,
  CameraFacing,
} from '../types';

export interface UseCameraInfoReturn {
  // Device information
  deviceInfo: DeviceCameraInfo | null;
  currentCameraInfo: CurrentCameraInfo | null;

  // Camera lists
  allCameras: CameraInfo[];
  backCameras: CameraInfo[];
  frontCameras: CameraInfo[];
  macroCameras: CameraInfo[];

  // Quick access properties
  hasMultipleCameras: boolean;
  hasBackCamera: boolean;
  hasFrontCamera: boolean;
  hasMacroCamera: boolean;
  hasTorch: boolean;

  // Default cameras
  defaultBackCamera: CameraInfo | null;
  defaultFrontCamera: CameraInfo | null;

  // Zoom information
  maxZoom: number;
  minZoom: number;

  // Loading and error states
  isLoading: boolean;
  error: string | null;

  // Actions
  refreshInfo: () => Promise<void>;
  getCameraById: (id: string) => CameraInfo | null;
  getCamerasByFacing: (facing: CameraFacing) => CameraInfo[];
}

export function useCameraInfo(): UseCameraInfoReturn {
  const [deviceInfo, setDeviceInfo] = useState<DeviceCameraInfo | null>(null);
  const [currentCameraInfo, setCurrentCameraInfo] =
    useState<CurrentCameraInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCameraInfo = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const info = await CameraInfoModule.getCameraInfo();
      setDeviceInfo(info);

      // Try to get current camera info if available
      try {
        const currentInfo = await CameraInfoModule.getCurrentCameraInfo();
        setCurrentCameraInfo(currentInfo);
      } catch (e) {
        // Current camera info might not be available if no camera is bound
        console.log('Current camera info not available:', e);
      }
    } catch (e: any) {
      let errorMessage = 'Failed to load camera information';

      // Handle specific error types
      if (e?.code === 'PERMISSION_ERROR') {
        errorMessage =
          'Camera permission not granted. Please grant camera permission in app settings.';
      } else if (e?.code === 'NO_CAMERAS_ERROR') {
        errorMessage = 'No cameras found on this device.';
      } else if (e?.code === 'CAMERA_ACCESS_ERROR') {
        errorMessage = 'Unable to access camera information. Please try again.';
      } else if (e?.message) {
        errorMessage = e.message;
      }

      setError(errorMessage);
      console.error('Error loading camera info:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshInfo = useCallback(async () => {
    await loadCameraInfo();
  }, [loadCameraInfo]);

  useEffect(() => {
    loadCameraInfo();
  }, [loadCameraInfo]);
  // Computed properties
  const allCameras = useMemo(
    () => deviceInfo?.cameras || [],
    [deviceInfo?.cameras]
  );
  const backCameras = useMemo(
    () => allCameras.filter((camera) => camera.facing === 'back'),
    [allCameras]
  );
  const frontCameras = useMemo(
    () => allCameras.filter((camera) => camera.facing === 'front'),
    [allCameras]
  );
  const macroCameras = useMemo(
    () => allCameras.filter((camera) => camera.isMacroCamera),
    [allCameras]
  );

  const hasMultipleCameras = allCameras.length > 1;
  const hasBackCamera = backCameras.length > 0;
  const hasFrontCamera = frontCameras.length > 0;
  const hasMacroCamera = macroCameras.length > 0;
  const hasTorch = allCameras.some((camera) => camera.hasFlash);

  const defaultBackCamera = deviceInfo?.defaultBackCamera
    ? allCameras.find((camera) => camera.id === deviceInfo.defaultBackCamera) ||
      null
    : backCameras[0] || null;

  const defaultFrontCamera = deviceInfo?.defaultFrontCamera
    ? allCameras.find(
        (camera) => camera.id === deviceInfo.defaultFrontCamera
      ) || null
    : frontCameras[0] || null;

  // Zoom range from all cameras
  const allZoomRanges = allCameras.map((camera) => ({
    min: camera.zoomMin,
    max: camera.zoomMax,
  }));
  const maxZoom = Math.max(...allZoomRanges.map((range) => range.max), 1);
  const minZoom = Math.min(...allZoomRanges.map((range) => range.min), 1);

  const getCameraById = useCallback(
    (id: string): CameraInfo | null => {
      return allCameras.find((camera) => camera.id === id) || null;
    },
    [allCameras]
  );

  const getCamerasByFacing = useCallback(
    (facing: CameraFacing): CameraInfo[] => {
      return allCameras.filter((camera) => camera.facing === facing);
    },
    [allCameras]
  );

  return {
    // Device information
    deviceInfo,
    currentCameraInfo,

    // Camera lists
    allCameras,
    backCameras,
    frontCameras,
    macroCameras,

    // Quick access properties
    hasMultipleCameras,
    hasBackCamera,
    hasFrontCamera,
    hasMacroCamera,
    hasTorch,

    // Default cameras
    defaultBackCamera,
    defaultFrontCamera,

    // Zoom information
    maxZoom,
    minZoom,

    // Loading and error states
    isLoading,
    error,

    // Actions
    refreshInfo,
    getCameraById,
    getCamerasByFacing,
  };
}
