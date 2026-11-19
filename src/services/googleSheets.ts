import type { WorkoutEntry, WorkoutType } from '../types/workout';
import { calculatePace } from '../utils/pace';

export const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
export const DEFAULT_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbzonKoO9tGbEgm_NOgefo3szhNjDFlf466ZYj4PKHfSYUciQbsQLCAb7RuLvrs5dMaj/exec';

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface TokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: TokenResponse) => void;
            error_callback?: (error: { type: string; message?: string }) => void;
          }) => TokenClient;
          revoke: (token: string, done?: () => void) => void;
        };
      };
    };
  }
}

export function isGisLoaded(): boolean {
  return Boolean(window.google?.accounts?.oauth2?.initTokenClient);
}

export function requestSheetsAccessToken(clientId: string): Promise<{
  accessToken: string;
  expiresIn: number;
}> {
  return new Promise((resolve, reject) => {
    const cleanClientId = clientId.trim();
    if (!cleanClientId) {
      reject(new Error('Ingresa tu OAuth Client ID antes de conectar.'));
      return;
    }

    if (!isGisLoaded()) {
      reject(
        new Error(
          'Google Identity Services aún está cargando o fue bloqueado. Revisa tu conexión e intenta de nuevo.'
        )
      );
      return;
    }

    try {
      const tokenClient = window.google!.accounts!.oauth2!.initTokenClient({
        client_id: cleanClientId,
        scope: SHEETS_SCOPE,
        callback: (response: TokenResponse) => {
          if (response.error || !response.access_token) {
            reject(
              new Error(
                response.error_description ||
                  response.error ||
                  'No se pudo obtener el token de autorización de Google.'
              )
            );
            return;
          }
          resolve({
            accessToken: response.access_token,
            expiresIn: response.expires_in ?? 3600,
          });
        },
        error_callback: (err) => {
          if (err.type === 'popup_closed') {
            reject(new Error('Ventana de autorización cerrada antes de completar el acceso.'));
            return;
          }
          if (err.type === 'popup_failed_to_open') {
            reject(
              new Error('El navegador bloqueó la ventana emergente de Google. Permite popups para continuar.')
            );
            return;
          }
          reject(new Error(err.message || `Error de autenticación (${err.type}).`));
        },
      });

      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (error) {
      reject(error instanceof Error ? error : new Error('Error al iniciar Google Identity Services.'));
    }
  });
}

export function revokeSheetsToken(accessToken: string): void {
  try {
    if (accessToken && window.google?.accounts?.oauth2?.revoke) {
      window.google.accounts.oauth2.revoke(accessToken);
    }
  } catch {
    // Ignore revoke errors on cleanup
  }
}

function formatA1SheetRange(sheetName: string, cellRange: string): string {
  const cleanName = (sheetName.trim() || 'Hoja 1').replace(/'/g, "''");
  return `'${cleanName}'!${cellRange}`;
}

export interface AppendRowPayload {
  fecha: string;
  tipo: WorkoutType;
  distancia_km: number;
  duracion_min: number;
  notas: string;
}

export async function appendWorkoutToSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  row: AppendRowPayload
): Promise<{ updatedRange: string }> {
  const range = formatA1SheetRange(sheetName, 'A:E');
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId.trim()
  )}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      majorDimension: 'ROWS',
      values: [
        [
          row.fecha,
          row.tipo,
          Number(row.distancia_km.toFixed(2)),
          Number(row.duracion_min.toFixed(1)),
          row.notas,
        ],
      ],
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    const apiMessage = data?.error?.message || `Error HTTP ${response.status} al guardar en Google Sheets.`;
    throw new Error(apiMessage);
  }

  return {
    updatedRange: data?.updates?.updatedRange || range,
  };
}

