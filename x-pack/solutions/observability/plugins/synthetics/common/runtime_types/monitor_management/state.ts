/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export const FetchMonitorManagementListQueryArgsCodec = t.partial({
  page: t.number,
  perPage: t.number,
  sortField: t.string,
  sortOrder: t.union([t.literal('desc'), t.literal('asc')]),
  query: t.string,
  searchFields: t.array(t.string),
  tags: t.array(t.string),
  locations: t.array(t.string),
  monitorTypes: t.array(t.string),
  projects: t.array(t.string),
  schedules: t.array(t.string),
  monitorQueryIds: t.array(t.string),
  internal: t.boolean,
  showFromAllSpaces: t.boolean,
});

export type FetchMonitorManagementListQueryArgs = t.TypeOf<
  typeof FetchMonitorManagementListQueryArgsCodec
>;

export const FetchMonitorOverviewQueryArgsCodec = t.partial({
  query: t.string,
  searchFields: t.array(t.string),
  tags: t.array(t.string),
  locations: t.array(t.string),
  projects: t.array(t.string),
  schedules: t.array(t.string),
  monitorTypes: t.array(t.string),
  monitorQueryIds: t.array(t.string),
  sortField: t.string,
  sortOrder: t.string,
  showFromAllSpaces: t.boolean,
});

export type FetchMonitorOverviewQueryArgs = t.TypeOf<typeof FetchMonitorOverviewQueryArgsCodec>;

export const MonitorManagementEnablementResultCodec = t.type({
  isEnabled: t.boolean,
  canEnable: t.boolean,
  canManageApiKeys: t.boolean,
  areApiKeysEnabled: t.boolean,
  isValidApiKey: t.boolean,
  isServiceAllowed: t.boolean,
});

export type MonitorManagementEnablementResult = t.TypeOf<
  typeof MonitorManagementEnablementResultCodec
>;
