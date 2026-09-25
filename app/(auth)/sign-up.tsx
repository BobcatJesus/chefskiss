import { useState } from 'react';

import { Link, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';

import { signUp } from '@/features/auth/api';

export default function SignUpScreen() {
  const { role } = useLocalSearchParams<{ role?: string }>();
  const isChef = role === 'chef';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const copy = isChef
    ? {
        title: 'Chef sign up',
        subtitle: 'Turn your kitchen into something people talk about.',
        body: 'Share your food with your neighborhood, build your profile, and start getting booked for meals, prep, and private chef experiences.',
        footer: 'For cooks with something to share and neighbors ready to eat.',
      }
    : {
        title: 'Customer sign up',
        subtitle: 'Good food is closer than you think.',
        body: 'Discover independent cooks, order their next dish, and bring something special home.',
        footer: 'For hungry neighbors and cooks with something to share.',
      };

  async function handleSignUp() {
    if (!email.trim() || !password) {
      setErrorMessage('Email and password are required.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters.');
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      await signUp({ email, password, fullName, role: isChef ? 'chef' : 'customer' });
      setSuccessMessage('Account created with email registration. If email confirmation is enabled, check your inbox.');
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : 'Unable to sign up.';

      if (rawMessage.toLowerCase().includes('already registered')) {
        setErrorMessage('This email is already registered. Please sign in instead.');
        return;
      }

      setErrorMessage(rawMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{copy.title}</Text>
      <Text style={styles.subtitle}>{copy.subtitle}</Text>
      <Text style={styles.bodyText}>Create your account with email and a password.</Text>
      <Text style={styles.footerText}>{copy.footer}</Text>
      <TextInput
        autoCapitalize="words"
        autoComplete="name"
        onChangeText={setFullName}
        placeholder="Full name"
        placeholderTextColor="#6b7280"
        style={styles.input}
        value={fullName}
      />
      <TextInput
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="Email"
        placeholderTextColor="#6b7280"
        style={styles.input}
        value={email}
      />
      <TextInput
        autoCapitalize="none"
        autoComplete="new-password"
        onChangeText={setPassword}
        placeholder="Password (min 8 chars)"
        placeholderTextColor="#6b7280"
        secureTextEntry
        style={styles.input}
        value={password}
      />
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      {successMessage ? <Text style={styles.success}>{successMessage}</Text> : null}
      <Pressable disabled={isSubmitting} onPress={handleSignUp} style={styles.button}>
        <Text style={styles.buttonLabel}>{isSubmitting ? 'Creating account...' : 'Create account'}</Text>
      </Pressable>
      <Link href={{ pathname: '/(auth)/sign-in', params: { role } }} style={styles.link}>
        Already have an account? Sign in
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f1e8' },
  content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24, paddingBottom: 56, gap: 10 },
  title: { fontSize: 28, fontWeight: '700', color: '#172b2a' },
  subtitle: { marginTop: 8, color: '#1f2a2a', textAlign: 'left', marginBottom: 8, fontWeight: '600', width: '100%', maxWidth: 420 },
  bodyText: { color: '#4b5563', lineHeight: 22, width: '100%', maxWidth: 420, marginBottom: 8 },
  footerText: { color: '#475569', lineHeight: 20, width: '100%', maxWidth: 420, marginBottom: 8 },
  input: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#ffffff',
    marginTop: 10,
  },
  error: { color: '#b91c1c', width: '100%', maxWidth: 420, marginTop: 10 },
  success: { color: '#065f46', width: '100%', maxWidth: 420, marginTop: 10 },
  button: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#d97706',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonLabel: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
  link: { marginTop: 16, color: '#0f766e', fontWeight: '600' },
});