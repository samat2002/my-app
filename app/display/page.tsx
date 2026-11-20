"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import axios from 'axios';
import {
  DISPLAY_CHANNEL_NAME,
  DISPLAY_EVENTS,
  type DisplayMediaPayload,
} from '@/lib/display-channel';

export default function DisplayScreen() {
  const [currentMedia, setCurrentMedia] = useState<DisplayMediaPayload | null>(null);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const channelRef = useRef<any>(null);

  // ─── Play Media with Real-Time Timer & Seamless Loop ────────────────────────
  const playMedia = useCallback((payload: DisplayMediaPayload) => {
    // Clear previous timers
    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

    setCurrentMedia(payload);
    setProgressPercent(0);

    const durSec = payload.durationSeconds || payload.displaySeconds || 30;
    const totalMs = durSec * 1000;
    const startTime = Date.now();
    const endTime = startTime + totalMs;

    // Smooth real-time border progress bar
    progressIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTime;
      const pct = Math.min(100, Math.max(0, (elapsed / totalMs) * 100));
      setProgressPercent(pct);

      if (now >= endTime) {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      }
    }, 100);

    // When timer expires, mark current job COMPLETED and check for next queued media or return to pure black
    timerRef.current = setTimeout(async () => {
      try {
        const res = await axios.post('/api/media-jobs/public/finish', { jobId: payload.jobId });
        if (res.data?.success && res.data.nextJob) {
          const next = res.data.nextJob;
          const nextSec = next.displaySeconds || (next.displayMinutes ? next.displayMinutes : 30);
          const nextPayload: DisplayMediaPayload = {
            jobId: next.id,
            title: next.title,
            type: next.type,
            mediaUrl: next.mediaUrl,
            cutDuration: next.cutDuration,
            displaySeconds: nextSec,
            durationSeconds: nextSec,
            startedAt: Date.now(),
            endsAt: Date.now() + nextSec * 1000,
          };

          // Broadcast next media playing so admin dashboard updates immediately
          if (channelRef.current) {
            channelRef.current.send({
              type: 'broadcast',
              event: DISPLAY_EVENTS.DISPLAY_MEDIA,
              payload: nextPayload,
            });
          }

          playMedia(nextPayload);
          return;
        } else {
          // Broadcast that display is now finished and screen is idle
          if (channelRef.current) {
            channelRef.current.send({
              type: 'broadcast',
              event: DISPLAY_EVENTS.MEDIA_FINISHED,
              payload: { finishedJobId: payload.jobId },
            });
          }
        }
      } catch (e) {
        console.error('Error finishing media & fetching next:', e);
      }

      // No next media: return to pure black screen
      clearDisplay();
    }, totalMs);
  }, []);

  // ─── Clear Display (Pure Black Screen) ──────────────────────────────────────
  const clearDisplay = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    setCurrentMedia(null);
    setProgressPercent(0);
  }, []);

  // ─── Connect to Supabase Realtime WebSocket ─────────────────────────────────
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );

    const channel = supabase.channel(DISPLAY_CHANNEL_NAME, {
      config: {
        broadcast: { self: true },
      },
    });

    channel
      .on('broadcast', { event: DISPLAY_EVENTS.DISPLAY_MEDIA }, ({ payload }) => {
        if (payload && payload.mediaUrl) {
          playMedia(payload as DisplayMediaPayload);
        }
      })
      .on('broadcast', { event: DISPLAY_EVENTS.CANCEL_DISPLAY }, () => {
        clearDisplay();
      })
      .on('broadcast', { event: DISPLAY_EVENTS.QUEUE_PLAY_TOGGLE }, ({ payload }) => {
        if (payload?.enabled && !currentMedia) {
          // If queue play turned ON while screen is idle, check for next onQueue media to play
          axios
            .get('/api/media-jobs/public/next')
            .then((res) => {
              if (res.data?.success && res.data.data) {
                const next = res.data.data;
                const nextSec = next.displaySeconds || (next.displayMinutes ? next.displayMinutes : 30);
                playMedia({
                  jobId: next.id,
                  title: next.title,
                  type: next.type,
                  mediaUrl: next.mediaUrl,
                  cutDuration: next.cutDuration,
                  displaySeconds: nextSec,
                  durationSeconds: nextSec,
                  startedAt: Date.now(),
                  endsAt: Date.now() + nextSec * 1000,
                });
              }
            })
            .catch(() => {});
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channelRef.current = channel;
        }
      });

    // Check if there is already a currently playing job on screen
    axios
      .get('/api/media-jobs/public/current')
      .then((res) => {
        if (res.data?.success && res.data.data) {
          const current = res.data.data;
          const remSec = current.remainingSeconds || current.displaySeconds || 30;
          if (remSec > 0) {
            playMedia({
              jobId: current.id,
              title: current.title,
              type: current.type,
              mediaUrl: current.mediaUrl,
              cutDuration: current.cutDuration,
              displaySeconds: current.displaySeconds || 30,
              durationSeconds: remSec,
              startedAt: current.startedAt || Date.now(),
              endsAt: Date.now() + remSec * 1000,
            });
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load current display job:', err);
      });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      supabase.removeChannel(channel);
    };
  }, [playMedia, clearDisplay]);

  // Ensure video element plays as soon as loaded
  useEffect(() => {
    if (videoRef.current && currentMedia?.type === 'video') {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  }, [currentMedia]);

  // ─── RENDER: PURE BLACK SCREEN WHEN IDLE ───────────────────────────────────
  if (!currentMedia) {
    return <div className="fixed inset-0 w-screen h-screen bg-black cursor-none select-none" />;
  }

  return (
    <div className="fixed inset-0 w-screen h-screen bg-black flex items-center justify-center overflow-hidden select-none cursor-none">
      {/* Sleek Progress Bar Around Screen Borders */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-white/10 z-50">
        <div
          className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 transition-all duration-100 ease-linear shadow-[0_0_12px_rgba(59,130,246,0.8)]"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/10 z-50">
        <div
          className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 transition-all duration-100 ease-linear shadow-[0_0_12px_rgba(59,130,246,0.8)]"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Media Playback Container */}
      <div className="relative w-full h-full flex items-center justify-center p-2 sm:p-4">
        {currentMedia.type === 'video' ? (
          <video
            ref={videoRef}
            key={currentMedia.mediaUrl}
            src={currentMedia.mediaUrl}
            autoPlay
            loop
            muted
            playsInline
            onCanPlay={(e) => e.currentTarget.play().catch(() => {})}
            className="w-full h-full object-contain"
          />
        ) : (
          <img
            key={currentMedia.mediaUrl}
            src={currentMedia.mediaUrl}
            alt="Display"
            className="w-full h-full object-contain animate-fade-in"
          />
        )}
      </div>
    </div>
  );
}
