import { GlobalSimConfig } from '../data/rfqDefaults';

export interface HourlyTrafficPoint {
  hourIndex: number;       // 0..167
  dayIndex: number;        // 0..6 (0=Mon .. 4=Fri, 5=Sat, 6=Sun)
  dayName: string;
  hourOfDay: number;       // 0..23
  isWeekend: boolean;
  isDaytime: boolean;      // 08:00..21:59
  weight: number;          // normalized so mean across all 168 hours = 1.0
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Base 24-hour shape for a public general consumer chatbot (unnormalized):
 * - Nighttime trough (02:00 - 05:00)
 * - Morning ramp (06:00 - 09:00)
 * - Daytime active plateau (10:00 - 17:00)
 * - Evening consumer peak (18:00 - 21:00)
 * - Late night wind-down (22:00 - 01:00)
 */
const BASE_DIURNAL_SHAPE_24H = [
  0.38, // 00:00
  0.26, // 01:00
  0.19, // 02:00
  0.16, // 03:00 (Nighttime minimum trough)
  0.16, // 04:00 (Nighttime minimum trough)
  0.20, // 05:00
  0.34, // 06:00
  0.58, // 07:00
  0.88, // 08:00 (Start of daytime plateau)
  1.12, // 09:00
  1.24, // 10:00
  1.32, // 11:00
  1.38, // 12:00 (Midday peak)
  1.35, // 13:00
  1.28, // 14:00
  1.25, // 15:00
  1.27, // 16:00
  1.34, // 17:00
  1.42, // 18:00
  1.52, // 19:00 (Evening B2C peak)
  1.55, // 20:00 (Evening B2C peak)
  1.40, // 21:00
  1.08, // 22:00
  0.68, // 23:00
];

/**
 * Generates a 168-hour normalized seasonality curve (mean weight = 1.0 across the week)
 */
export function generateWeeklyTrafficProfile(
  seasonality: GlobalSimConfig['seasonality']
): HourlyTrafficPoint[] {
  const { preset, nighttimeFloorRatio, weekendToWeekdayRatio, peakAmplitude } = seasonality;

  if (preset === 'FLAT_24_7') {
    return Array.from({ length: 168 }, (_, idx) => {
      const dayIndex = Math.floor(idx / 24);
      const hourOfDay = idx % 24;
      return {
        hourIndex: idx,
        dayIndex,
        dayName: DAY_NAMES[dayIndex],
        hourOfDay,
        isWeekend: dayIndex >= 5,
        isDaytime: hourOfDay >= 8 && hourOfDay < 22,
        weight: 1.0,
      };
    });
  }

  // Construct 24h diurnal curve adjusted for floor and peak amplitude
  const minRaw = Math.min(...BASE_DIURNAL_SHAPE_24H);
  const maxRaw = Math.max(...BASE_DIURNAL_SHAPE_24H);

  const diurnal24 = BASE_DIURNAL_SHAPE_24H.map((val, hour) => {
    // Normalize within 0..1
    const norm01 = (val - minRaw) / (maxRaw - minRaw);
    // Apply peak amplitude power shaping
    const shaped = Math.pow(norm01, peakAmplitude);
    // For B2B preset, reduce late evening (19:00-22:00) relative to midday (09:00-17:00)
    const b2bModifier =
      preset === 'B2B_CUSTOMER_CARE' && (hour >= 19 || hour <= 6) ? 0.78 : 1.0;
    const rawHeight = nighttimeFloorRatio + (1.48 - nighttimeFloorRatio) * shaped;
    return Math.max(nighttimeFloorRatio, rawHeight * b2bModifier);
  });

  // Expand to 168 hours with weekday (Mon-Fri) and weekend (Sat-Sun) factors
  // Subtle day-of-week variation on weekdays (Tue-Thu slightly higher than Mon/Fri)
  const dayMultipliers = [
    0.98, // Mon
    1.03, // Tue
    1.04, // Wed
    1.02, // Thu
    0.93, // Fri
    weekendToWeekdayRatio * 1.03, // Sat
    weekendToWeekdayRatio * 0.97, // Sun
  ];

  const unnormalized: HourlyTrafficPoint[] = [];
  for (let d = 0; d < 7; d++) {
    const isWeekend = d >= 5;
    for (let h = 0; h < 24; h++) {
      // On weekends, morning ramp is shifted slightly later and evening is softer
      const weekendShiftVal = isWeekend
        ? 0.65 * diurnal24[h] + 0.35 * diurnal24[(h + 23) % 24]
        : diurnal24[h];
      const rawWeight = weekendShiftVal * dayMultipliers[d];
      unnormalized.push({
        hourIndex: d * 24 + h,
        dayIndex: d,
        dayName: DAY_NAMES[d],
        hourOfDay: h,
        isWeekend,
        isDaytime: h >= 8 && h < 22,
        weight: rawWeight,
      });
    }
  }

  const meanWeight =
    unnormalized.reduce((acc, pt) => acc + pt.weight, 0) / unnormalized.length;

  return unnormalized.map((pt) => ({
    ...pt,
    weight: pt.weight / meanWeight,
  }));
}
