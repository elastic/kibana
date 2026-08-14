/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import type { RumReportTemplateId } from '../../../common/rum_report';
import type {
  RumEmailConnectorOption,
  RumReportCadence,
  RumReportSchedule,
  RumReportScheduleFilters,
  RumReportScheduleSpec,
} from '../../../common/rum_report_schedule';

type ScheduleWriteFields = Pick<
  RumReportScheduleSpec,
  'cadence' | 'weekday' | 'monthday' | 'hour' | 'minute' | 'tzid'
>;

export const fetchRumEmailConnectors = async (
  http: HttpStart
): Promise<RumEmailConnectorOption[]> => {
  const response = await http.get<{ connectors: RumEmailConnectorOption[] }>(
    '/internal/ux/rum/report_schedules/connectors'
  );
  return response.connectors;
};

export const fetchRumReportSchedules = async (http: HttpStart): Promise<RumReportSchedule[]> => {
  const response = await http.get<{ schedules: RumReportSchedule[] }>(
    '/internal/ux/rum/report_schedules'
  );
  return response.schedules;
};

export const createRumReportSchedule = async (
  http: HttpStart,
  body: {
    name: string;
    cadence: RumReportCadence;
    connectorId: string;
    to: string[];
    templateId: RumReportTemplateId;
    filters: RumReportScheduleFilters;
    enabled?: boolean;
    includeAi?: boolean;
    inferenceConnectorId?: string;
  } & Partial<ScheduleWriteFields>
): Promise<RumReportSchedule> => {
  return http.post<RumReportSchedule>('/internal/ux/rum/report_schedules', {
    body: JSON.stringify(body),
  });
};

export const updateRumReportSchedule = async (
  http: HttpStart,
  id: string,
  body: {
    name?: string;
    cadence?: RumReportCadence;
    connectorId?: string;
    to?: string[];
    enabled?: boolean;
    includeAi?: boolean;
    inferenceConnectorId?: string;
  } & Partial<ScheduleWriteFields>
): Promise<RumReportSchedule> => {
  return http.put<RumReportSchedule>(
    `/internal/ux/rum/report_schedules/${encodeURIComponent(id)}`,
    { body: JSON.stringify(body) }
  );
};

export const deleteRumReportSchedule = async (http: HttpStart, id: string): Promise<void> => {
  await http.delete(`/internal/ux/rum/report_schedules/${encodeURIComponent(id)}`);
};

export const sendRumReportNow = async (
  http: HttpStart,
  body: {
    connectorId: string;
    to: string[];
    templateId: RumReportTemplateId;
    filters: RumReportScheduleFilters;
    rangeFrom: string;
    rangeTo: string;
    compare?: string;
    name?: string;
    includeAi?: boolean;
    inferenceConnectorId?: string;
  }
): Promise<void> => {
  await http.post('/internal/ux/rum/report_schedules/_send', {
    body: JSON.stringify(body),
  });
};

export const sendRumReportScheduleNow = async (http: HttpStart, id: string): Promise<void> => {
  await http.post(`/internal/ux/rum/report_schedules/${encodeURIComponent(id)}/_send`);
};

export const testRumReportEmailConnector = async (
  http: HttpStart,
  connectorId: string,
  to: string[]
): Promise<void> => {
  await http.post(
    `/internal/ux/rum/report_schedules/connectors/${encodeURIComponent(connectorId)}/_test`,
    { body: JSON.stringify({ to }) }
  );
};
