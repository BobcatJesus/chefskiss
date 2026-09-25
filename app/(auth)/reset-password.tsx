import { useState } from 'react';

import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';

import { updatePassword } from '@/features/auth/api';
import { useAuth } from '@/features/auth/hooks';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { session, isLoading } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleUpdatePassword() {
    if (!session) {
      setErrorMessage('This page must be opened from the password reset email. Request a new link from the sign-in screen.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSaving(true);

    try {
      await updatePassword(password);
      setSuccessMessage('Password updated. You can return to sign in.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update your password.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.kicker}>Too Many Cooks</Text>
      <Text style={styles.title}>Set a new password</Text>
      <Text style={styles.subtitle}>
        {isLoading
          ? 'Checking your password reset link...'
          : session
            ? 'Choose a new password for your account.'
            : 'Open this page from the password reset email to continue.'}
      </Text>

      {session ? (
        <>
          <TextInput
            autoCapitalize="none"
            autoComplete="new-password"
            onChangeText={setPassword}
            placeholder="New password"
            placeholderTextColor="#6b7280"
            secureTextEntry
            style={styles.input}
            value={password}
          />
          <TextInput
            autoCapitalize="none"
            autoComplete="new-password"
            onChangeText={setConfirmPassword}
            placeholder="Confirm new password"
            placeholderTextColor="#6b7280"
            secureTextEntry
            style={styles.input}
            value={confirmPassword}
          />
        </>
      ) : null}

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      {successMessage ? <Text style={styles.success}>{successMessage}</Text> : null}

      {session ? (
        <Pressable disabled={isSaving} onPress={() => void handleUpdatePassword()} style={styles.button}>
          <Text style={styles.buttonLabel}>{isSaving ? 'Updating...' : 'Update password'}</Text>
        </Pressable>
      ) : (
        <Pressable onPress={() => router.replace('/(auth)/sign-in')} style={styles.button}>
          <Text style={styles.buttonLabel}>Return to sign in</Text>
        </Pressable>
      )}

      {successMessage ? (
        <Pressable onPress={() => router.replace('/(auth)/sign-in')} style={styles.linkButton}>
          <Text style={styles.linkLabel}>Return to sign in</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f1e8' },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24, maxWidth: 520, width: '100%', alignSelf: 'center' },
  kicker: { color: '#c2410c', fontSize: 13, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase' },
  title: { marginTop: 8, color: '#172b2a', fontSize: 30, fontWeight: '800' },
  subtitle: { marginTop: 8, marginBottom: 18, color: '#475569', fontSize: 15 },
  input: { width: '100%', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 16, backgroundColor: '#ffffff', marginTop: 12 },
  error: { color: '#b91c1c', marginTop: 12 },
  success: { color: '#065f46', marginTop: 12 },
  button: { width: '100%', backgroundColor: '#d97706', borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 18 },
  buttonLabel: { color: '#ffffff', fontWeight: '800', fontSize: 16 },
  linkButton: { alignSelf: 'center', marginTop: 16, padding: 6 },
  linkLabel: { color: '#0f766e', fontWeight: '800' },
});
