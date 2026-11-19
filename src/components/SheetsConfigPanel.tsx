import React, { useState } from 'react';
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  FileSpreadsheet,
  KeyRound,
  Link2,
  Loader2,
  LogOut,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  TableProperties,
} from 'lucide-react';
import type { SheetsConfig } from '../types/workout';
import { DEFAULT_APPS_SCRIPT_URL } from '../services/googleSheets';
import { extractSpreadsheetId } from '../utils/pace';

interface SheetsConfigPanelProps {
  config: SheetsConfig;
  isDemoMode: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  isTestingSheet: boolean;
  sheetTitle: string;
  availableTabs: string[];
  hasHeaderRow: boolean | null;
  connectionError: string;
  connectionSuccess: string;
  onUpdateConfig: (next: SheetsConfig) => void;
  onToggleDemoMode: (enabled: boolean) => void;
  onConnectSheets: () => void;
  onDisconnectSheets: () => void;
  onTestAndLoadSheet: () => void;
  onCreateHeaders: () => void;
  onResetDemoData: () => void;
  onClearLocalData: () => void;
}

export const SheetsConfigPanel: React.FC<SheetsConfigPanelProps> = ({
  config,
  isDemoMode,
  isConnected,
  isConnecting,
  isTestingSheet,
  sheetTitle,
  availableTabs,
  hasHeaderRow,
  connectionError,
  connectionSuccess,
  onUpdateConfig,
  onToggleDemoMode,
  onConnectSheets,
  onDisconnectSheets,
  onTestAndLoadSheet,
  onCreateHeaders,
  onResetDemoData,
  onClearLocalData,
}) => {
  const [showGuide, setShowGuide] = useState(false);
  const [showOAuthSection, setShowOAuthSection] = useState(false);
  const [copiedOrigin, setCopiedOrigin] = useState(false);

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  const copyOrigin = async () => {
    if (!currentOrigin) return;
    try {
      await navigator.clipboard.writeText(currentOrigin);
      setCopiedOrigin(true);
      setTimeout(() => setCopiedOrigin(false), 2000);
    } catch {
      // Clipboard fallback ignored
    }
  };

  return (
    <section aria-label="Configuración de Google Sheets y Modo Demo" className="space-y-4">
      {/* Primary Direct Integration: Google Apps Script (/exec) without OAuth */}
      <div className="bg-white rounded-2xl border border-black/8 p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-[#0D0F12]">
              Google Apps Script (/exec)
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-[#525866]">
              Envío directo por POST sin requerir OAuth. URL guardada en tu navegador (localStorage).
            </p>
          </div>
          {config.appsScriptUrl.trim() && !isDemoMode && (
            <span className="text-xs font-bold text-emerald-700 inline-flex items-center gap-1 shrink-0 pt-1">
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
              Listo
            </span>
          )}
        </div>

        <div>
          <label
            htmlFor="apps-script-url"
            className="block text-xs font-semibold text-[#525866] mb-1.5"
          >
            URL del Web App (/exec)
          </label>
          <div className="relative">
            <Link2
              className="w-4 h-4 text-[#525866] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="apps-script-url"
              type="url"
              value={config.appsScriptUrl}
              onChange={(e) =>
                onUpdateConfig({ ...config, appsScriptUrl: e.target.value })
              }
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full min-h-[46px] pl-10 pr-3.5 bg-[#F7F8FA] border border-black/10 rounded-xl font-mono text-xs text-[#0D0F12] placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#0D0F12] focus:bg-white transition-colors"
            />
          </div>

          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-[#525866]">
              Envía POST (no-cors, text/plain) con: fecha, tipo, distancia_km, duracion_min, notas
            </span>
            {config.appsScriptUrl.trim() !== DEFAULT_APPS_SCRIPT_URL && (
              <button
                type="button"
                onClick={() =>
                  onUpdateConfig({ ...config, appsScriptUrl: DEFAULT_APPS_SCRIPT_URL })
                }
                className="min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-semibold text-[#0D0F12] bg-[#F0F2F5] hover:bg-[#E4E7EC] inline-flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" aria-hidden="true" />
                <span>Restaurar URL por defecto</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Demo / Local Mode Card */}
      <div className="bg-white rounded-2xl border border-black/8 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F0F2F5] text-[#0D0F12] flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0D0F12]">Modo demo / local</h3>
              <p className="mt-0.5 text-xs sm:text-sm text-[#525866] leading-relaxed">
                Actívalo para probar en el celular sin conexión ni envíos externos. Desactívalo para enviar cada sesión a tu URL de Google Apps Script o Sheets.
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={isDemoMode}
            aria-label="Activar o desactivar modo demo local"
            onClick={() => onToggleDemoMode(!isDemoMode)}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D0F12] ${
              isDemoMode ? 'bg-[#0D0F12]' : 'bg-neutral-300'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow transition duration-200 ${
                isDemoMode ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="mt-4 pt-3 border-t border-black/6 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onResetDemoData}
            className="min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold text-[#0D0F12] bg-[#F0F2F5] hover:bg-[#E4E7EC] inline-flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Cargar ejemplos demo</span>
          </button>
          <button
            type="button"
            onClick={onClearLocalData}
            className="min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
          >
            Vaciar registros locales
          </button>
        </div>
      </div>

      {/* Optional OAuth Google Sheets API Card */}
      <div className="bg-white rounded-2xl border border-black/8 p-5 space-y-4">
        <button
          type="button"
          onClick={() => setShowOAuthSection((v) => !v)}
          className="w-full min-h-[40px] flex items-center justify-between gap-3 text-left"
        >
          <div>
            <h3 className="text-base font-bold text-[#0D0F12]">
              Conexión avanzada con OAuth (Opcional)
            </h3>
            <p className="text-xs text-[#525866]">
              Lectura bidireccional y escritura directa vía Google Sheets API v4
            </p>
          </div>
          {showOAuthSection || isConnected ? (
            <ChevronUp className="w-4 h-4 text-[#525866] shrink-0" aria-hidden="true" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#525866] shrink-0" aria-hidden="true" />
          )}
        </button>

        {(showOAuthSection || isConnected) && (
          <div className="space-y-4 pt-2 border-t border-black/6">
            <div className="space-y-3.5">
              <div>
                <label
                  htmlFor="sheets-client-id"
                  className="block text-xs font-semibold text-[#525866] mb-1.5"
                >
                  OAuth Client ID
                </label>
                <div className="relative">
                  <KeyRound
                    className="w-4 h-4 text-[#525866] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="sheets-client-id"
                    type="text"
                    value={config.clientId}
                    onChange={(e) =>
                      onUpdateConfig({ ...config, clientId: e.target.value })
                    }
                    placeholder="1234567890-abcdef.apps.googleusercontent.com"
                    className="w-full min-h-[46px] pl-10 pr-3.5 bg-[#F7F8FA] border border-black/10 rounded-xl font-mono text-xs sm:text-sm text-[#0D0F12] placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#0D0F12] focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="sheets-spreadsheet-id"
                  className="block text-xs font-semibold text-[#525866] mb-1.5"
                >
                  Spreadsheet ID (o pega el enlace de Google Sheets)
                </label>
                <div className="relative">
                  <FileSpreadsheet
                    className="w-4 h-4 text-[#525866] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="sheets-spreadsheet-id"
                    type="text"
                    value={config.spreadsheetId}
                    onChange={(e) =>
                      onUpdateConfig({
                        ...config,
                        spreadsheetId: extractSpreadsheetId(e.target.value),
                      })
                    }
                    placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                    className="w-full min-h-[46px] pl-10 pr-3.5 bg-[#F7F8FA] border border-black/10 rounded-xl font-mono text-xs sm:text-sm text-[#0D0F12] placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#0D0F12] focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="sheets-tab-name"
                  className="block text-xs font-semibold text-[#525866] mb-1.5"
                >
                  Nombre de la pestaña
                </label>
                <div className="relative">
                  <TableProperties
                    className="w-4 h-4 text-[#525866] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="sheets-tab-name"
                    type="text"
                    value={config.sheetName}
                    onChange={(e) =>
                      onUpdateConfig({ ...config, sheetName: e.target.value })
                    }
                    placeholder="Hoja 1"
                    className="w-full min-h-[46px] pl-10 pr-3.5 bg-[#F7F8FA] border border-black/10 rounded-xl text-sm font-medium text-[#0D0F12] placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#0D0F12] focus:bg-white transition-colors"
                  />
                </div>

                {availableTabs.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-[#525866] mr-1">Pestañas detectadas:</span>
                    {availableTabs.map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => onUpdateConfig({ ...config, sheetName: tab })}
                        className={`min-h-[30px] px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                          config.sheetName === tab
                            ? 'bg-[#0D0F12] text-white'
                            : 'bg-[#F0F2F5] text-[#0D0F12] hover:bg-[#E4E7EC]'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {connectionError && (
              <div
                role="alert"
                className="rounded-xl p-3.5 bg-red-50 border border-red-200 text-xs sm:text-sm text-red-800 leading-relaxed"
              >
                {connectionError}
              </div>
            )}

            {connectionSuccess && (
              <div
                role="status"
                className="rounded-xl p-3.5 bg-emerald-50 border border-emerald-200 text-xs sm:text-sm text-emerald-900 leading-relaxed"
              >
                {connectionSuccess}
              </div>
            )}

            <div className="space-y-2.5 pt-1">
              {!isConnected ? (
                <button
                  type="button"
                  onClick={onConnectSheets}
                  disabled={isConnecting}
                  className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-[#0D0F12] hover:bg-[#1E2229] disabled:opacity-50 text-white text-sm font-bold inline-flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  {isConnecting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#C6F806]" aria-hidden="true" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-[#C6F806]" aria-hidden="true" />
                  )}
                  <span>{isConnecting ? 'Autorizando con Google...' : 'Conectar Google Sheets'}</span>
                </button>
              ) : (
                <div className="space-y-2.5">
                  {sheetTitle && (
                    <div className="text-xs text-[#525866]">
                      Documento activo: <span className="font-semibold text-[#0D0F12]">{sheetTitle}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={onTestAndLoadSheet}
                      disabled={isTestingSheet}
                      className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#F0F2F5] hover:bg-[#E4E7EC] text-xs sm:text-sm font-semibold text-[#0D0F12] inline-flex items-center justify-center gap-2 transition-colors"
                    >
                      {isTestingSheet ? (
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <FileSpreadsheet className="w-4 h-4" aria-hidden="true" />
                      )}
                      <span>Probar y leer hoja</span>
                    </button>

                    <button
                      type="button"
                      onClick={onDisconnectSheets}
                      className="min-h-[44px] px-3.5 py-2.5 rounded-xl border border-black/12 bg-white hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-xs sm:text-sm font-semibold text-[#0D0F12] inline-flex items-center justify-center gap-2 transition-colors"
                    >
                      <LogOut className="w-4 h-4" aria-hidden="true" />
                      <span>Desconectar</span>
                    </button>
                  </div>

                  {hasHeaderRow === false && (
                    <button
                      type="button"
                      onClick={onCreateHeaders}
                      className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-[#C6F806] hover:bg-[#B8EA00] text-xs font-bold text-[#0D0F12] transition-colors"
                    >
                      Agregar encabezados en fila 1 (fecha, tipo, distancia_km, duracion_min, notas)
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Collapsible Setup Instructions */}
            <div className="pt-2 border-t border-black/6">
              <button
                type="button"
                onClick={() => setShowGuide((v) => !v)}
                className="w-full min-h-[40px] flex items-center justify-between text-xs font-semibold text-[#525866] hover:text-[#0D0F12] transition-colors"
              >
                <span>Cómo configurar OAuth Client ID (solo si usas OAuth)</span>
                {showGuide ? (
                  <ChevronUp className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <ChevronDown className="w-4 h-4" aria-hidden="true" />
                )}
              </button>

              {showGuide && (
                <div className="mt-3 space-y-2.5 text-xs text-[#525866] leading-relaxed">
                  <p>
                    1. En Google Cloud Console habilita la <strong className="text-[#0D0F12]">Google Sheets API</strong> y crea un ID de cliente OAuth 2.0 de tipo <strong className="text-[#0D0F12]">Aplicación web</strong>.
                  </p>
                  <div>
                    <p>2. Agrega esta URL en <strong className="text-[#0D0F12]">Orígenes autorizados de JavaScript</strong>:</p>
                    <div className="mt-1.5 flex items-center gap-2 bg-[#F4F5F7] rounded-lg px-3 py-2">
                      <code className="font-mono text-[11px] text-[#0D0F12] truncate flex-1">
                        {currentOrigin}
                      </code>
                      <button
                        type="button"
                        onClick={copyOrigin}
                        className="min-h-[30px] px-2 py-1 rounded bg-white border border-black/10 text-[11px] font-semibold text-[#0D0F12] inline-flex items-center gap-1 shrink-0"
                      >
                        {copiedOrigin ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" aria-hidden="true" />
                            <span>Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" aria-hidden="true" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <p>
                    3. El botón solicita el scope <code className="font-mono text-[11px] text-[#0D0F12]">https://www.googleapis.com/auth/spreadsheets</code> y agrega filas con: <strong className="text-[#0D0F12]">fecha, tipo, distancia_km, duracion_min, notas</strong>.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
