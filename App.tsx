import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, ActivityIndicator } from 'react-native';
import { initDatabase, seedCategories, initSettings } from './src/database/db';
import HomeScreen from './src/screens/HomeScreen';
import AddPersonScreen from './src/screens/AddPersonScreen';
import PersonDetailScreen from './src/screens/PersonDetailScreen';
import LogIncidentScreen from './src/screens/LogIncidentScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import CategoryWeightsScreen from './src/screens/CategoryWeightsScreen';
import GlobalSettingsScreen from './src/screens/GlobalSettingsScreen';
import ManageCategoriesScreen from './src/screens/ManageCategoriesScreen';
import StatsScreen from './src/screens/StatsScreen';
import { supabase } from './src/services/supabase';
import { AuthProvider } from './src/contexts/AuthContext';
import SignInScreen from './src/screens/SignInScreen';
import PaywallScreen from './src/screens/PaywallScreen';
import { initializePurchases } from './src/services/purchases';
import { ThemeProvider, useTheme } from './src/theme';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import LegalScreen from './src/screens/LegalScreen';

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
        options={{ title: 'Person Details' }}
      />
      <Stack.Screen 
        name="LogIncident" 
        component={LogIncidentScreen}
        options={{ title: 'Log Incident' }}
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
          fontFamily: 'Inter_600SemiBold',
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
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
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
  
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    const testSupabase = async () => {
      try {
        initDatabase();
        initSettings();
        seedCategories();
        
        try {
          await initializePurchases();
        } catch (error) {
          console.log('⚠️ RevenueCat failed:', error);
        }
        
        console.log('Database ready ✅');
        
        const { data, error } = await supabase.from('profiles').select('count');
        if (error) {
          console.log('⚠️ Supabase connection issue:', error.message);
        } else {
          console.log('✅ Supabase connected!');
        }
        
        setDbInitialized(true);
      } catch (error) {
        console.error('Database error:', error);
        setDbInitialized(true);
      }
    };
    
    testSupabase();
  }, []);

  if (!dbInitialized || !fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text>Loading...</Text>
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