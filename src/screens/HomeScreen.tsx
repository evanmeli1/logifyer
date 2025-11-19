import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function HomeScreen() {  // ← Make sure "export default" is here
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Home Screen - People List</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 18,
  },
});