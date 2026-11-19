import React from 'react';
import type { PaceMetrics, WorkoutType } from '../types/workout';

interface PaceHeroCardProps {
  tipo: WorkoutType;
  distanceKm: number;
  durationMin: number;
  metrics: PaceMetrics;
}

export const PaceHeroCard: React.FC<PaceHeroCardProps> = ({
  tipo,
  distanceKm,
  durationMin,
  metrics,
}) => {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const progressOffset =
    circumference - (Math.min(100, Math.max(0, metrics.intensityPercent)) / 100) * circumference;

  return (
    <section
      aria-label="Ritmo calculado en vivo"
      className="bg-[#0D0F12] text-white rounded-2xl p-5 sm:p-6 shadow-sm overflow-hidden relative"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-medium text-neutral-400">
            <span>{tipo}</span>
            <span aria-hidden="true">·</span>
            <span>{metrics.zoneLabel}</span>
          </div>

          <div className="mt-2 flex items-baseline gap-2.5">
            <span className="font-display text-5xl sm:text-6xl font-extrabold tracking-tight tabular-nums leading-none text-white">
              {metrics.paceFormatted}
            </span>
            <span className="font-display text-xl sm:text-2xl font-bold text-[#C6F806] tracking-wide">
              min/km
            </span>
          </div>

          <p className="mt-2 text-xs sm:text-sm text-neutral-300">
            {metrics.zoneHint}
          </p>
        </div>

        <div className="shrink-0 flex flex-col items-center">
          <div className="relative w-20 h-20 flex items-center justify-center">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80" aria-hidden="true">
              <circle
                cx="40"
                cy="40"
                r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="6"
              />
              <circle
                cx="40"
                cy="40"
                r={radius}
                fill="none"
                stroke="#C6F806"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={progressOffset}
                className="transition-all duration-300 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="font-mono text-sm font-bold tabular-nums text-white leading-none">
                {metrics.speedKmh !== null ? metrics.speedKmh.toFixed(1) : '0.0'}
              </span>
              <span className="text-[10px] text-neutral-400 mt-0.5">km/h</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-3 gap-3 text-left">
        <div>
          <span className="block text-[11px] text-neutral-400">Distancia</span>
          <span className="font-mono text-base sm:text-lg font-semibold tabular-nums text-white">
            {Number.isFinite(distanceKm) && distanceKm > 0 ? distanceKm.toFixed(2) : '0.00'} km
          </span>
        </div>
        <div>
          <span className="block text-[11px] text-neutral-400">Duración</span>
          <span className="font-mono text-base sm:text-lg font-semibold tabular-nums text-white">
            {Number.isFinite(durationMin) && durationMin > 0 ? durationMin.toFixed(0) : '0'} min
          </span>
        </div>
        <div>
          <span className="block text-[11px] text-neutral-400">Destino</span>
          <span className="font-sans text-sm sm:text-base font-semibold text-[#C6F806] truncate block">
            {metrics.paceDecimal ? 'Lista para guardar' : 'Completa datos'}
          </span>
        </div>
      </div>
    </section>
  );
};
