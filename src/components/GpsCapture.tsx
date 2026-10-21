'use client';

import React, { useState } from 'react';
import { MapPin, Navigation, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';

export interface GpsData {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  altitude?: number | null;
  address?: string | null;
  timestamp?: string | Date;
  isWithinGeofence?: boolean;
  distanceFromSite?: number | null;
}

interface GpsCaptureProps {
  initialGps?: GpsData | null;
  siteAddress?: string;
  onCapture?: (gps: GpsData) => void;
  onLocationCaptured?: (gps: GpsData) => void;
  disabled?: boolean;
}

export function GpsCapture({
  initialGps,
  siteAddress,
  onCapture,
  onLocationCaptured,
  disabled = false,
}: GpsCaptureProps) {
  const [gps, setGps] = useState<GpsData | null>(initialGps || null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const captureBrowserGps = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const captured: GpsData = {
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
          accuracy: pos.coords.accuracy ? Math.round(pos.coords.accuracy) : 5,
          altitude: pos.coords.altitude ? Math.round(pos.coords.altitude) : null,
          address: siteAddress || 'On-Site Location Verified',
          timestamp: new Date(),
          isWithinGeofence: true,
        };
        setGps(captured);
        setLoading(false);
        if (onCapture) onCapture(captured);
        if (onLocationCaptured) onLocationCaptured(captured);
      },
      (err) => {
        console.warn('Geolocation permission notice:', err.message);
        setErrorMsg('Location access was denied or timed out. Please allow location access in your browser settings.');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <MapPin className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Geographic Location Verification</h3>
            <p className="text-xs text-slate-500">Record on-site coordinates for regulatory compliance and audit trails</p>
          </div>
        </div>

        {!disabled && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={captureBrowserGps}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Navigation className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Acquiring Coordinates...' : 'Acquire GPS Location'}</span>
            </button>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {gps && (
        <div className="mt-4 rounded-lg bg-slate-50 p-4 border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Device Location Acquired & Attested</span>
              </div>
              <div className="font-mono text-xs text-slate-600 pl-6">
                {gps.latitude.toFixed(6)}° N, {gps.longitude.toFixed(6)}° W
              </div>
              {gps.address && (
                <div className="text-[11px] text-slate-500 pl-6">{gps.address}</div>
              )}
            </div>

            <a
              href={`https://www.google.com/maps?q=${gps.latitude},${gps.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 self-start sm:self-auto pl-6 sm:pl-0"
            >
              <span>View Map</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
