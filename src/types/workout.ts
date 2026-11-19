export type WorkoutType = 'Correr' | 'Caminata' | 'Trail';

export interface WorkoutEntry {
  id: string;
  fecha: string;
  tipo: WorkoutType;
  distancia_km: number;
  duracion_min: number;
  ritmo_min_km: string;
  notas: string;
  aiAnalysis?: string;
  source: 'local' | 'sheets';
  syncedToSheets: boolean;
  createdAt: string;
}

export interface SheetsConfig {
  appsScriptUrl: string;
  clientId: string;
  spreadsheetId: string;
  sheetName: string;
}

export interface PaceMetrics {
  paceDecimal: number | null;
  paceFormatted: string;
  speedKmh: number | null;
  zoneLabel: string;
  zoneHint: string;
  intensityPercent: number;
}
