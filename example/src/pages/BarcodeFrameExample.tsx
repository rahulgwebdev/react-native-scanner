import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScannerView, { BarcodeFormat } from 'react-native-scanner';
import type { BarcodeScannedEventPayload } from 'react-native-scanner';

export default function BarcodeFrameExample() {
  const insets = useSafeAreaInsets();
  const [scannedData, setScannedData] = useState<string>('');
  const [enableFrame, setEnableFrame] = useState(true);
  const [showBarcodeFramesOnlyInFrame, setShowBarcodeFramesOnlyInFrame] =
    useState(false);
  const [frameColor, setFrameColor] = useState('#00FF00');
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [zoom, setZoom] = useState(1.0);
  const [pauseScanning, setPauseScanning] = useState(false);

  const frameColors = ['#00FF00', '#FF0000', '#0000FF', '#FFFF00', '#FF00FF'];

  const cycleFrameColor = () => {
    const currentIndex = frameColors.indexOf(frameColor);
    const nextIndex = (currentIndex + 1) % frameColors.length;
    const nextColor = frameColors[nextIndex];
    if (nextColor) {
      setFrameColor(nextColor);
    }
  };

  const handleBarcodeScanned = (event: {
    nativeEvent: BarcodeScannedEventPayload;
  }) => {
    const { data, format } = event.nativeEvent;
    setScannedData(data);
    setPauseScanning(true);

    Alert.alert('Barcode Scanned!', `Format: ${format}\nData: ${data}`, [
      {
        text: 'Scan Again',
        onPress: () => {
          setPauseScanning(false);
        },
      },
      {
        text: 'OK',
        style: 'default',
        onPress: () => {
          setPauseScanning(false);
        },
      },
    ]);
  };

  const handleScannerError = (event: {
    nativeEvent: { error: string; code: string };
  }) => {
    const { error, code } = event.nativeEvent;
    Alert.alert('Scanner Error', `Error: ${error}\nCode: ${code}`);
  };

  const handleLoad = (event: {
    nativeEvent: { success: boolean; error?: string };
  }) => {
    const { success, error } = event.nativeEvent;
    if (!success) {
      Alert.alert('Camera Error', error || 'Failed to initialize camera');
    }
  };

  const toggleTorch = () => {
    setTorchEnabled(!torchEnabled);
  };

  const increaseZoom = () => {
    setZoom((prev) => Math.min(prev + 0.5, 3.0));
  };

  const decreaseZoom = () => {
    setZoom((prev) => Math.max(prev - 0.5, 1.0));
  };

  return (
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
          enableFrame={enableFrame}
          frameColor={frameColor}
          showBarcodeFramesOnlyInFrame={showBarcodeFramesOnlyInFrame}
          torch={torchEnabled}
          zoom={zoom}
          pauseScanning={pauseScanning}
          onBarcodeScanned={handleBarcodeScanned}
          onScannerError={handleScannerError}
          onLoad={handleLoad}
          frameSize={{ width: 300, height: 100 }}
        />
      </View>

      <ScrollView
        style={styles.controlsContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.controlSection}>
          <Text style={styles.sectionTitle}>Barcode Frame Visualization</Text>

          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Enable Frame Overlay</Text>
            <Switch
              value={enableFrame}
              onValueChange={setEnableFrame}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={enableFrame ? '#f5dd4b' : '#f4f3f4'}
            />
          </View>

          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>
              Show Barcode Frames Only in Frame
            </Text>
            <Switch
              value={showBarcodeFramesOnlyInFrame}
              onValueChange={setShowBarcodeFramesOnlyInFrame}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={showBarcodeFramesOnlyInFrame ? '#f5dd4b' : '#f4f3f4'}
              disabled={!enableFrame}
            />
          </View>

          <Text style={styles.description}>
            {showBarcodeFramesOnlyInFrame
              ? 'Yellow frames will only appear around barcodes detected within the green frame overlay.'
              : 'Yellow frames will appear around all detected barcodes, regardless of position.'}
          </Text>
        </View>

        <View style={styles.controlSection}>
          <Text style={styles.sectionTitle}>Frame Configuration</Text>

          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Frame Color</Text>
            <TouchableOpacity style={styles.button} onPress={cycleFrameColor}>
              <Text style={styles.buttonText}>Change Color</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.colorPreview}>
            <View
              style={[styles.colorSwatch, { backgroundColor: frameColor }]}
            />
            <Text style={styles.colorText}>{frameColor}</Text>
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
    fontFamily: 'monospace',
  },
  zoomControls: {
    flexDirection: 'row',
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
