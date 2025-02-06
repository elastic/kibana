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

export const StaleAlertStatusMetaDataCodec = t.intersection([
  AlertStatusMetaDataCodec,
  t.partial({
    isDeleted: t.boolean,
    isLocationRemoved: t.boolean,
  }),
]);

export const AlertPendingStatusMetaDataCodec = t.intersection([
  t.interface({
    monitorQueryId: t.string,
    configId: t.string,
    status: t.string,
    locationId: t.string,
  }),
  t.partial({
    timestamp: t.string,
    ping: OverviewPingCodec,
  }),
]);

export const AlertStatusCodec = t.interface({
  upConfigs: t.record(t.string, AlertStatusMetaDataCodec),
  downConfigs: t.record(t.string, AlertStatusMetaDataCodec),
  pendingConfigs: t.record(t.string, AlertPendingStatusMetaDataCodec),
  enabledMonitorQueryIds: t.array(t.string),
  staleDownConfigs: t.record(t.string, StaleAlertStatusMetaDataCodec),
  maxPeriod: t.number,
});

export type StaleDownConfig = t.TypeOf<typeof StaleAlertStatusMetaDataCodec>;
export type AlertStatusMetaData = t.TypeOf<typeof AlertStatusMetaDataCodec>;
export type AlertOverviewStatus = t.TypeOf<typeof AlertStatusCodec>;
export type StatusRuleInspect = AlertOverviewStatus & {
  monitors: Array<{
    id: string;
    name: string;
    type: string;
  }>;
};
export type AlertStatusConfigs = Record<string, AlertStatusMetaData>;
