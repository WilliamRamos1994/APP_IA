import type { PaceMetrics, WorkoutEntry, WorkoutType } from '../types/workout';

export function getTodayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDisplayDate(isoDate: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const [y, m, d] = parts;
  const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
  if (Number.isNaN(dateObj.getTime())) return isoDate;
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(dateObj);
}

export function calculatePace(
  distanceKm: number,
  durationMin: number,
  tipo: WorkoutType = 'Correr'
): PaceMetrics {
  if (!Number.isFinite(distanceKm) || !Number.isFinite(durationMin) || distanceKm <= 0 || durationMin <= 0) {
    return {
      paceDecimal: null,
      paceFormatted: '--:--',
      speedKmh: null,
      zoneLabel: 'Listo para medir',
      zoneHint: 'Ingresa distancia y duración',
      intensityPercent: 0,
    };
  }

  const paceDecimal = durationMin / distanceKm;
  let mins = Math.floor(paceDecimal);
  let secs = Math.round((paceDecimal - mins) * 60);
  if (secs === 60) {
    mins += 1;
    secs = 0;
  }

  const paceFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const speedKmh = (distanceKm / durationMin) * 60;

  let zoneLabel = 'Base Aeróbica';
  let zoneHint = 'Ritmo sostenible y controlado';
  let intensityPercent = 58;

  if (tipo === 'Caminata') {
    if (paceDecimal <= 9.5) {
      zoneLabel = 'Marcha Enérgica';
      zoneHint = 'Cadencia alta de caminata deportiva';
      intensityPercent = 72;
    } else if (paceDecimal <= 12.5) {
      zoneLabel = 'Caminata Activa';
      zoneHint = 'Buen ritmo para quema aeróbica';
      intensityPercent = 52;
    } else {
      zoneLabel = 'Recuperación';
      zoneHint = 'Paso suave de movilidad';
      intensityPercent = 35;
    }
  } else if (tipo === 'Trail') {
    if (paceDecimal <= 5.5) {
      zoneLabel = 'Trail Rápido';
      zoneHint = 'Empuje exigente en sendero';
      intensityPercent = 88;
    } else if (paceDecimal <= 7.5) {
      zoneLabel = 'Trail Tempo';
      zoneHint = 'Resistencia sostenida en terreno mixto';
      intensityPercent = 70;
    } else {
      zoneLabel = 'Ascenso Técnico';
      zoneHint = 'Trabajo de fuerza y desnivel';
      intensityPercent = 56;
    }
  } else {
    if (paceDecimal <= 4.15) {
      zoneLabel = 'Umbral / Series';
      zoneHint = 'Esfuerzo máximo anaeróbico';
      intensityPercent = 94;
    } else if (paceDecimal <= 5.15) {
      zoneLabel = 'Ritmo Tempo';
      zoneHint = 'Paso firme de carrera sostenida';
      intensityPercent = 78;
    } else if (paceDecimal <= 6.3) {
      zoneLabel = 'Base Aeróbica';
      zoneHint = 'Construcción de resistencia';
      intensityPercent = 60;
    } else {
      zoneLabel = 'Trote Suave';
      zoneHint = 'Recuperación activa';
      intensityPercent = 42;
    }
  }

  return {
    paceDecimal,
    paceFormatted,
    speedKmh,
    zoneLabel,
    zoneHint,
    intensityPercent,
  };
}

export function extractSpreadsheetId(rawInput: string): string {
  const trimmed = rawInput.trim();
  if (!trimmed) return '';
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

export function getInitialDemoWorkouts(): WorkoutEntry[] {
  const today = new Date();
  const offsetISO = (daysAgo: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  return [
    {
      id: 'demo-1',
      fecha: offsetISO(1),
      tipo: 'Correr',
      distancia_km: 8.4,
      duracion_min: 42,
      ritmo_min_km: '05:00',
      notas: 'Rodaje progresivo en parque al amanecer, últimas 2 km fuertes.',
      aiAnalysis:
        'Excelente control progresivo a 05:00 min/km. Cerrar los últimos 2 km con más cadencia consolida tu umbral aeróbico. Mañana prioriza movilidad de tobillo o un trote regenerativo corto.',
      source: 'local',
      syncedToSheets: false,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'demo-2',
      fecha: offsetISO(3),
      tipo: 'Trail',
      distancia_km: 11.2,
      duracion_min: 74,
      ritmo_min_km: '06:36',
      notas: 'Sendero con subida técnica y barro ligero, buenas sensaciones de pisada.',
      source: 'local',
      syncedToSheets: false,
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
    {
      id: 'demo-3',
      fecha: offsetISO(5),
      tipo: 'Caminata',
      distancia_km: 4.5,
      duracion_min: 48,
      ritmo_min_km: '10:40',
      notas: 'Descarga activa post-series, hidratación constante.',
      source: 'local',
      syncedToSheets: false,
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
  ];
}
