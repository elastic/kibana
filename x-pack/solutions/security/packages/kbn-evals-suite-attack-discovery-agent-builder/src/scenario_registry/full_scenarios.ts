/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Ad2ScenarioDefinition, Ad2ScenarioStep } from './types';

const step = (
  ruleName: string,
  severity: Ad2ScenarioStep['severity'],
  riskScore: number,
  message: string,
  processName: string | null,
  commandLine: string | null,
  eventType: Ad2ScenarioStep['eventType'],
  context: string | null
): Ad2ScenarioStep => ({
  ruleName,
  severity,
  riskScore,
  message,
  processName,
  commandLine,
  eventType,
  context,
});

/** Full-profile-only chains (clean profile chains live in clean_scenarios.ts). */
export const AD2_FULL_ONLY_SCENARIOS = {
  'aws-compromise': {
    key: 'aws-compromise',
    title: 'AWS credential compromise and S3 exfiltration',
    host: 'dev-cloudops-04',
    os: 'linux',
    user: 'diego.moreno',
    startHoursAgo: 3,
    raw: false,
    dataset: 'aws.cloudtrail',
    category: 'Cloud',
    steps: [
      step(
        'AWS Console Login from Anomalous ASN',
        'high',
        73,
        'Console login from anomalous ASN AS14061 for IAM user diego.moreno',
        null,
        null,
        null,
        null
      ),
      step(
        'AWS IAM AccessKey Created for Another User',
        'high',
        78,
        'diego.moreno created an access key for platform-svc-account',
        null,
        null,
        null,
        null
      ),
      step(
        'AWS SSM SendCommand to Production EC2 from New Principal',
        'high',
        81,
        'platform-svc-account issued SSM SendCommand to prod-web-tier-3',
        null,
        null,
        null,
        null
      ),
      step(
        'AWS S3 GetObject Volume Spike from New Source IP',
        'critical',
        91,
        '947 GetObject calls targeted customer-exports from a new source IP',
        null,
        null,
        null,
        null
      ),
    ],
  },
  'azure-oauth': {
    key: 'azure-oauth',
    title: 'Azure AD OAuth consent phishing and mailbox theft',
    host: 'wks-morgan-08',
    os: 'windows',
    user: 'morgan.li',
    startHoursAgo: 5,
    raw: false,
    dataset: 'azure.auditlogs',
    category: 'Identity',
    steps: [
      step(
        'Azure AD Consent Grant to Unverified Application',
        'high',
        71,
        'Mail.Read and offline_access granted to an unverified multi-tenant app',
        null,
        null,
        null,
        null
      ),
      step(
        'Anomalous OAuth Token Issuance for Mail Read Scope',
        'high',
        74,
        'First-time OAuth token issued for the app-user pair',
        null,
        null,
        null,
        null
      ),
      step(
        'Anomalous EWS Mailbox Download Volume',
        'high',
        78,
        '3,214 messages read through EWS in eight minutes',
        null,
        null,
        null,
        null
      ),
      step(
        'New Mail Forwarding Rule to External Address',
        'critical',
        88,
        'All messages forwarded to an external proton.me address',
        null,
        null,
        null,
        null
      ),
    ],
  },
  'macos-toolkit': {
    key: 'macos-toolkit',
    title: 'macOS persistence, credential access, and C2',
    host: 'mbp-taylor-05',
    os: 'macos',
    user: 'taylor.reid',
    startHoursAgo: 9,
    raw: true,
    steps: [
      step(
        'LaunchAgent Persistence Created by Non-System Process',
        'high',
        72,
        'A temporary installer created com.updater.helper.plist',
        'installer.pkg-child',
        '/tmp/installer.pkg-child --install',
        'file',
        '/Users/taylor.reid/Library/LaunchAgents/com.updater.helper.plist'
      ),
      step(
        'osascript Spawned by Browser Process',
        'high',
        75,
        'Google Chrome Helper spawned osascript to display a deceptive prompt',
        'osascript',
        "osascript -e 'display dialog \"System update required\"'",
        'process',
        null
      ),
      step(
        'Keychain Access from Non-Signed Binary',
        'high',
        80,
        'Unsigned kc-dump accessed login.keychain-db',
        'kc-dump',
        '/tmp/toolkit/kc-dump /Users/taylor.reid/Library/Keychains/login.keychain-db',
        'file',
        '/Users/taylor.reid/Library/Keychains/login.keychain-db'
      ),
      step(
        'Outbound Connection to Cloudflare Workers Proxy',
        'critical',
        87,
        'Toolkit beacon connected to c2-relay-92831.workers.dev',
        'beacon',
        '/tmp/toolkit/beacon --server c2-relay-92831.workers.dev',
        'network',
        'c2-relay-92831.workers.dev'
      ),
    ],
  },
} as const satisfies Record<string, Ad2ScenarioDefinition>;

export type Ad2FullOnlyScenarioKey = keyof typeof AD2_FULL_ONLY_SCENARIOS;

export const AD2_FULL_ONLY_SCENARIO_KEYS = Object.keys(
  AD2_FULL_ONLY_SCENARIOS
) as Ad2FullOnlyScenarioKey[];
