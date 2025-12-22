import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
import { initDatabase, seedCategories, initSettings, initRelationshipTypes } from './src/database/db';
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
import { initStreakTracking } from './src/services/streakService';
import { useAuth } from './src/contexts/AuthContext';
import { Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';

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
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 24 }}>{focused ? '👥' : '👤'}</Text>
          ),
        }}
      />
      <Tab.Screen 
        name="Log" 
        component={LogStack}
        options={{ 
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 24 }}>{focused ? '✏️' : '📝'}</Text>
          ),
        }}
      />
      <Tab.Screen 
        name="Stats" 
        component={StatsStack}
        options={{ 
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 24 }}>{focused ? '📊' : '📈'}</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={user ? 'MainApp' : 'SignIn'}
      >
        <Stack.Screen 
          name="SignIn" 
          component={SignInScreen}
          initialParams={{ isInitialLaunch: !user }}
        />
        <Stack.Screen name="MainApp" component={TabNavigator} />

        <Stack.Screen
          name="Settings"
          component={SettingsStack}
          options={{ presentation: 'modal' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}



export default function App() {
  const [dbInitialized, setDbInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize database
        initDatabase();
        initSettings();
        seedCategories();
        initRelationshipTypes();
        console.log('Calling initStreakTracking...');
        initStreakTracking();
        console.log('initStreakTracking completed');        console.log('✅ Database initialized');
        
        // Initialize RevenueCat (non-blocking)
        try {
          await initializePurchases();
          console.log('✅ RevenueCat initialized');
        } catch (error) {
          console.log('⚠️ RevenueCat initialization failed:', error);
          // Don't block app launch if RevenueCat fails
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

  if (!dbInitialized || !fontsLoaded) {
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