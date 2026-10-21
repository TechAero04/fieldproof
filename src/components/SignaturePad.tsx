'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Eraser, Check, PenLine } from 'lucide-react';

interface SignaturePadProps {
  initialSignature?: string | null;
  initialName?: string;
  initialRole?: string;
  onSave?: (signatureData: {
    signatureDataUrl: string;
    signerName: string;
    signerRole: string;
  }) => void;
  onSignatureSave?: (signatureDataUrl: string, signerName: string, signerRole: string) => void;
  disabled?: boolean;
}

export function SignaturePad({
  initialSignature,
  initialName = '',
  initialRole = 'Inspector',
  onSave,
  onSignatureSave,
  disabled = false,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [signerName, setSignerName] = useState(initialName);
  const [signerRole, setSignerRole] = useState(initialRole);
  const [savedDataUrl, setSavedDataUrl] = useState<string | null>(initialSignature || null);

  const notifySave = (dataUrl: string, name: string, role: string) => {
    if (onSave) onSave({ signatureDataUrl: dataUrl, signerName: name, signerRole: role });
    if (onSignatureSave) onSignatureSave(dataUrl, name, role);
  };

  useEffect(() => {
    if (initialSignature) {
      setSavedDataUrl(initialSignature);
      setHasDrawn(true);
    }
    if (initialName) setSignerName(initialName);
    if (initialRole) setSignerRole(initialRole);
  }, [initialSignature, initialName, initialRole]);

  // Handle high-DPI canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set line style
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else if ('clientX' in e) {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
    return { x: 0, y: 0 };
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing || disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if ('touches' in e) {
      // Prevent scrolling when drawing on touchscreen
      e.preventDefault();
    }

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    setSavedDataUrl(dataUrl);
    notifySave(
      dataUrl,
      signerName.trim() || 'Inspector',
      signerRole.trim() || 'Inspector'
    );
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    setSavedDataUrl(null);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <PenLine className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Digital Attestation & Signature</h3>
            <p className="text-xs text-slate-500">Sign directly on screen to legally certify findings</p>
          </div>
        </div>

        {hasDrawn && (
          <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            <Check className="h-3.5 w-3.5" />
            Signature Recorded
          </span>
        )}
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Signer Full Name</label>
          <input
            type="text"
            value={signerName}
            disabled={disabled}
            onChange={(e) => {
              setSignerName(e.target.value);
              if (savedDataUrl) {
                notifySave(savedDataUrl, e.target.value, signerRole);
              }
            }}
            placeholder="e.g. Marcus Vance"
            className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Role / Title</label>
          <input
            type="text"
            value={signerRole}
            disabled={disabled}
            onChange={(e) => {
              setSignerRole(e.target.value);
              if (savedDataUrl) {
                notifySave(savedDataUrl, signerName, e.target.value);
              }
            }}
            placeholder="e.g. Lead Safety Inspector"
            className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100"
          />
        </div>
      </div>

      {/* Signature Canvas Box */}
      <div className="relative rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 overflow-hidden">
        {savedDataUrl && !isDrawing && (
          <div className="absolute inset-0 flex items-center justify-center p-2 pointer-events-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={savedDataUrl}
              alt="Recorded Signature"
              className="max-h-24 max-w-full object-contain"
            />
          </div>
        )}

        <canvas
          ref={canvasRef}
          width={600}
          height={160}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className={`h-36 w-full touch-none cursor-crosshair ${
            disabled ? 'pointer-events-none opacity-60' : ''
          }`}
        />

        <div className="pointer-events-none absolute bottom-2 left-4 text-[11px] text-slate-400">
          Draw signature with finger, stylus, or mouse above
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Timestamped upon submission with verified inspector credentials.
        </p>
        {!disabled && (
          <button
            type="button"
            onClick={clearCanvas}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Eraser className="h-3.5 w-3.5 text-slate-500" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
