/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { SchemaOutput } from '../schema_output';
import { useLogicalAndFields } from '../../constants/filters_fields_with_logical_and';

const fetchMonitorQueryArgs = {
  query: z.string().optional(),
  searchFields: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  locations: z.array(z.string()).optional(),
  monitorTypes: z.array(z.string()).optional(),
  projects: z.array(z.string()).optional(),
  schedules: z.array(z.string()).optional(),
  remoteNames: z.array(z.string()).optional(),
  monitorQueryIds: z.array(z.string()).optional(),
  configIds: z.array(z.string()).optional(),
  sortField: z.string().optional(),
  sortOrder: z.enum(['desc', 'asc']).optional(),
  showFromAllSpaces: z.boolean().optional(),
  useLogicalAndFor: z.array(z.enum(useLogicalAndFields)).optional(),
  // Date-range window for the overview list. When `[dateRangeStart, dateRangeEnd]`
  // are present, the server scopes each monitor's status to that window (and
  // surfaces monitors with no run in the window as `pending`). The range strings
  // accept datemath (e.g. `now-24h`) or ISO timestamps.
  dateRangeStart: z.string().optional(),
  dateRangeEnd: z.string().optional(),
};

export const FetchMonitorManagementListQueryArgsCodec = z.looseObject({
  ...fetchMonitorQueryArgs,
  page: z.number().optional(),
  perPage: z.number().optional(),
  internal: z.boolean().optional(),
});

export type FetchMonitorManagementListQueryArgs = SchemaOutput<
  typeof FetchMonitorManagementListQueryArgsCodec
>;

export const FetchMonitorOverviewQueryArgsCodec = z.looseObject({
  ...fetchMonitorQueryArgs,
  includeHeartbeatMonitors: z.boolean().optional(),
  page: z.number().optional(),
  perPage: z.number().optional(),
  statusFilter: z.enum(['up', 'down', 'pending', 'stale', 'disabled']).optional(),
});

export type FetchMonitorOverviewQueryArgs = SchemaOutput<typeof FetchMonitorOverviewQueryArgsCodec>;

export const MonitorManagementEnablementResultCodec = z.looseObject({
  isEnabled: z.boolean(),
  canEnable: z.boolean(),
  canManageApiKeys: z.boolean(),
  areApiKeysEnabled: z.boolean(),
  isValidApiKey: z.boolean(),
  isServiceAllowed: z.boolean(),
});

export type MonitorManagementEnablementResult = SchemaOutput<
  typeof MonitorManagementEnablementResultCodec
>;
