import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Dimensions, ScrollView } from 'react-native';
import Animated, { 
  FadeInDown, 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { useTheme } from '../theme';
import { useAuth } from '../contexts/AuthContext';

const { width, height } = Dimensions.get('window');

const FloatingShape = ({ 
  size, 
  initialX, 
  initialY, 
  delay, 
  duration,
  color 
}: { 
  size: number; 
  initialX: number; 
  initialY: number; 
  delay: number;
  duration: number;
  color: string;
}) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(progress.value, [0, 1], [0, -25]);
    const translateX = interpolate(progress.value, [0, 1], [0, 12]);
    const scale = interpolate(progress.value, [0, 0.5, 1], [1, 1.08, 1]);
    const opacity = interpolate(progress.value, [0, 0.5, 1], [0.5, 0.7, 0.5]);

    return {
      transform: [{ translateY }, { translateX }, { scale }],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: initialX,
          top: initialY,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
};

const FEATURES = [
  { 
    icon: '🤖', 
    title: 'AI Insights', 
    description: 'Get personalized relationship advice powered by AI',
  },
  { 
    icon: '🎨', 
    title: 'Premium Themes', 
    description: 'Unlock Purple, Emerald, Amber, and Sunset themes',
  },
  { 
    icon: '📂', 
    title: 'Unlimited Categories', 
    description: 'Create as many custom incident types as you need',
  },
  { 
    icon: '📈', 
    title: 'Advanced Analytics', 
    description: 'Deep stats, trends, and relationship patterns',
  },
  { 
    icon: '☁️', 
    title: 'Cloud Backup', 
    description: 'Sync and access your data across all devices',
  },
  { 
    icon: '🚀', 
    title: 'Early Access', 
    description: 'Be the first to try new features and updates',
  },
];

export default function PaywallScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    try {
      const offerings = await Purchases.getOfferings();
      if (offerings.current?.availablePackages) {
        setPackages(offerings.current.availablePackages);
      }
    } catch (error) {
      console.error('Error loading offerings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!user) {
      Alert.alert(
        'Account Required',
        'You need to sign in before subscribing to Premium.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => navigation.replace('SignIn') }
        ]
      );
      return;
    }

    if (packages.length === 0) {
      Alert.alert('Error', 'No subscription plan available');
      return;
    }

    const pkg = packages[0];

    setPurchasing(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      if (customerInfo.entitlements.active['premium']) {
        Alert.alert('Welcome to Premium! 🎉', 'You now have access to all premium features.', [
          { text: 'Let\'s Go!', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error: any) {
      if (!error.userCancelled) {
        Alert.alert('Purchase Failed', 'Something went wrong. Please try again.');
      }
    } finally {
      setPurchasing(false);
    }
  };

  const restorePurchases = async () => {
    setPurchasing(true);
    try {
      const customerInfo = await Purchases.restorePurchases();
      if (customerInfo.entitlements.active['premium']) {
        Alert.alert('Welcome Back! 🎉', 'Your premium subscription has been restored.', [
          { text: 'Let\'s Go!', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('No Subscription Found', 'We couldn\'t find an active subscription for your account.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textMuted }]}>Loading plans...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Floating Animated Shapes */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <FloatingShape 
          size={160} 
          initialX={-50} 
          initialY={60} 
          delay={0} 
          duration={4000}
          color={theme.primary + '12'}
        />
        <FloatingShape 
          size={100} 
          initialX={width - 60} 
          initialY={120} 
          delay={600} 
          duration={3600}
          color={theme.primaryLight + '15'}
        />
        <FloatingShape 
          size={80} 
          initialX={width * 0.4} 
          initialY={height * 0.12} 
          delay={1200} 
          duration={4200}
          color={theme.primary + '10'}
        />
      </View>

      {/* Header */}
      <LinearGradient
        colors={[theme.primary, theme.primaryLight]}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Premium</Text>
            <Text style={styles.headerSubtitle}>Get the full experience</Text>
          </View>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Features Section */}
        <Animated.View 
          entering={FadeInDown.delay(100).duration(500)}
          style={styles.featuresSection}
        >
          <View style={[styles.featuresCard, { backgroundColor: theme.card }]}>
            {FEATURES.map((feature, index) => (
              <View 
                key={index} 
                style={[
                  styles.featureRow,
                  index !== FEATURES.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.divider }
                ]}
              >
                <View style={[styles.featureIcon, { backgroundColor: theme.primary + '12' }]}>
                  <Text style={styles.featureEmoji}>{feature.icon}</Text>
                </View>
                <View style={styles.featureText}>
                  <Text style={[styles.featureTitle, { color: theme.text }]}>{feature.title}</Text>
                  <Text style={[styles.featureDescription, { color: theme.textMuted }]}>{feature.description}</Text>
                </View>
                <View style={[styles.checkCircle, { backgroundColor: theme.primary + '15' }]}>
                  <Text style={[styles.checkmark, { color: theme.primary }]}>✓</Text>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Guarantee */}
        <Animated.View 
          entering={FadeInDown.delay(200).duration(500)}
          style={styles.guaranteeSection}
        >
          <View style={[styles.guaranteeCard, { backgroundColor: theme.primary + '08' }]}>
            <Text style={styles.guaranteeIcon}>🛡️</Text>
            <View style={styles.guaranteeText}>
              <Text style={[styles.guaranteeTitle, { color: theme.text }]}>Money-Back Guarantee</Text>
              <Text style={[styles.guaranteeDescription, { color: theme.textMuted }]}>
                Not satisfied? Get a full refund within 7 days.
              </Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Bottom CTA */}
      <Animated.View 
        entering={FadeInDown.delay(300).duration(500)}
        style={[styles.bottomSection, { backgroundColor: theme.card, borderTopColor: theme.divider }]}
      >
        <TouchableOpacity 
          style={[styles.purchaseButton, { opacity: (purchasing || packages.length === 0) ? 0.6 : 1 }]}
          onPress={handlePurchase}
          disabled={purchasing || packages.length === 0}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[theme.primary, theme.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.purchaseGradient}
          >
            {purchasing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.purchaseText}>Start 1 Week Free Trial • $1.99/mo</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.bottomLinks}>
          <TouchableOpacity onPress={restorePurchases} disabled={purchasing}>
            <Text style={[styles.linkText, { color: theme.textMuted }]}>Restore</Text>
          </TouchableOpacity>
          <Text style={[styles.linkDivider, { color: theme.divider }]}>•</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Legal', { tab: 'terms' })}>
            <Text style={[styles.linkText, { color: theme.textMuted }]}>Terms</Text>
          </TouchableOpacity>
          <Text style={[styles.linkDivider, { color: theme.divider }]}>•</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Legal', { tab: 'privacy' })}>
            <Text style={[styles.linkText, { color: theme.textMuted }]}>Privacy</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  header: {
    paddingTop: 30,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.85)',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 20,
  },
  featuresSection: {
    marginBottom: 16,
  },
  featuresCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  featureEmoji: {
    fontSize: 22,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  guaranteeSection: {
    marginBottom: 10,
  },
  guaranteeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 14,
  },
  guaranteeIcon: {
    fontSize: 28,
  },
  guaranteeText: {
    flex: 1,
  },
  guaranteeTitle: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 2,
  },
  guaranteeDescription: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  bottomSection: {
    padding: 20,
    paddingBottom: 36,
    borderTopWidth: 1,
  },
  purchaseButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#F43F5E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  purchaseGradient: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  purchaseText: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
  },
  bottomLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  linkText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  linkDivider: {
    fontSize: 10,
  },
});