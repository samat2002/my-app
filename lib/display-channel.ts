export const DISPLAY_CHANNEL_NAME = 'video-display';

export const DISPLAY_EVENTS = {
  DISPLAY_MEDIA: 'DISPLAY_MEDIA',
  CANCEL_DISPLAY: 'CANCEL_DISPLAY',
  MEDIA_FINISHED: 'MEDIA_FINISHED',
  QUEUE_UPDATED: 'QUEUE_UPDATED',
  QUEUE_PLAY_TOGGLE: 'QUEUE_PLAY_TOGGLE',
} as const;

export interface DisplayMediaPayload {
  jobId: number;
  title?: string;
  type: 'video' | 'image';
  mediaUrl: string;
  cutDuration?: number; // duration of cut video in seconds
  displaySeconds: number; // duration in seconds
  durationSeconds: number; // total display seconds
  startedAt: number; // epoch ms
  endsAt: number; // epoch ms
}

export interface CancelDisplayPayload {
  cancelledAt: number;
  jobId?: number;
}
