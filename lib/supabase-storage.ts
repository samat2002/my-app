import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import path from 'path';

// Support separate Discord Supabase project or fallback to main Supabase project
const supabaseUrl =
  process.env.DISCORD_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_DISCORD_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  '';

const supabaseKey =
  process.env.DISCORD_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.DISCORD_SUPABASE_KEY ||
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

let bucketVerified = false;

/**
 * Ensures that the bucket exists in the Discord Supabase project before uploading.
 */
async function ensureBucketExists() {
  if (bucketVerified) return;
  try {
    const { data: buckets, error } = await supabaseStorage.storage.listBuckets();
    if (error) {
      console.warn(`⚠️ Supabase storage listBuckets warning on ${supabaseUrl}: ${error.message}`);
      return;
    }

    const exists = buckets?.some((b) => b.name === BUCKET_NAME);
    if (!exists) {
      console.log(`📦 Bucket '${BUCKET_NAME}' not found in ${supabaseUrl}, creating it...`);
      const { error: createError } = await supabaseStorage.storage.createBucket(BUCKET_NAME, {
        public: true,
      });
      if (createError) {
        console.warn(`⚠️ Could not auto-create bucket: ${createError.message}`);
      } else {
        console.log(`✅ Created public bucket '${BUCKET_NAME}' in Supabase Storage!`);
      }
    }
    bucketVerified = true;
  } catch (err: any) {
    console.warn(`⚠️ Error checking bucket existence: ${err?.message}`);
  }
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
    await ensureBucketExists();

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

    const mimeType =
      contentType ||
      (typeof response.headers['content-type'] === 'string'
        ? response.headers['content-type']
        : 'image/png');

    // 2. Upload file buffer to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseStorage.storage
      .from(BUCKET_NAME)
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error(
        `❌ Supabase storage upload error on project [${supabaseUrl}]: ${uploadError.message}`
      );
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
