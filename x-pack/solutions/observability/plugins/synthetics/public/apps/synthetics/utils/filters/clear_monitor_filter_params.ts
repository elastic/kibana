/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SyntheticsUrlParams } from '../url_params';
import { getMonitorFilterFields } from './filter_fields';

const ACTIVE_MONITOR_FILTER_URL_KEYS = [
  ...getMonitorFilterFields(),
  'query',
  'statusFilter',
  'configIds',
] as const;

// Pagination is reset with filters so a stale page index doesn't survive, but
// it is not itself a user-facing filter.
const MONITOR_FILTER_URL_KEYS_TO_CLEAR = [...ACTIVE_MONITOR_FILTER_URL_KEYS, 'pagination'] as const;

type ActiveMonitorFilterUrlKey = (typeof ACTIVE_MONITOR_FILTER_URL_KEYS)[number];

const isActiveFilterValue = (value: SyntheticsUrlParams[ActiveMonitorFilterUrlKey]): boolean => {
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return Boolean(value);
};

export const hasActiveMonitorFilters = (params: SyntheticsUrlParams): boolean =>
  ACTIVE_MONITOR_FILTER_URL_KEYS.some((key) => isActiveFilterValue(params[key]));

export const getClearedMonitorFilterParams = (): Partial<
  Record<keyof SyntheticsUrlParams, string>
> =>
  Object.fromEntries(MONITOR_FILTER_URL_KEYS_TO_CLEAR.map((key) => [key, undefined])) as Partial<
    Record<keyof SyntheticsUrlParams, string>
  >;
