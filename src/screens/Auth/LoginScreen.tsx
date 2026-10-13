import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Animated, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { useAppDispatch } from '../../redux/hooks';
import { setAuth, setError } from '../../redux/slices/authSlice';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import CustomAlertModal from '../../components/CustomAlertModal';
import AnimatedButton from '../../components/AnimatedButton';
import * as Haptics from 'expo-haptics';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLocalLoading] = useState(false);
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { themeColors, isDark } = useTheme();
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const triggerShake = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    icon: string;
    iconColor?: string;
    iconBg?: string;
  }>({
    visible: false,
    title: "",
    message: "",
    icon: "alert-circle-outline",
  });

  const showAlert = (title: string, message: string, icon = "alert-circle-outline", iconColor = themeColors.expense, iconBg = themeColors.softExpense) => {
    setAlertConfig({ visible: true, title, message, icon, iconColor, iconBg });
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return;
    setLocalLoading(true);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim(),
    });

    if (error) {
      dispatch(setError(error.message));
      triggerShake();
      showAlert("Login Failed", error.message, "close-circle-outline");
    } else {
      dispatch(setAuth({ user: data.user, session: data.session }));
    }
    
    setLocalLoading(false);
  };

  const handleGoogleLogin = async () => {
    try {
      setLocalLoading(true);
      
      // Create redirect URI for Expo Go / native app
      const redirectUrl = AuthSession.makeRedirectUri();
      console.log("Generated Redirect URL:", redirectUrl);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true, // Crucial for React Native!
        },
      });
      
      if (error) throw error;
      
      if (data?.url) {
        // Open the Google login page securely in the in-app browser
        const res = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        
        if (res.type === 'success' && res.url) {
          // Parse the URL to get the Supabase session tokens
          const urlObj = new URL(res.url.replace('#', '?'));
          const access_token = urlObj.searchParams.get('access_token');
          const refresh_token = urlObj.searchParams.get('refresh_token');
          
          if (access_token && refresh_token) {
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token,
              refresh_token
            });
            if (sessionError) throw sessionError;
            
            if (sessionData.session) {
              dispatch(setAuth({ user: sessionData.user, session: sessionData.session }));
            }
          }
        }
      }
    } catch (err: any) {
      showAlert("Google Login Failed", err.message || "Something went wrong with Google Login", "close-circle-outline");
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: themeColors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: themeColors.softPrimary }]}>
              <Ionicons name="wallet" size={32} color={themeColors.primary} />
            </View>
            <Text style={[styles.title, { color: themeColors.primary }]}>Welcome Back</Text>
            <Text style={[styles.subtitle, { color: themeColors.muted }]}>Log in to sync your expenses</Text>
          </View>

          <Animated.View style={[styles.card, { backgroundColor: themeColors.surface, borderColor: themeColors.border, transform: [{ translateX: shakeAnim }] }]}>
            <TextInput
              style={[styles.input, { backgroundColor: themeColors.card, borderColor: themeColors.border, color: themeColors.text }]}
              placeholder="Email"
              placeholderTextColor={themeColors.muted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            
            <View style={[styles.passwordContainer, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
              <TextInput
                style={[styles.passwordInput, { color: themeColors.text }]}
                placeholder="Password"
                placeholderTextColor={themeColors.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity 
                style={styles.eyeIcon} 
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowPassword(!showPassword);
                }}
              >
                <Ionicons 
                  name={showPassword ? "eye-off" : "eye"} 
                  size={22} 
                  color={themeColors.muted} 
                />
              </TouchableOpacity>
            </View>

            <AnimatedButton 
              style={[styles.button, { backgroundColor: themeColors.primary }]} 
              onPress={handleLogin}
              disabled={loading}
              hapticFeedback="light"
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>Log In</Text>
              )}
            </AnimatedButton>
          </Animated.View>

          <View style={styles.dividerContainer}>
            <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
            <Text style={[styles.dividerText, { color: themeColors.muted }]}>OR</Text>
            <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
          </View>

          <AnimatedButton 
            style={[styles.googleButton, { backgroundColor: themeColors.card, borderColor: themeColors.border }]} 
            onPress={handleGoogleLogin}
            disabled={loading}
            hapticFeedback="light"
          >
            <Ionicons name="logo-google" size={20} color={themeColors.text} />
            <Text style={[styles.googleButtonText, { color: themeColors.text }]}>Continue with Google</Text>
          </AnimatedButton>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: themeColors.text }]}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup' as never)}>
              <Text style={[styles.link, { color: themeColors.primary }]}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>


      <CustomAlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        icon={alertConfig.icon as any}
        iconColor={alertConfig.iconColor || themeColors.primary}
        iconBg={alertConfig.iconBg || themeColors.softPurple}
        confirmText="OK"
        confirmColor={alertConfig.iconColor || themeColors.primary}
        onConfirm={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
        onCancel={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  card: {
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  input: {
    height: 56,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    height: '100%',
  },
  eyeIcon: {
    padding: 16,
  },
  button: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 17,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 32,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: 16,
    fontWeight: '600',
    fontSize: 14,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  googleButtonText: {
    fontWeight: '700',
    fontSize: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    fontSize: 15,
    fontWeight: '500',
  },
  link: {
    fontWeight: '800',
    fontSize: 15,
  }
});
