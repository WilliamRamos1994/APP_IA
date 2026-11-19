import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Smartphone, Sheet } from 'lucide-react';
import { Header, type AppTab } from './components/Header';
import { MobileNav } from './components/MobileNav';
import { PaceHeroCard } from './components/PaceHeroCard';
import { WorkoutForm } from './components/WorkoutForm';
import { HistoryPanel } from './components/HistoryPanel';
import { SheetsConfigPanel } from './components/SheetsConfigPanel';
import type { SheetsConfig, WorkoutEntry, WorkoutType } from './types/workout';
import {
  calculatePace,
  getInitialDemoWorkouts,
  getTodayISO,
} from './utils/pace';
import {
  DEFAULT_APPS_SCRIPT_URL,
  appendWorkoutToSheet,
  fetchSpreadsheetInfoAndRows,
  requestSheetsAccessToken,
  revokeSheetsToken,
  sendWorkoutToAppsScript,
  writeHeaderRowToSheet,
} from './services/googleSheets';

const STORAGE_CONFIG_KEY = 'runtracker_sheets_config_v1';
const STORAGE_DEMO_KEY = 'runtracker_demo_mode_v2';
const STORAGE_WORKOUTS_KEY = 'runtracker_local_workouts_v1';

function loadInitialConfig(): SheetsConfig {
  try {
    const raw = localStorage.getItem(STORAGE_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SheetsConfig>;
      return {
        appsScriptUrl:
          typeof parsed.appsScriptUrl === 'string' && parsed.appsScriptUrl.trim()
            ? parsed.appsScriptUrl
            : DEFAULT_APPS_SCRIPT_URL,
        clientId: typeof parsed.clientId === 'string' ? parsed.clientId : '',
        spreadsheetId: typeof parsed.spreadsheetId === 'string' ? parsed.spreadsheetId : '',
        sheetName:
          typeof parsed.sheetName === 'string' && parsed.sheetName.trim()
            ? parsed.sheetName
            : 'Hoja 1',
      };
    }
  } catch {
    // Fallback to defaults
  }
  return {
    appsScriptUrl: DEFAULT_APPS_SCRIPT_URL,
    clientId: '',
    spreadsheetId: '',
    sheetName: 'Hoja 1',
  };
}

function loadInitialDemoMode(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_DEMO_KEY);
    if (raw === null) return false;
    return JSON.parse(raw) === true;
  } catch {
    return false;
  }
}

