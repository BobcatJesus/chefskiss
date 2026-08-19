import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type UploadMealPhotoInput = {
  userId: string;
  uri: string;
  name: string;
  mimeType?: string | null;
  webFile?: Blob | null;
};

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-');
}

export async function uploadMealPhoto(input: UploadMealPhotoInput): Promise<string> {
  if (!isSupabaseConfigured) {
    throw new Error('Missing Supabase configuration.');
  }

  const safeFileName = sanitizeFileName(input.name || 'meal-photo');
  const filePath = `${input.userId}/meal-photos/${Date.now()}-${safeFileName}`;

  if (input.webFile) {
    const { error: uploadError } = await supabase.storage
      .from('cook-docs')
      .upload(filePath, input.webFile, {
        contentType: input.mimeType || undefined,
        upsert: true,
      });

    if (uploadError) {
      if (uploadError.message.toLowerCase().includes('row-level security')) {
        throw new Error('Photo upload blocked by storage policy. Apply the latest Supabase migration and try again.');
      }
      throw new Error(uploadError.message);
    }
  } else {
    const response = await fetch(input.uri);
    const buffer = await response.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from('cook-docs')
      .upload(filePath, buffer, {
        contentType: input.mimeType || undefined,
        upsert: true,
      });

    if (uploadError) {
      if (uploadError.message.toLowerCase().includes('row-level security')) {
        throw new Error('Photo upload blocked by storage policy. Apply the latest Supabase migration and try again.');
      }
      throw new Error(uploadError.message);
    }
  }

  const { data } = supabase.storage.from('cook-docs').getPublicUrl(filePath);
  if (!data?.publicUrl) {
    throw new Error('Unable to resolve public URL for uploaded meal photo.');
  }

  return data.publicUrl;
}
