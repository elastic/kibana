/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildAlertDocument } from './build_documents';
import type {
  Ad2IndexedAlert,
  Ad2ScenarioDefinition,
  Ad2ScenarioOs,
  Ad2ScenarioStep,
} from './types';

interface BackgroundRule {
  readonly ruleName: string;
  readonly category: string;
  readonly dataset: string;
  readonly count: number;
  /**
   * Severity/risk of the alerts this rule emits. Several rules deliberately
   * fire HIGH/CRITICAL with scores inside the signal band (71-96): a noise
   * population entirely below the signal range turns
   * `kibana.alert.risk_score >= 70` into a perfect answer key. The benign
   * reading stays in each message — a high score on a benign occurrence is
   * the rule's own rating, not a verdict on the activity.
   */
  /**
   * Benign reading carried in the message itself, so a high severity above
   * reads as the rule's own rating while the text explains the activity.
   */
  readonly message: string;
  readonly severity: Ad2ScenarioStep['severity'];
  readonly riskScore: number;
}

const BACKGROUND_RULES: readonly BackgroundRule[] = [
  {
    ruleName: 'Okta Sign-In from New Geographic Location',
    category: 'Identity',
    dataset: 'okta.system',
    count: 12,
    message:
      'Okta sign-in from a new geographic location for bob.jenkins; travel exception on file',
    severity: 'medium',
    riskScore: 47,
  },
  {
    ruleName: 'Okta MFA Push Denied by User',
    category: 'Identity',
    dataset: 'okta.system',
    count: 8,
    message: 'Okta MFA push denied by user; expected for an unrequested sign-in',
    severity: 'low',
    riskScore: 21,
  },
  {
    ruleName: 'Suspicious Cross-Region API Call',
    category: 'Cloud',
    dataset: 'aws.cloudtrail',
    count: 10,
    message: 'Cross-region S3 replication job issued the API call from the backup service role',
    severity: 'high',
    riskScore: 78,
  },
  {
    ruleName: 'SSH Login from Corp Bastion',
    category: 'Network',
    dataset: 'system.auth',
    count: 10,
    message: 'SSH session from the corporate bastion matched the on-call access pattern',
    severity: 'low',
    riskScore: 26,
  },
  {
    ruleName: 'New Local User Created',
    category: 'Endpoint Behavior Detection',
    dataset: 'endpoint.events.iam',
    count: 5,
    message: 'Local service account created by configuration management (ansible, run 4471)',
    severity: 'low',
    riskScore: 33,
  },
  {
    ruleName: 'Slack API Token Created',
    category: 'Identity',
    dataset: 'slack.audit',
    count: 8,
    message: 'Slack API token created for the approved reporting integration',
    severity: 'low',
    riskScore: 24,
  },
  {
    ruleName: 'GitHub OAuth Token Created',
    category: 'Identity',
    dataset: 'github.audit',
    count: 8,
    message: 'GitHub OAuth token created for the org-approved CI application',
    severity: 'medium',
    riskScore: 43,
  },
  {
    ruleName: 'Endpoint Agent Heartbeat Missed',
    category: 'System',
    dataset: 'endpoint.status',
    count: 14,
    message: 'Endpoint agent heartbeat missed during the nightly maintenance window',
    severity: 'low',
    riskScore: 18,
  },
  {
    ruleName: 'Anomalous Process Execution on Server',
    category: 'Endpoint Behavior Detection',
    dataset: 'endpoint.events.process',
    count: 10,
    message: 'Scheduled integrity scan ran outside its usual window on the build server',
    severity: 'critical',
    riskScore: 97,
  },
  {
    ruleName: 'USB Mass Storage Connected',
    category: 'Endpoint Behavior Detection',
    dataset: 'endpoint.events.registry',
    count: 5,
    message: 'Encrypted corporate backup drive connected to the imaging workstation',
    severity: 'low',
    riskScore: 21,
  },
  {
    ruleName: 'Anomalous DNS Query Volume',
    category: 'Network',
    dataset: 'endpoint.events.dns',
    count: 10,
    message: 'DNS query volume spike traced to the marketing analytics batch export',
    severity: 'high',
    riskScore: 74,
  },
  {
    ruleName: 'Firewall Deny from Corp Range',
    category: 'Network',
    dataset: 'firewall.log',
    count: 10,
    message: 'Firewall denied a connection from the guest Wi-Fi range per standing policy',
    severity: 'medium',
    riskScore: 39,
  },
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

export const buildBackgroundNoiseAlerts = (
  runMarker: string,
  baseTime: Date = new Date()
): Ad2IndexedAlert[] => {
  const alerts: Ad2IndexedAlert[] = [];
  let counter = 0;

  for (const rule of BACKGROUND_RULES) {
    for (let i = 0; i < rule.count; i++) {
      counter += 1;
      const [host, os, user] = BACKGROUND_HOSTS[counter % BACKGROUND_HOSTS.length];
      const scenario = backgroundScenario(host, os, user, rule.dataset, rule.category);
      const timestamp = new Date(baseTime.getTime() - minutesAgoForIndex(counter) * 60_000);
      alerts.push(
        buildAlertDocument(
          'background',
          scenario,
          counter,
          {
            ruleName: rule.ruleName,
            severity: rule.severity,
            riskScore: rule.riskScore,
            message: rule.message,
            processName: null,
            commandLine: null,
            eventType: null,
            context: null,
          },
          timestamp,
          runMarker,
          // One rule identity per BACKGROUND RULE: these 110 alerts represent
          // 12 noisy rules, so rule-based correlation has to see repeated hits
          // from the same rule, not 110 single-hit rules. `ruleName` is the
          // shared seed, so all alerts of one rule share
          // `kibana.alert.rule.uuid`/`rule_id` while every ALERT id stays
          // unique (it digests `counter`).
          rule.ruleName
        )
      );
    }
  }

  return alerts;
};

export const buildLoudClusterAlerts = (
  runMarker: string,
  baseTime: Date = new Date()
): Ad2IndexedAlert[] => {
  const alerts: Ad2IndexedAlert[] = [];

  for (let number = 1; number <= 40; number++) {
    const [host, os, user] = BACKGROUND_HOSTS[number % BACKGROUND_HOSTS.length];
    const scenario = loudClusterScenario(host, os, user);
    const timestamp = new Date(baseTime.getTime() - minutesAgoForIndex(number + 200) * 60_000);
    alerts.push(
      buildAlertDocument(
        'loud-cluster',
        scenario,
        number,
        {
          ruleName: 'Windows Defender Signature Update Failed',
          severity: 'medium',
          riskScore: 47,
          message: 'Defender signature update failed; retry scheduled',
          processName: null,
          commandLine: null,
          eventType: null,
          context: null,
        },
        timestamp,
        runMarker,
        // All 40 hits come from ONE flaky rule, so they share a single rule
        // identity; only the alert id varies per hit.
        'defender-signature-update'
      )
    );
  }

  return alerts;
};

export const getBackgroundNoiseAlertIds = (
  runMarker: string,
  baseTime: Date = new Date('2026-07-01T12:00:00.000Z')
): readonly string[] => [
  ...buildBackgroundNoiseAlerts(runMarker, baseTime).map((alert) => alert.id),
  ...buildLoudClusterAlerts(runMarker, baseTime).map((alert) => alert.id),
];

export const FULL_PROFILE_EXPECTED_SIGNAL_ALERT_COUNT = 28;
export const FULL_PROFILE_BACKGROUND_ALERT_COUNT = 110;
export const FULL_PROFILE_LOUD_CLUSTER_ALERT_COUNT = 40;

export const isNoiseScenarioKey = (scenarioKey: string): boolean =>
  scenarioKey === 'background' || scenarioKey === 'loud-cluster';

/**
 * Alert ids are digests of (runMarker, scenarioKey, stepNumber) and deliberately
 * do not spell out the scenario key — the key is the target/noise discriminator
 * this suite measures. So noise membership can only be tested against the
 * plan's own noise id set, never by inspecting the id string.
 */
export const isNoiseAlertId = (alertId: string, noiseAlertIds: readonly string[]): boolean =>
  noiseAlertIds.includes(alertId);
