import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ScannerView, {
  BarcodeFormat,
  BarcodeScanStrategy,
  type BarcodeScannedEventPayload,
} from 'react-native-scanner';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { useReliableInsets } from '../hooks';

export default function RectangularFrameExample() {
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pauseScanning, setPauseScanning] = useState(false);
  const [permission, setPermission] = useState<
    'granted' | 'denied' | 'blocked' | 'unavailable' | 'limited' | 'loading'
  >('loading');

  // Focus area configuration with rectangular frame
  const [focusAreaConfig, setFocusAreaConfig] = useState({
    enabled: false, // Only scan in focus area
    showOverlay: true, // Show focus area overlay
    size: { width: 300, height: 200 }, // Rectangular focus area
    color: '#00FF00', // Color of focus area border
  });

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
    nativeEvent: { barcodes: BarcodeScannedEventPayload[] };
  }) => {
    const barcodes = event.nativeEvent.barcodes;
    if (barcodes.length === 0) {
      return;
    }

    const barcode = barcodes[0]!;
    setPauseScanning(true);

    Alert.alert(
      'Barcode Scanned!',
      `Data: ${barcode.data}\nFormat: ${barcode.format}`,
      [
        {
          text: 'OK',
          onPress: () => {
            setPauseScanning(false);
          },
        },
      ],
      {
        onDismiss: () => {
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

  const toggleFocusAreaEnabled = () => {
    setFocusAreaConfig((prev) => ({
      ...prev,
      enabled: !prev.enabled,
    }));
  };

  const changeFocusAreaSize = () => {
    setFocusAreaConfig((prev) => ({
      ...prev,
      size:
        prev.size.width === 300
          ? { width: 250, height: 150 }
          : { width: 300, height: 200 },
    }));
  };

  const changeZoom = () => {
    setZoom(zoom === 1 ? 2 : zoom === 2 ? 3 : 1);
  };

  const insets = useReliableInsets();

  if (permission === 'loading') {
    return <Text>Checking camera permission...</Text>;
  }

  if (permission === RESULTS.DENIED) {
    return (
      <View style={styles.container}>
        <Text>Camera permission is required</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (permission === RESULTS.BLOCKED) {
    return (
      <View style={styles.container}>
        <Text>Camera permission is blocked. Please enable it in settings.</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={[styles.header, { top: insets.top }]}>
          <Text style={styles.title}>Rectangular Frame Example</Text>
          <Text style={styles.subtitle}>
            Demonstrates rectangular focus area configuration
          </Text>
        </View>

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
            focusArea={focusAreaConfig}
            torch={torchEnabled}
            zoom={zoom}
            onBarcodeScanned={handleBarcodeScanned}
            onScannerError={handleScannerError}
            onLoad={handleLoad}
            pauseScanning={pauseScanning}
            barcodeScanStrategy={BarcodeScanStrategy.ONE}
          />
        </View>

        <ScrollView
          style={styles.controlsContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.controlSection}>
            <Text style={styles.sectionTitle}>Focus Area Controls</Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[
                  styles.button,
                  focusAreaConfig.enabled && styles.activeButton,
                ]}
                onPress={toggleFocusAreaEnabled}
              >
                <Text style={styles.buttonText}>
                  {focusAreaConfig.enabled ? 'Disable' : 'Enable'} Focus Area
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.button}
                onPress={changeFocusAreaSize}
              >
                <Text style={styles.buttonText}>
                  Size: {focusAreaConfig.size.width}x
                  {focusAreaConfig.size.height}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.controlSection]}>
            <Text style={styles.sectionTitle}>Camera Controls</Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, torchEnabled && styles.activeButton]}
                onPress={toggleTorch}
              >
                <Text style={styles.buttonText}>
                  {torchEnabled ? 'Disable' : 'Enable'} Torch
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={changeZoom}>
                <Text style={styles.buttonText}>Zoom: {zoom}x</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.statusSection}>
            <Text style={styles.statusText}>
              Focus Area: {focusAreaConfig.enabled ? 'Enabled' : 'Disabled'}
              {focusAreaConfig.enabled &&
                ` (${focusAreaConfig.size.width}x${focusAreaConfig.size.height}px)`}
            </Text>
            <Text style={styles.statusText}>Frame Type: Rectangular</Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  },
  header: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    marginTop: 4,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  controlsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  controlSection: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  activeButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  statusSection: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 4,
  },
});
