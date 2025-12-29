import { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
  Platform,
  Switch,
  ScrollView,
} from 'react-native';
import {
  ScannerView,
  BarcodeFormat,
  BarcodeScanStrategy,
  type BarcodeScannedEvent,
} from '@cleanui/react-native-scanner';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useReliableInsets } from '../hooks';

export default function BarcodeFrameExample() {
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pauseScanning, setPauseScanning] = useState(false);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [permission, setPermission] = useState<
    'granted' | 'denied' | 'blocked' | 'unavailable' | 'limited' | 'loading'
  >('loading');

  // Focus area configuration
  const [focusAreaConfig, setFocusAreaConfig] = useState({
    enabled: false, // Only scan in focus area
    showOverlay: true, // Show focus area overlay
    size: { width: 300, height: 100 }, // Rectangular focus area
    color: '#00FF00', // Color of focus area border
  });

  // Barcode frames configuration
  const [barcodeFramesConfig, setBarcodeFramesConfig] = useState({
    enabled: true, // Show frames around detected barcodes
    color: '#FF0000', // Color of barcode frames
    onlyInFocusArea: false, // Show frames for all barcodes, not just in focus area
  });

  const insets = useReliableInsets();

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

  const cycleFrameColor = () => {
    const colors = ['#00FF00', '#FF0000', '#0000FF', '#FFFF00', '#FF00FF'];
    const currentIndex = colors.indexOf(focusAreaConfig.color);
    const nextIndex = (currentIndex + 1) % colors.length;
    const nextColor = colors[nextIndex];
    if (nextColor) {
      setFocusAreaConfig((prev) => ({
        ...prev,
        color: nextColor,
      }));
    }
  };

  const handleBarcodeScanned = (event: BarcodeScannedEvent) => {
    const barcodes = event.nativeEvent.barcodes.map((barcode) => ({
      ...barcode,
      format: barcode.format as BarcodeFormat,
    }));
    if (barcodes.length === 0) {
      return;
    }

    setPauseScanning(true);
    setScannedData(barcodes[0]!.data);

    Alert.alert(
      'Barcode Scanned!',
      `Data: ${barcodes[0]!.data}\nFormat: ${barcodes[0]!.format}`,
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

  const increaseZoom = () => {
    setZoom(Math.min(zoom + 0.5, 3));
  };

  const decreaseZoom = () => {
    setZoom(Math.max(zoom - 0.5, 1));
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
        <View style={styles.scannerContainer}>
          <ScannerView
            style={styles.scanner}
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
            barcodeFrames={barcodeFramesConfig}
            torch={torchEnabled}
            zoom={zoom}
            pauseScanning={pauseScanning}
            onBarcodeScanned={handleBarcodeScanned}
            onScannerError={handleScannerError}
            onLoad={handleLoad}
            barcodeScanStrategy={BarcodeScanStrategy.ONE}
          />
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom }}
          style={styles.controlsContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.controlSection}>
            <Text style={styles.sectionTitle}>Barcode Frame Visualization</Text>

            <View style={styles.controlRow}>
              <Text style={styles.controlLabel}>Enable Focus Area</Text>
              <Switch
                value={focusAreaConfig.showOverlay}
                onValueChange={(value) =>
                  setFocusAreaConfig((prev) => ({
                    ...prev,
                    showOverlay: value,
                  }))
                }
                trackColor={{ false: '#767577', true: '#81b0ff' }}
                thumbColor={focusAreaConfig.showOverlay ? '#f5dd4b' : '#f4f3f4'}
              />
            </View>

            <View style={styles.controlRow}>
              <Text style={styles.controlLabel}>Enable Barcode Frames</Text>
              <Switch
                value={barcodeFramesConfig.enabled}
                onValueChange={(value) =>
                  setBarcodeFramesConfig((prev) => ({
                    ...prev,
                    enabled: value,
                  }))
                }
                trackColor={{ false: '#767577', true: '#81b0ff' }}
                thumbColor={barcodeFramesConfig.enabled ? '#f5dd4b' : '#f4f3f4'}
              />
            </View>

            <View style={styles.controlRow}>
              <Text style={styles.controlLabel}>
                Show Barcode Frames Only in Focus Area
              </Text>
              <Switch
                value={barcodeFramesConfig.onlyInFocusArea}
                onValueChange={(value) =>
                  setBarcodeFramesConfig((prev) => ({
                    ...prev,
                    onlyInFocusArea: value,
                  }))
                }
                trackColor={{ false: '#767577', true: '#81b0ff' }}
                thumbColor={
                  barcodeFramesConfig.onlyInFocusArea ? '#f5dd4b' : '#f4f3f4'
                }
                disabled={!focusAreaConfig.showOverlay}
              />
            </View>

            <Text style={styles.description}>
              {barcodeFramesConfig.onlyInFocusArea
                ? 'Red frames will only appear around barcodes detected within the green focus area overlay.'
                : 'Red frames will appear around all detected barcodes, regardless of position.'}
            </Text>
          </View>

          <View style={styles.controlSection}>
            <Text style={styles.sectionTitle}>Focus Area Configuration</Text>

            <View style={styles.controlRow}>
              <Text style={styles.controlLabel}>Focus Area Color</Text>
              <TouchableOpacity style={styles.button} onPress={cycleFrameColor}>
                <Text style={styles.buttonText}>Change Color</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.colorPreview}>
              <View
                style={[
                  styles.colorSwatch,
                  { backgroundColor: focusAreaConfig.color },
                ]}
              />
              <Text style={styles.colorText}>{focusAreaConfig.color}</Text>
            </View>
          </View>

          <View style={styles.controlSection}>
            <Text style={styles.sectionTitle}>Camera Controls</Text>

            <View style={styles.controlRow}>
              <Text style={styles.controlLabel}>Torch</Text>
              <TouchableOpacity style={styles.button} onPress={toggleTorch}>
                <Text style={styles.buttonText}>
                  {torchEnabled ? '🔦 OFF' : '🔦 ON'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.controlRow}>
              <Text style={styles.controlLabel}>Zoom: {zoom.toFixed(1)}x</Text>
              <View style={styles.zoomControls}>
                <TouchableOpacity
                  style={styles.smallButton}
                  onPress={decreaseZoom}
                >
                  <Text style={styles.buttonText}>-</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.smallButton}
                  onPress={increaseZoom}
                >
                  <Text style={styles.buttonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {scannedData ? (
            <View style={styles.controlSection}>
              <Text style={styles.sectionTitle}>Last Scanned</Text>
              <Text style={styles.scannedData}>{scannedData}</Text>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerContainer: {
    flex: 1,
    position: 'relative',
  },
  scanner: {
    flex: 1,
  },
  controlsContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '50%',
  },
  controlSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  controlLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  description: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  smallButton: {
    backgroundColor: '#007AFF',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  colorPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  colorSwatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  colorText: {
    fontSize: 14,
    color: '#333',
  },
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scannedData: {
    fontSize: 14,
    color: '#333',
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    fontFamily: 'monospace',
  },
});
