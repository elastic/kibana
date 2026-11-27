/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  ReportFrequency,
  ReportWeekday,
  ScheduledReportSchedule,
} from '../../../../common/types/scheduled_reports';

export const FREQUENCY_LABELS: Record<ReportFrequency, string> = {
  DAILY: i18n.translate('xpack.digitalExperience.reports.scheduled.daily', {
    defaultMessage: 'Daily',
  }),
  WEEKLY: i18n.translate('xpack.digitalExperience.reports.scheduled.weekly', {
    defaultMessage: 'Weekly',
  }),
  MONTHLY: i18n.translate('xpack.digitalExperience.reports.scheduled.monthly', {
    defaultMessage: 'Monthly',
  }),
};

export const WEEKDAY_SHORT_LABELS: Record<ReportWeekday, string> = {
  MO: i18n.translate('xpack.digitalExperience.reports.scheduled.monday', {
    defaultMessage: 'Mon',
  }),
  TU: i18n.translate('xpack.digitalExperience.reports.scheduled.tuesday', {
    defaultMessage: 'Tue',
  }),
  WE: i18n.translate('xpack.digitalExperience.reports.scheduled.wednesday', {
    defaultMessage: 'Wed',
  }),
  TH: i18n.translate('xpack.digitalExperience.reports.scheduled.thursday', {
    defaultMessage: 'Thu',
  }),
  FR: i18n.translate('xpack.digitalExperience.reports.scheduled.friday', {
    defaultMessage: 'Fri',
  }),
  SA: i18n.translate('xpack.digitalExperience.reports.scheduled.saturday', {
    defaultMessage: 'Sat',
  }),
  SU: i18n.translate('xpack.digitalExperience.reports.scheduled.sunday', {
    defaultMessage: 'Sun',
  }),
};

export const WEEKDAY_LONG_LABELS: Record<ReportWeekday, string> = {
  MO: i18n.translate('xpack.digitalExperience.reports.scheduleForm.monday', {
    defaultMessage: 'Monday',
  }),
  TU: i18n.translate('xpack.digitalExperience.reports.scheduleForm.tuesday', {
    defaultMessage: 'Tuesday',
  }),
  WE: i18n.translate('xpack.digitalExperience.reports.scheduleForm.wednesday', {
    defaultMessage: 'Wednesday',
  }),
  TH: i18n.translate('xpack.digitalExperience.reports.scheduleForm.thursday', {
    defaultMessage: 'Thursday',
  }),
  FR: i18n.translate('xpack.digitalExperience.reports.scheduleForm.friday', {
    defaultMessage: 'Friday',
  }),
  SA: i18n.translate('xpack.digitalExperience.reports.scheduleForm.saturday', {
    defaultMessage: 'Saturday',
  }),
  SU: i18n.translate('xpack.digitalExperience.reports.scheduleForm.sunday', {
    defaultMessage: 'Sunday',
  }),
};

const FALLBACK_TIME_ZONES = [
  'UTC',
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
];

const pad = (value: number): string => String(value).padStart(2, '0');

/** Human-readable summary of a scheduled report's cadence, time, and time zone. */
export const describeSchedule = ({
  frequency,
  weekday,
  monthday,
  hour,
  minute,
  timeZone,
}: ScheduledReportSchedule): string => {
  const time = `${pad(hour)}:${pad(minute)}`;
  if (frequency === 'WEEKLY') {
    const day = WEEKDAY_SHORT_LABELS[weekday ?? 'MO'];
    return i18n.translate('xpack.digitalExperience.reports.scheduled.weeklySummary', {
      defaultMessage: 'Weekly on {day} at {time} {timeZone}',
      values: { day, time, timeZone },
    });
  }
  if (frequency === 'MONTHLY') {
    return i18n.translate('xpack.digitalExperience.reports.scheduled.monthlySummary', {
      defaultMessage: 'Monthly on day {day} at {time} {timeZone}',
      values: { day: monthday ?? 1, time, timeZone },
    });
  }
  return i18n.translate('xpack.digitalExperience.reports.scheduled.dailySummary', {
    defaultMessage: 'Daily at {time} {timeZone}',
    values: { time, timeZone },
  });
};

/** Default name suggested when scheduling a scorecard report. */
export const getDefaultScheduleName = (serviceName: string, environment?: string): string => {
  const scope = environment ? `${serviceName} (${environment})` : serviceName;
  return i18n.translate('xpack.digitalExperience.reports.scheduleForm.defaultName', {
    defaultMessage: 'Weekly scorecard: {scope}',
    values: { scope },
  });
};

/** Browser IANA time zone, falling back to UTC if unavailable. */
export const getDefaultTimeZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

/** Available IANA time zone identifiers supported by the browser runtime. */
export const getTimeZoneOptions = (): string[] => {
  const intlWithSupportedValues = Intl as typeof Intl & {
    supportedValuesOf?: (key: string) => string[];
  };
  try {
    const supported = intlWithSupportedValues.supportedValuesOf?.('timeZone');
    if (supported && supported.length > 0) {
      return supported.includes('UTC') ? supported : ['UTC', ...supported];
    }
  } catch {
    // Fall back to common zones in older runtimes.
  }
  return FALLBACK_TIME_ZONES;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Client-side sanity check for an email address before submitting to the server. */
export const isValidEmail = (value: string): boolean => EMAIL_PATTERN.test(value.trim());
