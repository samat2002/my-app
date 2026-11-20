export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseStorage } from '@/lib/supabase-storage';

const DISPLAY_BUCKET = 'display-media';
let bucketReady = false;

async function ensureDisplayBucket() {
  if (bucketReady) return;
  try {
    const { data: buckets } = await supabaseStorage.storage.listBuckets();
    const exists = buckets?.some((b) => b.name === DISPLAY_BUCKET);
    if (!exists) {
      await supabaseStorage.storage.createBucket(DISPLAY_BUCKET, { public: true });
    }
    bucketReady = true;
  } catch (err) {
    console.warn('Could not verify/create display-media bucket:', err);
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDisplayBucket();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = file.name.split('.').pop() || 'dat';
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const storagePath = `uploads/${filename}`;

    const { error: uploadError } = await supabaseStorage.storage
      .from(DISPLAY_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: true,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: publicUrlData } = supabaseStorage.storage
      .from(DISPLAY_BUCKET)
      .getPublicUrl(storagePath);

    return NextResponse.json({
      success: true,
      url: publicUrlData.publicUrl,
      filename,
      size: file.size,
      type: file.type,
    });
  } catch (error: any) {
    console.error('POST /api/media-jobs/upload error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}
