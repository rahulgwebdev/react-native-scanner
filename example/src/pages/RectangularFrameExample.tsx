import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScannerView, { BarcodeFormat } from 'react-native-scanner';
import type { NavigationProp } from '../types/navigation';
import type { FrameSize, BarcodeFrameConfig } from 'react-native-scanner';

export default function RectangularFrameExample() {
  const navigation = useNavigation<NavigationProp>();
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [zoom, setZoom] = useState(1.0);
  const [enableFrame, setEnableFrame] = useState(true);
  const [frameColor, setFrameColor] = useState('#00FF00');
  const [selectedBarcodeType, setSelectedBarcodeType] = useState<BarcodeFormat>(
    BarcodeFormat.QR_CODE
  );
  const [scannedData, setScannedData] = useState<string>('');
  const scannerRef = useRef<typeof ScannerView>(null);

  // Define barcode-specific frame configurations
  const barcodeFrameConfigs: BarcodeFrameConfig[] = [
    {
      format: BarcodeFormat.QR_CODE,
      frameSize: { width: 250, height: 250 }, // Square for QR codes
      frameColor: '#00FF00',
    },
    {
      format: BarcodeFormat.CODE_128,
      frameSize: { width: 300, height: 100 }, // Wide rectangle for 1D codes
      frameColor: '#FF6B35',
    },
    {
      format: BarcodeFormat.EAN_13,
      frameSize: { width: 280, height: 80 }, // Wide rectangle for EAN codes
      frameColor: '#4ECDC4',
    },
    {
      format: BarcodeFormat.DATA_MATRIX,
      frameSize: { width: 200, height: 200 }, // Square for Data Matrix
      frameColor: '#45B7D1',
    },
    {
      format: BarcodeFormat.PDF_417,
      frameSize: { width: 320, height: 120 }, // Wide rectangle for PDF417
      frameColor: '#96CEB4',
    },
  ];

  // Get current frame configuration based on selected barcode type
  const getCurrentFrameConfig = (): FrameSize => {
    const config = barcodeFrameConfigs.find(
      (c) => c.format === selectedBarcodeType
    );
    return config?.frameSize || { width: 250, height: 250 };
  };

  const getCurrentFrameColor = (): string => {
    const config = barcodeFrameConfigs.find(
      (c) => c.format === selectedBarcodeType
    );
    return config?.frameColor || '#00FF00';
  };

  const handleBarcodeScanned = (event: {
    nativeEvent: { data: string; format: string; timestamp: number };
  }) => {
    const { data, format } = event.nativeEvent;
    setScannedData(data);

    Alert.alert('Barcode Scanned!', `Format: ${format}\nData: ${data}`, [
      {
        text: 'Scan Again',
        onPress: () => {
          if (scannerRef.current) {
            // Note: resumeScanning method would need to be implemented
            console.log('Resume scanning');
          }
        },
      },
      {
        text: 'OK',
        style: 'default',
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

  const cycleFrameColor = () => {
    const colors = [
      '#00FF00',
      '#FF6B35',
      '#4ECDC4',
      '#45B7D1',
      '#96CEB4',
      '#FFD93D',
    ];
    const currentIndex = colors.indexOf(frameColor);
    const nextIndex = (currentIndex + 1) % colors.length;
    const nextColor = colors[nextIndex];
    if (nextColor) {
      setFrameColor(nextColor);
    }
  };

  const cycleBarcodeType = () => {
    const types = [
      BarcodeFormat.QR_CODE,
      BarcodeFormat.CODE_128,
      BarcodeFormat.EAN_13,
      BarcodeFormat.DATA_MATRIX,
      BarcodeFormat.PDF_417,
    ];
    const currentIndex = types.indexOf(selectedBarcodeType);
    const nextIndex = (currentIndex + 1) % types.length;
    const nextType = types[nextIndex];
    if (nextType) {
      setSelectedBarcodeType(nextType);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Rectangular Frame Scanner</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.scannerContainer}>
        <ScannerView
          style={styles.scanner}
          enableFrame={enableFrame}
          frameColor={getCurrentFrameColor()}
          frameSize={getCurrentFrameConfig()}
          barcodeTypes={[selectedBarcodeType]}
          barcodeFrameConfigs={barcodeFrameConfigs}
          torch={torchEnabled}
          zoom={zoom}
          onBarcodeScanned={handleBarcodeScanned}
          onScannerError={handleScannerError}
          onLoad={handleLoad}
        />
      </View>

      <ScrollView
        style={styles.controlsContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.controlSection}>
          <Text style={styles.sectionTitle}>Frame Configuration</Text>

          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Enable Frame</Text>
            <Switch
              value={enableFrame}
              onValueChange={setEnableFrame}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={enableFrame ? '#f5dd4b' : '#f4f3f4'}
            />
          </View>

          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>
              Current Type: {selectedBarcodeType}
            </Text>
            <TouchableOpacity style={styles.button} onPress={cycleBarcodeType}>
              <Text style={styles.buttonText}>Change Type</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>
              Frame Size: {JSON.stringify(getCurrentFrameConfig())}
            </Text>
          </View>

          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Frame Color</Text>
            <TouchableOpacity style={styles.button} onPress={cycleFrameColor}>
              <Text style={styles.buttonText}>Change Color</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.controlSection}>
          <Text style={styles.sectionTitle}>Camera Controls</Text>

          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Torch</Text>
            <Switch
              value={torchEnabled}
              onValueChange={toggleTorch}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={torchEnabled ? '#f5dd4b' : '#f4f3f4'}
            />
          </View>

          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Zoom: {zoom.toFixed(1)}x</Text>
            <View style={styles.zoomControls}>
              <TouchableOpacity
                style={styles.zoomButton}
                onPress={decreaseZoom}
              >
                <Text style={styles.zoomButtonText}>-</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.zoomButton}
                onPress={increaseZoom}
              >
                <Text style={styles.zoomButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {scannedData ? (
          <View style={styles.controlSection}>
            <Text style={styles.sectionTitle}>Last Scanned</Text>
            <View style={styles.scannedDataContainer}>
              <Text style={styles.scannedDataText} numberOfLines={3}>
                {scannedData}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>About Rectangular Frames</Text>
          <Text style={styles.infoText}>
            This example demonstrates how different barcode types can have
            optimized frame shapes:
          </Text>
          <Text style={styles.infoText}>
            • QR Codes & Data Matrix: Square frames{'\n'}• 1D Barcodes (Code
            128, EAN): Wide rectangles{'\n'}• PDF417: Extra wide rectangles
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 60,
  },
  scannerContainer: {
    height: 300,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  scanner: {
    flex: 1,
  },
  controlsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  controlSection: {
    backgroundColor: '#fff',
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
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  controlLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
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
    fontWeight: '500',
  },
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  zoomButton: {
    backgroundColor: '#007AFF',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  zoomButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  scannedDataContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  scannedDataText: {
    fontSize: 14,
    color: '#1a1a1a',
    fontFamily: 'monospace',
  },
  infoSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 4,
  },
});
