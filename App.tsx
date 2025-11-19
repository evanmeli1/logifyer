import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, ActivityIndicator } from 'react-native';
import { initDatabase, seedCategories } from './src/database/db';
import HomeScreen from './src/screens/HomeScreen';
import AddPersonScreen from './src/screens/AddPersonScreen';
import PersonDetailScreen from './src/screens/PersonDetailScreen';
import LogIncidentScreen from './src/screens/LogIncidentScreen';

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
        options={{ title: 'Add Person' }}
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
        options={{ title: 'Log Incident' }}
      />
    </Stack.Navigator>
  );
}

function SettingsScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Settings</Text>
    </View>
  );
}

export default function App() {
  const [dbInitialized, setDbInitialized] = useState(false);

  useEffect(() => {
    try {
      initDatabase();
      seedCategories();
      console.log('Database ready ✅');
      setDbInitialized(true);
    } catch (error) {
      console.error('Database error:', error);
    }
  }, []);

  if (!dbInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Tab.Navigator>
        <Tab.Screen 
          name="Home" 
          component={HomeStack}
          options={{ headerShown: false }}
        />
        <Tab.Screen 
          name="Log" 
          component={LogStack}
          options={{ headerShown: false }}
        />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}