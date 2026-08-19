type EnvShape = {
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
};

type EnvKey = 'EXPO_PUBLIC_SUPABASE_URL' | 'EXPO_PUBLIC_SUPABASE_ANON_KEY';

function normalizeValue(value: string): string {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

function readEnv(key: EnvKey): string | null {
  const rawValue = process.env[key];
  if (!rawValue) {
    return null;
  }

  const normalized = normalizeValue(rawValue);
  if (!normalized) {
    return null;
  }

  return normalized;
}

export const env: EnvShape = {
  supabaseUrl: readEnv('EXPO_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: readEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
};

function isPlaceholderValue(value: string | null): boolean {
  if (!value) {
    return false;
  }

  const lower = value.toLowerCase();
  return (
    lower.includes('your-project-id') ||
    lower.includes('your-project-ref') ||
    lower.includes('your-real-project-ref') ||
    lower.includes('your-public-anon-key') ||
    lower.includes('your-real-anon-key') ||
    lower.includes('<') ||
    lower.includes('>') ||
    lower.includes('example')
  );
}

function looksLikeSupabaseUrl(value: string | null): boolean {
  if (!value) {
    return false;
  }

  return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(value);
}

export const isSupabaseConfigured =
  Boolean(env.supabaseUrl && env.supabaseAnonKey) &&
  !isPlaceholderValue(env.supabaseUrl) &&
  !isPlaceholderValue(env.supabaseAnonKey) &&
  looksLikeSupabaseUrl(env.supabaseUrl);
