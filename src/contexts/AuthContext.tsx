import React, { createContext, useContext, useEffect, useState } from 'react';
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
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInWithApple: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed:', _event, session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

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
        throw error;
      }

      console.log('Auth data:', data);

      if (data?.url) {
        console.log('Opening browser to:', data.url);
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        console.log('Browser result:', result);

        if (result.type === 'success') {
          const url = result.url;
          console.log('Success URL:', url);
          
          const params = new URLSearchParams(url.split('#')[1]);
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');

          if (access_token && refresh_token) {
            await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              // Link RevenueCat to this user
              try {
                await Purchases.logIn(user.id);
                console.log('✅ RevenueCat linked to user');
              } catch (rcError) {
                console.log('RevenueCat login error:', rcError);
              }

              const { data: cloudPeople } = await supabase
                .from('people')
                .select('id')
                .eq('user_id', user.id)
                .limit(1);

              if (cloudPeople && cloudPeople.length > 0) {
                console.log('📥 User has cloud data - syncing to local');
                await syncCloudToLocal(user.id);
              } else {
                console.log('📤 First time sign-in - syncing local to cloud');
                await syncLocalToCloud(user.id);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
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
        throw new Error('No identity token received');
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (error) {
        console.error('Supabase Apple error:', error);
        throw error;
      }

      console.log('✅ Apple sign-in successful');

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Link RevenueCat to this user
        try {
          await Purchases.logIn(user.id);
          console.log('✅ RevenueCat linked to user');
        } catch (rcError) {
          console.log('RevenueCat login error:', rcError);
        }

        const { data: cloudPeople } = await supabase
          .from('people')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);

        if (cloudPeople && cloudPeople.length > 0) {
          console.log('📥 Syncing cloud to local');
          await syncCloudToLocal(user.id);
        } else {
          console.log('📤 Syncing local to cloud');
          await syncLocalToCloud(user.id);
        }
      }
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        console.log('User canceled Apple sign-in');
      } else {
        console.error('Apple sign-in error:', error);
        throw error;
      }
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    // Log out of RevenueCat
    try {
      await Purchases.logOut();
      console.log('✅ RevenueCat logged out');
    } catch (rcError) {
      console.log('RevenueCat logout error:', rcError);
    }
    
    clearLocalData();
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signInWithGoogle, signInWithApple, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};