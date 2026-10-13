import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Animated, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { useAppDispatch } from '../../redux/hooks';
import { setAuth, setError } from '../../redux/slices/authSlice';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import CustomAlertModal from '../../components/CustomAlertModal';
import AnimatedButton from '../../components/AnimatedButton';
import * as Haptics from 'expo-haptics';

export default function SignupScreen() {
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

  const handleSignup = async () => {
    if (!email.trim() || !password.trim()) return;
    setLocalLoading(true);
    
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: password.trim(),
    });

    if (error) {
      dispatch(setError(error.message));
      triggerShake();
      showAlert("Signup Failed", error.message, "close-circle-outline");
    } else {
      if (data.user) {
        dispatch(setAuth({ user: data.user, session: data.session }));
        if (!data.session) {
           showAlert(
             "Check your Email", 
             "We've sent you a confirmation link. Please verify your email to log in.", 
             "mail-unread-outline", 
             themeColors.income, 
             themeColors.softIncome
           );
        }
      }
    }
    
    setLocalLoading(false);
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
            <View style={[styles.iconContainer, { backgroundColor: themeColors.softTeal }]}>
              <Ionicons name="person-add" size={30} color={themeColors.teal} style={{ marginLeft: 4 }} />
            </View>
            <Text style={[styles.title, { color: themeColors.primary }]}>Create Account</Text>
            <Text style={[styles.subtitle, { color: themeColors.muted }]}>Start tracking your expenses securely</Text>
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
              onPress={handleSignup}
              disabled={loading}
              hapticFeedback="light"
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>Sign Up</Text>
              )}
            </AnimatedButton>
          </Animated.View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: themeColors.text }]}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={[styles.link, { color: themeColors.primary }]}>Log In</Text>
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