export async function fetchSpreadsheetInfoAndRows(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string
): Promise<{
  title: string;
  availableTabs: string[];
  rows: WorkoutEntry[];
  hasHeaderRow: boolean;
}> {
  const cleanId = spreadsheetId.trim();
  const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    cleanId
  )}?fields=properties.title,sheets.properties.title`;

  const metaRes = await fetch(metaUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const metaData = await metaRes.json();
  if (!metaRes.ok) {
    throw new Error(
      metaData?.error?.message || `No se pudo leer el documento (${metaRes.status}). Verifica el Spreadsheet ID.`
    );
  }

  const title: string = metaData?.properties?.title || 'Hoja de cálculo';
  const availableTabs: string[] = Array.isArray(metaData?.sheets)
    ? metaData.sheets.map((s: { properties?: { title?: string } }) => s?.properties?.title || '').filter(Boolean)
    : [];

  const targetTab = sheetName.trim() || availableTabs[0] || 'Hoja 1';
  const range = formatA1SheetRange(targetTab, 'A1:E100');
  const valuesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    cleanId
  )}/values/${encodeURIComponent(range)}`;

  const valuesRes = await fetch(valuesUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const valuesData = await valuesRes.json();
  if (!valuesRes.ok) {
    throw new Error(
      valuesData?.error?.message ||
        `No se pudo leer la pestaña "${targetTab}". Verifica que el nombre coincida exactamente.`
    );
  }

  const rawRows: unknown[][] = Array.isArray(valuesData?.values) ? valuesData.values : [];
  if (rawRows.length === 0) {
    return { title, availableTabs, rows: [], hasHeaderRow: false };
  }

  const firstRow = rawRows[0].map((c) => String(c ?? '').trim().toLowerCase());
  const hasHeaderRow =
    firstRow.includes('fecha') ||
    firstRow.includes('tipo') ||
    firstRow.includes('distancia_km') ||
    firstRow.includes('duracion_min');

  const dataRows = hasHeaderRow ? rawRows.slice(1) : rawRows;
  const parsed: WorkoutEntry[] = [];

  dataRows.forEach((cols, idx) => {
    const fecha = String(cols[0] ?? '').trim();
    const rawTipo = String(cols[1] ?? 'Correr').trim();
    const tipo: WorkoutType =
      rawTipo === 'Caminata' || rawTipo === 'Trail' || rawTipo === 'Correr' ? rawTipo : 'Correr';
    const distancia_km = Number(String(cols[2] ?? '').replace(',', '.'));
    const duracion_min = Number(String(cols[3] ?? '').replace(',', '.'));
    const notas = String(cols[4] ?? '').trim();

    if (!fecha && (!Number.isFinite(distancia_km) || distancia_km <= 0)) {
      return;
    }

    const pace = calculatePace(
      Number.isFinite(distancia_km) ? distancia_km : 0,
      Number.isFinite(duracion_min) ? duracion_min : 0,
      tipo
    );

    parsed.push({
      id: `sheet-${idx}-${fecha}-${distancia_km}`,
      fecha: fecha || 'Sin fecha',
      tipo,
      distancia_km: Number.isFinite(distancia_km) ? distancia_km : 0,
      duracion_min: Number.isFinite(duracion_min) ? duracion_min : 0,
      ritmo_min_km: pace.paceFormatted,
      notas,
      source: 'sheets',
      syncedToSheets: true,
      createdAt: new Date().toISOString(),
    });
  });

  return {
    title,
    availableTabs,
    rows: parsed.reverse(),
    hasHeaderRow,
  };
}

export async function writeHeaderRowToSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string
): Promise<void> {
  const range = formatA1SheetRange(sheetName, 'A1:E1');
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId.trim()
  )}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      majorDimension: 'ROWS',
      values: [['fecha', 'tipo', 'distancia_km', 'duracion_min', 'notas']],
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || 'No se pudieron escribir los encabezados.');
  }
}

export async function sendWorkoutToAppsScript(
  appsScriptUrl: string,
  row: AppendRowPayload
): Promise<void> {
  const cleanUrl = appsScriptUrl.trim();
  if (!cleanUrl) {
    throw new Error('Ingresa la URL de Google Apps Script (/exec) en la pestaña Google Sheets.');
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(cleanUrl);
  } catch {
    throw new Error('La URL de Google Apps Script no es válida.');
  }

  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    throw new Error('La URL de Google Apps Script debe comenzar con https://.');
  }

  await fetch(cleanUrl, {
    method: 'POST',
    mode: 'no-cors',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify({
      fecha: row.fecha,
      tipo: row.tipo,
      distancia_km: Number(row.distancia_km.toFixed(2)),
      duracion_min: Number(row.duracion_min.toFixed(1)),
      notas: row.notas,
    }),
  });
}
