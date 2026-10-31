/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { RumReportTemplateId } from './rum_report';

export const RUM_REPORT_SCHEDULE_SO_TYPE = 'ux-rum-report-schedule';
export const RUM_REPORT_EMAIL_TASK_TYPE = 'ux:rum-report-email';

export const RUM_REPORT_CADENCES = ['daily', 'weekdays', 'weekly', 'biweekly', 'monthly'] as const;
export type RumReportCadence = (typeof RUM_REPORT_CADENCES)[number];

export const isRumReportCadence = (value: string): value is RumReportCadence =>
  (RUM_REPORT_CADENCES as readonly string[]).includes(value);

export const RUM_REPORT_WEEKDAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const;
export type RumReportWeekday = (typeof RUM_REPORT_WEEKDAYS)[number];

export const isRumReportWeekday = (value: string): value is RumReportWeekday =>
  (RUM_REPORT_WEEKDAYS as readonly string[]).includes(value);

export const RUM_REPORT_MINUTES = [0, 15, 30, 45] as const;
export type RumReportMinute = (typeof RUM_REPORT_MINUTES)[number];

export interface RumReportScheduleSpec {
  cadence: RumReportCadence;
  weekday: RumReportWeekday;
  monthday: number;
  hour: number;
  minute: RumReportMinute;
  tzid: string;
}

export const DEFAULT_SCHEDULE_SPEC: RumReportScheduleSpec = {
  cadence: 'weekly',
  weekday: 'MO',
  monthday: 1,
  hour: 8,
  minute: 0,
  tzid: 'UTC',
};

const clampInt = (value: unknown, min: number, max: number, fallback: number): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
};

const snapMinute = (value: unknown): RumReportMinute => {
  const parsed = clampInt(value, 0, 59, 0);
  if (parsed >= 45) {
    return 45;
  }
  if (parsed >= 30) {
    return 30;
  }
  if (parsed >= 15) {
    return 15;
  }
  return 0;
};

export interface RumReportScheduleInput {
  cadence?: string;
  weekday?: string;
  monthday?: number;
  hour?: number;
  minute?: number;
  tzid?: string;
}

export const normalizeScheduleSpec = (raw: RumReportScheduleInput): RumReportScheduleSpec => {
  const cadence = raw.cadence && isRumReportCadence(raw.cadence) ? raw.cadence : 'weekly';
  const weekday =
    raw.weekday && isRumReportWeekday(raw.weekday) ? raw.weekday : DEFAULT_SCHEDULE_SPEC.weekday;
  const tzid =
    typeof raw.tzid === 'string' && raw.tzid.trim().length > 0 && raw.tzid.length <= 64
      ? raw.tzid.trim()
      : 'UTC';
  return {
    cadence,
    weekday,
    monthday: clampInt(raw.monthday, 1, 28, 1),
    hour: clampInt(raw.hour, 0, 23, 8),
    minute: snapMinute(raw.minute),
    tzid,
  };
};

export const rumReportEmailTaskId = (scheduleId: string): string =>
  `${RUM_REPORT_EMAIL_TASK_TYPE}:${scheduleId}`;

export interface RumReportScheduleFilters {
  serviceName?: string;
  browser?: string;
  os?: string;
  location?: string;
  pageUrl?: string;
  frustration?: string;
  user?: string;
  includeBots?: string;
  kuery?: string;
  breakpoint?: string;
  connection?: string;
  device?: string;
  errorGroup?: string;
  includePii?: boolean;
}

export interface RumReportScheduleAttributes {
  name: string;
  enabled: boolean;
  cadence: RumReportCadence;
  weekday?: RumReportWeekday;
  monthday?: number;
  hour?: number;
  minute?: number;
  tzid?: string;
  connectorId: string;
  to: string[];
  templateId: RumReportTemplateId;
  filters: RumReportScheduleFilters;
  includeAi?: boolean;
  inferenceConnectorId?: string;
  createdAt: string;
  lastRunAt?: string;
  lastError?: string;
}

export const specFromSchedule = (schedule: RumReportScheduleInput): RumReportScheduleSpec =>
  normalizeScheduleSpec(schedule);

const pad2 = (value: number): string => String(value).padStart(2, '0');

const weekdayLabel = (weekday: RumReportWeekday): string => {
  const labels: Record<RumReportWeekday, string> = {
    MO: i18n.translate('xpack.ux.reports.schedule.weekdayMondayLabel', {
      defaultMessage: 'Monday',
    }),
    TU: i18n.translate('xpack.ux.reports.schedule.weekdayTuesdayLabel', {
      defaultMessage: 'Tuesday',
    }),
    WE: i18n.translate('xpack.ux.reports.schedule.weekdayWednesdayLabel', {
      defaultMessage: 'Wednesday',
    }),
    TH: i18n.translate('xpack.ux.reports.schedule.weekdayThursdayLabel', {
      defaultMessage: 'Thursday',
    }),
    FR: i18n.translate('xpack.ux.reports.schedule.weekdayFridayLabel', {
      defaultMessage: 'Friday',
    }),
    SA: i18n.translate('xpack.ux.reports.schedule.weekdaySaturdayLabel', {
      defaultMessage: 'Saturday',
    }),
    SU: i18n.translate('xpack.ux.reports.schedule.weekdaySundayLabel', {
      defaultMessage: 'Sunday',
    }),
  };
  return labels[weekday];
};

export const formatScheduleLabel = (raw: RumReportScheduleInput): string => {
  const spec = normalizeScheduleSpec(raw);
  const time = `${pad2(spec.hour)}:${pad2(spec.minute)}`;
  const tz = spec.tzid;
  if (spec.cadence === 'daily') {
    return i18n.translate('xpack.ux.reports.schedule.cadenceDailySummary', {
      defaultMessage: 'Every day at {time} {tz}',
      values: { time, tz },
    });
  }
  if (spec.cadence === 'weekdays') {
    return i18n.translate('xpack.ux.reports.schedule.cadenceWeekdaysSummary', {
      defaultMessage: 'Weekdays at {time} {tz}',
      values: { time, tz },
    });
  }
  if (spec.cadence === 'biweekly') {
    return i18n.translate('xpack.ux.reports.schedule.cadenceBiweeklySummary', {
      defaultMessage: 'Every other {weekday} at {time} {tz}',
      values: { weekday: weekdayLabel(spec.weekday), time, tz },
    });
  }
  if (spec.cadence === 'monthly') {
    return i18n.translate('xpack.ux.reports.schedule.cadenceMonthlySummary', {
      defaultMessage: 'Monthly on day {day} at {time} {tz}',
      values: { day: spec.monthday, time, tz },
    });
  }
  return i18n.translate('xpack.ux.reports.schedule.cadenceWeeklySummary', {
    defaultMessage: 'Every {weekday} at {time} {tz}',
    values: { weekday: weekdayLabel(spec.weekday), time, tz },
  });
};

export interface RumReportSchedule extends RumReportScheduleAttributes {
  id: string;
}

export interface RumEmailConnectorOption {
  id: string;
  name: string;
}

export const parseRecipientList = (raw: string): string[] => {
  const seen = new Set<string>();
  const recipients: string[] = [];
  for (const part of raw.split(/[,;\s]+/)) {
    const email = part.trim().toLowerCase();
    if (!email || seen.has(email) || email.length > 256 || !email.includes('@')) {
      continue;
    }
    seen.add(email);
    recipients.push(email);
    if (recipients.length >= 20) {
      break;
    }
  }
  return recipients;
};
