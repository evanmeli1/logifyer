import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, ActivityIndicator } from 'react-native';
import { initDatabase, seedCategories, initSettings } from './src/database/db';import HomeScreen from './src/screens/HomeScreen';
import AddPersonScreen from './src/screens/AddPersonScreen';
import PersonDetailScreen from './src/screens/PersonDetailScreen';
import LogIncidentScreen from './src/screens/LogIncidentScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import CategoryWeightsScreen from './src/screens/CategoryWeightsScreen';
import GlobalSettingsScreen from './src/screens/GlobalSettingsScreen';
import ManageCategoriesScreen from './src/screens/ManageCategoriesScreen';


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

function SettingsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="SettingsMain" 
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
      <Stack.Screen 
        name="CategoryWeights" 
        component={CategoryWeightsScreen}
        options={{ title: 'Category Weights' }}
      />
      <Stack.Screen 
        name="GlobalSettings" 
        component={GlobalSettingsScreen}
        options={{ title: 'Global Settings' }}
      />
      <Stack.Screen 
        name="ManageCategories" 
        component={ManageCategoriesScreen}
        options={{ title: 'Manage Categories' }}
      />
    </Stack.Navigator>
  );
}


export default function App() {
  const [dbInitialized, setDbInitialized] = useState(false);

  useEffect(() => {
    try {
      initDatabase();
      initSettings();
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
        <Tab.Screen 
          name="Settings" 
          component={SettingsStack}
          options={{ headerShown: false }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}