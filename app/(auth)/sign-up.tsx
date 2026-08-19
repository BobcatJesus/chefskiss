import { useState } from 'react';

import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';

import { signUp } from '@/features/auth/api';

export default function SignUpScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
      await signUp({ email, password, fullName });
      setSuccessMessage('Account created. If email confirmation is enabled, check your inbox.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to sign up.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Sign up</Text>
      <Text style={styles.subtitle}>Create your account and start ordering or cooking.</Text>
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
      <Link href="/(auth)/sign-in" style={styles.link}>
        Already have an account? Sign in
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24, paddingBottom: 56, gap: 10 },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { marginTop: 8, color: '#4b5563', textAlign: 'center', marginBottom: 8 },
  input: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  error: { color: '#b91c1c', width: '100%', maxWidth: 420 },
  success: { color: '#065f46', width: '100%', maxWidth: 420 },
  button: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#0f766e',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonLabel: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
  link: { marginTop: 16, color: '#0f766e', fontWeight: '600' },
});