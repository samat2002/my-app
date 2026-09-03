import prisma from './prisma';
import { uploadImageToSupabase } from './supabase-storage';

export interface SaveImageData {
  user?: string;
  userId?: string;
  image: string; // Original URL or attachment URL
  filename?: string;
  channelId?: string;
  messageId?: string;
  contentType?: string;
  time?: Date | string;
  uploadToStorage?: boolean; // Default true: uploads file to Supabase storage for permanent persistence
}

export interface SaveLogData {
  user?: string;
  userId?: string;
  message: string;
  time?: Date | string;
}

/**
 * Save an image record into Supabase using Prisma and Supabase Storage.
 * If uploadToStorage is true (default), downloads the image file and uploads it
 * to Supabase Storage 'discord-images' bucket so the link never expires!
 */
export async function saveImageRecord(data: SaveImageData) {
  try {
    const timestamp = data.time ? new Date(data.time) : new Date();

    // Check if messageId already exists to avoid duplicates
    if (data.messageId) {
      const existing = await prisma.image.findUnique({
        where: { messageId: data.messageId },
      });
      if (existing) {
        return { created: false, image: existing, message: 'Image already exists' };
      }
    }

    let finalImageUrl = data.image;
    let finalFilename = data.filename ?? 'image';

    // Upload to Supabase Storage bucket unless explicitly disabled
    const shouldUpload = data.uploadToStorage !== false;
    if (shouldUpload && data.image) {
      try {
        const uploadResult = await uploadImageToSupabase(
          data.image,
          data.filename,
          data.contentType
        );
        finalImageUrl = uploadResult.permanentUrl;
        finalFilename = uploadResult.filename;
      } catch (uploadErr: any) {
        console.warn('⚠️ Supabase storage upload failed, saving original URL:', uploadErr.message);
      }
    }

    const created = await prisma.image.create({
      data: {
        user: data.user ?? 'Unknown',
        userId: data.userId ?? null,
        image: finalImageUrl,
        filename: finalFilename,
        channelId: data.channelId ?? null,
        messageId: data.messageId ?? null,
        time: timestamp,
      },
    });

    return { created: true, image: created, message: 'Image saved to Supabase successfully' };
  } catch (error: any) {
    console.error('❌ Error saving image to Prisma/Supabase:', error);
    throw error;
  }
}

/**
 * Batch save multiple images from a channel scan.
 */
export async function batchSaveImages(items: SaveImageData[]) {
  const results = {
    total: items.length,
    saved: 0,
    skipped: 0,
    errors: 0,
  };

  for (const item of items) {
    try {
      const res = await saveImageRecord(item);
      if (res.created) {
        results.saved++;
      } else {
        results.skipped++;
      }
    } catch (err) {
      results.errors++;
    }
  }

  return results;
}

/**
 * Save a log record into Supabase using Prisma.
 */
export async function saveLogRecord(data: SaveLogData) {
  try {
    const timestamp = data.time ? new Date(data.time) : new Date();

    const created = await prisma.log.create({
      data: {
        user: data.user ?? 'Unknown',
        userId: data.userId ?? null,
        message: data.message,
        time: timestamp,
      },
    });

    return { created: true, log: created };
  } catch (error: any) {
    console.error('❌ Error saving log to Prisma/Supabase:', error);
    throw error;
  }
}

/**
 * Get all images with optional pagination.
 */
export async function getImages(options: { limit?: number; offset?: number; channelId?: string } = {}) {
  const { limit = 50, offset = 0, channelId } = options;

  return prisma.image.findMany({
    where: channelId ? { channelId } : undefined,
    orderBy: { time: 'desc' },
    take: limit,
    skip: offset,
  });
}

/**
 * Delete an image record by ID.
 */
export async function deleteImageRecord(id: number) {
  return prisma.image.delete({
    where: { id },
  });
}
