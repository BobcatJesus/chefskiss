import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/features/auth/hooks';

export default function ChooseProfileScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const roles = Array.isArray(session?.user?.user_metadata?.roles)
    ? session.user.user_metadata.roles
    : session?.user?.user_metadata?.role
      ? [session.user.user_metadata.role]
      : ['customer'];

  const normalizedRoles = Array.from(new Set(roles.filter((value): value is string => typeof value === 'string')));

  function chooseRole(role: 'customer' | 'chef') {
    if (role === 'chef') {
      router.replace('/(cook)/meals');
      return;
    }

    router.replace('/(customer)/discover');
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.panel}>
        <Text style={styles.title}>Choose your profile</Text>
        <Text style={styles.subtitle}>You have more than one profile. Pick the one you want to enter.</Text>

        {normalizedRoles.includes('customer') ? (
          <Pressable onPress={() => chooseRole('customer')} style={styles.optionButton}>
            <Text style={styles.optionButtonText}>Customer profile</Text>
            <Text style={styles.optionButtonSubtext}>Browse cooks and order meals</Text>
          </Pressable>
        ) : null}

        {normalizedRoles.includes('chef') ? (
          <Pressable onPress={() => chooseRole('chef')} style={[styles.optionButton, styles.chefButton]}>
            <Text style={styles.optionButtonText}>Chef profile</Text>
            <Text style={styles.optionButtonSubtext}>Manage your menu and orders</Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f1e8',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  panel: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#fffdf9',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e8dccd',
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#172b2a',
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 20,
    color: '#475569',
    lineHeight: 22,
  },
  optionButton: {
    width: '100%',
    backgroundColor: '#e6f4ef',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#bfded6',
  },
  chefButton: {
    backgroundColor: '#fff4d6',
    borderColor: '#f3d58a',
  },
  optionButtonText: {
    color: '#172b2a',
    fontSize: 20,
    fontWeight: '800',
  },
  optionButtonSubtext: {
    marginTop: 6,
    color: '#475569',
    fontSize: 14,
  },
});
