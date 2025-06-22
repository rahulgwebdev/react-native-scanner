import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import your screens here
import HomeScreen from './pages/HomeScreen';
import FullScreenExample from './pages/FullScreenExample';
import RectangularFrameExample from './pages/RectangularFrameExample';
import CameraInfoExample from './pages/CameraInfoExample';

// Import types
import type { RootStackParamList } from './types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
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
            name="RectangularFrameExample"
            component={RectangularFrameExample}
            options={{
              title: 'Rectangular Frame Example',
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
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
