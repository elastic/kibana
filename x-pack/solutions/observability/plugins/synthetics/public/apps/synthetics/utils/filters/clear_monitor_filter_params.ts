/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SyntheticsUrlParams } from '../url_params';
import type { SyntheticsMonitorFilterField } from './filter_fields';
import { getMonitorFilterFields } from './filter_fields';

const ACTIVE_MONITOR_FILTER_URL_KEYS = [
  ...getMonitorFilterFields(),
  'query',
  'statusFilter',
  'statusCodes',
  'configIds',
] as const;

// Pagination is reset with filters so a stale page index doesn't survive, but
// it is not itself a user-facing filter.
const MONITOR_FILTER_URL_KEYS_TO_CLEAR = [...ACTIVE_MONITOR_FILTER_URL_KEYS, 'pagination'] as const;

type ActiveMonitorFilterUrlKey = (typeof ACTIVE_MONITOR_FILTER_URL_KEYS)[number];

export interface MonitorFilterActivityOptions {
  excludeFields?: ReadonlyArray<SyntheticsMonitorFilterField>;
  includeStatusFilter?: boolean;
  includeStatusCodes?: boolean;
  includeConfigIds?: boolean;
}

const isActiveFilterValue = (value: SyntheticsUrlParams[ActiveMonitorFilterUrlKey]): boolean => {
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return Boolean(value);
};

export const hasActiveMonitorFilters = (
  params: SyntheticsUrlParams,
  options: MonitorFilterActivityOptions = {}
): boolean => {
  const excluded = new Set(options.excludeFields ?? []);
  const includeStatusFilter = options.includeStatusFilter ?? true;
  const includeStatusCodes = options.includeStatusCodes ?? false;
  const includeConfigIds = options.includeConfigIds ?? false;

  const keys: ActiveMonitorFilterUrlKey[] = [
    ...getMonitorFilterFields().filter((field) => !excluded.has(field)),
    'query',
  ];
  if (includeStatusFilter) {
    keys.push('statusFilter');
  }
  if (includeStatusCodes) {
    keys.push('statusCodes');
  }
  if (includeConfigIds) {
    keys.push('configIds');
  }

  return keys.some((key) => isActiveFilterValue(params[key]));
};

export const getClearedMonitorFilterParams = (): Partial<
  Record<keyof SyntheticsUrlParams, string>
> =>
  Object.fromEntries(MONITOR_FILTER_URL_KEYS_TO_CLEAR.map((key) => [key, undefined])) as Partial<
    Record<keyof SyntheticsUrlParams, string>
  >;
