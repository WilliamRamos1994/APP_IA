import React from 'react';
import {
  BrainCircuit,
  Calendar,
  CheckCircle2,
  Footprints,
  Loader2,
  Mountain,
  Plus,
  Send,
  Timer,
  Zap,
} from 'lucide-react';
import type { PaceMetrics, WorkoutType } from '../types/workout';

interface WorkoutFormProps {
  fecha: string;
  tipo: WorkoutType;
  distanciaInput: string;
  duracionInput: string;
  notas: string;
  metrics: PaceMetrics;
  aiAnalysis: string;
  aiLoading: boolean;
  aiError: string;
  isSaving: boolean;
  saveFeedback: { type: 'success' | 'error'; text: string } | null;
  isConnected: boolean;
  hasAppsScript: boolean;
  isDemoMode: boolean;
  onChangeFecha: (val: string) => void;
  onChangeTipo: (val: WorkoutType) => void;
  onChangeDistancia: (val: string) => void;
  onChangeDuracion: (val: string) => void;
  onChangeNotas: (val: string) => void;
  onAnalyzeWithAI: () => void;
  onSaveWorkout: (e: React.FormEvent) => void;
}

const WORKOUT_TYPES: { id: WorkoutType; label: string; icon: React.ReactNode }[] = [
  { id: 'Correr', label: 'Correr', icon: <Zap className="w-4 h-4" aria-hidden="true" /> },
  { id: 'Caminata', label: 'Caminata', icon: <Footprints className="w-4 h-4" aria-hidden="true" /> },
  { id: 'Trail', label: 'Trail', icon: <Mountain className="w-4 h-4" aria-hidden="true" /> },
];

