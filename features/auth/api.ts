import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type SignInInput = {
  email: string;
  password: string;
  role?: 'customer' | 'chef';
};

type SignUpInput = {
  email: string;
  password: string;
  fullName?: string;
  role?: 'customer' | 'chef';
};

export async function signIn({ email, password, role }: SignInInput): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('Missing Supabase configuration. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!role) {
    return;
  }

  const { data: currentUserData, error: userFetchError } = await supabase.auth.getUser();

  if (userFetchError) {
    throw new Error(userFetchError.message);
  }

  const currentMetadata = (currentUserData.user?.user_metadata ?? {}) as Record<string, unknown>;
  const currentRoles = Array.isArray(currentMetadata.roles) ? currentMetadata.roles : [];
  const nextRoles = Array.from(
    new Set([
      ...(typeof currentMetadata.role === 'string' && currentMetadata.role ? [currentMetadata.role] : []),
      ...currentRoles,
      role,
    ].filter((value): value is string => typeof value === 'string' && value.length > 0))
  );

  const { error: updateError } = await supabase.auth.updateUser({
    data: {
      ...currentMetadata,
      role,
      roles: nextRoles,
    },
  });

  if (updateError) {
    throw new Error(updateError.message);
  }
}

export async function sendPasswordReset(email: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('Missing Supabase configuration. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }

  const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined;
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo });

  if (error) {
    throw new Error(error.message);
  }
}

export async function updatePassword(password: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('Missing Supabase configuration. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    throw new Error(error.message);
  }
}

export async function signUp({ email, password, fullName, role }: SignUpInput): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('Missing Supabase configuration. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }

  const selectedRole = role ?? 'customer';

  const { error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: {
        full_name: fullName?.trim() || null,
        role: selectedRole,
        roles: [selectedRole],
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function signOut(): Promise<void> {
  if (!isSupabaseConfigured) {
    return;
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}
