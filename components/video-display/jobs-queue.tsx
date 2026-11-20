"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Table,
  Button,
  Tag,
  Space,
  Select,
  Popconfirm,
  Modal,
  Tooltip,
  Badge,
  Tabs,
  Segmented,
  Progress,
  Switch,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  PlayCircleOutlined,
  StopOutlined,
  ReloadOutlined,
  VideoCameraOutlined,
  PictureOutlined,
  DeleteOutlined,
  EyeOutlined,
  DesktopOutlined,
  ClockCircleOutlined,
  HistoryOutlined,
  ThunderboltOutlined,
  StepForwardOutlined,
  RollbackOutlined,
  PlusCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import axios from 'axios';
import { createBrowserClient } from '@supabase/ssr';
import {
  DISPLAY_CHANNEL_NAME,
  DISPLAY_EVENTS,
  type DisplayMediaPayload,
} from '@/lib/display-channel';

export interface MediaJobRow {
  id: number;
  title: string | null;
  type: 'video' | 'image';
  mediaUrl: string;
  thumbnailUrl: string | null;
  cutDuration: number | null;
  displaySeconds?: number;
  displayMinutes?: number;
  status: 'PENDING' | 'onQueue' | 'ON_QUEUE' | 'APPROVED' | 'PLAYING' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';
  submittedBy: string | null;
  approvedBy: string | null;
  playOrder?: number;
  createdAt: string;
  updatedAt: string;
}

