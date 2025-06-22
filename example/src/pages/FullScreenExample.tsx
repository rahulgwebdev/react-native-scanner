import { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
  Platform,
  Button,
  StatusBar,
} from 'react-native';
import ScannerView, { BarcodeFormat } from 'react-native-scanner';
import {
  check,
  request,
  PERMISSIONS,
  RESULTS,
  openSettings,
} from 'react-native-permissions';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import SystemNavigationBar from 'react-native-system-navigation-bar';

// Custom hook to manage navigation bar behavior
const useNavigationBarControl = (immersive: boolean) => {
  useEffect(() => {
    if (Platform.OS === 'android') {
      if (immersive) {
        // Full immersive mode - hide both status and navigation bars
        // SystemNavigationBar.fullScreen();
        // SystemNavigationBar.immersive();
        SystemNavigationBar.setNavigationColor('transparent', 'light');
      } else {
        // Fixed navigation buttons with transparent background
        // SystemNavigationBar.navigationShow();
        // SystemNavigationBar.setNavigationColor('transparent', 'light');
        // SystemNavigationBar.setNavigationBarDividerColor('transparent');
        // Ensure navigation bar is always visible and not hidden
        // SystemNavigationBar.setNavigationBarContrastEnforced(false);
      }
    }
  }, [immersive]);

  return immersive;
};

