/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  AlertInstanceContext,
  AlertInstanceState,
  RecoveredActionGroupId,
} from '@kbn/alerting-plugin/common';
import { RuleType } from '@kbn/alerting-plugin/server';
import { DefaultAlert, ObservabilityUptimeAlert } from '@kbn/alerts-as-data-utils';
import { UMServerLibs } from '../lib';
import { UptimeCorePluginsSetup, UptimeServerSetup } from '../adapters';

/**
 * Because all of our types are presumably going to list the `producer` as `'uptime'`,
 * we should just omit this field from the returned value to simplify the returned alert type.
 *
 * When we register all the alerts we can inject this field.
 */
export type DefaultUptimeAlertInstance<TActionGroupIds extends string> = RuleType<
  Record<string, any>,
  never,
  Record<string, any>,
  AlertInstanceState,
  AlertInstanceContext,
  TActionGroupIds,
  RecoveredActionGroupId,
  ObservabilityUptimeAlert
>;

export type UptimeAlertTypeFactory<TActionGroupIds extends string> = (
  server: UptimeServerSetup,
  libs: UMServerLibs,
  plugins: UptimeCorePluginsSetup
) => DefaultUptimeAlertInstance<TActionGroupIds>;

export type LegacyUptimeRuleTypeFactory<TActionGroupIds extends string> = (
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
  DefaultAlert
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