export default function JobsQueue() {
  const [jobs, setJobs] = useState<MediaJobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [isQueuePlayOn, setIsQueuePlayOn] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<MediaJobRow | null>(null);
  const [activeMainTab, setActiveMainTab] = useState<'current' | 'queue' | 'post'>('queue');
  const [queueFilter, setQueueFilter] = useState<'ALL' | 'PENDING' | 'ON_QUEUE'>('ALL');
  const [postFilter, setPostFilter] = useState<'ALL' | 'COMPLETED' | 'OTHER'>('ALL');

  // Live timer for currently playing job
  const [liveSecondsRemaining, setLiveSecondsRemaining] = useState<number>(0);
  const [liveTotalSeconds, setLiveTotalSeconds] = useState<number>(30);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Persistent Realtime channel ref for zero-latency instant broadcast
  const channelRef = useRef<any>(null);

  // ─── Fetch Jobs & Settings ──────────────────────────────────────────────────
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const [jobsRes, settingsRes] = await Promise.all([
        axios.get('/api/media-jobs'),
        axios.get('/api/media-jobs/public/settings').catch(() => null),
      ]);

      if (jobsRes.data?.success && Array.isArray(jobsRes.data.data)) {
        setJobs(jobsRes.data.data);
      }
      if (settingsRes?.data?.success) {
        setIsQueuePlayOn(!!settingsRes.data.queuePlayEnabled);
      }
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Failed to load media jobs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // ─── Categories ─────────────────────────────────────────────────────────────
  const isOnQueue = (status: string) =>
    status === 'onQueue' || status === 'ON_QUEUE' || status === 'APPROVED';

  const currentJob = jobs.find((j) => j.status === 'PLAYING') || null;

  const queueJobs = jobs
    .filter((j) => j.status === 'PENDING' || isOnQueue(j.status))
    .sort((a, b) => {
      // onQueue jobs first (waiting to play), then by playOrder asc, then createdAt asc
      if (isOnQueue(a.status) && !isOnQueue(b.status)) return -1;
      if (!isOnQueue(a.status) && isOnQueue(b.status)) return 1;
      if (isOnQueue(a.status) && isOnQueue(b.status)) {
        const orderDiff = (a.playOrder || 0) - (b.playOrder || 0);
        if (orderDiff !== 0) return orderDiff;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const postJobs = jobs
    .filter((j) => j.status === 'COMPLETED' || j.status === 'REJECTED' || j.status === 'CANCELLED')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  // ─── Live Progress Ticker for Current Job ───────────────────────────────────
  useEffect(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    if (currentJob) {
      const totalSec =
        currentJob.displaySeconds ??
        (currentJob.cutDuration ?? (currentJob.displayMinutes ?? 30));
      setLiveTotalSeconds(totalSec);

      const startedAt = new Date(currentJob.updatedAt).getTime();
      const calcRemaining = () => {
        const elapsed = (Date.now() - startedAt) / 1000;
        const rem = Math.max(0, Math.ceil(totalSec - elapsed));
        setLiveSecondsRemaining(rem);
      };

      calcRemaining();
      timerIntervalRef.current = setInterval(calcRemaining, 500);
    } else {
      setLiveSecondsRemaining(0);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [currentJob]);

  // ─── Supabase Realtime Connection ───────────────────────────────────────────
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );

    const channel = supabase.channel(DISPLAY_CHANNEL_NAME);
    channel
      .on('broadcast', { event: DISPLAY_EVENTS.DISPLAY_MEDIA }, () => {
        fetchJobs();
      })
      .on('broadcast', { event: DISPLAY_EVENTS.CANCEL_DISPLAY }, () => {
        fetchJobs();
      })
      .on('broadcast', { event: DISPLAY_EVENTS.MEDIA_FINISHED }, () => {
        fetchJobs();
      })
      .on('broadcast', { event: DISPLAY_EVENTS.QUEUE_PLAY_TOGGLE }, ({ payload }) => {
        if (payload?.enabled !== undefined) {
          setIsQueuePlayOn(payload.enabled);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channelRef.current = channel;
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchJobs]);

  // ─── Update Duration for a Job ──────────────────────────────────────────────
  const handleDurationChange = async (jobId: number, seconds: number) => {
    try {
      await axios.patch('/api/media-jobs', { id: jobId, displaySeconds: seconds });
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, displaySeconds: seconds, displayMinutes: seconds } : j))
      );
      message.success(`Display duration updated to ${seconds}s`);
    } catch (err: any) {
      message.error('Failed to update duration');
    }
  };

  // ─── Start Playing a Job (Internal Helper) ──────────────────────────────────
  const startPlayingJob = async (job: MediaJobRow) => {
    const sec = job.displaySeconds ?? (job.cutDuration ?? (job.displayMinutes ?? 30));
    const startedAt = Date.now();
    const payload: DisplayMediaPayload = {
      jobId: job.id,
      title: job.title || undefined,
      type: job.type,
      mediaUrl: job.mediaUrl,
      cutDuration: job.cutDuration || undefined,
      displaySeconds: sec,
      durationSeconds: sec,
      startedAt,
      endsAt: startedAt + sec * 1000,
    };

    // 1. Instant Realtime broadcast (0ms latency)
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: DISPLAY_EVENTS.DISPLAY_MEDIA,
        payload,
      });
    }

    // 2. Server API fallback broadcast
    axios
      .post('/api/media-jobs/broadcast', {
        action: DISPLAY_EVENTS.DISPLAY_MEDIA,
        payload,
      })
      .catch(() => { });

    // 3. Mark in DB as PLAYING (PATCH auto-completes any previous PLAYING job)
    await axios.patch('/api/media-jobs', {
      id: job.id,
      status: 'PLAYING',
      approvedBy: 'Admin',
    });

    fetchJobs();
  };

  // ─── Approve Job -> Status becomes onQueue (DOES NOT auto-play) ─────────────
  const handleApprove = async (job: MediaJobRow) => {
    try {
      await axios.patch('/api/media-jobs', {
        id: job.id,
        status: 'onQueue',
        approvedBy: 'Admin',
      });
      message.success(`Job #${job.id} approved and added to queue with status "onQueue"! ⏳`);
      fetchJobs();
    } catch (err: any) {
      console.error('Approve error:', err);
      message.error(err.response?.data?.error || 'Approval failed');
    }
  };

  // ─── Toggle Queue Play ON / OFF ─────────────────────────────────────────────
  const handleToggleQueuePlay = async (checked: boolean) => {
    setIsQueuePlayOn(checked);
    try {
      await axios.post('/api/media-jobs/public/settings', { queuePlayEnabled: checked });

      // Broadcast toggle change to all connected clients & display screens
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: DISPLAY_EVENTS.QUEUE_PLAY_TOGGLE,
          payload: { enabled: checked },
        });
      }

      if (checked) {
        message.success('Queue Play enabled! Jobs in queue will play automatically.');
        // If screen is currently idle, immediately start playing the first onQueue job!
        if (!currentJob) {
          const firstQueueJob = queueJobs.find((j) => isOnQueue(j.status));
          if (firstQueueJob) {
            await startPlayingJob(firstQueueJob);
            message.success(`Started playing #${firstQueueJob.id} from queue! 📺`);
          }
        }
      } else {
        message.info('Queue Play paused/disabled. Screen will not auto-play queue jobs.');
      }
    } catch (err: any) {
      message.error('Failed to update Queue Play setting');
    }
  };

  // ─── Play Now (Instant override / play) ─────────────────────────────────────
  const handlePlayNow = async (job: MediaJobRow) => {
    try {
      await startPlayingJob(job);
      const sec = job.displaySeconds ?? (job.cutDuration ?? (job.displayMinutes ?? 30));
      message.success(`Playing #${job.id} live now (${sec}s)! 📺`);
      setActiveMainTab('current');
    } catch (err: any) {
      console.error('Play now error:', err);
      message.error(err.response?.data?.error || 'Failed to play job');
    }
  };

  // ─── Stop / Cancel Current Display ──────────────────────────────────────────
  const handleStopCurrentDisplay = async () => {
    setCancelling(true);
    try {
      // 1. Instant broadcast cancel
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: DISPLAY_EVENTS.CANCEL_DISPLAY,
          payload: { cancelledAt: Date.now() },
        });
      }

      axios
        .post('/api/media-jobs/broadcast', {
          action: DISPLAY_EVENTS.CANCEL_DISPLAY,
          payload: { cancelledAt: Date.now() },
        })
        .catch(() => { });

      // 2. Mark current job as COMPLETED (moved to post jobs)
      if (currentJob) {
        await axios.patch('/api/media-jobs', {
          id: currentJob.id,
          status: 'COMPLETED',
        });
      }

      message.success('Live display stopped! Screen returned to pure black.');
      fetchJobs();
    } catch (err: any) {
      message.error('Failed to stop display');
    } finally {
      setCancelling(false);
    }
  };

  // ─── Skip to Next Queued Job ────────────────────────────────────────────────
  const handleSkipToNext = async () => {
    const nextOnQueue = queueJobs.find((j) => isOnQueue(j.status));
    if (!nextOnQueue) {
      message.info('No onQueue job to play next. Stopping current display.');
      await handleStopCurrentDisplay();
      return;
    }

    try {
      // Complete current job
      if (currentJob) {
        await axios.patch('/api/media-jobs', {
          id: currentJob.id,
          status: 'COMPLETED',
        });
      }
      // Start next onQueue job
      await startPlayingJob(nextOnQueue);
      message.success(`Skipped! Now playing next job #${nextOnQueue.id} live. ⏭️`);
    } catch (err: any) {
      message.error('Failed to skip to next job');
    }
  };

  // ─── Replay Job (From Post Jobs or Current) ──────────────────────────────────
  const handleReplay = async (job: MediaJobRow) => {
    try {
      await startPlayingJob(job);
      const sec = job.displaySeconds ?? (job.cutDuration ?? (job.displayMinutes ?? 30));
      message.success(`Replaying "${job.title || `Job #${job.id}`}" live (${sec}s)! 🔄`);
      setActiveMainTab('current');
    } catch (err: any) {
      message.error('Failed to replay media');
    }
  };

  // ─── Add back to Queue (From Post Jobs) ──────────────────────────────────────
  const handleReQueue = async (job: MediaJobRow) => {
    try {
      await axios.patch('/api/media-jobs', {
        id: job.id,
        status: 'onQueue',
      });
      message.success(`Job #${job.id} added back to onQueue! ⏳`);
      fetchJobs();
    } catch (err: any) {
      message.error('Failed to re-queue job');
    }
  };

  // ─── Reject Job ─────────────────────────────────────────────────────────────
  const handleReject = async (jobId: number) => {
    try {
      await axios.patch('/api/media-jobs', { id: jobId, status: 'REJECTED' });
      message.info('Job marked as rejected');
      fetchJobs();
    } catch (err: any) {
      message.error('Failed to reject job');
    }
  };

  // ─── Return to Pending ──────────────────────────────────────────────────────
  const handleReturnToPending = async (jobId: number) => {
    try {
      await axios.patch('/api/media-jobs', { id: jobId, status: 'PENDING' });
      message.info('Job returned to pending');
      fetchJobs();
    } catch (err: any) {
      message.error('Failed to update job status');
    }
  };

  // ─── Delete Job ─────────────────────────────────────────────────────────────
  const handleDelete = async (jobId: number) => {
    try {
      await axios.delete('/api/media-jobs', { data: { id: jobId } });
      message.success('Job deleted');
      fetchJobs();
    } catch (err: any) {
      message.error('Failed to delete job');
    }
  };

  // ─── Duration Select Helper Component ───────────────────────────────────────
  const renderDurationSelect = (sec: number | undefined, record: MediaJobRow) => {
    const cut = record.cutDuration ? Number(record.cutDuration) : null;
    const standardOptions = [
      { label: '10 Seconds', value: 10 },
      { label: '15 Seconds', value: 15 },
      { label: '30 Seconds', value: 30 },
      { label: '45 Seconds', value: 45 },
      { label: '60 Seconds', value: 60 },
      { label: '90 Seconds', value: 90 },
      { label: '120 Seconds', value: 120 },
    ];

    // cutDuration as first option
    const options = cut
      ? [{ label: `Cut (${cut}s)`, value: cut }, ...standardOptions.filter((opt) => opt.value !== cut)]
      : standardOptions;

    // Default to cutDuration if present and sec is unset, or current sec, or 30
    const currentSec = sec ?? (cut ?? (record.displayMinutes ? record.displayMinutes : 30));

    return (
      <Select
        size="small"
        value={currentSec}
        onChange={(val) => handleDurationChange(record.id, val)}
        options={options}
        className="w-28"
      />
    );
  };

  // ─── Filtered Data ──────────────────────────────────────────────────────────
  const filteredQueueJobs = queueJobs.filter((j) => {
    if (queueFilter === 'ALL') return true;
    if (queueFilter === 'PENDING') return j.status === 'PENDING';
    return isOnQueue(j.status);
  });

  const filteredPostJobs = postJobs.filter((j) => {
    if (postFilter === 'ALL') return true;
    if (postFilter === 'COMPLETED') return j.status === 'COMPLETED';
    return j.status === 'REJECTED' || j.status === 'CANCELLED';
  });

  const pendingCount = queueJobs.filter((j) => j.status === 'PENDING').length;
  const onQueueCount = queueJobs.filter((j) => isOnQueue(j.status)).length;
  const completedCount = postJobs.filter((j) => j.status === 'COMPLETED').length;

  // ─── Queue Table Columns ────────────────────────────────────────────────────
  const queueColumns: ColumnsType<MediaJobRow> = [
    {
      title: 'Queue State',
      dataIndex: 'status',
      width: 140,
      render: (status: string) => {
        if (isOnQueue(status)) {
          return (
            <Tag color="blue" icon={<ClockCircleOutlined />} className="font-semibold">
              onQueue
            </Tag>
          );
        }
        return (
          <Tag color="gold" icon={<ClockCircleOutlined />}>
            Waiting Approval
          </Tag>
        );
      },
    },
    {
      title: 'Type',
      dataIndex: 'type',
      width: 100,
      render: (type: string, record: MediaJobRow) => (
        <Space size="small">
          {type === 'video' ? (
            <Tag color="blue" icon={<VideoCameraOutlined />}>
              Video {record.cutDuration ? `(${record.cutDuration}s)` : ''}
            </Tag>
          ) : (
            <Tag color="purple" icon={<PictureOutlined />}>
              Image
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Title / Preview',
      dataIndex: 'title',
      render: (title: string | null, record: MediaJobRow) => (
        <div className="flex items-center gap-3">
          <div
            onClick={() => setPreviewMedia(record)}
            className="w-11 h-11 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center cursor-pointer hover:border-blue-400 shrink-0"
          >
            {record.type === 'video' ? (
              <video src={record.mediaUrl} className="w-full h-full object-cover pointer-events-none" />
            ) : (
              <img src={record.mediaUrl} alt="Preview" className="w-full h-full object-cover" />
            )}
          </div>
          <div className="min-w-0">
            <span className="font-semibold text-gray-800 text-sm block truncate">
              {title || `Submission #${record.id}`}
            </span>
            <span className="text-gray-400 text-xs">
              {dayjs(record.createdAt).format('MMM D, HH:mm')} • by {record.submittedBy || 'Admin'}
            </span>
          </div>
        </div>
      ),
    },
    {
      title: 'Duration',
      dataIndex: 'displaySeconds',
      width: 120,
      render: (sec: number | undefined, record: MediaJobRow) => renderDurationSelect(sec, record),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_: any, record: MediaJobRow) => (
        <Space size="small">
          {/* Quick Preview */}
          <Tooltip title="Preview">
            <Button size="small" icon={<EyeOutlined />} onClick={() => setPreviewMedia(record)} />
          </Tooltip>

          {/* Pending: Approve (moves to onQueue, doesn't auto-play) vs Play Now vs Reject */}
          {record.status === 'PENDING' && (
            <>
              <Tooltip title="Approve & Place onQueue">
                <Button
                  type="primary"
                  size="small"
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleApprove(record)}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Approve
                </Button>
              </Tooltip>
              <Tooltip title="Play Live Immediately (Bypass queue)">
                <Button
                  type="default"
                  size="small"
                  icon={<ThunderboltOutlined />}
                  onClick={() => handlePlayNow(record)}
                  className="text-amber-600 border-amber-300 hover:border-amber-500 bg-amber-50/60"
                />
              </Tooltip>
              <Tooltip title="Reject">
                <Button
                  danger
                  size="small"
                  icon={<CloseCircleOutlined />}
                  onClick={() => handleReject(record.id)}
                />
              </Tooltip>
            </>
          )}

          {/* onQueue: Play Now or Back to Pending */}
          {isOnQueue(record.status) && (
            <>
              <Tooltip title="Play on Screen Now">
                <Button
                  type="primary"
                  size="small"
                  icon={<PlayCircleOutlined />}
                  onClick={() => handlePlayNow(record)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Play Now
                </Button>
              </Tooltip>
              <Tooltip title="Return to Pending">
                <Button
                  size="small"
                  icon={<RollbackOutlined />}
                  onClick={() => handleReturnToPending(record.id)}
                />
              </Tooltip>
            </>
          )}

          {/* Delete */}
          <Popconfirm
            title="Delete this queued job?"
            onConfirm={() => handleDelete(record.id)}
            okText="Delete"
            okType="danger"
          >
            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ─── Post Jobs Table Columns ────────────────────────────────────────────────
  const postColumns: ColumnsType<MediaJobRow> = [
    {
      title: 'Job #',
      dataIndex: 'id',
      width: 75,
      render: (id: number) => <Tag className="font-mono">#{id}</Tag>,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      width: 100,
      render: (type: string, record: MediaJobRow) => (
        <Space size="small">
          {type === 'video' ? (
            <Tag color="blue" icon={<VideoCameraOutlined />}>
              Video {record.cutDuration ? `(${record.cutDuration}s)` : ''}
            </Tag>
          ) : (
            <Tag color="purple" icon={<PictureOutlined />}>
              Image
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Title / Preview',
      dataIndex: 'title',
      render: (title: string | null, record: MediaJobRow) => (
        <div className="flex items-center gap-3">
          <div
            onClick={() => setPreviewMedia(record)}
            className="w-11 h-11 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center cursor-pointer hover:border-blue-400 shrink-0"
          >
            {record.type === 'video' ? (
              <video src={record.mediaUrl} className="w-full h-full object-cover pointer-events-none" />
            ) : (
              <img src={record.mediaUrl} alt="Preview" className="w-full h-full object-cover" />
            )}
          </div>
          <div className="min-w-0">
            <span className="font-semibold text-gray-800 text-sm block truncate">
              {title || `Submission #${record.id}`}
            </span>
            <span className="text-gray-400 text-xs">
              Last played: {dayjs(record.updatedAt).format('MMM D, HH:mm:ss')}
            </span>
          </div>
        </div>
      ),
    },
    {
      title: 'Duration',
      dataIndex: 'displaySeconds',
      width: 120,
      render: (sec: number | undefined, record: MediaJobRow) => renderDurationSelect(sec, record),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 120,
      render: (status: string) => {
        if (status === 'COMPLETED') {
          return (
            <Tag color="green" icon={<CheckCircleOutlined />}>
              Played Once
            </Tag>
          );
        }
        if (status === 'REJECTED') {
          return (
            <Tag color="red" icon={<CloseCircleOutlined />}>
              Rejected
            </Tag>
          );
        }
        return <Tag color="default">Cancelled</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 190,
      fixed: 'right',
      render: (_: any, record: MediaJobRow) => (
        <Space size="small">
          <Tooltip title="Preview">
            <Button size="small" icon={<EyeOutlined />} onClick={() => setPreviewMedia(record)} />
          </Tooltip>
          <Tooltip title="Replay Live on Screen">
            <Button
              type="primary"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => handleReplay(record)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Replay
            </Button>
          </Tooltip>
          <Tooltip title="Add back to onQueue">
            <Button
              size="small"
              icon={<PlusCircleOutlined />}
              onClick={() => handleReQueue(record)}
              className="text-emerald-600 border-emerald-300 hover:border-emerald-500 bg-emerald-50/50"
            >
              Re-queue
            </Button>
          </Tooltip>
          <Popconfirm
            title="Delete this job from history?"
            onConfirm={() => handleDelete(record.id)}
            okText="Delete"
            okType="danger"
          >
            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const liveProgressPercent =
    liveTotalSeconds > 0
      ? Math.min(100, Math.max(0, ((liveTotalSeconds - liveSecondsRemaining) / liveTotalSeconds) * 100))
      : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-4 py-2">
      {/* ─── Top Global Status & Quick Controls Bar ─────────────────────────── */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Live Status Pill */}
          {currentJob ? (
            <Tag
              color="error"
              className="px-3 py-1 font-semibold flex items-center gap-1.5 cursor-pointer animate-pulse"
              onClick={() => setActiveMainTab('current')}
            >
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
              LIVE ON SCREEN: {currentJob.title || `Job #${currentJob.id}`} ({liveSecondsRemaining}s left)
            </Tag>
          ) : (
            <Tag color="default" className="px-3 py-1 text-gray-500 font-medium">
              Screen: Idle (Black)
            </Tag>
          )}

          {/* Queue Count Pill */}
          <Tag
            color="blue"
            className="px-2.5 py-1 cursor-pointer font-medium"
            onClick={() => setActiveMainTab('queue')}
          >
            Queue: {queueJobs.length} ({pendingCount} pending, {onQueueCount} onQueue)
          </Tag>

          {/* Queue Auto-Play Indicator Pill */}
          <Tag
            color={isQueuePlayOn ? 'success' : 'default'}
            className="px-2.5 py-1 font-semibold"
          >
            Queue Play: {isQueuePlayOn ? 'ON' : 'OFF'}
          </Tag>

          {/* Post Count Pill */}
          <Tag
            color="green"
            className="px-2.5 py-1 cursor-pointer font-medium"
            onClick={() => setActiveMainTab('post')}
          >
            Played: {completedCount}
          </Tag>
        </div>

        <Space size="middle" className="flex items-center">
          {/* Refresh Button */}
          <Tooltip title="Refresh queue & status">
            <Button icon={<ReloadOutlined />} onClick={fetchJobs} loading={loading} />
          </Tooltip>

          {/* OFF/ON toggle button right after refresh button that makes play the job on queue */}
          <Tooltip title={isQueuePlayOn ? "Queue Play is ON (auto-plays jobs from queue)" : "Queue Play is OFF (queue paused)"}>
            <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 border border-gray-200 rounded-xl select-none">
              <span className="text-xs font-semibold text-gray-700">Queue Play:</span>
              <Switch
                size="small"
                checked={isQueuePlayOn}
                onChange={handleToggleQueuePlay}
                checkedChildren="ON"
                unCheckedChildren="OFF"
                className={isQueuePlayOn ? 'bg-emerald-600' : 'bg-gray-300'}
              />
            </div>
          </Tooltip>

          {/* Stop / Cancel Live Display */}
          {currentJob && (
            <Popconfirm
              title="Stop Live Display?"
              description="This will immediately stop playback and return the public screen to pure black."
              onConfirm={handleStopCurrentDisplay}
              okText="Stop Display"
              okType="danger"
            >
              <Button danger type="primary" icon={<StopOutlined />} loading={cancelling} className="font-semibold">
                Stop Display
              </Button>
            </Popconfirm>
          )}
        </Space>
      </div>

      {/* ─── 3-Tab Split Navigation ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 sm:p-4">
        <Tabs
          activeKey={activeMainTab}
          onChange={(key) => setActiveMainTab(key as 'current' | 'queue' | 'post')}
          size="middle"
          items={[
            // ─── TAB 1: CURRENT JOB (Now displaying on screen) ────────────────
            {
              key: 'current',
              label: (
                <span className="flex items-center gap-2 font-semibold px-2">
                  <Badge status={currentJob ? 'error' : 'default'} />
                  <DesktopOutlined className={currentJob ? 'text-red-500' : 'text-gray-400'} />
                  1. Current Job
                  {currentJob && (
                    <Tag color="red" className="text-xs py-0 px-1.5 font-bold m-0 animate-pulse">
                      LIVE
                    </Tag>
                  )}
                </span>
              ),
              children: (
                <div className="py-2">
                  {currentJob ? (
                    <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-5 text-white shadow-md border border-gray-800">
                      <div className="flex flex-col md:flex-row gap-6 items-center">
                        {/* Live Player / Preview Window */}
                        <div className="relative w-full md:w-80 h-52 bg-black rounded-xl overflow-hidden border border-gray-700 flex items-center justify-center shrink-0">
                          {currentJob.type === 'video' ? (
                            <video
                              src={currentJob.mediaUrl}
                              autoPlay
                              loop
                              muted
                              playsInline
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <img
                              src={currentJob.mediaUrl}
                              alt="Current Media"
                              className="w-full h-full object-contain"
                            />
                          )}
                          <div className="absolute top-2 left-2">
                            <Tag color="red" className="font-bold border-0 animate-pulse m-0">
                              ● LIVE BROADCAST
                            </Tag>
                          </div>
                          <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-0.5 rounded text-xs font-mono">
                            {liveSecondsRemaining}s / {liveTotalSeconds}s
                          </div>
                        </div>

                        {/* Live Details & Controls */}
                        <div className="flex-1 w-full space-y-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Tag color={currentJob.type === 'video' ? 'blue' : 'purple'} className="m-0">
                                {currentJob.type === 'video' ? 'VIDEO' : 'IMAGE'}
                              </Tag>
                              {currentJob.cutDuration && (
                                <Tag color="cyan" className="m-0">
                                  Cut: {currentJob.cutDuration}s
                                </Tag>
                              )}
                              <span className="text-xs text-gray-400">
                                Job #{currentJob.id}
                              </span>
                            </div>
                            <h3 className="text-xl font-bold text-white m-0">
                              {currentJob.title || `Media Job #${currentJob.id}`}
                            </h3>
                            <p className="text-xs text-gray-400 m-0 mt-0.5">
                              Submitted by {currentJob.submittedBy || 'Admin'} • Display duration: {liveTotalSeconds}s
                            </p>
                          </div>

                          {/* Progress Countdown Bar */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-gray-300 font-medium">
                              <span>Playback Progress</span>
                              <span className="font-mono text-emerald-400">
                                {liveSecondsRemaining}s remaining
                              </span>
                            </div>
                            <Progress
                              percent={Math.round(liveProgressPercent)}
                              strokeColor={{
                                '0%': '#3b82f6',
                                '50%': '#6366f1',
                                '100%': '#10b981',
                              }}
                              railColor="rgba(255,255,255,0.15)"
                              showInfo={false}
                            />
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-wrap gap-2 pt-1">
                            <Button
                              type="primary"
                              icon={<PlayCircleOutlined />}
                              onClick={() => handleReplay(currentJob)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              Restart / Replay
                            </Button>

                            {onQueueCount > 0 && (
                              <Button
                                type="default"
                                icon={<StepForwardOutlined />}
                                onClick={handleSkipToNext}
                                className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                              >
                                Skip to Next onQueue Job ({onQueueCount} waiting)
                              </Button>
                            )}

                            <Button
                              danger
                              icon={<StopOutlined />}
                              onClick={handleStopCurrentDisplay}
                              className="font-medium"
                            >
                              Stop Display (Black Screen)
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Idle State */
                    <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center space-y-3">
                      <div className="w-14 h-14 mx-auto rounded-2xl bg-gray-200 flex items-center justify-center text-gray-400 text-2xl">
                        <DesktopOutlined />
                      </div>
                      <div className="max-w-md mx-auto">
                        <h4 className="text-base font-bold text-gray-700 m-0">Screen is Idle (Pure Black)</h4>
                        <p className="text-xs text-gray-400 mt-1 mb-0">
                          {isQueuePlayOn
                            ? 'Queue Play is ON. When you add jobs to onQueue, they will automatically play.'
                            : 'Queue Play is OFF. Turn ON the "Queue Play" toggle next to the refresh button to start playing the queue.'}
                        </p>
                      </div>

                      {onQueueCount > 0 ? (
                        <div className="pt-2 flex justify-center gap-2">
                          <Button
                            type="primary"
                            icon={<PlayCircleOutlined />}
                            onClick={() => {
                              const next = queueJobs.find((j) => isOnQueue(j.status));
                              if (next) startPlayingJob(next);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 font-semibold"
                          >
                            Play Next onQueue Job Now ({queueJobs.find((j) => isOnQueue(j.status))?.title || 'Job in queue'})
                          </Button>
                          {!isQueuePlayOn && (
                            <Button
                              onClick={() => handleToggleQueuePlay(true)}
                              className="font-medium text-emerald-700 border-emerald-300"
                            >
                              Turn ON Queue Play
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="pt-2">
                          <Button
                            type="default"
                            onClick={() => setActiveMainTab('queue')}
                            className="text-blue-600 border-blue-200"
                          >
                            Go to Queue Jobs ({queueJobs.length})
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ),
            },

            // ─── TAB 2: QUEUE JOBS (Waiting for approve & onQueue) ─────────────
            {
              key: 'queue',
              label: (
                <span className="flex items-center gap-2 font-semibold px-2">
                  <ClockCircleOutlined className="text-blue-500" />
                  2. Queue Jobs
                  <Tag color="blue" className="text-xs py-0 px-1.5 font-bold m-0">
                    {queueJobs.length}
                  </Tag>
                </span>
              ),
              children: (
                <div className="space-y-3 py-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <p className="text-xs text-gray-500 m-0">
                      Approved jobs enter <span className="font-semibold text-blue-600">onQueue</span> status. Use the <span className="font-semibold text-emerald-600">Queue Play toggle</span> above to start or pause automated playback on the screen.
                    </p>
                    <Segmented
                      size="small"
                      value={queueFilter}
                      onChange={(val) => setQueueFilter(val as any)}
                      options={[
                        { label: `All Queue (${queueJobs.length})`, value: 'ALL' },
                        { label: `Needs Approval (${pendingCount})`, value: 'PENDING' },
                        { label: `On Queue (${onQueueCount})`, value: 'ON_QUEUE' },
                      ]}
                    />
                  </div>

                  <Table<MediaJobRow>
                    columns={queueColumns}
                    dataSource={filteredQueueJobs}
                    rowKey="id"
                    loading={loading}
                    size="middle"
                    scroll={{ x: 'max-content' }}
                    pagination={{ pageSize: 6, showTotal: (t) => `${t} queued jobs` }}
                    locale={{
                      emptyText: (
                        <div className="py-6 text-gray-400 text-xs">
                          No jobs in queue. Create or cut a new video in Tab 1 to submit!
                        </div>
                      ),
                    }}
                  />
                </div>
              ),
            },

            // ─── TAB 3: POST JOBS (Already played once) ───────────────────────
            {
              key: 'post',
              label: (
                <span className="flex items-center gap-2 font-semibold px-2">
                  <HistoryOutlined className="text-emerald-500" />
                  3. Post Jobs
                  <Tag color="green" className="text-xs py-0 px-1.5 font-bold m-0">
                    {completedCount}
                  </Tag>
                </span>
              ),
              children: (
                <div className="space-y-3 py-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <p className="text-xs text-gray-500 m-0">
                      Media jobs that have already played on the display screen at least once.
                    </p>
                    <Segmented
                      size="small"
                      value={postFilter}
                      onChange={(val) => setPostFilter(val as any)}
                      options={[
                        { label: `All Post (${postJobs.length})`, value: 'ALL' },
                        { label: `Played Once (${completedCount})`, value: 'COMPLETED' },
                        { label: `Rejected / Cancelled (${postJobs.length - completedCount})`, value: 'OTHER' },
                      ]}
                    />
                  </div>

                  <Table<MediaJobRow>
                    columns={postColumns}
                    dataSource={filteredPostJobs}
                    rowKey="id"
                    loading={loading}
                    size="middle"
                    scroll={{ x: 'max-content' }}
                    pagination={{ pageSize: 6, showTotal: (t) => `${t} played jobs` }}
                    locale={{
                      emptyText: (
                        <div className="py-6 text-gray-400 text-xs">
                          No post jobs yet. When a media finishes displaying on screen, it appears here.
                        </div>
                      ),
                    }}
                  />
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* ─── Preview Modal ─────────────────────────────────────────────────── */}
      <Modal
        open={previewMedia !== null}
        onCancel={() => setPreviewMedia(null)}
        footer={null}
        destroyOnHidden
        centered
        title={previewMedia?.title || `Preview #${previewMedia?.id}`}
      >
        {previewMedia && (
          <div className="pt-2 flex flex-col items-center">
            {previewMedia.type === 'video' ? (
              <video
                src={previewMedia.mediaUrl}
                controls
                autoPlay
                loop
                className="max-h-[420px] w-full rounded-lg bg-black object-contain"
              />
            ) : (
              <img
                src={previewMedia.mediaUrl}
                alt="Preview"
                className="max-h-[420px] w-full rounded-lg object-contain bg-gray-900"
              />
            )}
            <div className="w-full flex justify-between text-xs text-gray-500 mt-2">
              <span>
                Duration setting:{' '}
                {previewMedia.displaySeconds ??
                  (previewMedia.cutDuration ?? (previewMedia.displayMinutes ?? 30))}
                s
              </span>
              {previewMedia.cutDuration && <span>Cut length: {previewMedia.cutDuration}s</span>}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
