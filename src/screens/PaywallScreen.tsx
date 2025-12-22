import React, { useState, useEffect, useRef } from 'react';
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
    title: 'Custom Categories', 
    description: 'Add custom incident types that matter to you',
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
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    loadOfferings();
    checkExistingSubscription();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const checkExistingSubscription = async () => {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      if (customerInfo.entitlements.active['premium']) {
        if (mountedRef.current) {
          Alert.alert(
            'Already Premium! 🎉',
            'You already have an active subscription.',
            [{ text: 'Got it', onPress: () => navigation.goBack() }]
          );
        }
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      // Don't show error to user - they might just not have a subscription
    }
  };

  const loadOfferings = async () => {
    try {
      const offerings = await Purchases.getOfferings();
      if (offerings.current?.availablePackages && offerings.current.availablePackages.length > 0) {
        if (mountedRef.current) {
          setPackages(offerings.current.availablePackages);
        }
      } else {
        if (mountedRef.current) {
          setPackages([]);
          Alert.alert(
            'No Plans Available',
            'Could not load subscription plans. Please try again later.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        }
      }
    } catch (error) {
      console.error('Error loading offerings:', error);
      if (mountedRef.current) {
        Alert.alert(
          'Connection Error',
          'Could not load subscription plans. Check your internet connection.',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => navigation.goBack() },
            { text: 'Retry', onPress: () => loadOfferings() }
          ]
        );
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handlePurchase = async () => {
    // Guard against multiple simultaneous purchases
    if (purchasing) return;

    // Check if user is authenticated
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

    // Validate packages exist
    if (packages.length === 0) {
      Alert.alert('Error', 'No subscription plan available. Please try again later.');
      return;
    }

    const pkg = packages[0];

    // Validate package integrity
    if (!pkg?.product?.priceString || !pkg?.identifier) {
      Alert.alert(
        'Invalid Plan',
        'The subscription plan is invalid. Please restart the app and try again.'
      );
      return;
    }

    setPurchasing(true);

    try {
      // Verify RevenueCat user ID is properly set
      const customerId = await Purchases.getAppUserID();
      if (!customerId || customerId.startsWith('$RCAnonymousID:')) {
        if (mountedRef.current) {
          setPurchasing(false);
          Alert.alert(
            'Account Setup Error',
            'Your account isn\'t properly configured. Please sign out and sign back in.',
            [{ text: 'OK', onPress: () => navigation.navigate('Settings') }]
          );
        }
        return;
      }

      // Attempt purchase
      const { customerInfo } = await Purchases.purchasePackage(pkg);

      if (!mountedRef.current) return;

      // Validate purchase response
      if (!customerInfo) {
        setPurchasing(false);
        Alert.alert(
          'Purchase Error',
          'We received an invalid response. Please contact support if you were charged.'
        );
        return;
      }

      // Check if premium entitlement is active
      if (customerInfo.entitlements.active['premium']) {
        Alert.alert(
          'Welcome to Premium! 🎉', 
          'You now have access to all premium features.',
          [{ text: 'Let\'s Go!', onPress: () => navigation.goBack() }]
        );
      } else {
        // Purchase went through but entitlement didn't activate immediately
        Alert.alert(
          'Processing Purchase',
          'Your purchase is being processed. Premium features will be available shortly. Please restart the app in a few minutes if they don\'t appear.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error: any) {
      if (!mountedRef.current) return;

      console.error('Purchase error:', error);

      if (!error.userCancelled) {
        // Check for specific error types
        const errorMessage = error.message?.toLowerCase() || '';
        const errorCode = error.code?.toLowerCase() || '';

        if (errorMessage.includes('network') || 
            errorCode.includes('network') || 
            errorCode === 'network_error') {
          Alert.alert(
            'Connection Lost',
            'Your internet connection was interrupted. Your purchase was not completed. Please check your connection and try again.'
          );
        } else if (errorCode === 'payment_pending') {
          Alert.alert(
            'Payment Pending',
            'Your payment is being processed. Premium features will be available once the payment completes.'
          );
        } else if (errorCode === 'product_already_purchased') {
          Alert.alert(
            'Already Subscribed',
            'You already have an active subscription. Try restoring your purchases.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Restore', onPress: restorePurchases }
            ]
          );
        } else {
          Alert.alert(
            'Purchase Failed',
            'Something went wrong with your purchase. Please try again or contact support if the problem persists.'
          );
        }
      }
    } finally {
      if (mountedRef.current) {
        setPurchasing(false);
      }
    }
  };

  const restorePurchases = async () => {
    // Guard against multiple simultaneous restores
    if (purchasing) return;

    setPurchasing(true);
    try {
      const customerInfo = await Purchases.restorePurchases();

      if (!mountedRef.current) return;

      if (customerInfo.entitlements.active['premium']) {
        Alert.alert(
          'Welcome Back! 🎉', 
          'Your premium subscription has been restored.',
          [{ text: 'Let\'s Go!', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert(
          'No Subscription Found',
          'We couldn\'t find an active subscription for your account. If you recently purchased, please wait a few minutes and try again.'
        );
      }
    } catch (error: any) {
      if (!mountedRef.current) return;

      console.error('Restore error:', error);

      const errorMessage = error.message?.toLowerCase() || '';
      if (errorMessage.includes('network')) {
        Alert.alert(
          'Connection Error',
          'Could not restore purchases. Check your internet connection and try again.'
        );
      } else {
        Alert.alert(
          'Restore Failed',
          'Failed to restore purchases. Please try again or contact support if the problem persists.'
        );
      }
    } finally {
      if (mountedRef.current) {
        setPurchasing(false);
      }
    }
  };

  const navigateToLegal = (tab: 'terms' | 'privacy') => {
    try {
      navigation.navigate('Legal', { tab });
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert(
        'Error',
        `Could not open ${tab === 'terms' ? 'Terms of Service' : 'Privacy Policy'}. Please contact support.`
      );
    }
  };

  const getPriceDisplay = (): string => {
    if (packages.length === 0 || !packages[0]?.product) {
      return 'Loading...';
    }

    const product = packages[0].product;
    let display = '';

    // Add intro price info if available
    if (product.introPrice) {
      const period = product.introPrice.periodNumberOfUnits || 1;
      const unit = product.introPrice.periodUnit || 'week';
      display += `Start ${period} ${unit}${period > 1 ? 's' : ''} Free Trial • `;
    }

    // Add regular price
    display += `${product.priceString}/mo`;

    return display;
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
    <View style={[styles.container, { backgroundColor: theme.background }]}>
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
            style={[
              styles.closeButton,
              purchasing && styles.closeButtonDisabled
            ]}
            onPress={() => navigation.goBack()}
            disabled={purchasing}
          >
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!purchasing}
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
              <Text style={styles.purchaseText}>{getPriceDisplay()}</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.bottomLinks}>
          <TouchableOpacity onPress={restorePurchases} disabled={purchasing}>
            <Text style={[styles.linkText, { color: theme.textMuted, opacity: purchasing ? 0.5 : 1 }]}>
              Restore
            </Text>
          </TouchableOpacity>
          <Text style={[styles.linkDivider, { color: theme.divider }]}>•</Text>
          <TouchableOpacity onPress={() => navigateToLegal('terms')} disabled={purchasing}>
            <Text style={[styles.linkText, { color: theme.textMuted, opacity: purchasing ? 0.5 : 1 }]}>
              Terms
            </Text>
          </TouchableOpacity>
          <Text style={[styles.linkDivider, { color: theme.divider }]}>•</Text>
          <TouchableOpacity onPress={() => navigateToLegal('privacy')} disabled={purchasing}>
            <Text style={[styles.linkText, { color: theme.textMuted, opacity: purchasing ? 0.5 : 1 }]}>
              Privacy
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
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
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
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
  closeButtonDisabled: {
    opacity: 0.4,
  },
  closeText: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
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
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
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
    fontFamily: 'Poppins_700Bold',
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
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 2,
  },
  guaranteeDescription: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
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
    fontFamily: 'Poppins_700Bold',
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
    fontFamily: 'Poppins_500Medium',
  },
  linkDivider: {
    fontSize: 10,
  },
});