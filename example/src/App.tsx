import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import your screens here
import HomeScreen from './pages/HomeScreen';
import FullScreenExample from './pages/FullScreenExample';
import NewPropsExample from './pages/NewPropsExample';
import RectangularFrameExample from './pages/RectangularFrameExample';
import BarcodeFrameExample from './pages/BarcodeFrameExample';
import CameraInfoExample from './pages/CameraInfoExample';
import BarcodeScanStrategyExample from './pages/BarcodeScanStrategyExample';

// Import types
import type { RootStackParamList } from './types/navigation';
import { useNavigationBarControl } from './hooks';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  useNavigationBarControl(true);
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Home">
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ title: 'Home' }}
          />
          <Stack.Screen
            name="FullScreenExample"
            component={FullScreenExample}
            options={{
              title: 'Full Screen Example',
              headerShown: false,
              gestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="NewPropsExample"
            component={NewPropsExample}
            options={{
              title: 'New Props Example',
              headerShown: false,
              gestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="RectangularFrameExample"
            component={RectangularFrameExample}
            options={{
              title: 'Rectangular Frame Example',
              headerShown: false,
              gestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="BarcodeFrameExample"
            component={BarcodeFrameExample}
            options={{
              title: 'Barcode Frame Example',
              headerShown: false,
              gestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="CameraInfoExample"
            component={CameraInfoExample}
            options={{
              title: 'Camera Info',
              headerShown: false,
              gestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="BarcodeScanStrategyExample"
            component={BarcodeScanStrategyExample}
            options={{
              title: 'Barcode Scan Strategy',
              headerShown: false,
              gestureEnabled: true,
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
