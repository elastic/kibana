/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const REPORT_EMAIL_CONNECTORS_ENDPOINT =
  'GET /internal/digital_experience/report/email_connectors' as const;
export const SCHEDULED_REPORTS_LIST_ENDPOINT =
  'GET /internal/digital_experience/applications/{serviceName}/report/schedules' as const;
export const SCHEDULED_REPORTS_CREATE_ENDPOINT =
  'POST /internal/digital_experience/applications/{serviceName}/report/schedules' as const;
export const SCHEDULED_REPORT_UPDATE_ENDPOINT =
  'PUT /internal/digital_experience/applications/{serviceName}/report/schedules/{scheduleId}' as const;
export const SCHEDULED_REPORT_SET_ENABLED_ENDPOINT =
  'PATCH /internal/digital_experience/applications/{serviceName}/report/schedules/{scheduleId}' as const;
export const SCHEDULED_REPORT_RUN_ENDPOINT =
  'POST /internal/digital_experience/applications/{serviceName}/report/schedules/{scheduleId}/run' as const;
export const SCHEDULED_REPORT_DELETE_ENDPOINT =
  'DELETE /internal/digital_experience/applications/{serviceName}/report/schedules/{scheduleId}' as const;

export const REPORT_TYPES = ['scorecard'] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY'] as const;
export type ReportFrequency = (typeof REPORT_FREQUENCIES)[number];

export const REPORT_WEEKDAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const;
export type ReportWeekday = (typeof REPORT_WEEKDAYS)[number];

export const DEFAULT_REPORT_LOOKBACK_DAYS = 7;
export const MIN_REPORT_LOOKBACK_DAYS = 1;
export const MAX_REPORT_LOOKBACK_DAYS = 30;
export const MAX_REPORT_RECIPIENTS = 50;
export const MAX_SCHEDULED_REPORT_NAME_LENGTH = 200;
export const MAX_CONNECTOR_ID_LENGTH = 200;
export const MAX_TIME_ZONE_LENGTH = 100;
export const MAX_RECIPIENT_LENGTH = 320;
export const MAX_SCHEDULE_ID_LENGTH = 200;

export interface ScheduledReportSchedule {
  frequency: ReportFrequency;
  /** Used when `frequency === 'WEEKLY'`. */
  weekday?: ReportWeekday;
  /** Day of month (1..28) used when `frequency === 'MONTHLY'`. */
  monthday?: number;
  /** Hour (0..23) in `timeZone`. */
  hour: number;
  /** Minute (0..59). */
  minute: number;
  /** IANA time zone name (e.g. `'UTC'`). */
  timeZone: string;
}

export interface ScheduledReportInput {
  reportType: ReportType;
  name: string;
  environment?: string;
  lookbackDays: number;
  schedule: ScheduledReportSchedule;
  connectorId: string;
  recipients: string[];
  enabled: boolean;
}

export interface ScheduledReportLastRun {
  status: string;
  startedAt: string;
  error?: string;
}

export interface ScheduledReport extends ScheduledReportInput {
  id: string;
  serviceName: string;
  /** Display name of the email connector when it exists in the current space. */
  connectorName?: string;
  lastRun?: ScheduledReportLastRun;
}

export interface EmailConnectorOption {
  id: string;
  name: string;
  isPreconfigured?: boolean;
  isDeprecated?: boolean;
}

export interface ScheduledReportsListResponse {
  /** False when Workflows is not installed or licensed on this cluster. */
  available: boolean;
  reports: ScheduledReport[];
}

export interface EmailConnectorsResponse {
  /** False when Workflows is not installed or licensed on this cluster. */
  available: boolean;
  emailConnectors: EmailConnectorOption[];
}

export interface SetScheduledReportEnabledResponse {
  id: string;
  enabled: boolean;
}

export interface RunScheduledReportResponse {
  executionId: string;
}

export interface DeleteScheduledReportResponse {
  deleted: true;
}
