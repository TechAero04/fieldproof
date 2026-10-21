'use client';

import React, { useState } from 'react';
import { Camera, Image as ImageIcon, Trash2, Plus } from 'lucide-react';

export interface PhotoItem {
  id?: string;
  fileUrl: string;
  caption?: string | null;
  questionId?: string | null;
  fileType?: string;
  fileSize?: number;
}

interface PhotoUploadProps {
  photos: PhotoItem[];
  onChange?: (photos: PhotoItem[]) => void;
  onPhotosChange?: (photos: PhotoItem[]) => void;
  questionId?: string | null;
  title?: string;
  maxPhotos?: number;
  disabled?: boolean;
}

export function PhotoUpload({
  photos,
  onChange,
  onPhotosChange,
  questionId = null,
  title = 'Photo Evidence',
  maxPhotos = 6,
  disabled = false,
}: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);

  const notify = (updated: PhotoItem[]) => {
    if (onChange) onChange(updated);
    if (onPhotosChange) onPhotosChange(updated);
  };

  // Filter photos for this specific question (if questionId given) or all inspection photos
  const currentPhotos = questionId
    ? photos.filter((p) => p.questionId === questionId)
    : photos;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newItems: PhotoItem[] = [];

    let processed = 0;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        newItems.push({
          fileUrl: base64,
          caption: file.name.replace(/\.[^/.]+$/, ''),
          questionId: questionId,
          fileType: file.type || 'image/jpeg',
          fileSize: file.size,
        });

        processed++;
        if (processed === files.length) {
          notify([...photos, ...newItems]);
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (indexToRemove: number) => {
    const updated = photos.filter((_, idx) => idx !== indexToRemove);
    notify(updated);
  };

  const updateCaption = (index: number, newCaption: string) => {
    const updated = [...photos];
    if (updated[index]) {
      updated[index] = { ...updated[index], caption: newCaption };
      notify(updated);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <Camera className="h-3.5 w-3.5 text-blue-600" />
          {title} ({currentPhotos.length}/{maxPhotos})
        </label>
      </div>

      {/* Grid of uploaded photos */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {currentPhotos.map((photo, idx) => (
          <div
            key={idx}
            className="group relative rounded-lg border border-slate-200 bg-slate-50 overflow-hidden shadow-sm"
          >
            <div className="aspect-video w-full overflow-hidden bg-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.fileUrl}
                alt={photo.caption || 'Inspection photo'}
                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
            </div>

            <div className="p-2">
              <input
                type="text"
                disabled={disabled}
                value={photo.caption || ''}
                onChange={(e) => updateCaption(idx, e.target.value)}
                placeholder="Add caption or finding note..."
                className="w-full text-[11px] bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none placeholder:text-slate-400"
              />
            </div>

            {!disabled && (
              <button
                type="button"
                onClick={() => removePhoto(idx)}
                className="absolute top-1.5 right-1.5 rounded-full bg-red-600 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow"
                title="Remove photo"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}

        {/* Add photo card button */}
        {!disabled && currentPhotos.length < maxPhotos && (
          <label className="relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white p-4 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer transition-colors aspect-video">
            <input
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              onChange={handleFileChange}
              disabled={uploading}
              className="sr-only"
            />
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 mb-1">
              <Plus className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-slate-700">
              {uploading ? 'Processing...' : 'Add Photo'}
            </span>
            <span className="text-[10px] text-slate-400">JPG, PNG, WebP</span>
          </label>
        )}
      </div>
    </div>
  );
}
