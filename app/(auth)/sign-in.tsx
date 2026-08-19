import { useState } from 'react';

import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';

import { signIn } from '@/features/auth/api';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSignIn() {
    if (!email.trim() || !password) {
      setErrorMessage('Email and password are required.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await signIn({ email, password });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to sign in.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Sign in</Text>
      <Text style={styles.subtitle}>Sign in with your Chefskiss account.</Text>
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
        autoComplete="password"
        onChangeText={setPassword}
        placeholder="Password"
        placeholderTextColor="#6b7280"
        secureTextEntry
        style={styles.input}
        value={password}
      />
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      <Pressable disabled={isSubmitting} onPress={handleSignIn} style={styles.button}>
        <Text style={styles.buttonLabel}>{isSubmitting ? 'Signing in...' : 'Sign in'}</Text>
      </Pressable>
      <Link href="/(auth)/sign-up" style={styles.link}>
        Create an account
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24, paddingBottom: 56, gap: 10 },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { marginTop: 8, color: '#4b5563', marginBottom: 8 },
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