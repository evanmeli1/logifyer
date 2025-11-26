import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Dimensions } from 'react-native';
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
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
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
    const translateY = interpolate(progress.value, [0, 1], [0, -30]);
    const translateX = interpolate(progress.value, [0, 1], [0, 15]);
    const scale = interpolate(progress.value, [0, 0.5, 1], [1, 1.1, 1]);
    const opacity = interpolate(progress.value, [0, 0.5, 1], [0.6, 0.8, 0.6]);

    return {
      transform: [
        { translateY },
        { translateX },
        { scale },
      ],
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

export default function SignInScreen() {
  const { signInWithGoogle, signInWithApple } = useAuth();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [loading, setLoading] = useState<'google' | 'apple' | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading('google');
    try {
      await signInWithGoogle();
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(null);
    }
  };

  const handleAppleSignIn = async () => {
    setLoading('apple');
    try {
      await signInWithApple();
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <View style={styles.container}>
      {/* Warm Gradient Background */}
      <LinearGradient
        colors={[
          theme.primary + '15',
          theme.primaryLight + '10',
          '#FFF5F5',
          '#FFFFFF',
        ]}
        locations={[0, 0.3, 0.6, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Floating Animated Shapes */}
      <View style={StyleSheet.absoluteFill}>
        <FloatingShape 
          size={180} 
          initialX={-60} 
          initialY={80} 
          delay={0} 
          duration={4000}
          color={theme.primary + '12'}
        />
        <FloatingShape 
          size={120} 
          initialX={width - 80} 
          initialY={150} 
          delay={500} 
          duration={3500}
          color={theme.primaryLight + '15'}
        />
        <FloatingShape 
          size={90} 
          initialX={40} 
          initialY={height * 0.4} 
          delay={1000} 
          duration={4500}
          color={theme.primary + '10'}
        />
        <FloatingShape 
          size={140} 
          initialX={width - 100} 
          initialY={height * 0.55} 
          delay={1500} 
          duration={3800}
          color={theme.primaryLight + '12'}
        />
        <FloatingShape 
          size={70} 
          initialX={width * 0.3} 
          initialY={height * 0.15} 
          delay={800} 
          duration={4200}
          color={theme.primary + '08'}
        />
      </View>

      {/* Back Button */}
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={[styles.backArrow, { color: theme.text }]}>←</Text>
      </TouchableOpacity>

      {/* Content */}
      <View style={styles.content}>
        <Animated.View 
          entering={FadeInDown.delay(100).duration(500)}
          style={styles.topSection}
        >
          <Text style={[styles.title, { color: theme.text }]}>Welcome</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Sign in to sync your data across{'\n'}devices and unlock premium features
          </Text>
        </Animated.View>

        <Animated.View 
          entering={FadeInDown.delay(250).duration(500)}
          style={styles.buttonSection}
        >
          <TouchableOpacity 
            style={styles.appleButton}
            onPress={handleAppleSignIn}
            disabled={loading !== null}
            activeOpacity={0.8}
          >
            {loading === 'apple' ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.appleIcon}></Text>
                <Text style={styles.appleButtonText}>Continue with Apple</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.googleButton, { borderColor: theme.divider }]}
            onPress={handleGoogleSignIn}
            disabled={loading !== null}
            activeOpacity={0.8}
          >
            {loading === 'google' ? (
              <ActivityIndicator color={theme.text} />
            ) : (
              <>
                <View style={styles.googleIcon}>
                  <Text style={styles.googleG}>G</Text>
                </View>
                <Text style={[styles.googleButtonText, { color: theme.text }]}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Bottom */}
      <Animated.View 
        entering={FadeInDown.delay(400).duration(500)}
        style={styles.bottomSection}
      >
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[theme.primary, theme.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryGradient}
          >
            <Text style={styles.primaryButtonText}>Skip for now</Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={[styles.disclaimer, { color: theme.textMuted }]}>
          By continuing, you agree to our{' '}
          <Text style={{ color: theme.primary }}>Terms</Text>
          {' '}and{' '}
          <Text style={{ color: theme.primary }}>Privacy Policy</Text>
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 54,
    left: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
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
  backArrow: {
    fontSize: 24,
    fontFamily: 'Inter_600SemiBold',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  topSection: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 34,
    fontFamily: 'Inter_700Bold',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonSection: {
    gap: 14,
  },
  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    height: 56,
    borderRadius: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  appleIcon: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  appleButtonText: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    height: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  googleIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleG: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
  },
  googleButtonText: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  primaryButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#F43F5E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryGradient: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
  },
  disclaimer: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
});