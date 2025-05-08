/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { OverviewPingCodec } from '../monitor_management/synthetics_overview_status';

export const SyntheticsCommonStateCodec = t.intersection([
  t.partial({
    firstTriggeredAt: t.string,
    lastTriggeredAt: t.string,
    lastResolvedAt: t.string,
    meta: t.record(t.string, t.unknown),
    idWithLocation: t.string,
  }),
  t.type({
    firstCheckedAt: t.string,
    lastCheckedAt: t.string,
    isTriggered: t.boolean,
  }),
]);

export type SyntheticsCommonState = t.TypeOf<typeof SyntheticsCommonStateCodec>;

export const SyntheticsMonitorStatusAlertStateCodec = t.type({});

export type SyntheticsMonitorStatusAlertState = t.TypeOf<
  typeof SyntheticsMonitorStatusAlertStateCodec
>;

export const AlertStatusMetaDataCodec = t.interface({
  monitorQueryId: t.string,
  configId: t.string,
  status: t.string,
  locationId: t.string,
  timestamp: t.string,
  ping: OverviewPingCodec,
  checks: t.type({
    downWithinXChecks: t.number,
    down: t.number,
  }),
});

const StaleMetaDataCodec = t.partial({
  isDeleted: t.boolean,
  isLocationRemoved: t.boolean,
});

export const StaleAlertStatusMetaDataCodec = t.intersection([
  AlertStatusMetaDataCodec,
  StaleMetaDataCodec,
]);

const MissingPingMonitorInfoCodec = t.intersection([
  t.type({
    monitor: t.type({ name: t.string, id: t.string, type: t.string }),
    observer: t.type({ geo: t.type({ name: t.string }) }),
    tags: t.array(t.string),
  }),
  t.partial({
    labels: t.record(t.string, t.string),
    url: t.partial({
      full: t.string,
    }),
    error: t.type({ message: t.string, stack_trace: t.string }),
    service: t.type({ name: t.string }),
    agent: t.type({ name: t.string }),
    state: t.type({ id: t.string }),
  }),
]);

export const AlertPendingStatusMetaDataCodec = t.intersection([
  t.interface({
    monitorQueryId: t.string,
    configId: t.string,
    status: t.string,
    locationId: t.string,
    monitorInfo: MissingPingMonitorInfoCodec,
  }),
  t.partial({
    timestamp: t.string,
    ping: OverviewPingCodec,
  }),
]);

const StaleAlertPendingStatusMetaDataCodec = t.intersection([
  AlertPendingStatusMetaDataCodec,
  StaleMetaDataCodec,
]);

export const AlertStatusCodec = t.interface({
  upConfigs: t.record(t.string, AlertStatusMetaDataCodec),
  downConfigs: t.record(t.string, AlertStatusMetaDataCodec),
  pendingConfigs: t.record(t.string, AlertPendingStatusMetaDataCodec),
  enabledMonitorQueryIds: t.array(t.string),
  staleDownConfigs: t.record(t.string, StaleAlertStatusMetaDataCodec),
  stalePendingConfigs: t.record(t.string, StaleAlertPendingStatusMetaDataCodec),
  maxPeriod: t.number,
});

export type StaleDownConfig = t.TypeOf<typeof StaleAlertStatusMetaDataCodec>;
export type AlertStatusMetaData = t.TypeOf<typeof AlertStatusMetaDataCodec>;
export type AlertPendingStatusMetaData = t.TypeOf<typeof AlertPendingStatusMetaDataCodec>;
export type AlertOverviewStatus = t.TypeOf<typeof AlertStatusCodec>;
export type StatusRuleInspect = AlertOverviewStatus & {
  monitors: Array<{
    id: string;
    name: string;
    type: string;
  }>;
};
export type TLSRuleInspect = StatusRuleInspect;
export type AlertStatusConfigs = Record<string, AlertStatusMetaData>;
export type AlertPendingStatusConfigs = Record<string, AlertPendingStatusMetaData>;
export type StaleAlertMetadata = t.TypeOf<typeof StaleMetaDataCodec>;
export type MissingPingMonitorInfo = t.TypeOf<typeof MissingPingMonitorInfoCodec>;