export const WorkoutForm: React.FC<WorkoutFormProps> = ({
  fecha,
  tipo,
  distanciaInput,
  duracionInput,
  notas,
  metrics,
  aiAnalysis,
  aiLoading,
  aiError,
  isSaving,
  saveFeedback,
  isConnected,
  hasAppsScript,
  isDemoMode,
  onChangeFecha,
  onChangeTipo,
  onChangeDistancia,
  onChangeDuracion,
  onChangeNotas,
  onAnalyzeWithAI,
  onSaveWorkout,
}) => {
  const bumpDistancia = (delta: number) => {
    const current = parseFloat(distanciaInput.replace(',', '.'));
    const next = Math.max(0.5, (Number.isFinite(current) ? current : 0) + delta);
    onChangeDistancia(next.toFixed(1));
  };

  const bumpDuracion = (delta: number) => {
    const current = parseFloat(duracionInput.replace(',', '.'));
    const next = Math.max(1, (Number.isFinite(current) ? current : 0) + delta);
    onChangeDuracion(String(Math.round(next)));
  };

  const hasValidMetrics = metrics.paceDecimal !== null;

  return (
    <form
      onSubmit={onSaveWorkout}
      className="bg-white rounded-2xl border border-black/8 p-5 sm:p-6 space-y-5"
    >
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-2xl font-bold tracking-tight text-[#0D0F12]">
          Nuevo entrenamiento
        </h2>
        <span className="text-xs font-medium text-[#525866] whitespace-nowrap">
          {isDemoMode
            ? 'Modo demo / local'
            : isConnected
            ? 'OAuth Google Sheets'
            : hasAppsScript
            ? 'Apps Script (/exec)'
            : 'Sin conexión'}
        </span>
      </div>

      {/* Sport Type Segmented Selector */}
      <div>
        <span className="block text-xs font-semibold text-[#525866] mb-2">
          Tipo de actividad
        </span>
        <div
          role="radiogroup"
          aria-label="Tipo de actividad"
          className="grid grid-cols-3 gap-1.5 p-1 bg-[#F0F2F5] rounded-xl"
        >
          {WORKOUT_TYPES.map((item) => {
            const active = tipo === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onChangeTipo(item.id)}
                className={`min-h-[44px] px-3 rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-2 transition-all whitespace-nowrap ${
                  active
                    ? 'bg-[#0D0F12] text-white shadow-sm'
                    : 'text-[#525866] hover:text-[#0D0F12]'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Date */}
      <div>
        <label htmlFor="workout-fecha" className="block text-xs font-semibold text-[#525866] mb-1.5">
          Fecha
        </label>
        <div className="relative">
          <Calendar
            className="w-4 h-4 text-[#525866] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            id="workout-fecha"
            type="date"
            required
            value={fecha}
            onChange={(e) => onChangeFecha(e.target.value)}
            className="w-full min-h-[48px] pl-10 pr-4 bg-[#F7F8FA] border border-black/10 rounded-xl text-sm font-medium text-[#0D0F12] focus:outline-none focus:ring-2 focus:ring-[#0D0F12] focus:bg-white transition-colors"
          />
        </div>
      </div>

      {/* Distance & Duration side-by-side */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div>
          <label
            htmlFor="workout-distancia"
            className="block text-xs font-semibold text-[#525866] mb-1.5"
          >
            Distancia (km)
          </label>
          <input
            id="workout-distancia"
            type="number"
            step="0.01"
            min="0.01"
            inputMode="decimal"
            placeholder="5.0"
            required
            value={distanciaInput}
            onChange={(e) => onChangeDistancia(e.target.value)}
            className="w-full min-h-[52px] px-3.5 bg-[#F7F8FA] border border-black/10 rounded-xl font-mono text-xl font-bold tabular-nums text-[#0D0F12] focus:outline-none focus:ring-2 focus:ring-[#0D0F12] focus:bg-white transition-colors"
          />
          <div className="mt-2 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => bumpDistancia(1)}
              className="min-h-[36px] flex-1 px-2 text-xs font-semibold text-[#0D0F12] bg-[#F0F2F5] hover:bg-[#E4E7EC] rounded-lg transition-colors inline-flex items-center justify-center gap-1"
            >
              <Plus className="w-3 h-3" aria-hidden="true" />1 km
            </button>
            <button
              type="button"
              onClick={() => bumpDistancia(5)}
              className="min-h-[36px] flex-1 px-2 text-xs font-semibold text-[#0D0F12] bg-[#F0F2F5] hover:bg-[#E4E7EC] rounded-lg transition-colors inline-flex items-center justify-center gap-1"
            >
              <Plus className="w-3 h-3" aria-hidden="true" />5 km
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor="workout-duracion"
            className="block text-xs font-semibold text-[#525866] mb-1.5"
          >
            Duración (min)
          </label>
          <div className="relative">
            <input
              id="workout-duracion"
              type="number"
              step="0.5"
              min="1"
              inputMode="decimal"
              placeholder="28"
              required
              value={duracionInput}
              onChange={(e) => onChangeDuracion(e.target.value)}
              className="w-full min-h-[52px] px-3.5 pr-9 bg-[#F7F8FA] border border-black/10 rounded-xl font-mono text-xl font-bold tabular-nums text-[#0D0F12] focus:outline-none focus:ring-2 focus:ring-[#0D0F12] focus:bg-white transition-colors"
            />
            <Timer
              className="w-4 h-4 text-[#525866] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => bumpDuracion(5)}
              className="min-h-[36px] flex-1 px-2 text-xs font-semibold text-[#0D0F12] bg-[#F0F2F5] hover:bg-[#E4E7EC] rounded-lg transition-colors inline-flex items-center justify-center gap-1"
            >
              <Plus className="w-3 h-3" aria-hidden="true" />5 min
            </button>
            <button
              type="button"
              onClick={() => bumpDuracion(10)}
              className="min-h-[36px] flex-1 px-2 text-xs font-semibold text-[#0D0F12] bg-[#F0F2F5] hover:bg-[#E4E7EC] rounded-lg transition-colors inline-flex items-center justify-center gap-1"
            >
              <Plus className="w-3 h-3" aria-hidden="true" />10 min
            </button>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="workout-notas" className="block text-xs font-semibold text-[#525866] mb-1.5">
          Notas de la sesión
        </label>
        <textarea
          id="workout-notas"
          rows={2}
          value={notas}
          onChange={(e) => onChangeNotas(e.target.value)}
          placeholder="Sensaciones, terreno, clima, frecuencia cardíaca..."
          className="w-full px-3.5 py-3 bg-[#F7F8FA] border border-black/10 rounded-xl text-sm text-[#0D0F12] placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#0D0F12] focus:bg-white transition-colors resize-none"
        />
      </div>

      {/* Gemini AI Coach Feedback Box */}
      {(aiAnalysis || aiError || aiLoading) && (
        <div
          aria-live="polite"
          className={`rounded-xl p-4 border ${
            aiError
              ? 'bg-red-50 border-red-200 text-red-900'
              : 'bg-[#F4F6F9] border-black/10 text-[#0D0F12]'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-xs font-bold tracking-tight text-[#0D0F12] inline-flex items-center gap-1.5">
              <BrainCircuit className="w-4 h-4 text-[#0052FF]" aria-hidden="true" />
              Comentario de Entrenador IA
            </span>
          </div>
          {aiLoading ? (
            <p className="text-sm text-[#525866] inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              Evaluando tu ritmo y sensaciones...
            </p>
          ) : aiError ? (
            <p className="text-sm text-red-700">{aiError}</p>
          ) : (
            <p className="text-sm leading-relaxed text-[#1F242D]">{aiAnalysis}</p>
          )}
        </div>
      )}

      {/* Save Feedback */}
      {saveFeedback && (
        <div
          role="status"
          className={`rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2.5 border ${
            saveFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          {saveFeedback.type === 'success' && (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
          )}
          <span>{saveFeedback.text}</span>
        </div>
      )}

      {/* Dual Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <button
          type="button"
          onClick={onAnalyzeWithAI}
          disabled={!hasValidMetrics || aiLoading}
          className="min-h-[48px] px-4 py-3 rounded-xl border border-[#0D0F12]/20 bg-white hover:bg-[#F4F5F7] disabled:opacity-45 disabled:pointer-events-none text-sm font-semibold text-[#0D0F12] inline-flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          {aiLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            <BrainCircuit className="w-4 h-4 text-[#0052FF]" aria-hidden="true" />
          )}
          <span>Analizar con IA</span>
        </button>

        <button
          type="submit"
          disabled={!hasValidMetrics || isSaving}
          className="min-h-[48px] px-4 py-3 rounded-xl bg-[#C6F806] hover:bg-[#B8EA00] disabled:opacity-45 disabled:pointer-events-none text-sm font-bold text-[#0D0F12] inline-flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="w-4 h-4" aria-hidden="true" />
          )}
          <span>{isSaving ? 'Guardando...' : 'Guardar en Hoja'}</span>
        </button>
      </div>
    </form>
  );
};
