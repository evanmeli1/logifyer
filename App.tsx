import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, ActivityIndicator } from 'react-native';
import { initDatabase, seedCategories } from './src/database/db';

const Tab = createBottomTabNavigator();

function HomeScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Home</Text>
    </View>
  );
}

function LogScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Log</Text>
    </View>
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
    const setupDatabase = async () => {
      try {
        await initDatabase();
        await seedCategories();
        console.log('Database ready ✅');
        setDbInitialized(true);
      } catch (error) {
        console.error('Database error:', error);
      }
    };
    setupDatabase();
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
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Log" component={LogScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
