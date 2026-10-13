/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { KbnClient } from '@kbn/scout-oblt';

const MAINTENANCE_WINDOW_API = '/internal/alerting/rules/maintenance_window';

export const MW_DURATION_MS = 60 * 60 * 1000;

export interface MaintenanceWindow {
  id: string;
  duration: number;
  r_rule: { dtstart: string; tzid: string; freq: number; count: number };
}

/** Shape of one entry of the synthetics `formatMWs` output. */
export interface FormattedMaintenanceWindow {
  dtstart: string;
  tzid: string;
  count: number;
  duration: string;
}

interface PolicyWithStreamVars {
  inputs?: Array<{ streams?: Array<{ vars?: Record<string, { value?: unknown }> }> }>;
}

const spacePrefix = (spaceId?: string) => (spaceId && spaceId !== 'default' ? `/s/${spaceId}` : '');

export const createMaintenanceWindow = async (
  kbnClient: KbnClient,
  spaceId?: string
): Promise<MaintenanceWindow> => {
  const { data } = await kbnClient.request<MaintenanceWindow>({
    method: 'POST',
    path: `${spacePrefix(spaceId)}${MAINTENANCE_WINDOW_API}`,
    body: {
      title: `test-maintenance-window-${uuidv4()}`,
      duration: MW_DURATION_MS,
      r_rule: { dtstart: new Date().toISOString(), tzid: 'UTC', freq: 0, count: 1 },
      category_ids: ['management'],
    },
  });
  return data;
};

/**
 * `duration` and `r_rule` must be sent together: the stored `schedule` is
 * rebuilt from both, so a `duration`-only update returns 200 but is dropped.
 */
export const updateMaintenanceWindow = async (
  kbnClient: KbnClient,
  id: string,
  body: Pick<MaintenanceWindow, 'duration' | 'r_rule'>,
  spaceId?: string
): Promise<MaintenanceWindow> => {
  const { data } = await kbnClient.request<MaintenanceWindow>({
    method: 'POST',
    path: `${spacePrefix(spaceId)}${MAINTENANCE_WINDOW_API}/${id}`,
    body,
  });
  return data;
};

export const deleteMaintenanceWindow = async (
  kbnClient: KbnClient,
  id: string,
  spaceId?: string
) => {
  await kbnClient.request({
    method: 'DELETE',
    path: `${spacePrefix(spaceId)}${MAINTENANCE_WINDOW_API}/${id}`,
    ignoreErrors: [404],
  });
};

const safeJsonParse = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

/**
 * Scans a package policy for the first non-empty `maintenance_windows` yaml var
 * (synthetics writes it onto every input stream via `commonVars`). The value is
 * the JSON-stringified output of the synthetics `formatMWs` helper.
 */
export const parseMaintenanceWindowsVar = (
  pkgPolicy?: PolicyWithStreamVars
): FormattedMaintenanceWindow[] | undefined => {
  for (const input of pkgPolicy?.inputs ?? []) {
    for (const stream of input?.streams ?? []) {
      const value = stream?.vars?.maintenance_windows?.value;
      const parsed = typeof value === 'string' ? safeJsonParse(value) : value;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as FormattedMaintenanceWindow[];
      }
    }
  }
  return undefined;
};
