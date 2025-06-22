import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList, NavigationProp } from '../types/navigation';

interface ExampleCard {
  id: string;
  title: string;
  description: string;
  route: keyof RootStackParamList;
  icon: string;
  color: string;
}

const examples: ExampleCard[] = [
  {
    id: '1',
    title: 'Full Screen Scanner',
    description:
      'Complete barcode scanner with frame overlay, torch control, and immersive UI',
    route: 'FullScreenExample',
    icon: '📱',
    color: '#007AFF',
  },
  {
    id: '2',
    title: 'Rectangular Frame Scanner',
    description:
      'Scanner with rectangular frames optimized for different barcode types',
    route: 'RectangularFrameExample',
    icon: '📐',
    color: '#34C759',
  },
  {
    id: '3',
    title: 'Camera Info',
    description: 'Show device camera capabilities (zoom, torch, macro, etc)',
    route: 'CameraInfoExample',
    icon: '🛠️',
    color: '#FFD93D',
  },
  {
    id: '4',
    title: 'Basic Scanner',
    description: 'Simple scanner without frame overlay (coming soon)',
    route: 'Home', // Placeholder
    icon: '🔍',
    color: '#FF9500',
  },
  {
    id: '5',
    title: 'Custom Frame Scanner',
    description:
      'Scanner with customizable frame size and colors (coming soon)',
    route: 'Home', // Placeholder
    icon: '🎨',
    color: '#AF52DE',
  },
  {
    id: '6',
    title: 'Multi-Format Scanner',
    description:
      'Scanner configured for specific barcode formats (coming soon)',
    route: 'Home', // Placeholder
    icon: '📊',
    color: '#FF3B30',
  },
];

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();

  const handleCardPress = (example: ExampleCard) => {
    if (example.route !== 'Home') {
      navigation.navigate(example.route);
    } else {
      // Handle coming soon examples
      console.log(`${example.title} - Coming Soon!`);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>React Native Scanner</Text>
          <Text style={styles.subtitle}>
            Choose an example to explore different scanner configurations
          </Text>
        </View>

        <View style={styles.cardsContainer}>
          {examples.map((example) => (
            <TouchableOpacity
              key={example.id}
              style={[
                styles.card,
                { borderLeftColor: example.color },
                example.route === 'Home' && styles.disabledCard,
              ]}
              onPress={() => handleCardPress(example)}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardIcon}>{example.icon}</Text>
                <View style={styles.cardTitleContainer}>
                  <Text style={styles.cardTitle}>{example.title}</Text>
                  {example.route === 'Home' && (
                    <Text style={styles.comingSoon}>Coming Soon</Text>
                  )}
                </View>
              </View>
              <Text style={styles.cardDescription}>{example.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Built with CameraX and ML Kit for optimal performance
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  cardsContainer: {
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledCard: {
    opacity: 0.6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  comingSoon: {
    fontSize: 12,
    color: '#ff9500',
    fontWeight: '500',
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});
