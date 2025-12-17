import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../services/supabase';
import { Session, User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { syncLocalToCloud, syncCloudToLocal, clearLocalData } from '../services/syncService';
import * as AppleAuthentication from 'expo-apple-authentication';
import Purchases from 'react-native-purchases';

WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  retrySyncData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInWithApple: async () => {},
  signOut: async () => {},
  retrySyncData: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncFailed, setSyncFailed] = useState(false);
  const mountedRef = useRef(true);
  const authSubscriptionRef = useRef<any>(null);

  useEffect(() => {
    mountedRef.current = true;
    initializeAuth();

    return () => {
      mountedRef.current = false;
      if (authSubscriptionRef.current) {
        authSubscriptionRef.current.unsubscribe();
      }
    };
  }, []);

  const initializeAuth = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
        throw error;
      }

      if (mountedRef.current) {
        setSession(session);
        setUser(session?.user ?? null);
      }

      // Set up auth state listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (_event, session) => {
          console.log('Auth state changed:', _event, session?.user?.email);
          
          if (!mountedRef.current) return;

          setSession(session);
          setUser(session?.user ?? null);

          // Handle sign-in events
          // Handle sign-in events
          if (_event === 'SIGNED_IN' && session?.user) {
            // Don't await - let it run in background so it doesn't block UI
            handlePostSignIn(session.user).catch((error) => {
              console.error('Post sign-in handling error:', error);
              setSyncFailed(true);
            });
          }
        }
      );

      authSubscriptionRef.current = subscription;
    } catch (error) {
      console.error('Auth initialization error:', error);
      // Don't throw - allow app to continue in signed-out state
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handlePostSignIn = async (user: User) => {
      console.log('🔵 handlePostSignIn started for:', user.email);
    if (!user?.id) {
      throw new Error('Invalid user object');
    }

    // Link RevenueCat to this user
    try {
      const currentUserId = await Purchases.getAppUserID();
      
      // Only log in if not already logged in with this user
      if (currentUserId !== user.id) {
        await Purchases.logIn(user.id);
        console.log('✅ RevenueCat linked to user:', user.id);
      } else {
        console.log('✅ RevenueCat already linked to user');
      }
    } catch (rcError: any) {
      console.error('RevenueCat login error:', rcError);
      // Show warning but don't block sign-in
      Alert.alert(
        'Subscription Warning',
        'Could not sync your subscription status. Premium features may not work correctly. Please restart the app.',
        [{ text: 'OK' }]
      );
    }

     console.log('🔵 About to start syncUserData');

    // Sync data with retry logic
    try {
      await syncUserData(user.id);
      setSyncFailed(false);
    } catch (syncError) {
      console.error('Data sync error:', syncError);
      setSyncFailed(true);
      
      Alert.alert(
        'Sync Warning',
        'Your data could not be synced. You can retry from Settings.',
        [{ text: 'OK' }]
      );
    }
  };

  const syncUserData = async (userId: string, retries = 2): Promise<void> => {
  console.log('🟡 syncUserData called with userId:', userId);
  let lastError: any = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    console.log('🟡 Sync attempt:', attempt);
    try {
      if (attempt > 0) {
        console.log(`Sync attempt ${attempt + 1}/${retries + 1}`);
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
      
      console.log('🟡 Checking for cloud data...');

      // Direct query with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        const { data: cloudPeople, error: cloudError } = await supabase
          .from('people')
          .select('id')
          .eq('user_id', userId)
          .limit(1)
          .abortSignal(controller.signal);

        clearTimeout(timeoutId);
        console.log('🟡 Query result:', { cloudPeople, cloudError });

        if (cloudError) {
          throw cloudError;
        }

        if (cloudPeople && cloudPeople.length > 0) {
          console.log('📥 User has cloud data - syncing to local');
          await syncCloudToLocal(userId);
        } else {
          console.log('📤 First time sign-in - syncing local to cloud');
          await syncLocalToCloud(userId);
        }

        console.log('✅ Data sync completed successfully');
        return;
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
          throw new Error('Query timed out after 15 seconds');
        }
        throw err;
      }
    } catch (error: any) {
      lastError = error;
      console.error(`Sync attempt ${attempt + 1} failed:`, error);
      
      if (error?.message?.includes('unauthorized') || 
          error?.code === '401' ||
          error?.code === 'PGRST301') {
        console.error('Auth error during sync - not retrying');
        throw error;
      }
    }
  }

  throw lastError || new Error('Data sync failed after retries');
};

  const retrySyncData = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'No user signed in');
      return;
    }

    try {
      await syncUserData(user.id);
      setSyncFailed(false);
      Alert.alert('Success', 'Your data has been synced successfully!');
    } catch (error) {
      console.error('Manual sync retry failed:', error);
      Alert.alert(
        'Sync Failed',
        'Could not sync your data. Please try again later or contact support if the problem persists.'
      );
    }
  };

  const signInWithGoogle = async () => {
    try {
      console.log('Starting Google sign-in...');
      
      const redirectUrl = 'logifyer://';
      console.log('Redirect URL:', redirectUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: false,
        },
      });

      if (error) {
        console.error('Supabase auth error:', error);
        
        // Provide specific error messages
        if (error.message?.includes('network')) {
          throw new Error('Network error. Please check your connection.');
        }
        throw error;
      }

      console.log('Auth data received');

      if (!data?.url) {
        throw new Error('No authentication URL received from server');
      }

      console.log('Opening browser...');
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
      console.log('Browser result type:', result.type);

      if (result.type === 'success') {
        const url = result.url;
        console.log('Success! Processing authentication...');
        
        // Safely parse URL
        try {
          const hashPart = url.split('#')[1];
          if (!hashPart) {
            throw new Error('Invalid authentication response format');
          }

          const params = new URLSearchParams(hashPart);
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');

          if (!access_token || !refresh_token) {
            throw new Error('Missing authentication tokens');
          }

          // Set session with validation
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (sessionError) {
            throw sessionError;
          }

          if (!sessionData?.session) {
            throw new Error('Failed to establish session');
          }

          console.log('✅ Session established successfully');
          
          // Get user and handle post-sign-in
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          
          if (userError) {
            throw userError;
          }

          if (!user) {
            throw new Error('Failed to get user information');
          }

        } catch (parseError) {
          console.error('URL parsing error:', parseError);
          throw new Error('Failed to process authentication response');
        }
      } else if (result.type === 'cancel') {
        console.log('User canceled sign-in');
        // Don't throw error for user cancellation
        return;
      } else if (result.type === 'dismiss') {
        console.log('Browser dismissed');
        return;
      } else if (result.type === 'locked') {
        throw new Error('Another authentication is in progress');
      } else {
        throw new Error(`Unexpected browser result: ${result.type}`);
      }
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      
      // User-friendly error messages
      const errorMessage = error.message || 'An unknown error occurred';
      
      if (errorMessage.includes('network') || errorMessage.includes('Network')) {
        Alert.alert(
          'Connection Error',
          'Could not connect to sign-in service. Please check your internet connection.'
        );
      } else if (errorMessage.includes('canceled') || errorMessage.includes('cancelled')) {
        // Silent - user chose to cancel
      } else {
        Alert.alert(
          'Sign In Failed',
          'Could not complete Google sign-in. Please try again or contact support if the problem persists.'
        );
      }
      
      throw error;
    }
  };

  const signInWithApple = async () => {
    try {
      console.log('Starting Apple native sign-in...');
      
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      console.log('Apple credential received');

      if (!credential.identityToken) {
        throw new Error('No identity token received from Apple');
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (error) {
        console.error('Supabase Apple error:', error);
        
        if (error.message?.includes('network')) {
          throw new Error('Network error. Please check your connection.');
        }
        throw error;
      }

      if (!data?.session) {
        throw new Error('Failed to establish session with Apple sign-in');
      }

      console.log('✅ Apple sign-in successful');

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error('Failed to get user information');
      }

    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED' || error.code === 'ERR_CANCELED') {
        console.log('User canceled Apple sign-in');
        // Don't show error for user cancellation
        return;
      }
      
      console.error('Apple sign-in error:', error);
      
      const errorMessage = error.message || 'An unknown error occurred';
      
      if (errorMessage.includes('network') || errorMessage.includes('Network')) {
        Alert.alert(
          'Connection Error',
          'Could not connect to sign-in service. Please check your internet connection.'
        );
      } else {
        Alert.alert(
          'Sign In Failed',
          'Could not complete Apple sign-in. Please try again or contact support if the problem persists.'
        );
      }
      
      throw error;
    }
  };

  const signOut = async () => {
    try {
      // Check if user is already signed out
      if (!session && !user) {
        console.log('Already signed out');
        return;
      }

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Supabase sign-out error:', error);
        throw error;
      }
      
      // Log out of RevenueCat
      try {
        await Purchases.logOut();
        console.log('✅ RevenueCat logged out');
      } catch (rcError) {
        console.error('RevenueCat logout error:', rcError);
        // Don't block sign-out if RevenueCat fails
      }
      
      // Clear local data
      try {
        await clearLocalData();
        console.log('✅ Local data cleared');
      } catch (clearError) {
        console.error('Error clearing local data:', clearError);
        // Don't block sign-out if clear fails
      }

      // Reset sync state
      setSyncFailed(false);

      console.log('✅ Sign out completed');
    } catch (error) {
      console.error('Sign out error:', error);
      
      Alert.alert(
        'Sign Out Error',
        'There was a problem signing out. Please try again.',
        [{ text: 'OK' }]
      );
      
      throw error;
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        session, 
        user, 
        loading, 
        signInWithGoogle, 
        signInWithApple, 
        signOut,
        retrySyncData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};