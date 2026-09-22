/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AD2_SCENARIO_ID_PREFIX } from './constants';
import { buildAlertDocument } from './build_documents';
import type { Ad2IndexedAlert, Ad2ScenarioDefinition, Ad2ScenarioOs } from './types';

interface BackgroundRule {
  readonly ruleName: string;
  readonly category: string;
  readonly dataset: string;
  readonly count: number;
}

const BACKGROUND_RULES: readonly BackgroundRule[] = [
  { ruleName: 'Okta Sign-In from New Geographic Location', category: 'Identity', dataset: 'okta.system', count: 12 },
  { ruleName: 'Okta MFA Push Denied by User', category: 'Identity', dataset: 'okta.system', count: 8 },
  { ruleName: 'Suspicious Cross-Region API Call', category: 'Cloud', dataset: 'aws.cloudtrail', count: 10 },
  { ruleName: 'SSH Login from Corp Bastion', category: 'Network', dataset: 'system.auth', count: 10 },
  { ruleName: 'New Local User Created', category: 'Endpoint Behavior Detection', dataset: 'endpoint.events.iam', count: 5 },
  { ruleName: 'Slack API Token Created', category: 'Identity', dataset: 'slack.audit', count: 8 },
  { ruleName: 'GitHub OAuth Token Created', category: 'Identity', dataset: 'github.audit', count: 8 },
  { ruleName: 'Endpoint Agent Heartbeat Missed', category: 'System', dataset: 'endpoint.status', count: 14 },
  { ruleName: 'Anomalous Process Execution on Server', category: 'Endpoint Behavior Detection', dataset: 'endpoint.events.process', count: 10 },
  { ruleName: 'USB Mass Storage Connected', category: 'Endpoint Behavior Detection', dataset: 'endpoint.events.registry', count: 5 },
  { ruleName: 'Anomalous DNS Query Volume', category: 'Network', dataset: 'endpoint.events.dns', count: 10 },
  { ruleName: 'Firewall Deny from Corp Range', category: 'Network', dataset: 'firewall.log', count: 10 },
] as const;

const BACKGROUND_HOSTS: ReadonlyArray<readonly [string, Ad2ScenarioOs, string]> = [
  ['wks-bob-02', 'windows', 'bob.jenkins'],
  ['wks-charlie-03', 'windows', 'charlie.wong'],
  ['wks-priya-11', 'windows', 'priya.iyer'],
  ['wks-sam-14', 'windows', 'samira.a'],
  ['mbp-devon-06', 'macos', 'devon.tanaka'],
  ['srv-app-12', 'linux', 'app-svc'],
  ['srv-web-13', 'linux', 'www-data'],
  ['srv-db-15', 'linux', 'postgres'],
] as const;

const backgroundScenario = (
  host: string,
  os: Ad2ScenarioOs,
  user: string,
  dataset: string,
  category: string
): Ad2ScenarioDefinition => ({
  key: 'background',
  title: 'Background noise alert',
  host,
  os,
  user,
  startHoursAgo: 12,
  raw: false,
  dataset,
  category,
  steps: [],
});

const loudClusterScenario = (
  host: string,
  os: Ad2ScenarioOs,
  user: string
): Ad2ScenarioDefinition => ({
  key: 'loud-cluster',
  title: 'Flaky Defender update cluster',
  host,
  os,
  user,
  startHoursAgo: 12,
  raw: false,
  dataset: 'windows.system',
  category: 'System',
  steps: [],
});

/** Deterministic offsets (minutes ago) — portable seeder uses random; evals need repeatability. */
const minutesAgoForIndex = (index: number): number => 30 + (index % 138) * 10;

export const buildBackgroundNoiseAlerts = (baseTime: Date = new Date()): Ad2IndexedAlert[] => {
  const alerts: Ad2IndexedAlert[] = [];
  let counter = 0;

  for (const rule of BACKGROUND_RULES) {
    for (let i = 0; i < rule.count; i++) {
      counter += 1;
      const [host, os, user] = BACKGROUND_HOSTS[counter % BACKGROUND_HOSTS.length];
      const scenario = backgroundScenario(host, os, user, rule.dataset, rule.category);
      const timestamp = new Date(baseTime.getTime() - minutesAgoForIndex(counter) * 60_000);
      alerts.push(
        buildAlertDocument('background', scenario, counter, {
          ruleName: rule.ruleName,
          severity: 'low',
          riskScore: 21,
          message: `Background test alert: ${rule.ruleName}`,
          processName: null,
          commandLine: null,
          eventType: null,
          context: null,
        }, timestamp)
      );
    }
  }

  return alerts;
};

export const buildLoudClusterAlerts = (baseTime: Date = new Date()): Ad2IndexedAlert[] => {
  const alerts: Ad2IndexedAlert[] = [];

  for (let number = 1; number <= 40; number++) {
    const [host, os, user] = BACKGROUND_HOSTS[number % BACKGROUND_HOSTS.length];
    const scenario = loudClusterScenario(host, os, user);
    const timestamp = new Date(baseTime.getTime() - minutesAgoForIndex(number + 200) * 60_000);
    alerts.push(
      buildAlertDocument('loud-cluster', scenario, number, {
        ruleName: 'Windows Defender Signature Update Failed',
        severity: 'low',
        riskScore: 15,
        message: 'Defender signature update failed; retry scheduled',
        processName: null,
        commandLine: null,
        eventType: null,
        context: null,
      }, timestamp)
    );
  }

  return alerts;
};

export const getBackgroundNoiseAlertIds = (): readonly string[] => {
  const baseTime = new Date('2026-07-01T12:00:00.000Z');
  return [
    ...buildBackgroundNoiseAlerts(baseTime).map((alert) => alert.id),
    ...buildLoudClusterAlerts(baseTime).map((alert) => alert.id),
  ];
};

export const FULL_PROFILE_EXPECTED_SIGNAL_ALERT_COUNT = 28;
export const FULL_PROFILE_BACKGROUND_ALERT_COUNT = 110;
export const FULL_PROFILE_LOUD_CLUSTER_ALERT_COUNT = 40;

export const isNoiseScenarioKey = (scenarioKey: string): boolean =>
  scenarioKey === 'background' || scenarioKey === 'loud-cluster';

export const isNoiseAlertId = (alertId: string): boolean =>
  alertId.startsWith(`${AD2_SCENARIO_ID_PREFIX}background-alert-`) ||
  alertId.startsWith(`${AD2_SCENARIO_ID_PREFIX}loud-cluster-alert-`);
