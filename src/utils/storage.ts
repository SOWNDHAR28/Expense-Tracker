import AsyncStorage from "@react-native-async-storage/async-storage";

export const storageKeys = {
  auth: "et_auth_v1",
  transactions: "et_transactions_v1",
  theme: "et_theme_v1",
};

export async function readJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`Error reading AsyncStorage key "${key}":`, error);
    return fallback;
  }
}

export async function writeJSON<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Error writing AsyncStorage key "${key}":`, error);
  }
}

export async function removeKey(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.warn(`Error removing AsyncStorage key "${key}":`, error);
  }
}