function loadInitialLocalWorkouts(): WorkoutEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_WORKOUTS_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Fallback to initial demo entries
  }
  return getInitialDemoWorkouts();
}

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('registrar');

  // Form state
  const [fecha, setFecha] = useState<string>(() => getTodayISO());
  const [tipo, setTipo] = useState<WorkoutType>('Correr');
  const [distanciaInput, setDistanciaInput] = useState<string>('5.0');
  const [duracionInput, setDuracionInput] = useState<string>('27');
  const [notas, setNotas] = useState<string>('');

  // Gemini AI analysis state
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string>('');

  // Save state
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveFeedback, setSaveFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Persisted settings & local workouts
  const [config, setConfig] = useState<SheetsConfig>(loadInitialConfig);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(loadInitialDemoMode);
  const [localWorkouts, setLocalWorkouts] = useState<WorkoutEntry[]>(loadInitialLocalWorkouts);

  // Google Sheets OAuth in-memory state (token never stored in localStorage)
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isSyncingSheet, setIsSyncingSheet] = useState<boolean>(false);
  const [sheetTitle, setSheetTitle] = useState<string>('');
  const [availableTabs, setAvailableTabs] = useState<string[]>([]);
  const [hasHeaderRow, setHasHeaderRow] = useState<boolean | null>(null);
  const [sheetRows, setSheetRows] = useState<WorkoutEntry[]>([]);
  const [connectionError, setConnectionError] = useState<string>('');
  const [connectionSuccess, setConnectionSuccess] = useState<string>('');

  // Per-row action state in history
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const isConnected = Boolean(accessToken);
  const hasAppsScript = Boolean(config.appsScriptUrl.trim());

  // Persist config, demo mode, and local workouts to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(config));
    } catch {
      // Ignore storage quota errors
    }
  }, [config]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_DEMO_KEY, JSON.stringify(isDemoMode));
    } catch {
      // Ignore storage quota errors
    }
  }, [isDemoMode]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_WORKOUTS_KEY, JSON.stringify(localWorkouts));
    } catch {
      // Ignore storage quota errors
    }
  }, [localWorkouts]);

  const distanceKm = parseFloat(distanciaInput.replace(',', '.'));
  const durationMin = parseFloat(duracionInput.replace(',', '.'));

  const paceMetrics = useMemo(
    () => calculatePace(distanceKm, durationMin, tipo),
    [distanceKm, durationMin, tipo]
  );

  const displayedWorkouts = useMemo(() => {
    if (isConnected) {
      const unsyncedLocals = localWorkouts.filter((w) => !w.syncedToSheets);
      return [...unsyncedLocals, ...sheetRows];
    }
    return localWorkouts;
  }, [isConnected, localWorkouts, sheetRows]);

  const loadSheetData = useCallback(
    async (token: string, targetConfig: SheetsConfig) => {
      if (!targetConfig.spreadsheetId.trim()) {
        setConnectionError('Ingresa el Spreadsheet ID para leer la hoja.');
        return;
      }
      setIsSyncingSheet(true);
      setConnectionError('');
      try {
        const result = await fetchSpreadsheetInfoAndRows(
          token,
          targetConfig.spreadsheetId,
          targetConfig.sheetName
        );
        setSheetTitle(result.title);
        setAvailableTabs(result.availableTabs);
        setSheetRows(result.rows);
        setHasHeaderRow(result.hasHeaderRow);
        setConnectionSuccess(
          `Conectado a "${result.title}" · ${result.rows.length} fila(s) leídas de ${
            targetConfig.sheetName || 'Hoja 1'
          }.`
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al leer Google Sheets.';
        setConnectionError(msg);
      } finally {
        setIsSyncingSheet(false);
      }
    },
    []
  );

  const handleConnectSheets = async () => {
    setConnectionError('');
    setConnectionSuccess('');
    if (!config.clientId.trim()) {
      setConnectionError('Ingresa primero tu OAuth Client ID.');
      return;
    }

    setIsConnecting(true);
    try {
      const { accessToken: token } = await requestSheetsAccessToken(config.clientId);
      setAccessToken(token);
      setIsDemoMode(false);

      if (config.spreadsheetId.trim()) {
        await loadSheetData(token, config);
      } else {
        setConnectionSuccess(
          'Autorización exitosa. Ahora pega el Spreadsheet ID para empezar a guardar filas.'
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo conectar con Google Sheets.';
      setConnectionError(msg);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectSheets = () => {
    if (accessToken) {
      revokeSheetsToken(accessToken);
    }
    setAccessToken(null);
    setSheetTitle('');
    setAvailableTabs([]);
    setSheetRows([]);
    setHasHeaderRow(null);
    setConnectionError('');
    setConnectionSuccess('Sesión de Google Sheets desconectada.');
  };

  const handleCreateHeaders = async () => {
    if (!accessToken || !config.spreadsheetId.trim()) return;
    setIsSyncingSheet(true);
    setConnectionError('');
    try {
      await writeHeaderRowToSheet(
        accessToken,
        config.spreadsheetId,
        config.sheetName || 'Hoja 1'
      );
      setHasHeaderRow(true);
      setConnectionSuccess('Encabezados (fecha, tipo, distancia_km, duracion_min, notas) agregados en A1:E1.');
    } catch (err) {
      setConnectionError(err instanceof Error ? err.message : 'Error al escribir encabezados.');
    } finally {
      setIsSyncingSheet(false);
    }
  };

  const callGeminiAnalysis = async (payload: {
    fecha: string;
    tipo: WorkoutType;
    distancia_km: number;
    duracion_min: number;
    ritmo_formatted: string;
    notas: string;
  }): Promise<string> => {
    const res = await fetch('/api/analyze-run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error || 'No se pudo generar el análisis con IA.');
    }
    return data.analysis as string;
  };

  const handleAnalyzeForm = async () => {
    if (!paceMetrics.paceDecimal) return;
    setAiLoading(true);
    setAiError('');
    try {
      const analysis = await callGeminiAnalysis({
        fecha,
        tipo,
        distancia_km: distanceKm,
        duracion_min: durationMin,
        ritmo_formatted: paceMetrics.paceFormatted,
        notas,
      });
      setAiAnalysis(analysis);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Error al consultar Gemini.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveFeedback(null);

    if (!paceMetrics.paceDecimal) {
      setSaveFeedback({
        type: 'error',
        text: 'Ingresa una distancia y duración válidas antes de guardar.',
      });
      return;
    }

    const cleanNotes = notas.trim();
    const newEntry: WorkoutEntry = {
      id: `run-${Date.now()}`,
      fecha,
      tipo,
      distancia_km: Number(distanceKm.toFixed(2)),
      duracion_min: Number(durationMin.toFixed(1)),
      ritmo_min_km: paceMetrics.paceFormatted,
      notas: cleanNotes,
      aiAnalysis: aiAnalysis || undefined,
      source: 'local',
      syncedToSheets: false,
      createdAt: new Date().toISOString(),
    };

    // 1. Offline / Demo local-only mode
    if (isDemoMode) {
      setLocalWorkouts((prev) => [newEntry, ...prev]);
      setSaveFeedback({
        type: 'success',
        text: 'Entrenamiento guardado en Modo demo / local.',
      });
      setNotas('');
      setAiAnalysis('');
      setAiError('');
      return;
    }

    // 2. OAuth Google Sheets API v4 (if connected with spreadsheetId)
    if (isConnected && accessToken && config.spreadsheetId.trim()) {
      setIsSaving(true);
      try {
        const { updatedRange } = await appendWorkoutToSheet(
          accessToken,
          config.spreadsheetId,
          config.sheetName || 'Hoja 1',
          {
            fecha: newEntry.fecha,
            tipo: newEntry.tipo,
            distancia_km: newEntry.distancia_km,
            duracion_min: newEntry.duracion_min,
            notas: newEntry.notas,
          }
        );

        const syncedEntry: WorkoutEntry = {
          ...newEntry,
          source: 'sheets',
          syncedToSheets: true,
        };
        setSheetRows((prev) => [syncedEntry, ...prev]);
        setSaveFeedback({
          type: 'success',
          text: `Fila agregada en Google Sheets (${updatedRange}).`,
        });
        setNotas('');
        setAiAnalysis('');
        setAiError('');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al guardar en Google Sheets.';
        setSaveFeedback({
          type: 'error',
          text: `${msg} Puedes activar el Modo demo para guardarlo localmente.`,
        });
      } finally {
        setIsSaving(false);
      }
      return;
    }

    // 3. Google Apps Script (/exec) direct POST without OAuth
    if (hasAppsScript) {
      setIsSaving(true);
      try {
        await sendWorkoutToAppsScript(config.appsScriptUrl, {
          fecha: newEntry.fecha,
          tipo: newEntry.tipo,
          distancia_km: newEntry.distancia_km,
          duracion_min: newEntry.duracion_min,
          notas: newEntry.notas,
        });

        const syncedEntry: WorkoutEntry = {
          ...newEntry,
          syncedToSheets: true,
        };
        setLocalWorkouts((prev) => [syncedEntry, ...prev]);
        setSaveFeedback({
          type: 'success',
          text: 'Registro enviado a Google Sheets mediante Apps Script (/exec).',
        });
        setNotas('');
        setAiAnalysis('');
        setAiError('');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al enviar a Apps Script.';
        setSaveFeedback({
          type: 'error',
          text: `${msg} Revisa tu conexión o activa el Modo demo local.`,
        });
      } finally {
        setIsSaving(false);
      }
      return;
    }

    setSaveFeedback({
      type: 'error',
      text: 'Configura la URL de Google Apps Script, conecta OAuth o activa el Modo demo / local.',
    });
  };

  const handleAnalyzeHistoryWorkout = async (workout: WorkoutEntry) => {
    setAnalyzingId(workout.id);
    try {
      const analysis = await callGeminiAnalysis({
        fecha: workout.fecha,
        tipo: workout.tipo,
        distancia_km: workout.distancia_km,
        duracion_min: workout.duracion_min,
        ritmo_formatted: workout.ritmo_min_km,
        notas: workout.notas,
      });

      setLocalWorkouts((prev) =>
        prev.map((w) => (w.id === workout.id ? { ...w, aiAnalysis: analysis } : w))
      );
      setSheetRows((prev) =>
        prev.map((w) => (w.id === workout.id ? { ...w, aiAnalysis: analysis } : w))
      );
    } catch (err) {
      setSaveFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error al analizar sesión.',
      });
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleUploadLocalWorkout = async (workout: WorkoutEntry) => {
    setUploadingId(workout.id);
    try {
      if (accessToken && config.spreadsheetId.trim()) {
        await appendWorkoutToSheet(
          accessToken,
          config.spreadsheetId,
          config.sheetName || 'Hoja 1',
          {
            fecha: workout.fecha,
            tipo: workout.tipo,
            distancia_km: workout.distancia_km,
            duracion_min: workout.duracion_min,
            notas: workout.notas,
          }
        );
        setLocalWorkouts((prev) =>
          prev.map((w) => (w.id === workout.id ? { ...w, syncedToSheets: true } : w))
        );
        setSheetRows((prev) => [{ ...workout, syncedToSheets: true, source: 'sheets' }, ...prev]);
      } else if (hasAppsScript) {
        await sendWorkoutToAppsScript(config.appsScriptUrl, {
          fecha: workout.fecha,
          tipo: workout.tipo,
          distancia_km: workout.distancia_km,
          duracion_min: workout.duracion_min,
          notas: workout.notas,
        });
        setLocalWorkouts((prev) =>
          prev.map((w) => (w.id === workout.id ? { ...w, syncedToSheets: true } : w))
        );
      }
    } catch (err) {
      setConnectionError(
        err instanceof Error ? err.message : 'No se pudo subir el registro local a la hoja.'
      );
    } finally {
      setUploadingId(null);
    }
  };

  const handleDeleteLocalWorkout = (id: string) => {
    setLocalWorkouts((prev) => prev.filter((w) => w.id !== id));
  };

  const handleResetDemoData = () => {
    setLocalWorkouts(getInitialDemoWorkouts());
  };

  const handleClearLocalData = () => {
    setLocalWorkouts([]);
  };

  return (
    <div id="top" className="min-h-screen flex flex-col bg-[#F4F5F7]">
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isConnected={isConnected}
        hasAppsScript={hasAppsScript}
        isDemoMode={isDemoMode}
        onPrimaryAction={() => setActiveTab('conexion')}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 pt-4 pb-24 lg:py-8">
        {/* Mobile Tabbed View (< lg) */}
        <div className="lg:hidden space-y-4">
          {activeTab === 'registrar' && (
            <>
              <PaceHeroCard
                tipo={tipo}
                distanceKm={distanceKm}
                durationMin={durationMin}
                metrics={paceMetrics}
              />

              {/* Compact Mode Switcher Banner on Mobile */}
              <div className="bg-white rounded-xl border border-black/8 px-4 py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0 text-xs text-[#525866]">
                  {isDemoMode ? (
                    <>
                      <Smartphone className="w-4 h-4 text-[#0D0F12] shrink-0" aria-hidden="true" />
                      <span className="truncate font-medium text-[#0D0F12]">
                        Modo demo / local activo
                      </span>
                    </>
                  ) : isConnected ? (
                    <>
                      <Sheet className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
                      <span className="truncate font-medium text-[#0D0F12]">
                        Hoja: {config.sheetName || 'Hoja 1'}
                      </span>
                    </>
                  ) : hasAppsScript ? (
                    <>
                      <Sheet className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
                      <span className="truncate font-medium text-[#0D0F12]">
                        Apps Script (/exec) conectado
                      </span>
                    </>
                  ) : (
                    <>
                      <Smartphone className="w-4 h-4 text-[#0D0F12] shrink-0" aria-hidden="true" />
                      <span className="truncate font-medium text-[#0D0F12]">
                        Google Sheets sin configurar
                      </span>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('conexion')}
                  className="text-xs font-bold text-[#0052FF] inline-flex items-center gap-1 whitespace-nowrap shrink-0 min-h-[36px] px-1"
                >
                  <span>Configurar</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>

              <WorkoutForm
                fecha={fecha}
                tipo={tipo}
                distanciaInput={distanciaInput}
                duracionInput={duracionInput}
                notas={notas}
                metrics={paceMetrics}
                aiAnalysis={aiAnalysis}
                aiLoading={aiLoading}
                aiError={aiError}
                isSaving={isSaving}
                saveFeedback={saveFeedback}
                isConnected={isConnected}
                hasAppsScript={hasAppsScript}
                isDemoMode={isDemoMode}
                onChangeFecha={setFecha}
                onChangeTipo={setTipo}
                onChangeDistancia={setDistanciaInput}
                onChangeDuracion={setDuracionInput}
                onChangeNotas={setNotas}
                onAnalyzeWithAI={handleAnalyzeForm}
                onSaveWorkout={handleSaveWorkout}
              />
            </>
          )}

          {activeTab === 'historial' && (
            <HistoryPanel
              workouts={displayedWorkouts}
              isConnected={isConnected}
              hasAppsScript={hasAppsScript}
              isSyncingSheet={isSyncingSheet}
              analyzingId={analyzingId}
              uploadingId={uploadingId}
              onRefreshFromSheets={() => accessToken && loadSheetData(accessToken, config)}
              onUploadLocalWorkout={handleUploadLocalWorkout}
              onAnalyzeWorkout={handleAnalyzeHistoryWorkout}
              onDeleteLocalWorkout={handleDeleteLocalWorkout}
            />
          )}

          {activeTab === 'conexion' && (
            <SheetsConfigPanel
              config={config}
              isDemoMode={isDemoMode}
              isConnected={isConnected}
              isConnecting={isConnecting}
              isTestingSheet={isSyncingSheet}
              sheetTitle={sheetTitle}
              availableTabs={availableTabs}
              hasHeaderRow={hasHeaderRow}
              connectionError={connectionError}
              connectionSuccess={connectionSuccess}
              onUpdateConfig={setConfig}
              onToggleDemoMode={setIsDemoMode}
              onConnectSheets={handleConnectSheets}
              onDisconnectSheets={handleDisconnectSheets}
              onTestAndLoadSheet={() => accessToken && loadSheetData(accessToken, config)}
              onCreateHeaders={handleCreateHeaders}
              onResetDemoData={handleResetDemoData}
              onClearLocalData={handleClearLocalData}
            />
          )}
        </div>

        {/* Desktop Multi-Column Command Workspace (>= lg) */}
        <div className="hidden lg:grid lg:grid-cols-12 lg:gap-8 items-start">
          {activeTab === 'conexion' ? (
            <>
              <div className="lg:col-span-7">
                <SheetsConfigPanel
                  config={config}
                  isDemoMode={isDemoMode}
                  isConnected={isConnected}
                  isConnecting={isConnecting}
                  isTestingSheet={isSyncingSheet}
                  sheetTitle={sheetTitle}
                  availableTabs={availableTabs}
                  hasHeaderRow={hasHeaderRow}
                  connectionError={connectionError}
                  connectionSuccess={connectionSuccess}
                  onUpdateConfig={setConfig}
                  onToggleDemoMode={setIsDemoMode}
                  onConnectSheets={handleConnectSheets}
                  onDisconnectSheets={handleDisconnectSheets}
                  onTestAndLoadSheet={() => accessToken && loadSheetData(accessToken, config)}
                  onCreateHeaders={handleCreateHeaders}
                  onResetDemoData={handleResetDemoData}
                  onClearLocalData={handleClearLocalData}
                />
              </div>
              <div className="lg:col-span-5">
                <HistoryPanel
                  workouts={displayedWorkouts}
                  isConnected={isConnected}
                  hasAppsScript={hasAppsScript}
                  isSyncingSheet={isSyncingSheet}
                  analyzingId={analyzingId}
                  uploadingId={uploadingId}
                  onRefreshFromSheets={() => accessToken && loadSheetData(accessToken, config)}
                  onUploadLocalWorkout={handleUploadLocalWorkout}
                  onAnalyzeWorkout={handleAnalyzeHistoryWorkout}
                  onDeleteLocalWorkout={handleDeleteLocalWorkout}
                />
              </div>
            </>
          ) : activeTab === 'historial' ? (
            <>
              <div className="lg:col-span-8">
                <HistoryPanel
                  workouts={displayedWorkouts}
                  isConnected={isConnected}
                  hasAppsScript={hasAppsScript}
                  isSyncingSheet={isSyncingSheet}
                  analyzingId={analyzingId}
                  uploadingId={uploadingId}
                  onRefreshFromSheets={() => accessToken && loadSheetData(accessToken, config)}
                  onUploadLocalWorkout={handleUploadLocalWorkout}
                  onAnalyzeWorkout={handleAnalyzeHistoryWorkout}
                  onDeleteLocalWorkout={handleDeleteLocalWorkout}
                />
              </div>
              <div className="lg:col-span-4 space-y-5">
                <PaceHeroCard
                  tipo={tipo}
                  distanceKm={distanceKm}
                  durationMin={durationMin}
                  metrics={paceMetrics}
                />
                <SheetsConfigPanel
                  config={config}
                  isDemoMode={isDemoMode}
                  isConnected={isConnected}
                  isConnecting={isConnecting}
                  isTestingSheet={isSyncingSheet}
                  sheetTitle={sheetTitle}
                  availableTabs={availableTabs}
                  hasHeaderRow={hasHeaderRow}
                  connectionError={connectionError}
                  connectionSuccess={connectionSuccess}
                  onUpdateConfig={setConfig}
                  onToggleDemoMode={setIsDemoMode}
                  onConnectSheets={handleConnectSheets}
                  onDisconnectSheets={handleDisconnectSheets}
                  onTestAndLoadSheet={() => accessToken && loadSheetData(accessToken, config)}
                  onCreateHeaders={handleCreateHeaders}
                  onResetDemoData={handleResetDemoData}
                  onClearLocalData={handleClearLocalData}
                />
              </div>
            </>
          ) : (
            <>
              <div className="lg:col-span-6 space-y-5">
                <PaceHeroCard
                  tipo={tipo}
                  distanceKm={distanceKm}
                  durationMin={durationMin}
                  metrics={paceMetrics}
                />
                <WorkoutForm
                  fecha={fecha}
                  tipo={tipo}
                  distanciaInput={distanciaInput}
                  duracionInput={duracionInput}
                  notas={notas}
                  metrics={paceMetrics}
                  aiAnalysis={aiAnalysis}
                  aiLoading={aiLoading}
                  aiError={aiError}
                  isSaving={isSaving}
                  saveFeedback={saveFeedback}
                  isConnected={isConnected}
                  hasAppsScript={hasAppsScript}
                  isDemoMode={isDemoMode}
                  onChangeFecha={setFecha}
                  onChangeTipo={setTipo}
                  onChangeDistancia={setDistanciaInput}
                  onChangeDuracion={setDuracionInput}
                  onChangeNotas={setNotas}
                  onAnalyzeWithAI={handleAnalyzeForm}
                  onSaveWorkout={handleSaveWorkout}
                />
              </div>
              <div className="lg:col-span-6 space-y-5">
                <HistoryPanel
                  workouts={displayedWorkouts}
                  isConnected={isConnected}
                  hasAppsScript={hasAppsScript}
                  isSyncingSheet={isSyncingSheet}
                  analyzingId={analyzingId}
                  uploadingId={uploadingId}
                  onRefreshFromSheets={() => accessToken && loadSheetData(accessToken, config)}
                  onUploadLocalWorkout={handleUploadLocalWorkout}
                  onAnalyzeWorkout={handleAnalyzeHistoryWorkout}
                  onDeleteLocalWorkout={handleDeleteLocalWorkout}
                />
              </div>
            </>
          )}
        </div>
      </main>

      <MobileNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        workoutCount={displayedWorkouts.length}
      />
    </div>
  );
}
