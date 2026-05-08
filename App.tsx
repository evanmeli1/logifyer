import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { initDatabase, seedCategories, initSettings, initRelationshipTypes, getAllCategories } from './src/database/db';
import HomeScreen from './src/screens/HomeScreen';
import AddPersonScreen from './src/screens/AddPersonScreen';
import PersonDetailScreen from './src/screens/PersonDetailScreen';
import LogIncidentScreen from './src/screens/LogIncidentScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import CategoryWeightsScreen from './src/screens/CategoryWeightsScreen';
import GlobalSettingsScreen from './src/screens/GlobalSettingsScreen';
import ManageCategoriesScreen from './src/screens/ManageCategoriesScreen';
import StatsScreen from './src/screens/StatsScreen';
import SignInScreen from './src/screens/SignInScreen';
import PaywallScreen from './src/screens/PaywallScreen';
import LegalScreen from './src/screens/LegalScreen';
import { AuthProvider } from './src/contexts/AuthContext';
import { initializePurchases } from './src/services/purchases';
import { ThemeProvider, useTheme } from './src/theme';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useAuth } from './src/contexts/AuthContext';
import { Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { Ionicons } from '@expo/vector-icons';

// Keep the splash screen visible while we initialize
SplashScreen.preventAutoHideAsync().catch(() => {});

// Disable console logs in production
if (!__DEV__) {
  console.log = () => {};
  console.debug = () => {};
  console.info = () => {};
  // Keep errors and warnings
}

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="HomeMain" 
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="AddPerson" 
        component={AddPersonScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="PersonDetail" 
        component={PersonDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="LogIncident" 
        component={LogIncidentScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ManageCategories" 
        component={ManageCategoriesScreen}
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <Stack.Screen 
        name="CategoryWeights" 
        component={CategoryWeightsScreen}
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <Stack.Screen 
        name="Paywall" 
        component={PaywallScreen}
        options={{ headerShown: false, presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}

function LogStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="LogMain" 
        component={LogIncidentScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ManageCategories" 
        component={ManageCategoriesScreen}
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <Stack.Screen 
        name="CategoryWeights" 
        component={CategoryWeightsScreen}
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <Stack.Screen 
        name="Paywall" 
        component={PaywallScreen}
        options={{ headerShown: false, presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}

function SettingsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="SettingsMain" 
        component={SettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="SignIn" 
        component={SignInScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="CategoryWeights" 
        component={CategoryWeightsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="GlobalSettings" 
        component={GlobalSettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ManageCategories" 
        component={ManageCategoriesScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Paywall" 
        component={PaywallScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Legal" 
        component={LegalScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

function StatsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="StatsMain" 
        component={StatsScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

function TabNavigator() {
  const { theme } = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: 'Poppins_600SemiBold',
        },
        tabBarStyle: {
          height: 80,
          paddingBottom: 8,
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: theme.divider,
          backgroundColor: theme.card,
        },
      }}
    >
      <Tab.Screen
        name="People"
        component={HomeStack}
        options={{
          headerShown: false,
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Log"
        component={LogStack}
        options={{
          headerShown: false,
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'create' : 'create-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsStack}
        options={{
          headerShown: false,
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'stats-chart' : 'stats-chart-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function AppContent() {
  const { user, loading, guestMode } = useAuth();
  const { theme } = useTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user || guestMode ? (
          <>
            <Stack.Screen name="MainApp" component={TabNavigator} />
            <Stack.Screen
              name="Settings"
              component={SettingsStack}
              options={{ presentation: 'modal' }}
            />
          </>
        ) : (
          <Stack.Screen
            name="SignIn"
            component={SignInScreen}
            initialParams={{ isInitialLaunch: true }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}



export default function App() {
  const [dbInitialized, setDbInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  // Treat font errors as "ready" so we don't block on a bad font bundle
  const fontsReady = fontsLoaded || !!fontError;

  useEffect(() => {
    const initializeApp = async () => {
      try {
        initDatabase();
        initSettings();
        seedCategories();
        initRelationshipTypes();
        // If defaults are missing (e.g. prior seed failure), try once more
        const cats = getAllCategories() as any[];
        if (cats.filter((c: any) => c.is_custom === 0).length === 0) {
          seedCategories();
        }
        console.log('✅ Database initialized');

        // Initialize RevenueCat (non-blocking)
        try {
          await initializePurchases();
          console.log('✅ RevenueCat initialized');
        } catch (error) {
          console.log('⚠️ RevenueCat initialization failed:', error);
        }

        setDbInitialized(true);
      } catch (error) {
        console.error('❌ App initialization error:', error);
        setInitError('Failed to initialize app. Please restart.');
        setDbInitialized(true); // Allow UI to show error
      }
    };

    initializeApp();
  }, []);

  // Hide the splash screen once both DB and fonts are ready
  useEffect(() => {
    if (dbInitialized && fontsReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [dbInitialized, fontsReady]);

  if (!dbInitialized || !fontsReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' }}>
        <ActivityIndicator size="large" color="#F43F5E" />
        <Text style={{ marginTop: 12, fontSize: 15, color: '#6B7280' }}>Loading...</Text>
      </View>
    );
  }

  if (initError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#F9FAFB' }}>
        <Text style={{ fontSize: 40, marginBottom: 16 }}>⚠️</Text>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' }}>
          Initialization Error
        </Text>
        <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center' }}>
          {initError}
        </Text>
      </View>
    );
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}