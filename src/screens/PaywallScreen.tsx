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
  { icon: '🤖', title: 'AI Insights', description: 'Smart relationship analysis' },
  { icon: '📊', title: 'Unlimited Categories', description: 'Create custom incident types' },
  { icon: '☁️', title: 'Cloud Sync', description: 'Access across all devices' },
  { icon: '📈', title: 'Advanced Stats', description: 'Deep analytics & trends' },
];

export default function PaywallScreen({ navigation }: any) {
  const { theme } = useTheme();
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    try {
      const offerings = await Purchases.getOfferings();
      if (offerings.current?.availablePackages) {
        setPackages(offerings.current.availablePackages);
        if (offerings.current.availablePackages.length > 0) {
          setSelectedPackage(offerings.current.availablePackages[0].identifier);
        }
      }
    } catch (error) {
      console.error('Error loading offerings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    const pkg = packages.find(p => p.identifier === selectedPackage);
    if (!pkg) return;

    setPurchasing(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      if (customerInfo.entitlements.active['premium']) {
        Alert.alert('Success!', 'Welcome to Logifyer Premium!');
        navigation.goBack();
      }
    } catch (error: any) {
      if (!error.userCancelled) {
        Alert.alert('Error', 'Purchase failed. Please try again.');
      }
    } finally {
      setPurchasing(false);
    }
  };

  const restorePurchases = async () => {
    try {
      const customerInfo = await Purchases.restorePurchases();
      if (customerInfo.entitlements.active['premium']) {
        Alert.alert('Restored!', 'Your premium subscription has been restored.');
        navigation.goBack();
      } else {
        Alert.alert('No Subscription', 'No active subscription found.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to restore purchases.');
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Warm Gradient Background */}
      <LinearGradient
        colors={[
          theme.primary + '18',
          theme.primaryLight + '12',
          '#FFF5F5',
          '#FFFFFF',
        ]}
        locations={[0, 0.25, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

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

      {/* Close Button */}
      <TouchableOpacity 
        style={styles.closeButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={[styles.closeText, { color: theme.text }]}>✕</Text>
      </TouchableOpacity>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View 
          entering={FadeInDown.delay(100).duration(500)}
          style={styles.header}
        >
          <View style={[styles.premiumBadge, { backgroundColor: theme.primary + '15' }]}>
            <Text style={styles.premiumIcon}>✨</Text>
            <Text style={[styles.premiumText, { color: theme.primary }]}>PREMIUM</Text>
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Unlock Full Power</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Get deeper insights and unlimited{'\n'}customization for your relationships
          </Text>
        </Animated.View>

        {/* Features */}
        <Animated.View 
          entering={FadeInDown.delay(200).duration(500)}
          style={styles.featuresContainer}
        >
          {FEATURES.map((feature, index) => (
            <View 
              key={index} 
              style={[styles.featureRow, { backgroundColor: theme.card }]}
            >
              <View style={[styles.featureIcon, { backgroundColor: theme.primary + '12' }]}>
                <Text style={styles.featureEmoji}>{feature.icon}</Text>
              </View>
              <View style={styles.featureText}>
                <Text style={[styles.featureTitle, { color: theme.text }]}>{feature.title}</Text>
                <Text style={[styles.featureDescription, { color: theme.textMuted }]}>{feature.description}</Text>
              </View>
              <Text style={[styles.checkmark, { color: theme.primary }]}>✓</Text>
            </View>
          ))}
        </Animated.View>

        {/* Pricing Options */}
        <Animated.View 
          entering={FadeInDown.delay(300).duration(500)}
          style={styles.pricingContainer}
        >
          {packages.map((pkg) => {
            const isSelected = selectedPackage === pkg.identifier;
            const isYearly = pkg.identifier.toLowerCase().includes('annual') || 
                            pkg.identifier.toLowerCase().includes('yearly');
            
            return (
              <TouchableOpacity
                key={pkg.identifier}
                style={[
                  styles.pricingOption,
                  { 
                    backgroundColor: theme.card,
                    borderColor: isSelected ? theme.primary : theme.divider,
                    borderWidth: isSelected ? 2 : 1.5,
                  }
                ]}
                onPress={() => setSelectedPackage(pkg.identifier)}
                activeOpacity={0.8}
              >
                {isYearly && (
                  <View style={[styles.saveBadge, { backgroundColor: theme.primary }]}>
                    <Text style={styles.saveBadgeText}>BEST VALUE</Text>
                  </View>
                )}
                <View style={styles.pricingContent}>
                  <View style={styles.pricingLeft}>
                    <View style={[
                      styles.radioOuter,
                      { borderColor: isSelected ? theme.primary : theme.divider }
                    ]}>
                      {isSelected && (
                        <View style={[styles.radioInner, { backgroundColor: theme.primary }]} />
                      )}
                    </View>
                    <View>
                      <Text style={[styles.pricingTitle, { color: theme.text }]}>
                        {isYearly ? 'Yearly' : 'Monthly'}
                      </Text>
                      <Text style={[styles.pricingSubtitle, { color: theme.textMuted }]}>
                        {isYearly ? 'Billed annually' : 'Billed monthly'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.pricingRight}>
                    <Text style={[styles.pricingPrice, { color: theme.text }]}>
                      {pkg.product.priceString}
                    </Text>
                    <Text style={[styles.pricingPeriod, { color: theme.textMuted }]}>
                      {isYearly ? '/year' : '/month'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </Animated.View>
      </ScrollView>

      {/* Bottom CTA */}
      <Animated.View 
        entering={FadeInDown.delay(400).duration(500)}
        style={[styles.bottomSection, { backgroundColor: theme.card, borderTopColor: theme.divider }]}
      >
        <TouchableOpacity 
          style={styles.purchaseButton}
          onPress={handlePurchase}
          disabled={purchasing || !selectedPackage}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[theme.primary, theme.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.purchaseGradient, { opacity: purchasing ? 0.7 : 1 }]}
          >
            {purchasing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.purchaseText}>Start Premium</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={restorePurchases} style={styles.restoreButton}>
          <Text style={[styles.restoreText, { color: theme.textMuted }]}>Restore Purchases</Text>
        </TouchableOpacity>
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
  },
  closeButton: {
    position: 'absolute',
    top: 54,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  closeText: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    marginBottom: 16,
  },
  premiumIcon: {
    fontSize: 14,
  },
  premiumText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
  },
  title: {
    fontSize: 30,
    fontFamily: 'Inter_700Bold',
    marginBottom: 10,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 22,
  },
  featuresContainer: {
    gap: 10,
    marginBottom: 28,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
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
  },
  checkmark: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  pricingContainer: {
    gap: 12,
  },
  pricingOption: {
    borderRadius: 16,
    padding: 18,
    position: 'relative',
    overflow: 'hidden',
  },
  saveBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderBottomLeftRadius: 10,
  },
  saveBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  pricingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pricingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  pricingTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  pricingSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  pricingRight: {
    alignItems: 'flex-end',
  },
  pricingPrice: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
  },
  pricingPeriod: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  bottomSection: {
    padding: 20,
    paddingBottom: 36,
    borderTopWidth: 1,
  },
  purchaseButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: '#F43F5E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
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
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  restoreText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
});