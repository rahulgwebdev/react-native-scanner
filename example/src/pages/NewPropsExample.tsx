import { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { ScannerView, BarcodeFormat } from '@cleanui/react-native-scanner';
import type {
  BarcodeScannedEvent,
  BarcodeScannedEventPayload,
} from '@cleanui/react-native-scanner';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

function NewPropsExample() {
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pauseScanning, setPauseScanning] = useState(false);
  const [permission, setPermission] = useState<
    'granted' | 'denied' | 'blocked' | 'unavailable' | 'limited' | 'loading'
  >('loading');

  // Focus area configuration
  const [focusAreaConfig, setFocusAreaConfig] = useState({
    enabled: false, // Only scan in focus area
    showOverlay: true, // Show focus area overlay
    size: 300, // Size of focus area
    borderColor: '#00FF00', // Color of focus area border
    tintColor: '#000000', // Overlay tint base (native applies ~50% alpha like Android)
    position: { x: 50, y: 50 }, // Center (0-100)
  });

  // Barcode frames configuration
  const [barcodeFramesConfig, setBarcodeFramesConfig] = useState({
    enabled: true, // Show frames around detected barcodes
    color: '#FF0000', // Color of barcode frames
    onlyInFocusArea: false, // Show frames for all barcodes, not just in focus area
  });

  const insets = useSafeAreaInsets();

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

  const handleBarcodeScanned = (event: BarcodeScannedEvent) => {
    setPauseScanning(true);

    const barcodes: BarcodeScannedEventPayload[] =
      event.nativeEvent.barcodes.map((barcode) => ({
        ...barcode,
        format: barcode.format as BarcodeFormat,
      }));
    if (barcodes.length > 0) {
      const firstBarcode = barcodes[0];
      if (firstBarcode) {
        Alert.alert(
          'Barcode Scanned!',
          `Data: ${firstBarcode.data}\nFormat: ${firstBarcode.format}`,
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
      }
    }
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

  const toggleFocusAreaOverlay = () => {
    setFocusAreaConfig((prev) => ({
      ...prev,
      showOverlay: !prev.showOverlay,
    }));
  };

  const changeFocusAreaColor = () => {
    setFocusAreaConfig((prev) => ({
      ...prev,
      borderColor: prev.borderColor === '#00FF00' ? '#FF0000' : '#00FF00',
    }));
  };

  const changeFocusAreaSize = () => {
    setFocusAreaConfig((prev) => ({
      ...prev,
      size: prev.size === 300 ? 250 : 300,
    }));
  };

  const toggleBarcodeFrames = () => {
    setBarcodeFramesConfig((prev) => ({
      ...prev,
      enabled: !prev.enabled,
    }));
  };

  const toggleBarcodeFramesOnlyInFocusArea = () => {
    setBarcodeFramesConfig((prev) => ({
      ...prev,
      onlyInFocusArea: !prev.onlyInFocusArea,
    }));
  };

  const changeBarcodeFramesColor = () => {
    setBarcodeFramesConfig((prev) => ({
      ...prev,
      color: prev.color === '#FF0000' ? '#0000FF' : '#FF0000',
    }));
  };

  const changeZoom = () => {
    setZoom(zoom === 1 ? 2 : zoom === 2 ? 3 : 1);
  };

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
        <View style={styles.header}>
          <Text style={styles.title}>New Props Example</Text>
          <Text style={styles.subtitle}>
            Demonstrating the new focusArea and barcodeFrames props
          </Text>
        </View>

        <View style={styles.mainContainer}>
          {/* Camera View - 50% of screen */}
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
              focusArea={{
                ...focusAreaConfig,
                size:
                  typeof focusAreaConfig.size === 'number'
                    ? {
                        width: focusAreaConfig.size,
                        height: focusAreaConfig.size,
                      }
                    : focusAreaConfig.size,
              }}
              barcodeFrames={barcodeFramesConfig}
              torch={torchEnabled}
              zoom={zoom}
              onBarcodeScanned={handleBarcodeScanned}
              onScannerError={handleScannerError}
              onLoad={handleLoad}
              pauseScanning={pauseScanning}
            />
          </View>

          {/* Controls Section - 50% of screen */}
          <View style={styles.controlsContainer}>
            <ScrollView
              style={styles.controlsScrollView}
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
                      {focusAreaConfig.enabled ? 'Disable' : 'Enable'} Focus
                      Area
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.button,
                      focusAreaConfig.showOverlay && styles.activeButton,
                    ]}
                    onPress={toggleFocusAreaOverlay}
                  >
                    <Text style={styles.buttonText}>
                      {focusAreaConfig.showOverlay ? 'Hide' : 'Show'} Overlay
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.button}
                    onPress={changeFocusAreaColor}
                  >
                    <Text style={styles.buttonText}>Change Color</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.button}
                    onPress={changeFocusAreaSize}
                  >
                    <Text style={styles.buttonText}>Change Size</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.controlSection}>
                <Text style={styles.sectionTitle}>Barcode Frames Controls</Text>
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[
                      styles.button,
                      barcodeFramesConfig.enabled && styles.activeButton,
                    ]}
                    onPress={toggleBarcodeFrames}
                  >
                    <Text style={styles.buttonText}>
                      {barcodeFramesConfig.enabled ? 'Disable' : 'Enable'}{' '}
                      Frames
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.button,
                      barcodeFramesConfig.onlyInFocusArea &&
                        styles.activeButton,
                    ]}
                    onPress={toggleBarcodeFramesOnlyInFocusArea}
                  >
                    <Text style={styles.buttonText}>
                      {barcodeFramesConfig.onlyInFocusArea
                        ? 'All'
                        : 'Focus Only'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.button}
                    onPress={changeBarcodeFramesColor}
                  >
                    <Text style={styles.buttonText}>Change Color</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.controlSection}>
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
                  {focusAreaConfig.enabled && ` (${focusAreaConfig.size}px)`}
                </Text>
                <Text style={styles.statusText}>
                  Barcode Frames:{' '}
                  {barcodeFramesConfig.enabled ? 'Enabled' : 'Disabled'}
                  {barcodeFramesConfig.enabled &&
                    ` (${
                      barcodeFramesConfig.onlyInFocusArea ? 'Focus Only' : 'All'
                    })`}
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    padding: 12,
    backgroundColor: '#1a1a1a',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: '#ccc',
    textAlign: 'center',
    marginTop: 2,
  },
  mainContainer: {
    flex: 1,
    flexDirection: 'column',
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
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  controlsScrollView: {
    flex: 1,
  },
  controlSection: {
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  button: {
    backgroundColor: '#333',
    padding: 10,
    borderRadius: 6,
    flex: 1,
    marginHorizontal: 3,
    alignItems: 'center',
  },
  activeButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  statusSection: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#2a2a2a',
    borderRadius: 6,
    marginHorizontal: 12,
    marginBottom: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    marginBottom: 3,
  },
});

export default NewPropsExample;