function FullScreenExample() {
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [enableFrame, setEnableFrame] = useState(true);
  const [frameColor, setFrameColor] = useState('#00FF00');
  const [frameSize, setFrameSize] = useState(350);
  const [zoom, setZoom] = useState(1);
  const [immersive, setImmersive] = useState(true); // Default to immersive mode
  const [extendToGestureArea, setExtendToGestureArea] = useState(true); // Extend UI to gesture area
  const [pauseScanning, setPauseScanning] = useState(false); // Control scanning pause
  const [permission, setPermission] = useState<
    'granted' | 'denied' | 'blocked' | 'unavailable' | 'limited' | 'loading'
  >('loading');
  const insets = useSafeAreaInsets();

  // Apply navigation bar behavior
  useNavigationBarControl(immersive);

  useEffect(() => {
    const checkPermission = async () => {
      setPermission('loading');
      const result = await check(
        Platform.OS === 'android'
          ? PERMISSIONS.ANDROID.CAMERA
          : PERMISSIONS.IOS.CAMERA
      );
      setPermission(result);
    };
    checkPermission();
  }, []);

  const requestPermission = async () => {
    const result = await request(
      Platform.OS === 'android'
        ? PERMISSIONS.ANDROID.CAMERA
        : PERMISSIONS.IOS.CAMERA
    );
    setPermission(result);
  };

  const handleBarcodeScanned = (event: {
    nativeEvent: { data: string; format: string; timestamp: number };
  }) => {
    // return;
    // Pause scanning to prevent multiple scans
    setPauseScanning(true);

    Alert.alert(
      'Barcode Scanned!',
      `Data: ${event.nativeEvent.data}\nFormat: ${event.nativeEvent.format}`,
      [
        {
          text: 'OK',
          onPress: () => {
            // Resume scanning after alert is dismissed
            setPauseScanning(false);
          },
        },
      ],
      {
        onDismiss: () => {
          // Also resume scanning if alert is dismissed by tapping outside
          setPauseScanning(false);
        },
      }
    );
  };

  const handleScannerError = (event: {
    nativeEvent: { error: string; code: string };
  }) => {
    Alert.alert(
      'Scanner Error',
      `Error: ${event.nativeEvent.error}\nCode: ${event.nativeEvent.code}`,
      [{ text: 'OK' }]
    );
  };

  const handleLoad = (event: {
    nativeEvent: { success: boolean; error?: string };
  }) => {
    if (event.nativeEvent.success) {
      console.log('Scanner loaded successfully');
    } else {
      console.error('Scanner failed to load:', event.nativeEvent.error);
    }
  };

  const toggleTorch = () => {
    setTorchEnabled(!torchEnabled);
  };

  const toggleFrame = () => {
    setEnableFrame(!enableFrame);
  };

  const changeFrameColor = () => {
    setFrameColor(frameColor === '#00FF00' ? '#FF0000' : '#00FF00');
  };

  const changeFrameSize = () => {
    setFrameSize(frameSize === 350 ? 400 : frameSize === 400 ? 300 : 350);
  };

  const changeZoom = () => {
    setZoom(zoom === 1 ? 2 : zoom === 2 ? 3 : 1);
  };

  const toggleImmersive = () => {
    setImmersive(!immersive);
  };

  const toggleExtendToGestureArea = () => {
    setExtendToGestureArea(!extendToGestureArea);
  };

  if (permission === 'loading') {
    return <Text>Checking camera permission...</Text>;
  }

  if (permission === RESULTS.DENIED) {
    return (
      <View style={[styles.permissionText]}>
        <Text>Camera permission is required to use the scanner.</Text>
        <Button title="Grant Permission" onPress={requestPermission} />
      </View>
    );
  }

  if (permission === RESULTS.BLOCKED) {
    return (
      <View style={[styles.permissionText]}>
        <Text>Camera permission is blocked. Please enable it in settings.</Text>
        <Button title="Open Settings" onPress={() => openSettings()} />
      </View>
    );
  }

  if (permission !== RESULTS.GRANTED && permission !== RESULTS.LIMITED) {
    return (
      <View style={[styles.permissionText]}>
        <Text>Camera permission is unavailable.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      {/* Full screen camera view */}
      <View style={styles.cameraContainer}>
        <ScannerView
          style={styles.camera}
          barcodeTypes={[
            BarcodeFormat.QR_CODE,
            BarcodeFormat.CODE_128,
            BarcodeFormat.CODE_39,
            BarcodeFormat.EAN_13,
            BarcodeFormat.EAN_8,
            BarcodeFormat.UPC_A,
            BarcodeFormat.UPC_E,
            BarcodeFormat.DATA_MATRIX,
            BarcodeFormat.PDF_417,
            BarcodeFormat.AZTEC,
            BarcodeFormat.ITF,
          ]}
          enableFrame={enableFrame}
          frameColor={frameColor}
          frameSize={frameSize}
          torch={torchEnabled}
          zoom={zoom}
          onBarcodeScanned={handleBarcodeScanned}
          onScannerError={handleScannerError}
          onLoad={handleLoad}
          pauseScanning={pauseScanning}
        />
      </View>

      {/* Transparent controls overlay at top */}
      <View style={[styles.controlsOverlay, { paddingTop: insets.top }]}>
        <Text style={styles.title}>Barcode Scanner</Text>
        <View style={styles.controls}>
          <TouchableOpacity style={styles.button} onPress={toggleTorch}>
            <Text style={styles.buttonText}>
              {torchEnabled ? '🔦 OFF' : '🔦 ON'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={toggleFrame}>
            <Text style={styles.buttonText}>
              {enableFrame ? '📐 Hide' : '📐 Show'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={changeFrameColor}>
            <Text style={styles.buttonText}>🎨 Color</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={changeFrameSize}>
            <Text style={styles.buttonText}>📏 {frameSize}px</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={changeZoom}>
            <Text style={styles.buttonText}>🔍 {zoom.toFixed(1)}x</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={toggleImmersive}>
            <Text style={styles.buttonText}>
              {immersive ? '🖥️ Fixed Nav Buttons' : '🖥️ Immersive Mode'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.button}
            onPress={toggleExtendToGestureArea}
          >
            <Text style={styles.buttonText}>
              {extendToGestureArea
                ? '🖥️ Extend to Gesture Area'
                : '🖥️ Normal Mode'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Status info at bottom */}
      <View
        style={[
          styles.statusOverlay,
          {
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <Text style={styles.status}>
          Frame: {enableFrame ? 'ON' : 'OFF'} | Torch:{' '}
          {torchEnabled ? 'ON' : 'OFF'} | Zoom: {zoom.toFixed(1)}x | Mode:{' '}
          {immersive ? 'Immersive' : 'Fixed Nav Buttons'} | Gesture:{' '}
          {extendToGestureArea ? 'Extended' : 'Respected'}
        </Text>
      </View>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <FullScreenExample />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  camera: {
    flex: 1,
  },
  controlsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 15,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  statusOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingTop: 15,
  },
  status: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 14,
  },
  permissionText: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
