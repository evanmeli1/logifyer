import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import Purchases, { PurchasesPackage } from 'react-native-purchases';

export default function PaywallScreen({ navigation }: any) {
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    try {
      const offerings = await Purchases.getOfferings();
      if (offerings.current?.availablePackages) {
        setPackages(offerings.current.availablePackages);
      }
    } catch (error) {
      console.error('Error loading offerings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (pkg: PurchasesPackage) => {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      if (customerInfo.entitlements.active['premium']) {
        Alert.alert('Success!', 'Welcome to Logifyer Premium!');
        navigation.goBack();
      }
    } catch (error: any) {
      if (!error.userCancelled) {
        Alert.alert('Error', 'Purchase failed. Please try again.');
      }
    }
  };

  const restorePurchases = async () => {
    try {
      const customerInfo = await Purchases.restorePurchases();
      if (customerInfo.entitlements.active['premium']) {
        Alert.alert('Restored!', 'Your premium subscription has been restored.');
        navigation.goBack();
      } else {
        Alert.alert('No Subscription', 'No active subscription found.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to restore purchases.');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upgrade to Premium</Text>
      <Text style={styles.subtitle}>Unlock AI insights and unlimited custom categories</Text>

      {packages.map((pkg) => (
        <TouchableOpacity
          key={pkg.identifier}
          style={styles.packageButton}
          onPress={() => handlePurchase(pkg)}
        >
          <Text style={styles.packageTitle}>{pkg.product.title}</Text>
          <Text style={styles.packagePrice}>{pkg.product.priceString}</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity onPress={restorePurchases}>
        <Text style={styles.restoreText}>Restore Purchases</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#F5F7FA' },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 17, color: '#6B7280', textAlign: 'center', marginBottom: 32 },
  packageButton: { backgroundColor: '#6366F1', padding: 20, borderRadius: 12, marginBottom: 16 },
  packageTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
  packagePrice: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginTop: 4 },
  restoreText: { color: '#6366F1', textAlign: 'center', marginTop: 16, fontSize: 16 },
});