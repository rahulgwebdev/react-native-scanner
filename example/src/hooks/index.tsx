import { useEffect } from 'react';
import { Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SystemNavigationBar from 'react-native-system-navigation-bar';

// Custom hook to manage navigation bar behavior
export const useNavigationBarControl = (immersive: boolean) => {
  useEffect(() => {
    if (Platform.OS === 'android') {
      if (immersive) {
        // Full immersive mode - hide both status and navigation bars
        // SystemNavigationBar.fullScreen();
        // SystemNavigationBar.immersive();
        SystemNavigationBar.setNavigationColor('transparent', 'light');
      } else {
        // Fixed navigation buttons with transparent background
        // SystemNavigationBar.navigationShow();
        // SystemNavigationBar.setNavigationColor('transparent', 'light');
        // SystemNavigationBar.setNavigationBarDividerColor('transparent');
        // Ensure navigation bar is always visible and not hidden
        // SystemNavigationBar.setNavigationBarContrastEnforced(false);
      }
    }
  }, [immersive]);

  return immersive;
};

// Custom hook to get reliable insets for Android 10
export const useReliableInsets = (immersive: boolean = false) => {
  const insets = useSafeAreaInsets();

  // Fallback for Android 10 where insets might be zero
  if (Platform.OS === 'android') {
    const topInset = insets.top > 0 ? insets.top : StatusBar.currentHeight || 0;

    // For bottom inset, try to calculate navigation bar height
    let bottomInset = insets.bottom;
    if (bottomInset === 0) {
      // In Android 10, if we're in immersive mode, bottom inset should be 0
      // If not in immersive mode, estimate navigation bar height
      if (!immersive) {
        // We'll use a conservative estimate of 48dp (typical navigation bar height)
        // You can adjust this value based on your testing
        bottomInset = 48;
      }
      // If immersive is true, keep bottomInset as 0
    }

    return {
      top: topInset,
      bottom: bottomInset,
      left: insets.left,
      right: insets.right,
    };
  }

  return insets;
};
