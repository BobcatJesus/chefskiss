import { useEffect, useState } from 'react';

import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { sendPasswordReset, signIn } from '@/features/auth/api';

const FOOD_IMAGE =
  'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=1200&q=80';

export default function SignInScreen() {
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role?: string }>();
  const [selectedRole, setSelectedRole] = useState<'customer' | 'chef'>('customer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  useEffect(() => {
    if (role === 'chef') {
      setSelectedRole('chef');
      return;
    }

    setSelectedRole('customer');
  }, [role]);

  const selectRole = (role: 'customer' | 'chef') => {
    setSelectedRole(role);
    setErrorMessage(null);
  };

  async function handleSignIn() {
    if (!email.trim() || !password) {
      setErrorMessage('Email and password are required.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await signIn({ email, password, role: selectedRole });
      router.replace(selectedRole === 'chef' ? '/(cook)/meals' : '/(customer)/discover');
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : 'Unable to sign in.';

      if (rawMessage.toLowerCase().includes('email not confirmed')) {
        setErrorMessage('Email not confirmed. Check your inbox and confirm it, or disable email confirmation in Supabase for local testing.');
        return;
      }

      if (rawMessage.toLowerCase().includes('invalid login credentials')) {
        setErrorMessage('Invalid login credentials. Please check the email and password and try again.');
        return;
      }

      setErrorMessage(rawMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePasswordReset() {
    if (!email.trim()) {
      setErrorMessage('Enter your email first so we know where to send the reset link.');
      return;
    }

    setErrorMessage(null);
    setResetMessage(null);
    setIsResetting(true);

    try {
      await sendPasswordReset(email);
      setResetMessage('Reset request sent. Check your inbox and spam folder for a link from Supabase. If nothing arrives, verify the email and ask the project owner to check Supabase SMTP settings.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to send a password reset email.');
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} bounces={false}>
      <View style={styles.page}>
        <View style={styles.roleSwitchWrapper}>
          <View style={styles.roleSwitch}>
            <Pressable
              accessibilityRole="button"
              onPress={() => selectRole('customer')}
              style={[styles.roleButton, selectedRole === 'customer' && styles.roleButtonActive]}
            >
              <Text style={[styles.roleButtonText, selectedRole === 'customer' && styles.roleButtonTextActive]}>Customers</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => selectRole('chef')}
              style={[styles.roleButton, selectedRole === 'chef' && styles.roleButtonActive]}
            >
              <Text style={[styles.roleButtonText, selectedRole === 'chef' && styles.roleButtonTextActive]}>Chefs</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.heroCard}>
          <Image source={{ uri: FOOD_IMAGE }} style={styles.heroImage} resizeMode="cover" />
          <View style={styles.heroOverlay} />

          <View style={styles.heroContent}>
            <View style={styles.textBlock}>
              <Text style={styles.kicker}>too many cooks</Text>
            </View>
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Welcome back</Text>
          <Text style={styles.formSubtitle}>Use your email and password to continue</Text>

          <Text style={styles.fieldLabel}>Email</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#9ca3af"
            style={styles.input}
            value={email}
          />

          <Text style={styles.fieldLabel}>Password</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="password"
            onChangeText={setPassword}
            placeholder="Your password"
            placeholderTextColor="#9ca3af"
            secureTextEntry
            style={styles.input}
            value={password}
          />

          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

          <Pressable disabled={isSubmitting} onPress={() => void handleSignIn()} style={styles.button}>
            <Text style={styles.buttonLabel}>{isSubmitting ? 'Signing in...' : 'Sign in'}</Text>
          </Pressable>

          <Pressable disabled={isResetting} onPress={() => void handlePasswordReset()} style={styles.resetButton}>
            <Text style={styles.resetButtonLabel}>{isResetting ? 'Sending reset link...' : 'Forgot password?'}</Text>
          </Pressable>

          {resetMessage ? <Text style={styles.success}>{resetMessage}</Text> : null}

          <Text style={styles.accountPrompt}>New here?</Text>
          <Link href={{ pathname: '/(auth)/sign-up', params: { role: selectedRole } }} style={styles.link}>
            Create an account
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#efe7df',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  page: {
    width: '100%',
    maxWidth: 1150,
    alignSelf: 'center',
    gap: 16,
  },
  roleSwitchWrapper: {
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: -2,
  },
  roleSwitch: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 999,
    padding: 6,
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  roleButton: {
    minWidth: 144,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleButtonActive: {
    backgroundColor: '#1a2d2a',
  },
  roleButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1f2a2a',
  },
  roleButtonTextActive: {
    color: '#fff9f3',
  },
  heroCard: {
    position: 'relative',
    width: '100%',
    minHeight: 500,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#d7c7b4',
    borderWidth: 1,
    borderColor: 'rgba(19, 25, 21, 0.15)',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(18, 16, 14, 0.26)',
  },
  heroContent: {
    position: 'relative',
    zIndex: 1,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 26,
    minHeight: 500,
  },
  textBlock: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: {
    color: '#f5d49b',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 0,
  },
  formCard: {
    backgroundColor: '#fffdf9',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e8dccd',
  },
  formTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#172b2a',
  },
  formSubtitle: {
    marginTop: 6,
    marginBottom: 18,
    color: '#64716e',
    fontSize: 15,
  },
  fieldLabel: {
    marginTop: 12,
    marginBottom: 6,
    color: '#344542',
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#d8cec1',
    borderRadius: 9,
    backgroundColor: '#ffffff',
    paddingHorizontal: 13,
    paddingVertical: 13,
    fontSize: 16,
    color: '#172b2a',
  },
  error: {
    marginTop: 12,
    color: '#b42318',
    width: '100%',
    fontSize: 13,
  },
  button: {
    width: '100%',
    backgroundColor: '#d97706',
    borderRadius: 9,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 22,
  },
  buttonLabel: {
    color: '#fffaf2',
    fontWeight: '800',
    fontSize: 16,
  },
  resetButton: {
    alignSelf: 'center',
    marginTop: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  resetButtonLabel: {
    color: '#0f766e',
    fontWeight: '800',
    fontSize: 13,
  },
  success: {
    marginTop: 10,
    color: '#166534',
    width: '100%',
    fontSize: 13,
    textAlign: 'center',
  },
  accountPrompt: {
    marginTop: 20,
    color: '#7b8782',
    textAlign: 'center',
    fontSize: 13,
  },
  link: {
    marginTop: 6,
    color: '#0f766e',
    fontWeight: '800',
    textAlign: 'center',
  },
});