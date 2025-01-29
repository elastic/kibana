/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { ObserverCodec } from '../ping/observer';
import { ErrorStateCodec } from '../ping/error_state';
import { AgentType, MonitorType, PingErrorType, UrlType } from '..';

export const OverviewPingCodec = t.intersection([
  t.interface({
    '@timestamp': t.string,
    summary: t.partial({
      down: t.number,
      up: t.number,
    }),
    monitor: MonitorType,
    observer: ObserverCodec,
    config_id: t.string,
    agent: AgentType,
    url: UrlType,
    state: ErrorStateCodec,
  }),
  t.partial({
    error: PingErrorType,
    tags: t.array(t.string),
    service: t.type({
      name: t.string,
    }),
    labels: t.record(t.string, t.string),
  }),
]);

export const OverviewStatusMetaDataCodec = t.intersection([
  t.interface({
    monitorQueryId: t.string,
    configId: t.string,
    status: t.string,
    locationId: t.string,
    locationLabel: t.string,
    name: t.string,
    schedule: t.string,
    isEnabled: t.boolean,
    tags: t.array(t.string),
    isStatusAlertEnabled: t.boolean,
    type: t.string,
  }),
  t.partial({
    projectId: t.string,
    updated_at: t.string,
    ping: OverviewPingCodec,
    timestamp: t.string,
    spaceId: t.string,
  }),
]);

export const OverviewStatusCodec = t.interface({
  allMonitorsCount: t.number,
  disabledMonitorsCount: t.number,
  projectMonitorsCount: t.number,
  up: t.number,
  down: t.number,
  pending: t.number,
  disabledCount: t.number,
  upConfigs: t.record(t.string, OverviewStatusMetaDataCodec),
  downConfigs: t.record(t.string, OverviewStatusMetaDataCodec),
  pendingConfigs: t.record(t.string, OverviewStatusMetaDataCodec),
  disabledConfigs: t.record(t.string, OverviewStatusMetaDataCodec),
  enabledMonitorQueryIds: t.array(t.string),
  disabledMonitorQueryIds: t.array(t.string),
  allIds: t.array(t.string),
});

export type OverviewPing = t.TypeOf<typeof OverviewPingCodec>;
export type OverviewStatus = t.TypeOf<typeof OverviewStatusCodec>;
export type OverviewStatusState = t.TypeOf<typeof OverviewStatusCodec>;
export type OverviewStatusMetaData = t.TypeOf<typeof OverviewStatusMetaDataCodec>;
