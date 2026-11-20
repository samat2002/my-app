"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Card,
  Tabs,
  Upload,
  Button,
  Slider,
  Input,
  Space,
  Tag,
  message,
  Typography,
  Tooltip,
  Divider,
} from 'antd';
import {
  VideoCameraOutlined,
  PictureOutlined,
  UploadOutlined,
  ScissorOutlined,
  SmileOutlined,
  RotateRightOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  SendOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;

const DEFAULT_STICKERS = ['👑', '🔥', '⭐', '🎉', '💖', '🚀', '🎯', '🏆', '⚡', '👍', '😎', '💯'];

interface CanvasSticker {
  id: string;
  type: 'emoji' | 'image';
  content: string; // emoji character or image dataUrl
  imgElement?: HTMLImageElement;
  x: number;
  y: number;
  size: number;
}

export default function MediaCreator({ onCreated }: { onCreated?: () => void }) {
  const [activeMediaTab, setActiveMediaTab] = useState<'video' | 'image'>('video');
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ─── Video Trimmer State ─────────────────────────────────────────────────────
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [range, setRange] = useState<[number, number]>([0, 15]);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // ─── Image Canvas Editor State ──────────────────────────────────────────────
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [stickers, setStickers] = useState<CanvasSticker[]>([]);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseImageRef = useRef<HTMLImageElement | null>(null);
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // ─── Video Handling ──────────────────────────────────────────────────────────
  const handleVideoUpload = (file: File) => {
    if (!file.type.startsWith('video/')) {
      message.error('Please upload a valid video file (MP4, WebM, MOV)');
      return false;
    }
    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoSrc(url);
    if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ''));
    return false;
  };

  const onLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = Math.floor(videoRef.current.duration);
      setVideoDuration(dur);
      const initialEnd = Math.min(dur, 15);
      setRange([0, initialEnd]);
    }
  };

  // Video loop playback inside [range[0], range[1]]
  const onTimeUpdate = () => {
    if (videoRef.current) {
      if (videoRef.current.currentTime >= range[1] || videoRef.current.currentTime < range[0]) {
        videoRef.current.currentTime = range[0];
      }
    }
  };

  const applyPreset = (presetSec: number) => {
    if (videoDuration === 0) return;
    const start = range[0];
    let end = start + presetSec;
    if (end > videoDuration) {
      end = videoDuration;
      const newStart = Math.max(0, end - presetSec);
      setRange([newStart, end]);
    } else {
      setRange([start, end]);
    }
    if (videoRef.current) {
      videoRef.current.currentTime = range[0];
    }
  };

  const cutDuration = Math.max(0, range[1] - range[0]);

  // ─── Image Canvas Handling ───────────────────────────────────────────────────
  const handleImageUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      message.error('Please upload a valid image (PNG, JPG, WebP)');
      return false;
    }
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ''));

    const img = new Image();
    img.src = url;
    img.onload = () => {
      baseImageRef.current = img;
      setStickers([]);
      setRotation(0);
      setBrightness(100);
      setContrast(100);
      renderCanvas();
    };
    return false;
  };

  // Render Image & Stickers onto HTML5 Canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = baseImageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set max display resolution for high fidelity
    const maxW = 800;
    const scale = Math.min(1, maxW / img.width);
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    ctx.clearRect(0, 0, w, h);

    // Apply rotation & filter adjustments
    ctx.save();
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;

    ctx.translate(w / 2, h / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();

    // Draw stickers
    stickers.forEach((s) => {
      ctx.save();
      if (s.type === 'emoji') {
        ctx.font = `${s.size}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(s.content, s.x, s.y);
      } else if (s.type === 'image' && s.imgElement) {
        const aspect = s.imgElement.width / (s.imgElement.height || 1);
        const sw = s.size;
        const sh = s.size / aspect;
        ctx.drawImage(s.imgElement, s.x - sw / 2, s.y - sh / 2, sw, sh);
      }

      // Draw subtle selection highlight box if active
      if (s.id === selectedStickerId) {
        ctx.strokeStyle = '#1677ff';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(s.x - s.size / 2 - 4, s.y - s.size / 2 - 4, s.size + 8, s.size + 8);
      }
      ctx.restore();
    });
  }, [brightness, contrast, rotation, stickers, selectedStickerId]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Add default emoji sticker
  const addEmojiSticker = (emoji: string) => {
    const canvas = canvasRef.current;
    const x = canvas ? canvas.width / 2 : 150;
    const y = canvas ? canvas.height / 2 : 150;
    const newSticker: CanvasSticker = {
      id: `sticker-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'emoji',
      content: emoji,
      x,
      y,
      size: 48,
    };
    setStickers((prev) => [...prev, newSticker]);
    setSelectedStickerId(newSticker.id);
  };

  // Import custom image sticker
  const handleImportSticker = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        const canvas = canvasRef.current;
        const x = canvas ? canvas.width / 2 : 150;
        const y = canvas ? canvas.height / 2 : 150;
        const newSticker: CanvasSticker = {
          id: `sticker-img-${Date.now()}`,
          type: 'image',
          content: dataUrl,
          imgElement: img,
          x,
          y,
          size: 72,
        };
        setStickers((prev) => [...prev, newSticker]);
        setSelectedStickerId(newSticker.id);
      };
    };
    reader.readAsDataURL(file);
    return false;
  };

  // Sticker dragging on canvas
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const mouseY = ((e.clientY - rect.top) / rect.height) * canvas.height;

    // Check hit on stickers (reverse to pick top-most)
    const hit = [...stickers].reverse().find((s) => {
      const dist = Math.hypot(s.x - mouseX, s.y - mouseY);
      return dist <= s.size / 1.5;
    });

    if (hit) {
      setSelectedStickerId(hit.id);
      isDraggingRef.current = true;
      dragOffsetRef.current = { x: mouseX - hit.x, y: mouseY - hit.y };
    } else {
      setSelectedStickerId(null);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current || !selectedStickerId) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const mouseY = ((e.clientY - rect.top) / rect.height) * canvas.height;

    setStickers((prev) =>
      prev.map((s) =>
        s.id === selectedStickerId
          ? {
              ...s,
              x: mouseX - dragOffsetRef.current.x,
              y: mouseY - dragOffsetRef.current.y,
            }
          : s
      )
    );
  };

  const handleCanvasMouseUp = () => {
    isDraggingRef.current = false;
  };

  // ─── Submit Media Job ────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (activeMediaTab === 'video') {
      if (!videoFile || !videoSrc) {
        message.warning('Please select a video file first');
        return;
      }
      if (cutDuration > 60) {
        message.error('Cut video duration must be 60 seconds or less!');
        return;
      }
    } else {
      if (!imageFile || !imageSrc || !canvasRef.current) {
        message.warning('Please select an image file first');
        return;
      }
    }

    setSubmitting(true);
    try {
      let finalMediaUrl = '';

      if (activeMediaTab === 'video') {
        // Upload original video to Supabase Storage
        const formData = new FormData();
        formData.append('file', videoFile!);
        const uploadRes = await axios.post('/api/media-jobs/upload', formData);
        if (!uploadRes.data?.url) {
          throw new Error(uploadRes.data?.error || 'Failed to upload video');
        }
        finalMediaUrl = uploadRes.data.url;
      } else {
        // Export Canvas to Blob and upload
        const canvas = canvasRef.current!;
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92)
        );
        if (!blob) throw new Error('Canvas export failed');

        const file = new File([blob], `edited-${Date.now()}.jpg`, { type: 'image/jpeg' });
        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await axios.post('/api/media-jobs/upload', formData);
        if (!uploadRes.data?.url) {
          throw new Error(uploadRes.data?.error || 'Failed to upload image');
        }
        finalMediaUrl = uploadRes.data.url;
      }

      // Create MediaJob record in database
      const defaultDisplaySeconds =
        activeMediaTab === 'video' && cutDuration ? cutDuration : 30;

      await axios.post('/api/media-jobs', {
        title: title || (activeMediaTab === 'video' ? 'Video Job' : 'Image Job'),
        type: activeMediaTab,
        mediaUrl: finalMediaUrl,
        cutDuration: activeMediaTab === 'video' ? cutDuration : null,
        displaySeconds: defaultDisplaySeconds,
        submittedBy: 'Admin',
      });

      message.success('Media job created and submitted to queue! 🎉');

      // Reset Form
      setTitle('');
      setVideoFile(null);
      setVideoSrc(null);
      setImageFile(null);
      setImageSrc(null);
      setStickers([]);

      if (onCreated) onCreated();
    } catch (err: any) {
      console.error('Submit error:', err);
      message.error(err.response?.data?.error || err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-2">
      <Card className="rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <Tabs
          activeKey={activeMediaTab}
          onChange={(key) => setActiveMediaTab(key as 'video' | 'image')}
          centered
          items={[
            {
              key: 'video',
              label: (
                <span className="flex items-center gap-2 font-medium px-2 py-1">
                  <VideoCameraOutlined className="text-base text-blue-500" />
                  Cut Video (&lt; 60s)
                </span>
              ),
            },
            {
              key: 'image',
              label: (
                <span className="flex items-center gap-2 font-medium px-2 py-1">
                  <PictureOutlined className="text-base text-purple-500" />
                  Image Editor & Stickers
                </span>
              ),
            },
          ]}
        />

        {/* ─── TAB 1: VIDEO CUTTER ───────────────────────────────────────────── */}
        {activeMediaTab === 'video' && (
          <div className="space-y-4 pt-2">
            {!videoSrc ? (
              <Upload.Dragger
                accept="video/*"
                beforeUpload={handleVideoUpload}
                showUploadList={false}
                className="p-8 rounded-xl bg-gray-50/70 border-dashed hover:border-blue-500"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 text-2xl">
                    <VideoCameraOutlined />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-800 m-0">Click or drag video here to cut</h3>
                    <p className="text-xs text-gray-400 m-0 mt-1">MP4, WebM, MOV supported (up to 100MB)</p>
                  </div>
                  <Button icon={<UploadOutlined />}>Select Video File</Button>
                </div>
              </Upload.Dragger>
            ) : (
              <div className="space-y-4">
                {/* Video Player Preview */}
                <div className="relative rounded-xl overflow-hidden bg-black flex items-center justify-center max-h-[380px]">
                  <video
                    ref={videoRef}
                    src={videoSrc}
                    onLoadedMetadata={onLoadedMetadata}
                    onTimeUpdate={onTimeUpdate}
                    controls
                    className="max-h-[380px] w-auto mx-auto object-contain"
                  />
                  <div className="absolute top-3 right-3 flex items-center gap-2 bg-black/60 px-3 py-1 rounded-full backdrop-blur-xs text-white text-xs">
                    <ScissorOutlined />
                    <span>Cut: {cutDuration}s</span>
                  </div>
                </div>

                {/* Duration Presets: 15s, 30s, 45s, 60s */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Quick Duration Presets:
                    </span>
                    <Space size="small">
                      {[15, 30, 45, 60].map((sec) => (
                        <Button
                          key={sec}
                          size="small"
                          type={cutDuration === sec ? 'primary' : 'default'}
                          onClick={() => applyPreset(sec)}
                          disabled={videoDuration > 0 && sec > videoDuration}
                        >
                          {sec}s
                        </Button>
                      ))}
                    </Space>
                  </div>

                  {/* Dual Range Timeline Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-500 font-mono">
                      <span>Start: {range[0]}s</span>
                      <span className="font-bold text-blue-600">Cut Duration: {cutDuration}s (Max 60s)</span>
                      <span>End: {range[1]}s</span>
                    </div>
                    <Slider
                      range
                      min={0}
                      max={videoDuration || 60}
                      value={range}
                      onChange={(val) => {
                        const [newStart, newEnd] = val as [number, number];
                        if (newEnd - newStart <= 60) {
                          setRange([newStart, newEnd]);
                          if (videoRef.current) videoRef.current.currentTime = newStart;
                        } else {
                          // Clamp to 60s
                          setRange([newStart, newStart + 60]);
                          if (videoRef.current) videoRef.current.currentTime = newStart;
                        }
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <Tag color={cutDuration <= 60 ? 'green' : 'red'}>
                      {cutDuration <= 60 ? `✓ Valid Length (${cutDuration}s)` : 'Exceeds 60s limit'}
                    </Tag>
                    <Button
                      size="small"
                      danger
                      icon={<ReloadOutlined />}
                      onClick={() => {
                        setVideoFile(null);
                        setVideoSrc(null);
                      }}
                    >
                      Change Video
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 2: IMAGE EDITOR WITH STICKERS ────────────────────────────── */}
        {activeMediaTab === 'image' && (
          <div className="space-y-4 pt-2">
            {!imageSrc ? (
              <Upload.Dragger
                accept="image/*"
                beforeUpload={handleImageUpload}
                showUploadList={false}
                className="p-8 rounded-xl bg-gray-50/70 border-dashed hover:border-purple-500"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-500 text-2xl">
                    <PictureOutlined />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-800 m-0">Click or drag image here to edit</h3>
                    <p className="text-xs text-gray-400 m-0 mt-1">PNG, JPG, WebP supported with sticker overlays</p>
                  </div>
                  <Button icon={<UploadOutlined />}>Select Image File</Button>
                </div>
              </Upload.Dragger>
            ) : (
              <div className="space-y-4">
                {/* HTML5 Canvas with Drag & Drop Stickers */}
                <div className="relative bg-gray-900 rounded-xl overflow-hidden flex items-center justify-center min-h-[300px] max-h-[420px] p-2">
                  <canvas
                    ref={canvasRef}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    className="max-h-[390px] max-w-full rounded shadow-md cursor-crosshair"
                  />
                  {stickers.length === 0 && (
                    <div className="absolute top-3 left-3 bg-black/60 px-2.5 py-1 rounded text-white text-[11px] pointer-events-none">
                      💡 Click stickers below to stamp onto image (drag to position)
                    </div>
                  )}
                </div>

                {/* Sticker Palette & Controls */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200/80 space-y-3">
                  {/* Default Stickers */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                        <SmileOutlined className="text-amber-500" /> Default Stickers:
                      </span>
                      <Upload
                        accept="image/png,image/svg+xml,image/webp"
                        beforeUpload={handleImportSticker}
                        showUploadList={false}
                      >
                        <Button size="small" icon={<UploadOutlined />}>
                          Import Custom Image Sticker
                        </Button>
                      </Upload>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {DEFAULT_STICKERS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => addEmojiSticker(emoji)}
                          className="w-10 h-10 text-xl bg-white rounded-lg border border-gray-200 hover:border-blue-400 hover:scale-110 active:scale-95 transition-all shadow-xs flex items-center justify-center cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Selected Sticker Controls */}
                  {selectedStickerId && (
                    <div className="bg-white p-3 rounded-lg border border-blue-200 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-xs text-gray-500 shrink-0">Sticker Size:</span>
                        <Slider
                          min={20}
                          max={160}
                          value={stickers.find((s) => s.id === selectedStickerId)?.size || 48}
                          onChange={(val) => {
                            setStickers((prev) =>
                              prev.map((s) => (s.id === selectedStickerId ? { ...s, size: val } : s))
                            );
                          }}
                          className="flex-1"
                        />
                      </div>
                      <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => {
                          setStickers((prev) => prev.filter((s) => s.id !== selectedStickerId));
                          setSelectedStickerId(null);
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  )}

                  <Divider className="my-2!" />

                  {/* Image Adjustments (Brightness, Contrast, Rotate) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                    <div>
                      <span className="text-xs text-gray-500 block mb-1">Brightness: {brightness}%</span>
                      <Slider min={50} max={150} value={brightness} onChange={setBrightness} />
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 block mb-1">Contrast: {contrast}%</span>
                      <Slider min={50} max={150} value={contrast} onChange={setContrast} />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="small"
                        icon={<RotateRightOutlined />}
                        onClick={() => setRotation((prev) => (prev + 90) % 360)}
                      >
                        Rotate 90°
                      </Button>
                      <Button
                        size="small"
                        danger
                        onClick={() => {
                          setImageFile(null);
                          setImageSrc(null);
                          setStickers([]);
                        }}
                      >
                        Change Image
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── SUBMIT SECTION ────────────────────────────────────────────────── */}
        {(videoSrc || imageSrc) && (
          <div className="mt-5 pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="w-full sm:w-auto flex-1">
              <Input
                placeholder="Enter media title or note (optional)..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={60}
              />
            </div>
            <Button
              type="primary"
              size="large"
              icon={<SendOutlined />}
              loading={submitting}
              onClick={handleSubmit}
              className="w-full sm:w-auto px-6 font-semibold"
            >
              Submit Media Job
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
