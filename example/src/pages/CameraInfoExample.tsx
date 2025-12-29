import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCameraInfo } from '@cleanui/react-native-scanner';
import type { NavigationProp } from '../types/navigation';
import React from 'react';

export default function CameraInfoExample() {
  const navigation = useNavigation<NavigationProp>();
  const {
    deviceInfo,
    allCameras,
    backCameras,
    frontCameras,
    macroCameras,
    hasMultipleCameras,
    hasBackCamera,
    hasFrontCamera,
    hasMacroCamera,
    hasTorch,
    defaultBackCamera,
    defaultFrontCamera,
    maxZoom,
    minZoom,
    isLoading,
    error,
    refreshInfo,
  } = useCameraInfo();

  console.log('deviceInfo', deviceInfo);

  const handleRefresh = async () => {
    try {
      await refreshInfo();
      Alert.alert('Success', 'Camera information refreshed!');
    } catch (_e) {
      Alert.alert('Error', `Failed to refresh camera information ${_e}`);
    }
  };

  // Debug logging to help identify duplicate cameras
  React.useEffect(() => {
    if (allCameras.length > 0) {
      console.log('=== CAMERA DEBUG INFO ===');
      console.log('Total cameras found:', allCameras.length);
      console.log('Raw camera data:', JSON.stringify(allCameras, null, 2));
      console.log('Front cameras:', frontCameras.length);
      console.log('Back cameras:', backCameras.length);
      console.log('Macro cameras:', macroCameras.length);
      console.log('========================');
    }
  }, [allCameras, frontCameras, backCameras, macroCameras]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Camera Information</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading camera information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Camera Information</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Camera Information</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
          <Text style={styles.refreshButtonText}>🔄</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Beta Warning */}
        <View style={styles.betaWarning}>
          <Text style={styles.betaWarningText}>
            ⚠️ Beta: Camera information may be limited or unreliable because
            manufacturers often lock full hardware access behind their own
            system-level applications.
          </Text>
        </View>

        {/* Quick Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📱 Device Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Cameras</Text>
              <Text style={styles.summaryValue}>{allCameras.length}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Back Cameras</Text>
              <Text style={styles.summaryValue}>{backCameras.length}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Front Cameras</Text>
              <Text style={styles.summaryValue}>{frontCameras.length}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Macro Cameras</Text>
              <Text style={styles.summaryValue}>{macroCameras.length}</Text>
            </View>
          </View>
        </View>

        {/* Capabilities */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Capabilities</Text>
          <View style={styles.capabilityList}>
            <View style={styles.capabilityItem}>
              <Text style={styles.capabilityIcon}>
                {hasMultipleCameras ? '✅' : '❌'}
              </Text>
              <Text style={styles.capabilityText}>Multiple Cameras</Text>
            </View>
            <View style={styles.capabilityItem}>
              <Text style={styles.capabilityIcon}>
                {hasBackCamera ? '✅' : '❌'}
              </Text>
              <Text style={styles.capabilityText}>Back Camera</Text>
            </View>
            <View style={styles.capabilityItem}>
              <Text style={styles.capabilityIcon}>
                {hasFrontCamera ? '✅' : '❌'}
              </Text>
              <Text style={styles.capabilityText}>Front Camera</Text>
            </View>
            <View style={styles.capabilityItem}>
              <Text style={styles.capabilityIcon}>
                {hasMacroCamera ? '✅' : '❌'}
              </Text>
              <Text style={styles.capabilityText}>Macro Camera</Text>
            </View>
            <View style={styles.capabilityItem}>
              <Text style={styles.capabilityIcon}>
                {hasTorch ? '✅' : '❌'}
              </Text>
              <Text style={styles.capabilityText}>Torch/Flash</Text>
            </View>
          </View>
        </View>

        {/* Zoom Range */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔍 Zoom Range</Text>
          <View style={styles.zoomInfo}>
            <Text style={styles.zoomText}>
              Min: {minZoom.toFixed(1)}x | Max: {maxZoom.toFixed(1)}x
            </Text>
          </View>
        </View>

        {/* Default Cameras */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📷 Default Cameras</Text>
          {defaultBackCamera && (
            <View style={styles.cameraInfo}>
              <Text style={styles.cameraTitle}>Default Back Camera</Text>
              <Text style={styles.cameraDetail}>
                ID: {defaultBackCamera.id}
              </Text>
              <Text style={styles.cameraDetail}>
                Focus Distance: {defaultBackCamera.minFocusDistance.toFixed(2)}
              </Text>
              <Text style={styles.cameraDetail}>
                Macro: {defaultBackCamera.isMacroCamera ? 'Yes' : 'No'}
              </Text>
            </View>
          )}
          {defaultFrontCamera && (
            <View style={styles.cameraInfo}>
              <Text style={styles.cameraTitle}>Default Front Camera</Text>
              <Text style={styles.cameraDetail}>
                ID: {defaultFrontCamera.id}
              </Text>
              <Text style={styles.cameraDetail}>
                Focus Distance: {defaultFrontCamera.minFocusDistance.toFixed(2)}
              </Text>
              <Text style={styles.cameraDetail}>
                Macro: {defaultFrontCamera.isMacroCamera ? 'Yes' : 'No'}
              </Text>
            </View>
          )}
        </View>

        {/* All Cameras */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 All Cameras</Text>
          {allCameras.map((camera, index) => (
            <View key={camera.id} style={styles.cameraCard}>
              <View style={styles.cameraHeader}>
                <Text style={styles.cameraId}>Camera {index + 1}</Text>
                <Text style={styles.cameraFacing}>
                  {camera.facing.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.cameraDetail}>ID: {camera.id}</Text>
              <Text style={styles.cameraDetail}>
                Focus Distance: {camera.minFocusDistance.toFixed(2)}
              </Text>
              <Text style={styles.cameraDetail}>
                Zoom: {camera.zoomMin.toFixed(1)}x - {camera.zoomMax.toFixed(1)}
                x
              </Text>
              <Text style={styles.cameraDetail}>
                Flash: {camera.hasFlash ? 'Yes' : 'No'}
              </Text>
              <Text style={styles.cameraDetail}>
                Macro: {camera.isMacroCamera ? 'Yes' : 'No'}
              </Text>
              <Text style={styles.cameraDetail}>
                Focal Lengths: {camera.focalLengths.join(', ')}
              </Text>
            </View>
          ))}
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
  refreshButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  refreshButtonText: {
    fontSize: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ff3b30',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  section: {
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
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  capabilityList: {
    gap: 8,
  },
  capabilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  capabilityIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  capabilityText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  zoomInfo: {
    alignItems: 'center',
  },
  zoomText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  cameraInfo: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  cameraTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  cameraDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  cameraCard: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cameraId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  cameraFacing: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  betaWarning: {
    backgroundColor: '#ffd700',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 16,
  },
  betaWarningText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
  },
});
