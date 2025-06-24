# React Native Scanner

A native barcode and QR code scanner for React Native with support for frame overlay, torch control, and multiple barcode formats.

## Features

- 📱 **Native Performance**: Built with CameraX and ML Kit for optimal performance
- 🎯 **Frame Overlay**: Optional 200x200 frame overlay for precise scanning
- 🔦 **Torch Control**: Built-in flashlight/torch control
- 📊 **Multiple Formats**: Support for QR codes, Code128, Code39, EAN, UPC, and more
- 🎨 **Customizable**: Configurable frame colors and scanning behavior
- 📱 **Cross Platform**: Android support (iOS coming soon)

## Installation

```bash
npm install react-native-scanner
# or
yarn add react-native-scanner
```

### Android Setup

Add the following permissions to your `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="true" />
<uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />
<uses-feature android:name="android.hardware.camera.flash" android:required="false" />
```

## Usage

### Basic Scanner

```tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import ScannerView, { BarcodeFormat } from 'react-native-scanner';

export default function App() {
  const handleBarcodeScanned = (event) => {
    console.log('Scanned:', event.nativeEvent.data);
  };

  return (
    <View style={styles.container}>
      <ScannerView
        style={styles.scanner}
        barcodeTypes={[BarcodeFormat.QR_CODE, BarcodeFormat.CODE_128]}
        onBarcodeScanned={handleBarcodeScanned}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scanner: {
    flex: 1,
  },
});
```

### Advanced Scanner with Frame Overlay

```tsx
import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import ScannerView, { BarcodeFormat } from 'react-native-scanner';

export default function AdvancedScanner() {
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [enableFrame, setEnableFrame] = useState(true);

  return (
    <View style={styles.container}>
      <ScannerView
        style={styles.scanner}
        barcodeTypes={[
          BarcodeFormat.QR_CODE,
          BarcodeFormat.CODE_128,
          BarcodeFormat.EAN_13,
          BarcodeFormat.UPC_A,
        ]}
        enableFrame={enableFrame}
        frameColor="#00FF00"
        torch={torchEnabled}
        onBarcodeScanned={(event) => {
          console.log('Scanned:', event.nativeEvent.data);
        }}
        onScannerError={(event) => {
          console.error('Error:', event.nativeEvent.error);
        }}
        onLoad={(event) => {
          console.log('Scanner loaded:', event.nativeEvent.success);
        }}
      />
      
      <View style={styles.controls}>
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => setTorchEnabled(!torchEnabled)}
        >
          <Text>Toggle Torch</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => setEnableFrame(!enableFrame)}
        >
          <Text>Toggle Frame</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
```

## API Reference

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `barcodeTypes` | `BarcodeFormat[]` | `[BarcodeFormat.QR_CODE]` | Array of barcode formats to scan |
| `enableFrame` | `boolean` | `false` | Enable 200x200 frame overlay |
| `frameColor` | `string` | `'#FFFFFF'` | Color of the frame border |
| `showBarcodeFramesOnlyInFrame` | `boolean` | `false` | Show barcode detection frames only within the frame overlay |
| `torch` | `boolean` | `false` | Enable/disable torch/flashlight |
| `onBarcodeScanned` | `function` | - | Callback when barcode is scanned |
| `onScannerError` | `function` | - | Callback when scanner encounters an error |
| `onLoad` | `function` | - | Callback when scanner is loaded |

### Barcode Formats

```tsx
import { BarcodeFormat } from 'react-native-scanner';

// Available formats:
BarcodeFormat.QR_CODE        // QR Code
BarcodeFormat.CODE_128       // Code 128
BarcodeFormat.CODE_39        // Code 39
BarcodeFormat.EAN_13         // EAN-13
BarcodeFormat.EAN_8          // EAN-8
BarcodeFormat.UPC_A          // UPC-A
BarcodeFormat.UPC_E          // UPC-E
BarcodeFormat.DATA_MATRIX    // Data Matrix
BarcodeFormat.PDF_417        // PDF417
BarcodeFormat.AZTEC          // Aztec
BarcodeFormat.ITF            // ITF (Interleaved 2 of 5)
```

### Event Payloads

#### onBarcodeScanned
```tsx
{
  nativeEvent: {
    data: string;           // The scanned barcode data
    format: BarcodeFormat;  // The format of the scanned barcode
    timestamp: number;      // Timestamp when scanned
  }
}
```

#### onScannerError
```tsx
{
  nativeEvent: {
    error: string;          // Error message
    code: string;           // Error code
  }
}
```

#### onLoad
```tsx
{
  nativeEvent: {
    success: boolean;       // Whether scanner loaded successfully
    error?: string;         // Error message if loading failed
  }
}
```

## Frame Overlay

When `enableFrame` is set to `true`, the scanner displays a 200x200 pixel frame overlay in the center of the camera view. Only barcodes detected within this frame area will trigger the `onBarcodeScanned` event.

- **With Frame**: Only scans within the 200x200 frame area
- **Without Frame**: Scans the entire camera view

## Barcode Frame Visualization

The scanner can display visual frames around detected barcodes to help users see what's being scanned:

- **Default behavior**: Shows yellow frames around all detected barcodes
- **With `showBarcodeFramesOnlyInFrame={true}`**: Only shows frames for barcodes within the frame overlay
- **Requires `enableFrame={true}`**: The frame overlay must be enabled for this feature to work

```tsx
<ScannerView
  enableFrame={true}
  showBarcodeFramesOnlyInFrame={true}
  frameColor="#00FF00"
  // ... other props
/>
```

## Torch Control

The torch/flashlight can be controlled via the `torch` prop:

```tsx
const [torchEnabled, setTorchEnabled] = useState(false);

<ScannerView
  torch={torchEnabled}
  // ... other props
/>
```

## Permissions

The scanner requires camera permissions. Make sure to request camera permissions in your app before using the scanner:

```tsx
import { PermissionsAndroid, Platform } from 'react-native';

const requestCameraPermission = async () => {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: "Camera Permission",
          message: "This app needs camera access to scan barcodes",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK"
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn(err);
      return false;
    }
  }
  return true;
};
```

## Example

See the `example/` directory for a complete working example.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
