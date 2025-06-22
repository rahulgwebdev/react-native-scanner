import { NativeModules } from 'react-native';
import type { DeviceCameraInfo, CurrentCameraInfo } from './types';

const { CameraInfoModule } = NativeModules;

export interface CameraInfoModuleInterface {
  getCameraInfo(): Promise<DeviceCameraInfo>;
  getCurrentCameraInfo(): Promise<CurrentCameraInfo>;
}

export default CameraInfoModule as CameraInfoModuleInterface;
