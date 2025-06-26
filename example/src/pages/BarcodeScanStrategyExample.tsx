import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import ScannerView, { BarcodeScanStrategy } from 'react-native-scanner';
import type { BarcodeScannedEventPayload } from 'react-native-scanner';

const BarcodeScanStrategyExample: React.FC = () => {
  const [selectedStrategy, setSelectedStrategy] = useState<BarcodeScanStrategy>(
    BarcodeScanStrategy.ALL
  );
  const [scannedBarcodes, setScannedBarcodes] = useState<
    BarcodeScannedEventPayload[]
  >([]);
  const [isScanning, setIsScanning] = useState(true);

  const strategies = [
    { key: BarcodeScanStrategy.ONE, label: 'ONE - First barcode only' },
    { key: BarcodeScanStrategy.ALL, label: 'ALL - All barcodes' },
    {
      key: BarcodeScanStrategy.BIGGEST,
      label: 'BIGGEST - Largest barcode only',
    },
    {
      key: BarcodeScanStrategy.SORT_BY_BIGGEST,
      label: 'SORT_BY_BIGGEST - All sorted by size',
    },
  ];

  const handleBarcodeScanned = (event: {
    nativeEvent: { barcodes: BarcodeScannedEventPayload[] };
  }) => {
    const barcodes = event.nativeEvent.barcodes;
    setScannedBarcodes(barcodes);

    console.log(
      `Scanned ${barcodes.length} barcode(s) with strategy: ${selectedStrategy}`
    );
    if (Array.isArray(barcodes)) {
      barcodes.forEach((barcode, index) => {
        console.log(`Barcode ${index + 1}:`, {
          data: barcode.data,
          format: barcode.format,
          area: barcode.area,
          boundingBox: barcode.boundingBox,
        });
      });

      Alert.alert(
        'Barcodes Scanned!',
        `Found ${barcodes.length} barcode(s) using strategy: ${selectedStrategy}\n\n${barcodes
          .map(
            (barcode, index) =>
              `${index + 1}. ${barcode.data} (${barcode.format})${
                barcode.area ? ` - Area: ${Math.round(barcode.area)}` : ''
              }`
          )
          .join('\n')}`,
        [
          { text: 'Continue Scanning', style: 'default' },
          {
            text: 'Stop',
            style: 'destructive',
            onPress: () => setIsScanning(false),
          },
        ]
      );
    }
  };

  const handleStrategyChange = (strategy: BarcodeScanStrategy) => {
    setSelectedStrategy(strategy);
    setScannedBarcodes([]);
    console.log(`Strategy changed to: ${strategy}`);
  };

  const resetScanning = () => {
    setScannedBarcodes([]);
    setIsScanning(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Barcode Scan Strategy</Text>
        <Text style={styles.subtitle}>
          Current Strategy: {selectedStrategy}
        </Text>
      </View>

      <View style={styles.mainContainer}>
        {/* Scanner View - 50% of screen */}
        <View style={styles.scannerContainer}>
          {isScanning ? (
            <ScannerView
              style={styles.scanner}
              barcodeScanStrategy={selectedStrategy}
              onBarcodeScanned={handleBarcodeScanned}
              onScannerError={(event) => {
                console.error('Scanner error:', event.nativeEvent);
                Alert.alert('Scanner Error', event.nativeEvent.error);
              }}
              focusArea={{
                enabled: true,
                showOverlay: true,
                size: 300,
                borderColor: '#00FF00',
              }}
              barcodeFrames={{
                enabled: true,
                color: '#FF0000',
                onlyInFocusArea: false,
              }}
            />
          ) : (
            <View style={styles.scannerPlaceholder}>
              <Text style={styles.placeholderText}>Scanner Paused</Text>
              <TouchableOpacity
                style={styles.resumeButton}
                onPress={resetScanning}
              >
                <Text style={styles.resumeButtonText}>Resume Scanning</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Controls Section - 50% of screen */}
        <View style={styles.controlsContainer}>
          <ScrollView
            style={styles.controlsScrollView}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.strategySection}>
              <Text style={styles.sectionTitle}>Select Strategy:</Text>
              {strategies.map((strategy) => (
                <TouchableOpacity
                  key={strategy.key}
                  style={[
                    styles.strategyButton,
                    selectedStrategy === strategy.key &&
                      styles.selectedStrategy,
                  ]}
                  onPress={() => handleStrategyChange(strategy.key)}
                >
                  <Text
                    style={[
                      styles.strategyText,
                      selectedStrategy === strategy.key &&
                        styles.selectedStrategyText,
                    ]}
                  >
                    {strategy.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.resultsSection}>
              <Text style={styles.sectionTitle}>
                Last Scan Results ({scannedBarcodes.length} barcode(s)):
              </Text>
              <View style={styles.resultsList}>
                {scannedBarcodes.length === 0 ? (
                  <Text style={styles.noResultsText}>
                    No barcodes scanned yet
                  </Text>
                ) : (
                  Array.isArray(scannedBarcodes) && (
                    <>
                      {scannedBarcodes.map((barcode, index) => (
                        <View key={index} style={styles.barcodeItem}>
                          <Text style={styles.barcodeData}>
                            {index + 1}. {barcode.data}
                          </Text>
                          <Text style={styles.barcodeDetails}>
                            Format: {barcode.format}
                            {barcode.area &&
                              ` | Area: ${Math.round(barcode.area)}`}
                          </Text>
                          {barcode.boundingBox && (
                            <Text style={styles.barcodeDetails}>
                              Box: ({Math.round(barcode.boundingBox.left)},{' '}
                              {Math.round(barcode.boundingBox.top)}) - (
                              {Math.round(barcode.boundingBox.right)},{' '}
                              {Math.round(barcode.boundingBox.bottom)})
                            </Text>
                          )}
                        </View>
                      ))}
                    </>
                  )
                )}
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
  },
  mainContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  scanner: {
    flex: 1,
  },
  scannerPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
  },
  placeholderText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 15,
  },
  resumeButton: {
    backgroundColor: '#2196f3',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  resumeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  controlsContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderLeftWidth: 1,
    borderLeftColor: '#e0e0e0',
  },
  controlsScrollView: {
    flex: 1,
  },
  strategySection: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  strategyButton: {
    padding: 12,
    marginVertical: 3,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedStrategy: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
  },
  strategyText: {
    fontSize: 14,
    color: '#333',
  },
  selectedStrategyText: {
    color: '#2196f3',
    fontWeight: 'bold',
  },
  resultsSection: {
    flex: 1,
    padding: 15,
  },
  resultsList: {
    flex: 1,
  },
  noResultsText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    padding: 20,
  },
  barcodeItem: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  barcodeData: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3,
  },
  barcodeDetails: {
    fontSize: 12,
    color: '#666',
    marginBottom: 1,
  },
});

export default BarcodeScanStrategyExample;
