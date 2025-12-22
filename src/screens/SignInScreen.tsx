import React, { useState, useEffect, useRef, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Dimensions, Image } from 'react-native';
import Animated, { 
  FadeInDown, 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming,
  withDelay,
  Easing,
  interpolate,
  cancelAnimation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Linking } from 'react-native'; 



type RootStackParamList = {
  SignIn: { isInitialLaunch?: boolean };
  MainApp: undefined;
  Settings: undefined;
};


const { width, height } = Dimensions.get('window');

const FloatingShape = memo(({ 
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

    // Cleanup animation on unmount
    return () => {
      cancelAnimation(progress);
    };
  }, [delay, duration]);

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
});

FloatingShape.displayName = 'FloatingShape';

export default function SignInScreen() {
  const { signInWithGoogle, signInWithApple } = useAuth();
  const navigation =
  useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'SignIn'>>();
  const isInitialLaunch = route.params?.isInitialLaunch;
  const { theme } = useTheme();
  const background = theme.background ?? '#000';
  const [loading, setLoading] = useState<'google' | 'apple' | null>(null);
  const isMountedRef = useRef(true);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const safeNavigateBack = () => {
    if (isMountedRef.current) {
      // Check if we can go back, otherwise navigate to home
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        (navigation as any).navigate('MainApp');
      }
    }
  };

  const handleGoogleSignIn = async () => {
    // Prevent multiple simultaneous calls
    if (isProcessingRef.current) return;
    
    isProcessingRef.current = true;
    setLoading('google');
    
    try {
      await signInWithGoogle();
    } catch (error: any) {
      console.error('Google sign in error:', error);
      
      // Don't show error if user cancelled
      if (isMountedRef.current) {
        if (error.code === 'ERR_REQUEST_CANCELED' || 
            error.message?.includes('cancel') ||
            error.message?.includes('cancelled')) {
          // User cancelled, just clear loading
          console.log('User cancelled Google sign in');
          return; // Don't navigate if cancelled
        }
        // Note: sync errors show their own alert, no need to show another
      }
    } finally {
      isProcessingRef.current = false;
      if (isMountedRef.current) {
        setLoading(null);
        safeNavigateBack();
      }
    }
  };

  const handleAppleSignIn = async () => {
    // Prevent multiple simultaneous calls
    if (isProcessingRef.current) return;
    
    isProcessingRef.current = true;
    setLoading('apple');
    
    try {
      await signInWithApple();
      setTimeout(() => safeNavigateBack(), 1500);
      safeNavigateBack();
    } catch (error: any) {
      console.error('Apple sign in error:', error);
      
      // Don't show error if user cancelled
      if (isMountedRef.current) {
        if (error.code === '1001' || // Apple Sign In cancelled code
            error.code === 'ERR_REQUEST_CANCELED' ||
            error.message?.includes('cancel') ||
            error.message?.includes('cancelled')) {
          // User cancelled, just clear loading
          console.log('User cancelled Apple sign in');
        } else {
          // Actual error
          Alert.alert('Sign In Failed', error.message || 'Failed to sign in with Apple');
        }
      }
    } finally {
      isProcessingRef.current = false;
      if (isMountedRef.current) {
        setLoading(null);
        setTimeout(() => safeNavigateBack(), 1500);
      }
    }
  };

  const handleSkip = () => {
    if (navigation.canGoBack()) {
      // Opened from inside the app → just close
      navigation.goBack();
    } else {
      // App start → enter app
      navigation.replace('MainApp');
    }
  };


  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      {/* Warm Gradient Background */}
      <LinearGradient
        colors={[
          theme.primary + '15',
          theme.primaryLight + '10',
          background,
          background,
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

      {/* Back Button (hide when SignIn is root) */}
      {navigation.canGoBack() && (
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleSkip}
          disabled={loading !== null}
        >
          <Text style={[styles.backArrow, { color: theme.text, opacity: loading !== null ? 0.5 : 1 }]}>←</Text>
        </TouchableOpacity>
      )}


      {/* Content */}
      <View style={styles.content}>
        <Animated.View 
          entering={FadeInDown.delay(100).duration(500)}
          style={styles.topSection}
        >
          {isInitialLaunch && (
            <Image 
              source={require('../../assets/icon1.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
          )}
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
            style={[styles.appleButton, { opacity: loading !== null && loading !== 'apple' ? 0.5 : 1 }]}
            onPress={handleAppleSignIn}
            disabled={loading !== null}
            activeOpacity={0.8}
          >
            {loading === 'apple' ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="logo-apple" size={20} color="#fff" />
                <Text style={styles.appleButtonText}>Continue with Apple</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.googleButton,
              {
                backgroundColor: theme.card,
                borderColor: theme.divider,
                opacity: loading !== null && loading !== 'google' ? 0.5 : 1,
              },
            ]}
            onPress={handleGoogleSignIn}
            disabled={loading !== null}
            activeOpacity={0.8}
          >
            {loading === 'google' ? (
              <ActivityIndicator color={theme.text} />
            ) : (
              <>
                <Image 
                  source={require('../../assets/google-logo.png')} 
                  style={{width: 20, height: 27, marginLeft: 12}} 
                />
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
          style={[styles.primaryButton, { opacity: loading !== null ? 0.5 : 1 }]}
          onPress={handleSkip}
          disabled={loading !== null}
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

        <View style={styles.disclaimerContainer}>
          <Text style={[styles.disclaimer, { color: theme.textMuted }]}>
            By continuing, you agree to our{' '}
          </Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://evanmeli1.github.io/logifyer-legal/terms.html')}>
            <Text style={[styles.disclaimerLink, { color: theme.primary }]}>Terms</Text>
          </TouchableOpacity>
          <Text style={[styles.disclaimer, { color: theme.textMuted }]}> and </Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://evanmeli1.github.io/logifyer-legal/privacy.html')}>
            <Text style={[styles.disclaimerLink, { color: theme.primary }]}>Privacy Policy</Text>
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
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'transparent',
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
    fontFamily: 'Poppins_600SemiBold',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  topSection: {
    alignItems: 'center',
    marginBottom: 48,
    marginTop: -50,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  title: {
  fontSize: 34,
  fontFamily: 'Poppins_700Bold', 
  marginBottom: 12,
  letterSpacing: -0.5,
},
  subtitle: {
  fontSize: 16,
  fontFamily: 'Poppins_400Regular', 
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
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
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
  googleButtonText: {
    fontSize: 17,
    fontFamily: 'Poppins_600SemiBold',
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
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
  disclaimer: {
  fontSize: 13,
  fontFamily: 'Poppins_400Regular', 
  textAlign: 'center',
  lineHeight: 20,
},
disclaimerContainer: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'center',
  alignItems: 'center',
},
disclaimerLink: {
  fontSize: 13,
  fontFamily: 'Poppins_400Regular',
  textDecorationLine: 'underline',
},
});