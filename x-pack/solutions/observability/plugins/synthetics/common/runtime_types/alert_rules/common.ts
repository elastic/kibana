/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SchemaOutput } from '../schema_output';
import type { OverviewPing } from '../monitor_management/synthetics_overview_status';
import {
  SyntheticsCommonStateCodec,
  SyntheticsMonitorStatusAlertStateCodec,
} from '../zod/alert_rules_common';

export { SyntheticsCommonStateCodec, SyntheticsMonitorStatusAlertStateCodec };

export type SyntheticsCommonState = SchemaOutput<typeof SyntheticsCommonStateCodec>;
export type SyntheticsMonitorStatusAlertState = SchemaOutput<
  typeof SyntheticsMonitorStatusAlertStateCodec
>;

export interface AlertStatusMetaData {
  monitorQueryId: string;
  configId: string;
  status: string;
  locationId: string;
  timestamp: string;
  latestPing: OverviewPing;
  checks: {
    downWithinXChecks: number;
    down: number;
  };
}

// Interface for StaleMetaData
export interface StaleAlertMetadata {
  isDeleted?: boolean;
  isLocationRemoved?: boolean;
}

// Interface for MissingPingMonitorInfo
export interface MissingPingMonitorInfo {
  // Required fields
  monitor: {
    name: string;
    id: string;
    type: string;
  };
  observer: {
    geo: {
      name: string;
    };
  };
  tags: string[];

  // Optional fields
  labels?: Record<string, string>;
  url?: {
    full?: string;
  };
  error?: {
    message: string;
    stack_trace: string;
  };
  service?: {
    name: string;
  };
  agent?: {
    name: string;
  };
  state?: {
    id: string;
  };
}

export interface AlertPendingStatusMetaData {
  monitorQueryId: string;
  configId: string;
  status: string;
  locationId: string;
  monitorInfo: MissingPingMonitorInfo;
  timestamp?: string;
  latestPing?: OverviewPing;
  pendingCount?: number;
}

export interface AlertOverviewStatus {
  upConfigs: Record<string, AlertStatusMetaData>;
  downConfigs: Record<string, AlertStatusMetaData>;
  pendingConfigs: Record<string, AlertPendingStatusMetaData>;
  enabledMonitorQueryIds: string[];
  staleDownConfigs: Record<string, AlertStatusMetaData & StaleAlertMetadata>;
  stalePendingConfigs: Record<string, AlertPendingStatusMetaData & StaleAlertMetadata>;
  maxPeriod: number;
}
export type StaleDownConfig = AlertStatusMetaData & StaleAlertMetadata;
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
