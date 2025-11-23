import Purchases from 'react-native-purchases';

export const initializePurchases = async () => {
  const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_KEY!;
  
  Purchases.configure({ apiKey });
  console.log('✅ RevenueCat initialized');
};

export const checkSubscription = async () => {
  const customerInfo = await Purchases.getCustomerInfo();
  return customerInfo.entitlements.active['premium'] !== undefined;
};

export const purchasePackage = async (packageToPurchase: any) => {
  try {
    const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
    return customerInfo.entitlements.active['premium'] !== undefined;
  } catch (error: any) {
    if (error.userCancelled) {
      return false;
    }
    throw error;
  }
};