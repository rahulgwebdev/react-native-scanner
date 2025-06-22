import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Home: undefined;
  FullScreenExample: undefined;
};

export type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Home'
>;
