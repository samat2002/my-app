import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  '';

export const supabaseStorage = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

export const BUCKET_NAME = 'discord-images';

export interface UploadResult {
  permanentUrl: string;
  storagePath: string;
  filename: string;
}

/**
 * Downloads an image from a URL (e.g. Discord CDN) and uploads it to Supabase Storage.
 * Returns the permanent public URL.
 */
export async function uploadImageToSupabase(
  imageUrl: string,
  originalFilename?: string,
  contentType?: string
): Promise<UploadResult> {
  try {
    // 1. Download image bytes from Discord
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 15000,
    });

    const fileBuffer = Buffer.from(response.data);

    // Determine clean filename and extension
    const ext = originalFilename
      ? path.extname(originalFilename) || '.png'
      : '.png';
    const base = originalFilename
      ? path.basename(originalFilename, ext).replace(/[^a-zA-Z0-9_-]/g, '_')
      : 'image';
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const finalFilename = `${base}-${uniqueSuffix}${ext}`;
    const storagePath = `${finalFilename}`;

    const mimeType = contentType || (typeof response.headers['content-type'] === 'string' ? response.headers['content-type'] : 'image/png');

    // 2. Upload file buffer to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseStorage.storage
      .from(BUCKET_NAME)
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error('❌ Supabase storage upload error:', uploadError.message);
      // Fallback: If upload to storage fails for any reason, return the original URL
      return {
        permanentUrl: imageUrl,
        storagePath: '',
        filename: originalFilename || 'image',
      };
    }

    // 3. Get permanent public URL
    const { data: publicUrlData } = supabaseStorage.storage
      .from(BUCKET_NAME)
      .getPublicUrl(uploadData.path);

    console.log(`✅ Uploaded to Supabase Storage: ${publicUrlData.publicUrl}`);

    return {
      permanentUrl: publicUrlData.publicUrl,
      storagePath: uploadData.path,
      filename: originalFilename || finalFilename,
    };
  } catch (error: any) {
    console.error('❌ Failed to download/upload image to Supabase:', error?.message || error);
    // Fallback: Return original URL so data is not lost
    return {
      permanentUrl: imageUrl,
      storagePath: '',
      filename: originalFilename || 'image',
    };
  }
}
