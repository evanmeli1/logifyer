import Purchases from 'react-native-purchases';

export const checkPremium = async (): Promise<boolean> => {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo?.entitlements?.active?.['premium'] !== undefined;
  } catch (error) {
    return false;
  }
};