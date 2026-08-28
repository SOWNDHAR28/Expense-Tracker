import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { useAppDispatch } from '../../redux/hooks';
import { setAuth, setError, setLoading } from '../../redux/slices/authSlice';
import { colors } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLocalLoading] = useState(false);
  const navigation = useNavigation();
  const dispatch = useAppDispatch();

  const handleLogin = async () => {
    if (!email || !password) return;
    setLocalLoading(true);
    dispatch(setLoading(true));
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      dispatch(setError(error.message));
      alert(error.message);
    } else {
      dispatch(setAuth({ user: data.user, session: data.session }));
    }
    
    setLocalLoading(false);
    dispatch(setLoading(false));
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
      alert(err.message || "Something went wrong with Google Login");
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={[styles.title]}>Welcome Back</Text>
        <Text style={[styles.subtitle]}>Log in to sync your expenses</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.muted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Password"
            placeholderTextColor={colors.muted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity 
            style={styles.eyeIcon} 
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons 
              name={showPassword ? "eye-off" : "eye"} 
              size={24} 
              color={colors.muted} 
            />
          </TouchableOpacity>
        </View>
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.card} />
          ) : (
            <Text style={styles.buttonText}>Log In</Text>
          )}
        </TouchableOpacity>

        <View style={styles.dividerContainer}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.divider} />
        </View>

        <TouchableOpacity 
          style={styles.googleButton} 
          onPress={handleGoogleLogin}
          disabled={loading}
        >
          <Ionicons name="logo-google" size={20} color={colors.text} />
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Signup' as never)}>
            <Text style={styles.link}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: 24, // spacing.xl
    justifyContent: 'center',
  },
  title: {
    color: colors.primary,
    fontSize: 28, // textStyles.h1
    fontWeight: 'bold',
    marginBottom: 8, // spacing.xs
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16, // textStyles.body
    marginBottom: 40, // spacing.xxl
  },
  input: {
    backgroundColor: colors.card,
    padding: 16, // spacing.m
    borderRadius: 8, // spacing.s
    marginBottom: 16, // spacing.m
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    color: colors.text,
  },
  eyeIcon: {
    padding: 16,
  },
  button: {
    backgroundColor: colors.primary,
    padding: 16, // spacing.m
    borderRadius: 8, // spacing.s
    alignItems: 'center',
    marginTop: 8, // spacing.s
  },
  buttonText: {
    color: colors.card,
    fontWeight: 'bold',
    fontSize: 16,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.muted,
    paddingHorizontal: 16,
    fontWeight: '600',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  googleButtonText: {
    color: colors.text,
    fontWeight: 'bold',
    fontSize: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24, // spacing.xl
  },
  footerText: {
    fontSize: 16,
    color: colors.text,
  },
  link: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 16,
  }
});
