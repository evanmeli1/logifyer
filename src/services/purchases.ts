import Purchases from 'react-native-purchases';

export const initializePurchases = async () => {
  const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_KEY;

  if (!apiKey) {
    console.warn('⚠️ RevenueCat API key is missing — purchases disabled');
    return;
  }

  Purchases.configure({ apiKey });
  console.log('✅ RevenueCat initialized');
};

export const checkSubscription = async (): Promise<boolean> => {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo?.entitlements?.active?.['premium'] !== undefined;
  } catch (error) {
    console.warn('⚠️ checkSubscription failed:', error);
    return false;
  }
};

export const purchasePackage = async (packageToPurchase: any) => {
  try {
    const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
    return customerInfo?.entitlements?.active?.['premium'] !== undefined;
  } catch (error: any) {
    if (error.userCancelled) {
      return false;
    }
    throw error;
  }
};