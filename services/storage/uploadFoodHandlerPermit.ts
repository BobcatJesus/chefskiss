import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type UploadFoodHandlerPermitInput = {
  userId: string;
  uri: string;
  name: string;
  mimeType?: string | null;
  webFile?: Blob | null;
};

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-');
}

export async function uploadFoodHandlerPermit(input: UploadFoodHandlerPermitInput): Promise<string> {
  if (!isSupabaseConfigured) {
    throw new Error('Missing Supabase configuration.');
  }

  const safeFileName = sanitizeFileName(input.name || 'permit');
  const filePath = `${input.userId}/food-handler/${Date.now()}-${safeFileName}`;

  if (input.webFile) {
    const { error: uploadError } = await supabase.storage
      .from('cook-docs')
      .upload(filePath, input.webFile, {
        contentType: input.mimeType || undefined,
        upsert: true,
      });

    if (uploadError) {
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
      throw new Error(uploadError.message);
    }
  }

  const { data } = supabase.storage.from('cook-docs').getPublicUrl(filePath);
  if (!data?.publicUrl) {
    throw new Error('Unable to resolve public URL for uploaded permit.');
  }

  return data.publicUrl;
}
