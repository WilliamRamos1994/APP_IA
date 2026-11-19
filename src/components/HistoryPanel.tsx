import React, { useMemo, useState } from 'react';
import {
  BrainCircuit,
  CloudUpload,
  Footprints,
  Loader2,
  Mountain,
  RefreshCw,
  Trash2,
  Zap,
} from 'lucide-react';
import type { WorkoutEntry, WorkoutType } from '../types/workout';
import { calculatePace, formatDisplayDate } from '../utils/pace';

interface HistoryPanelProps {
  workouts: WorkoutEntry[];
  isConnected: boolean;
  hasAppsScript: boolean;
  isSyncingSheet: boolean;
  analyzingId: string | null;
  uploadingId: string | null;
  onRefreshFromSheets: () => void;
  onUploadLocalWorkout: (workout: WorkoutEntry) => void;
  onAnalyzeWorkout: (workout: WorkoutEntry) => void;
  onDeleteLocalWorkout: (id: string) => void;
}

type FilterOption = 'Todos' | WorkoutType;

const FILTER_OPTIONS: FilterOption[] = ['Todos', 'Correr', 'Caminata', 'Trail'];

function ActivityIcon({ tipo }: { tipo: WorkoutType }) {
  if (tipo === 'Caminata') return <Footprints className="w-4 h-4" aria-hidden="true" />;
  if (tipo === 'Trail') return <Mountain className="w-4 h-4" aria-hidden="true" />;
  return <Zap className="w-4 h-4" aria-hidden="true" />;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  workouts,
  isConnected,
  hasAppsScript,
  isSyncingSheet,
  analyzingId,
  uploadingId,
  onRefreshFromSheets,
  onUploadLocalWorkout,
  onAnalyzeWorkout,
  onDeleteLocalWorkout,
}) => {
  const [filter, setFilter] = useState<FilterOption>('Todos');

  const filteredWorkouts = useMemo(() => {
    if (filter === 'Todos') return workouts;
    return workouts.filter((w) => w.tipo === filter);
  }, [workouts, filter]);

  const summary = useMemo(() => {
    const totalKm = filteredWorkouts.reduce((acc, w) => acc + (w.distancia_km || 0), 0);
    const totalMin = filteredWorkouts.reduce((acc, w) => acc + (w.duracion_min || 0), 0);
    const avgPace = calculatePace(totalKm, totalMin, 'Correr');
    return {
      count: filteredWorkouts.length,
      totalKm,
      totalMin,
      avgPaceFormatted: avgPace.paceFormatted,
    };
  }, [filteredWorkouts]);

  return (
    <section aria-label="Historial de entrenamientos" className="space-y-4">
      {/* KPI Strip */}
      <div className="bg-white rounded-2xl border border-black/8 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-4 mb-3">
          <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[#0D0F12]">
            Resumen y registros
          </h2>
          {isConnected && (
            <button
              type="button"
              onClick={onRefreshFromSheets}
              disabled={isSyncingSheet}
              className="min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold text-[#0D0F12] bg-[#F0F2F5] hover:bg-[#E4E7EC] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isSyncingSheet ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>{isSyncingSheet ? 'Leyendo...' : 'Actualizar Hoja'}</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-black/6">
          <div>
            <span className="block text-[11px] font-medium text-[#525866]">Distancia total</span>
            <span className="font-display text-2xl font-extrabold tabular-nums text-[#0D0F12]">
              {summary.totalKm.toFixed(1)} <span className="text-sm font-semibold text-[#525866]">km</span>
            </span>
          </div>
          <div>
            <span className="block text-[11px] font-medium text-[#525866]">Sesiones</span>
            <span className="font-display text-2xl font-extrabold tabular-nums text-[#0D0F12]">
              {summary.count}
            </span>
          </div>
          <div>
            <span className="block text-[11px] font-medium text-[#525866]">Tiempo</span>
            <span className="font-display text-2xl font-extrabold tabular-nums text-[#0D0F12]">
              {Math.round(summary.totalMin)} <span className="text-sm font-semibold text-[#525866]">min</span>
            </span>
          </div>
          <div>
            <span className="block text-[11px] font-medium text-[#525866]">Ritmo medio</span>
            <span className="font-display text-2xl font-extrabold tabular-nums text-[#0D0F12]">
              {summary.avgPaceFormatted} <span className="text-sm font-semibold text-[#525866]">/km</span>
            </span>
          </div>
        </div>
      </div>

      {/* Filter Segmented Bar */}
      <div className="flex items-center gap-1 p-1 bg-[#E9ECEF] rounded-xl overflow-x-auto">
        {FILTER_OPTIONS.map((opt) => {
          const active = filter === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => setFilter(opt)}
              className={`min-h-[40px] flex-1 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-white text-[#0D0F12] shadow-sm'
                  : 'text-[#525866] hover:text-[#0D0F12]'
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {/* Workout Rows */}
      {filteredWorkouts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-black/8 p-8 text-center">
          <p className="text-sm font-semibold text-[#0D0F12]">
            No hay entrenamientos registrados en esta vista.
          </p>
          <p className="mt-1 text-xs text-[#525866]">
            Completa el formulario rápido para calcular tu ritmo y guardar la primera sesión.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-black/8 divide-y divide-black/6 overflow-hidden">
          {filteredWorkouts.map((item) => {
            const isAnalyzing = analyzingId === item.id;
            const isUploading = uploadingId === item.id;

            return (
              <article key={item.id} className="p-4 sm:p-5 space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[#0D0F12] text-[#C6F806] flex items-center justify-center shrink-0 mt-0.5">
                      <ActivityIcon tipo={item.tipo} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#525866]">
                        <span className="font-semibold text-[#0D0F12]">{item.tipo}</span>
                        <span aria-hidden="true">·</span>
                        <span>{formatDisplayDate(item.fecha)}</span>
                        <span aria-hidden="true">·</span>
                        <span className={item.syncedToSheets ? 'text-emerald-700 font-medium' : 'text-[#525866]'}>
                          {item.syncedToSheets ? 'En Google Sheets' : 'Demo local'}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                        <span className="font-display text-2xl font-extrabold tabular-nums text-[#0D0F12]">
                          {item.distancia_km.toFixed(2)} km
                        </span>
                        <span className="font-mono text-sm font-semibold tabular-nums text-[#363B44]">
                          {item.duracion_min.toFixed(0)} min
                        </span>
                        <span className="font-mono text-sm font-bold tabular-nums text-[#0052FF]">
                          {item.ritmo_min_km} min/km
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {!item.syncedToSheets && (isConnected || hasAppsScript) && (
                      <button
                        type="button"
                        onClick={() => onUploadLocalWorkout(item)}
                        disabled={isUploading}
                        title="Subir registro local a Google Sheets"
                        className="min-h-[40px] min-w-[40px] px-2.5 rounded-lg text-xs font-semibold text-[#0D0F12] bg-[#C6F806] hover:bg-[#B8EA00] inline-flex items-center justify-center gap-1 transition-colors"
                      >
                        {isUploading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                        ) : (
                          <CloudUpload className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                        <span className="hidden sm:inline">Subir</span>
                      </button>
                    )}

                    {!item.aiAnalysis && (
                      <button
                        type="button"
                        onClick={() => onAnalyzeWorkout(item)}
                        disabled={isAnalyzing}
                        title="Analizar sesión con Gemini IA"
                        className="min-h-[40px] min-w-[40px] px-2 rounded-lg text-xs font-medium text-[#525866] hover:text-[#0D0F12] hover:bg-[#F0F2F5] inline-flex items-center justify-center transition-colors"
                      >
                        {isAnalyzing ? (
                          <Loader2 className="w-4 h-4 animate-spin text-[#0052FF]" aria-hidden="true" />
                        ) : (
                          <BrainCircuit className="w-4 h-4 text-[#0052FF]" aria-hidden="true" />
                        )}
                      </button>
                    )}

                    {item.source === 'local' && (
                      <button
                        type="button"
                        onClick={() => onDeleteLocalWorkout(item.id)}
                        title="Eliminar registro local"
                        className="min-h-[40px] min-w-[40px] px-2 rounded-lg text-[#525866] hover:text-red-600 hover:bg-red-50 inline-flex items-center justify-center transition-colors"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>

                {item.notas && (
                  <p className="text-xs sm:text-sm text-[#363B44] pl-12 leading-relaxed">
                    {item.notas}
                  </p>
                )}

                {item.aiAnalysis && (
                  <div className="ml-12 p-3 rounded-xl bg-[#F4F6F9] text-xs sm:text-sm text-[#1F242D] leading-relaxed">
                    <span className="font-semibold text-[#0052FF] mr-1.5">IA:</span>
                    {item.aiAnalysis}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
