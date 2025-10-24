/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  AlertInstanceContext,
  AlertInstanceState,
  RecoveredActionGroupId,
} from '@kbn/alerting-plugin/common';
import type { RuleType } from '@kbn/alerting-plugin/server';
import type { DefaultAlert, ObservabilityUptimeAlert } from '@kbn/alerts-as-data-utils';
import type { UMServerLibs } from '../lib';
import type { UptimeCorePluginsSetup, UptimeServerSetup } from '../adapters';

/**
 * Because all of our types are presumably going to list the `producer` as `'uptime'`,
 * we should just omit this field from the returned value to simplify the returned alert type.
 *
 * When we register all the alerts we can inject this field.
 */

export type DurationAnomalyAlert = ObservabilityUptimeAlert & {
  'kibana.alert.current_trigger_started'?: string;
  'kibana.alert.first_triggered_at'?: string;
  'kibana.alert.last_triggered_at'?: string;
  'kibana.alert.last_resolved_at'?: string;
  'kibana.alert.first_checked_at': string;
  'kibana.alert.last_checked_at': string;
  'kibana.alert.is_triggered': boolean;
  'anomaly.severity': string;
  'anomaly.severity_score': number;
  'anomaly.monitor': string;
  'anomaly.slowest_anomaly_response': string;
  'anomaly.expected_response_time': string;
};

export type StatusCheckAlert = ObservabilityUptimeAlert & {
  'kibana.alert.current_trigger_started'?: string;
  'kibana.alert.first_triggered_at'?: string;
  'kibana.alert.last_triggered_at'?: string;
  'kibana.alert.last_resolved_at'?: string;
  'kibana.alert.first_checked_at': string;
  'kibana.alert.last_checked_at': string;
  'kibana.alert.is_triggered': boolean;
  'kibana.alert.status_message': string;
};

export type LegacyTlsAlert = ObservabilityUptimeAlert & {
  'kibana.alert.current_trigger_started'?: string;
  'kibana.alert.first_triggered_at'?: string;
  'kibana.alert.last_triggered_at'?: string;
  'kibana.alert.last_resolved_at'?: string;
  'kibana.alert.first_checked_at': string;
  'kibana.alert.last_checked_at': string;
  'kibana.alert.is_triggered': boolean;
  'certs.count': number;
  'certs.aging.count': number;
  'certs.aging.common_name_and_date': string;
  'certs.expiring.count': number;
  'certs.expiring.common_name_and_date': string;
  'certs.has_aging': boolean | null;
  'certs.has_expired': boolean | null;
};

export type TlsAlert = ObservabilityUptimeAlert & {
  'kibana.alert.current_trigger_started'?: string;
  'kibana.alert.first_triggered_at'?: string;
  'kibana.alert.last_triggered_at'?: string;
  'kibana.alert.last_resolved_at'?: string;
  'kibana.alert.first_checked_at': string;
  'kibana.alert.last_checked_at': string;
  'kibana.alert.is_triggered': boolean;
  'certs.common_name': string;
  'certs.issuer': string;
  'certs.summary': string;
  'certs.status': string;
};

export type DefaultUptimeAlertInstance<
  TActionGroupIds extends string,
  TAlert extends ObservabilityUptimeAlert
> = RuleType<
  Record<string, any>,
  never,
  Record<string, any>,
  AlertInstanceState,
  AlertInstanceContext,
  TActionGroupIds,
  RecoveredActionGroupId,
  TAlert
>;

export type UptimeAlertTypeFactory<
  TActionGroupIds extends string,
  TAlert extends ObservabilityUptimeAlert
> = (
  server: UptimeServerSetup,
  libs: UMServerLibs,
  plugins: UptimeCorePluginsSetup
) => DefaultUptimeAlertInstance<TActionGroupIds, TAlert>;

export type LegacyUptimeRuleTypeFactory<
  TActionGroupIds extends string,
  TAlert extends DefaultAlert
> = (
  server: UptimeServerSetup,
  libs: UMServerLibs,
  plugins: UptimeCorePluginsSetup
) => RuleType<
  Record<string, any>,
  never,
  Record<string, any>,
  AlertInstanceState,
  AlertInstanceContext,
  TActionGroupIds,
  RecoveredActionGroupId,
  TAlert
>;

export interface MonitorSummary {
  checkedAt: string;
  monitorUrl?: string;
  monitorId: string;
  configId?: string;
  monitorName: string;
  monitorType: string;
  latestErrorMessage?: string;
  observerLocation: string;
  observerName?: string;
  observerHostname?: string;
  tags?: string[];
  reason: string;
}
