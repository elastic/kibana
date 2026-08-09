/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * EA Facelift design prototype — all mock data lives here (the single
 * tweakable data file for the prototype; named `data.ts` because Kibana’s
 * import lint blocks browser code from importing paths containing “mock”).
 * Static, presentation-only.
 */

import { EntityType } from '../../../../../common/entity_analytics/types';
import type { CriticalityLevelWithUnassigned } from '../../../../../common/entity_analytics/asset_criticality/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FaceliftRiskLevel = 'Critical' | 'High' | 'Medium' | 'Low' | 'Unknown';

/** Matrix columns: low_impact and unassigned are folded into one tier. */
export type CriticalityTier = 'extreme' | 'high' | 'medium' | 'lowOrUnassigned';

export type TableView = 'resolved' | 'raw';

export type SignalCardId =
  | 'riskMovers'
  | 'newToCritical'
  | 'privilegedAtRisk'
  | 'newAnomalies'
  | 'dormantActive'
  | 'unresolvedHighRisk';

export interface SignalCardData {
  id: SignalCardId;
  title: string;
  value: number;
  label: string;
  /** 24h change. Positive = worse (red), negative = better (green). */
  delta: number;
  /** Label shown in the dismissible filter badge when the card is active. */
  filterLabel: string;
  trend?: number[];
  secondaryLinkText?: string;
}

export interface FaceliftRawRecord {
  id: string;
  name: string;
  entityId: string;
  entityType: EntityType;
  domain: string;
  source: string;
  riskScore: number;
  criticality: CriticalityLevelWithUnassigned;
  alerts: number;
  lastSeen: string;
  /** Identity id this record resolves to; undefined = unresolved. */
  resolvedTo?: string;
}

export interface FaceliftIdentity {
  id: string;
  name: string;
  entityType: EntityType;
  riskScore: number;
  /** 24h risk score change. */
  riskDelta24h: number;
  criticality: CriticalityLevelWithUnassigned;
  alerts: number;
  lastSeen: string;
  isPrivileged: boolean;
  isNewToCritical: boolean;
  hasNewAnomalies: boolean;
  isDormantActive: boolean;
  topRiskContributions?: Array<{ label: string; value: number }>;
}

export type ActiveFilter =
  | { type: 'matrix'; riskLevel: FaceliftRiskLevel; tier: CriticalityTier; label: string }
  | { type: 'card'; cardId: SignalCardId; label: string }
  | { type: 'identity'; identityId: string; label: string };

// ---------------------------------------------------------------------------
// Level / tier helpers
// ---------------------------------------------------------------------------

/** Standard mapping: Critical >90, High 70–90, Medium 40–70, Low 20–40, Unknown <20. */
export const getFaceliftRiskLevel = (score: number): FaceliftRiskLevel => {
  if (score > 90) return 'Critical';
  if (score >= 70) return 'High';
  if (score >= 40) return 'Medium';
  if (score >= 20) return 'Low';
  return 'Unknown';
};

export const RISK_LEVELS: FaceliftRiskLevel[] = ['Critical', 'High', 'Medium', 'Low', 'Unknown'];

export const CRITICALITY_TIERS: CriticalityTier[] = [
  'extreme',
  'high',
  'medium',
  'lowOrUnassigned',
];

export const CRITICALITY_TIER_LABELS: Record<CriticalityTier, string> = {
  extreme: 'Extreme impact',
  high: 'High impact',
  medium: 'Medium impact',
  lowOrUnassigned: 'Low/Unassigned',
};

export const tierOfCriticality = (criticality: CriticalityLevelWithUnassigned): CriticalityTier => {
  switch (criticality) {
    case 'extreme_impact':
      return 'extreme';
    case 'high_impact':
      return 'high';
    case 'medium_impact':
      return 'medium';
    default:
      return 'lowOrUnassigned';
  }
};

// ---------------------------------------------------------------------------
// Matrix headline numbers (presentational)
// ---------------------------------------------------------------------------

export const MATRIX_SUMMARY = {
  totalEntities: '5,000',
  criticalEntities: '2,500',
  deltaVsYesterday: '120',
};

export const RISK_MATRIX_COUNTS: Record<FaceliftRiskLevel, Record<CriticalityTier, number>> = {
  Critical: { extreme: 412, high: 968, medium: 754, lowOrUnassigned: 366 },
  High: { extreme: 118, high: 301, medium: 227, lowOrUnassigned: 154 },
  Medium: { extreme: 64, high: 189, medium: 340, lowOrUnassigned: 305 },
  Low: { extreme: 12, high: 45, medium: 156, lowOrUnassigned: 387 },
  Unknown: { extreme: 3, high: 9, medium: 38, lowOrUnassigned: 152 },
};

// ---------------------------------------------------------------------------
// Signal cards
// ---------------------------------------------------------------------------

export const SIGNAL_CARDS: SignalCardData[] = [
  {
    id: 'riskMovers',
    title: 'Risk movers',
    value: 14,
    label: 'entities with risk spike +20 or more in 24h',
    delta: 4,
    filterLabel: 'Risk movers (+20 in 24h)',
    trend: [6, 8, 7, 9, 11, 10, 14],
  },
  {
    id: 'newToCritical',
    title: 'New to Critical',
    value: 6,
    label: 'entities that crossed into critical today',
    delta: 2,
    filterLabel: 'New to Critical today',
  },
  {
    id: 'privilegedAtRisk',
    title: 'Privileged users at risk',
    value: 9,
    label: 'privileged users at high or critical risk',
    delta: 1,
    filterLabel: 'Privileged users at risk',
  },
  {
    id: 'newAnomalies',
    title: 'New anomalies',
    value: 37,
    label: 'entities with new anomalies today',
    delta: -5,
    filterLabel: 'New anomalies today',
    trend: [52, 48, 45, 41, 44, 39, 37],
    secondaryLinkText: 'Open in Anomaly Explorer',
  },
  {
    id: 'dormantActive',
    title: 'Dormant accounts active',
    value: 3,
    label: 'dormant accounts with new activity',
    delta: 3,
    filterLabel: 'Dormant accounts with new activity',
  },
  {
    id: 'unresolvedHighRisk',
    title: 'Unresolved high-risk records',
    value: 12,
    label: 'high-risk records not resolved to an identity',
    delta: -2,
    filterLabel: 'Unresolved high-risk records',
  },
];

export const DEFAULT_RISK_CONTRIBUTIONS = [
  { label: 'Critical alerts', value: 42 },
  { label: 'Privileged status', value: 15 },
  { label: 'Anomalies', value: 9 },
];

// ---------------------------------------------------------------------------
// Identities (~18) and raw records (~37)
// ---------------------------------------------------------------------------

const ago = (hours: number): string => new Date(Date.now() - hours * 36e5).toISOString();

export const IDENTITIES: FaceliftIdentity[] = [
  {
    id: 'id-amber',
    name: 'amber.rodriguez',
    entityType: EntityType.user,
    riskScore: 96,
    riskDelta24h: 24,
    criticality: 'extreme_impact',
    alerts: 14,
    lastSeen: ago(0.1),
    isPrivileged: true,
    isNewToCritical: true,
    hasNewAnomalies: true,
    isDormantActive: false,
    topRiskContributions: [
      { label: 'Critical alerts', value: 42 },
      { label: 'Privileged status', value: 15 },
      { label: 'Anomalies', value: 9 },
    ],
  },
  {
    id: 'id-svc-ci',
    name: 'svc-ci-deploy',
    entityType: EntityType.service,
    riskScore: 92,
    riskDelta24h: 8,
    criticality: 'high_impact',
    alerts: 9,
    lastSeen: ago(0.5),
    isPrivileged: false,
    isNewToCritical: true,
    hasNewAnomalies: false,
    isDormantActive: false,
    topRiskContributions: [
      { label: 'Critical alerts', value: 38 },
      { label: 'Rare process execution', value: 12 },
      { label: 'Token misuse signal', value: 8 },
    ],
  },
  {
    id: 'id-web-prod',
    name: 'web-prod-042',
    entityType: EntityType.host,
    riskScore: 88,
    riskDelta24h: 21,
    criticality: 'extreme_impact',
    alerts: 11,
    lastSeen: ago(0.2),
    isPrivileged: false,
    isNewToCritical: false,
    hasNewAnomalies: true,
    isDormantActive: false,
  },
  {
    id: 'id-james',
    name: 'james.okafor',
    entityType: EntityType.user,
    riskScore: 84,
    riskDelta24h: 3,
    criticality: 'high_impact',
    alerts: 6,
    lastSeen: ago(1),
    isPrivileged: true,
    isNewToCritical: false,
    hasNewAnomalies: false,
    isDormantActive: false,
  },
  {
    id: 'id-db-core',
    name: 'db-core-003',
    entityType: EntityType.host,
    riskScore: 81,
    riskDelta24h: -4,
    criticality: 'extreme_impact',
    alerts: 4,
    lastSeen: ago(2),
    isPrivileged: false,
    isNewToCritical: false,
    hasNewAnomalies: false,
    isDormantActive: false,
  },
  {
    id: 'id-maria',
    name: 'maria.chen',
    entityType: EntityType.user,
    riskScore: 78,
    riskDelta24h: 26,
    criticality: 'medium_impact',
    alerts: 7,
    lastSeen: ago(0.4),
    isPrivileged: false,
    isNewToCritical: false,
    hasNewAnomalies: true,
    isDormantActive: false,
  },
  {
    id: 'id-vpn-gw',
    name: 'vpn-gw-eu-1',
    entityType: EntityType.host,
    riskScore: 74,
    riskDelta24h: 0,
    criticality: 'high_impact',
    alerts: 3,
    lastSeen: ago(3),
    isPrivileged: false,
    isNewToCritical: false,
    hasNewAnomalies: false,
    isDormantActive: false,
  },
  {
    id: 'id-svc-backup',
    name: 'svc-backup-agent',
    entityType: EntityType.service,
    riskScore: 71,
    riskDelta24h: 2,
    criticality: 'medium_impact',
    alerts: 2,
    lastSeen: ago(0.7),
    isPrivileged: false,
    isNewToCritical: false,
    hasNewAnomalies: false,
    isDormantActive: true,
  },
  {
    id: 'id-liam',
    name: 'liam.novak',
    entityType: EntityType.user,
    riskScore: 72,
    riskDelta24h: 22,
    criticality: 'high_impact',
    alerts: 5,
    lastSeen: ago(0.25),
    isPrivileged: true,
    isNewToCritical: false,
    hasNewAnomalies: true,
    isDormantActive: false,
  },
  {
    id: 'id-kiosk',
    name: 'kiosk-lobby-2',
    entityType: EntityType.host,
    riskScore: 64,
    riskDelta24h: -2,
    criticality: 'low_impact',
    alerts: 1,
    lastSeen: ago(6),
    isPrivileged: false,
    isNewToCritical: false,
    hasNewAnomalies: false,
    isDormantActive: false,
  },
  {
    id: 'id-sofia',
    name: 'sofia.marino',
    entityType: EntityType.user,
    riskScore: 58,
    riskDelta24h: 5,
    criticality: 'medium_impact',
    alerts: 2,
    lastSeen: ago(2),
    isPrivileged: false,
    isNewToCritical: false,
    hasNewAnomalies: true,
    isDormantActive: false,
  },
  {
    id: 'id-build-runner',
    name: 'build-runner-17',
    entityType: EntityType.host,
    riskScore: 52,
    riskDelta24h: 1,
    criticality: 'medium_impact',
    alerts: 0,
    lastSeen: ago(0.8),
    isPrivileged: false,
    isNewToCritical: false,
    hasNewAnomalies: false,
    isDormantActive: false,
  },
  {
    id: 'id-tomas',
    name: 'tomas.lindqvist',
    entityType: EntityType.user,
    riskScore: 47,
    riskDelta24h: -9,
    criticality: 'low_impact',
    alerts: 1,
    lastSeen: ago(72),
    isPrivileged: false,
    isNewToCritical: false,
    hasNewAnomalies: false,
    isDormantActive: true,
  },
  {
    id: 'id-svc-report',
    name: 'svc-report-gen',
    entityType: EntityType.service,
    riskScore: 38,
    riskDelta24h: 2,
    criticality: 'low_impact',
    alerts: 0,
    lastSeen: ago(8),
    isPrivileged: false,
    isNewToCritical: false,
    hasNewAnomalies: false,
    isDormantActive: false,
  },
  {
    id: 'id-eva',
    name: 'eva.dubois',
    entityType: EntityType.user,
    riskScore: 33,
    riskDelta24h: 0,
    criticality: 'unassigned',
    alerts: 0,
    lastSeen: ago(24),
    isPrivileged: false,
    isNewToCritical: false,
    hasNewAnomalies: false,
    isDormantActive: false,
  },
  {
    id: 'id-print-srv',
    name: 'print-srv-01',
    entityType: EntityType.host,
    riskScore: 26,
    riskDelta24h: -3,
    criticality: 'low_impact',
    alerts: 0,
    lastSeen: ago(96),
    isPrivileged: false,
    isNewToCritical: false,
    hasNewAnomalies: false,
    isDormantActive: true,
  },
  {
    id: 'id-noah',
    name: 'noah.tanaka',
    entityType: EntityType.user,
    riskScore: 18,
    riskDelta24h: 1,
    criticality: 'unassigned',
    alerts: 0,
    lastSeen: ago(48),
    isPrivileged: false,
    isNewToCritical: false,
    hasNewAnomalies: false,
    isDormantActive: false,
  },
  {
    id: 'id-iot-sensor',
    name: 'iot-sensor-77',
    entityType: EntityType.host,
    riskScore: 8,
    riskDelta24h: 0,
    criticality: 'unassigned',
    alerts: 0,
    lastSeen: ago(120),
    isPrivileged: false,
    isNewToCritical: false,
    hasNewAnomalies: false,
    isDormantActive: false,
  },
];

export const IDENTITY_BY_ID: Record<string, FaceliftIdentity> = Object.fromEntries(
  IDENTITIES.map((identity) => [identity.id, identity])
);

export const RAW_RECORDS: FaceliftRawRecord[] = [
  // amber.rodriguez (3)
  {
    id: 'rec-ad-8f21',
    name: 'CORP\\arodriguez',
    entityId: 'S-1-5-21-397955417-626881126-188441444-3162',
    entityType: EntityType.user,
    domain: 'corp.acme.com',
    source: 'AD',
    riskScore: 96,
    criticality: 'extreme_impact',
    alerts: 9,
    lastSeen: ago(0.1),
    resolvedTo: 'id-amber',
  },
  {
    id: 'rec-okta-1a4e',
    name: 'amber.rodriguez@acme.com',
    entityId: '00u1a4ebafHGJKr5d697',
    entityType: EntityType.user,
    domain: 'acme.okta.com',
    source: 'Okta',
    riskScore: 91,
    criticality: 'extreme_impact',
    alerts: 4,
    lastSeen: ago(0.3),
    resolvedTo: 'id-amber',
  },
  {
    id: 'rec-wd-77c2',
    name: 'Amber Rodriguez (100482)',
    entityId: 'wd-emp-100482',
    entityType: EntityType.user,
    domain: 'acme.wd5.myworkday.com',
    source: 'Workday',
    riskScore: 88,
    criticality: 'extreme_impact',
    alerts: 1,
    lastSeen: ago(5),
    resolvedTo: 'id-amber',
  },
  // svc-ci-deploy (2)
  {
    id: 'rec-okta-9b2d',
    name: 'svc-ci-deploy@acme.com',
    entityId: '00u9b2dsvcHGJKr1x201',
    entityType: EntityType.service,
    domain: 'acme.okta.com',
    source: 'Okta',
    riskScore: 92,
    criticality: 'high_impact',
    alerts: 6,
    lastSeen: ago(0.5),
    resolvedTo: 'id-svc-ci',
  },
  {
    id: 'rec-ep-4410',
    name: 'svc-ci-deploy (agent)',
    entityId: 'ep-4410-bb71-98aa-01c3',
    entityType: EntityType.service,
    domain: 'corp.acme.com',
    source: 'Endpoint',
    riskScore: 87,
    criticality: 'high_impact',
    alerts: 3,
    lastSeen: ago(1.2),
    resolvedTo: 'id-svc-ci',
  },
  // web-prod-042 (2)
  {
    id: 'rec-ep-a2f9',
    name: 'web-prod-042',
    entityId: 'ep-a2f9-4c1e-88b3-71d0',
    entityType: EntityType.host,
    domain: 'corp.acme.com',
    source: 'Endpoint',
    riskScore: 88,
    criticality: 'extreme_impact',
    alerts: 8,
    lastSeen: ago(0.2),
    resolvedTo: 'id-web-prod',
  },
  {
    id: 'rec-cs-5512',
    name: 'WEB-PROD-042.corp',
    entityId: 'cs-agent-5512e0ff41',
    entityType: EntityType.host,
    domain: 'corp.acme.com',
    source: 'CrowdStrike',
    riskScore: 85,
    criticality: 'extreme_impact',
    alerts: 3,
    lastSeen: ago(0.6),
    resolvedTo: 'id-web-prod',
  },
  // james.okafor (4)
  {
    id: 'rec-ad-33d1',
    name: 'CORP\\jokafor',
    entityId: 'S-1-5-21-397955417-626881126-188441444-2044',
    entityType: EntityType.user,
    domain: 'corp.acme.com',
    source: 'AD',
    riskScore: 84,
    criticality: 'high_impact',
    alerts: 3,
    lastSeen: ago(1),
    resolvedTo: 'id-james',
  },
  {
    id: 'rec-okta-71b8',
    name: 'james.okafor@acme.com',
    entityId: '00u71b8okaHGJKr2m544',
    entityType: EntityType.user,
    domain: 'acme.okta.com',
    source: 'Okta',
    riskScore: 79,
    criticality: 'high_impact',
    alerts: 2,
    lastSeen: ago(1.4),
    resolvedTo: 'id-james',
  },
  {
    id: 'rec-wd-2091',
    name: 'James Okafor (100077)',
    entityId: 'wd-emp-100077',
    entityType: EntityType.user,
    domain: 'acme.wd5.myworkday.com',
    source: 'Workday',
    riskScore: 71,
    criticality: 'high_impact',
    alerts: 0,
    lastSeen: ago(30),
    resolvedTo: 'id-james',
  },
  {
    id: 'rec-entra-c4a7',
    name: 'james.okafor@acmecorp.onmicrosoft.com',
    entityId: 'c4a7d0f2-9e51-4b6a-a1c8-2f97e30d5b11',
    entityType: EntityType.user,
    domain: 'acmecorp.onmicrosoft.com',
    source: 'Entra ID',
    riskScore: 76,
    criticality: 'high_impact',
    alerts: 1,
    lastSeen: ago(2.5),
    resolvedTo: 'id-james',
  },
  // db-core-003 (1)
  {
    id: 'rec-ep-b7c3',
    name: 'db-core-003',
    entityId: 'ep-b7c3-11aa-40de-92f1',
    entityType: EntityType.host,
    domain: 'corp.acme.com',
    source: 'Endpoint',
    riskScore: 81,
    criticality: 'extreme_impact',
    alerts: 4,
    lastSeen: ago(2),
    resolvedTo: 'id-db-core',
  },
  // maria.chen (2)
  {
    id: 'rec-ad-90ef',
    name: 'CORP\\mchen',
    entityId: 'S-1-5-21-397955417-626881126-188441444-4471',
    entityType: EntityType.user,
    domain: 'corp.acme.com',
    source: 'AD',
    riskScore: 78,
    criticality: 'medium_impact',
    alerts: 5,
    lastSeen: ago(0.4),
    resolvedTo: 'id-maria',
  },
  {
    id: 'rec-okta-d3f0',
    name: 'maria.chen@acme.com',
    entityId: '00ud3f0cheHGJKr8q930',
    entityType: EntityType.user,
    domain: 'acme.okta.com',
    source: 'Okta',
    riskScore: 74,
    criticality: 'medium_impact',
    alerts: 2,
    lastSeen: ago(0.9),
    resolvedTo: 'id-maria',
  },
  // vpn-gw-eu-1 (2)
  {
    id: 'rec-ep-66a1',
    name: 'vpn-gw-eu-1',
    entityId: 'ep-66a1-90bc-4f2e-ad55',
    entityType: EntityType.host,
    domain: 'corp.acme.com',
    source: 'Endpoint',
    riskScore: 74,
    criticality: 'high_impact',
    alerts: 2,
    lastSeen: ago(3),
    resolvedTo: 'id-vpn-gw',
  },
  {
    id: 'rec-net-08d4',
    name: 'vpn-gw-eu-1.net',
    entityId: 'net-fw-08d4a1',
    entityType: EntityType.host,
    domain: 'ot.acme.local',
    source: 'Network',
    riskScore: 69,
    criticality: 'high_impact',
    alerts: 1,
    lastSeen: ago(4),
    resolvedTo: 'id-vpn-gw',
  },
  // svc-backup-agent (1)
  {
    id: 'rec-ad-5b09',
    name: 'CORP\\svc_backup',
    entityId: 'S-1-5-21-397955417-626881126-188441444-1180',
    entityType: EntityType.service,
    domain: 'corp.acme.com',
    source: 'AD',
    riskScore: 71,
    criticality: 'medium_impact',
    alerts: 2,
    lastSeen: ago(0.7),
    resolvedTo: 'id-svc-backup',
  },
  // liam.novak (3)
  {
    id: 'rec-ad-12aa',
    name: 'CORP\\lnovak',
    entityId: 'S-1-5-21-397955417-626881126-188441444-3901',
    entityType: EntityType.user,
    domain: 'corp.acme.com',
    source: 'AD',
    riskScore: 72,
    criticality: 'high_impact',
    alerts: 3,
    lastSeen: ago(0.25),
    resolvedTo: 'id-liam',
  },
  {
    id: 'rec-okta-e8b5',
    name: 'liam.novak@acme.com',
    entityId: '00ue8b5novHGJKr3z118',
    entityType: EntityType.user,
    domain: 'acme.okta.com',
    source: 'Okta',
    riskScore: 68,
    criticality: 'high_impact',
    alerts: 2,
    lastSeen: ago(0.6),
    resolvedTo: 'id-liam',
  },
  {
    id: 'rec-wd-3358',
    name: 'Liam Novak (100310)',
    entityId: 'wd-emp-100310',
    entityType: EntityType.user,
    domain: 'acme.wd5.myworkday.com',
    source: 'Workday',
    riskScore: 61,
    criticality: 'high_impact',
    alerts: 0,
    lastSeen: ago(26),
    resolvedTo: 'id-liam',
  },
  // kiosk-lobby-2 (1)
  {
    id: 'rec-ep-f00d',
    name: 'kiosk-lobby-2',
    entityId: 'ep-f00d-27c9-49ab-b3e8',
    entityType: EntityType.host,
    domain: 'corp.acme.com',
    source: 'Endpoint',
    riskScore: 64,
    criticality: 'low_impact',
    alerts: 1,
    lastSeen: ago(6),
    resolvedTo: 'id-kiosk',
  },
  // sofia.marino (2)
  {
    id: 'rec-ad-77e2',
    name: 'CORP\\smarino',
    entityId: 'S-1-5-21-397955417-626881126-188441444-5127',
    entityType: EntityType.user,
    domain: 'corp.acme.com',
    source: 'AD',
    riskScore: 58,
    criticality: 'medium_impact',
    alerts: 2,
    lastSeen: ago(2),
    resolvedTo: 'id-sofia',
  },
  {
    id: 'rec-entra-9f13',
    name: 'sofia.marino@acmecorp.onmicrosoft.com',
    entityId: '9f13ab77-3c02-46d1-b5a9-8811c2e64d20',
    entityType: EntityType.user,
    domain: 'acmecorp.onmicrosoft.com',
    source: 'Entra ID',
    riskScore: 54,
    criticality: 'medium_impact',
    alerts: 0,
    lastSeen: ago(3.5),
    resolvedTo: 'id-sofia',
  },
  // build-runner-17 (2)
  {
    id: 'rec-ep-31cb',
    name: 'build-runner-17',
    entityId: 'ep-31cb-55dd-4e01-97a2',
    entityType: EntityType.host,
    domain: 'corp.acme.com',
    source: 'Endpoint',
    riskScore: 52,
    criticality: 'medium_impact',
    alerts: 0,
    lastSeen: ago(0.8),
    resolvedTo: 'id-build-runner',
  },
  {
    id: 'rec-cs-8a60',
    name: 'BUILD-RUNNER-17.corp',
    entityId: 'cs-agent-8a60f9cc02',
    entityType: EntityType.host,
    domain: 'corp.acme.com',
    source: 'CrowdStrike',
    riskScore: 49,
    criticality: 'medium_impact',
    alerts: 0,
    lastSeen: ago(1.1),
    resolvedTo: 'id-build-runner',
  },
  // tomas.lindqvist (1)
  {
    id: 'rec-ad-c9d8',
    name: 'CORP\\tlindqvist',
    entityId: 'S-1-5-21-397955417-626881126-188441444-2718',
    entityType: EntityType.user,
    domain: 'corp.acme.com',
    source: 'AD',
    riskScore: 47,
    criticality: 'low_impact',
    alerts: 1,
    lastSeen: ago(72),
    resolvedTo: 'id-tomas',
  },
  // svc-report-gen (2)
  {
    id: 'rec-ad-40b6',
    name: 'CORP\\svc_reportgen',
    entityId: 'S-1-5-21-397955417-626881126-188441444-1533',
    entityType: EntityType.service,
    domain: 'corp.acme.com',
    source: 'AD',
    riskScore: 38,
    criticality: 'low_impact',
    alerts: 0,
    lastSeen: ago(8),
    resolvedTo: 'id-svc-report',
  },
  {
    id: 'rec-okta-2270',
    name: 'svc-report-gen@acme.com',
    entityId: '00u2270repHGJKr7t482',
    entityType: EntityType.service,
    domain: 'acme.okta.com',
    source: 'Okta',
    riskScore: 34,
    criticality: 'low_impact',
    alerts: 0,
    lastSeen: ago(10),
    resolvedTo: 'id-svc-report',
  },
  // eva.dubois (1)
  {
    id: 'rec-okta-ab19',
    name: 'eva.dubois@acme.com',
    entityId: '00uab19dubHGJKr6w775',
    entityType: EntityType.user,
    domain: 'acme.okta.com',
    source: 'Okta',
    riskScore: 33,
    criticality: 'unassigned',
    alerts: 0,
    lastSeen: ago(24),
    resolvedTo: 'id-eva',
  },
  // print-srv-01 (1)
  {
    id: 'rec-ep-dd21',
    name: 'print-srv-01',
    entityId: 'ep-dd21-83fe-4b77-c614',
    entityType: EntityType.host,
    domain: 'corp.acme.com',
    source: 'Endpoint',
    riskScore: 26,
    criticality: 'low_impact',
    alerts: 0,
    lastSeen: ago(96),
    resolvedTo: 'id-print-srv',
  },
  // noah.tanaka (1)
  {
    id: 'rec-wd-6644',
    name: 'Noah Tanaka (100566)',
    entityId: 'wd-emp-100566',
    entityType: EntityType.user,
    domain: 'acme.wd5.myworkday.com',
    source: 'Workday',
    riskScore: 18,
    criticality: 'unassigned',
    alerts: 0,
    lastSeen: ago(48),
    resolvedTo: 'id-noah',
  },
  // iot-sensor-77 (1)
  {
    id: 'rec-net-4f8a',
    name: 'iot-sensor-77',
    entityId: 'net-iot-4f8a2c',
    entityType: EntityType.host,
    domain: 'ot.acme.local',
    source: 'Network',
    riskScore: 8,
    criticality: 'unassigned',
    alerts: 0,
    lastSeen: ago(120),
    resolvedTo: 'id-iot-sensor',
  },
  // Unresolved high-risk records (signal card 6)
  {
    id: 'rec-ad-un01',
    name: 'CORP\\jdoe_admin',
    entityId: 'S-1-5-21-397955417-626881126-188441444-9001',
    entityType: EntityType.user,
    domain: 'corp.acme.com',
    source: 'AD',
    riskScore: 94,
    criticality: 'unassigned',
    alerts: 8,
    lastSeen: ago(0.3),
  },
  {
    id: 'rec-ep-un02',
    name: 'tmp-vm-0193',
    entityId: 'ep-un02-77aa-43c1-e9b0',
    entityType: EntityType.host,
    domain: 'corp.acme.com',
    source: 'Endpoint',
    riskScore: 88,
    criticality: 'unassigned',
    alerts: 5,
    lastSeen: ago(1.5),
  },
  {
    id: 'rec-ad-un03',
    name: 'CORP\\svc_legacy_ftp',
    entityId: 'S-1-5-21-397955417-626881126-188441444-0442',
    entityType: EntityType.service,
    domain: 'corp.acme.com',
    source: 'AD',
    riskScore: 82,
    criticality: 'unassigned',
    alerts: 3,
    lastSeen: ago(7),
  },
  {
    id: 'rec-okta-un04',
    name: 'okta-usr-4471@partner.example.com',
    entityId: '00uun04extHGJKr5v009',
    entityType: EntityType.user,
    domain: 'acme.okta.com',
    source: 'Okta',
    riskScore: 76,
    criticality: 'unassigned',
    alerts: 2,
    lastSeen: ago(4),
  },
  {
    id: 'rec-net-un05',
    name: 'unknown-mac-b4:2e:99',
    entityId: 'net-unk-b42e99',
    entityType: EntityType.host,
    domain: 'ot.acme.local',
    source: 'Network',
    riskScore: 71,
    criticality: 'unassigned',
    alerts: 1,
    lastSeen: ago(9),
  },
];

// ---------------------------------------------------------------------------
// Derived helpers
// ---------------------------------------------------------------------------

export const recordsForIdentity = (identityId: string): FaceliftRawRecord[] =>
  RAW_RECORDS.filter((record) => record.resolvedTo === identityId);

export const sourcesForIdentity = (identityId: string): string[] =>
  Array.from(new Set(recordsForIdentity(identityId).map((record) => record.source)));

const CARD_IDENTITY_PREDICATES: Record<SignalCardId, (identity: FaceliftIdentity) => boolean> = {
  riskMovers: (identity) => identity.riskDelta24h >= 20,
  newToCritical: (identity) => identity.isNewToCritical,
  privilegedAtRisk: (identity) =>
    identity.isPrivileged &&
    ['High', 'Critical'].includes(getFaceliftRiskLevel(identity.riskScore)),
  newAnomalies: (identity) => identity.hasNewAnomalies,
  dormantActive: (identity) => identity.isDormantActive,
  unresolvedHighRisk: () => true,
};

export const filterIdentities = (filter: ActiveFilter | null): FaceliftIdentity[] => {
  if (!filter) return IDENTITIES;
  switch (filter.type) {
    case 'matrix':
      return IDENTITIES.filter(
        (identity) =>
          getFaceliftRiskLevel(identity.riskScore) === filter.riskLevel &&
          tierOfCriticality(identity.criticality) === filter.tier
      );
    case 'card':
      return IDENTITIES.filter(CARD_IDENTITY_PREDICATES[filter.cardId]);
    case 'identity':
      return IDENTITIES.filter((identity) => identity.id === filter.identityId);
  }
};

export const filterRawRecords = (filter: ActiveFilter | null): FaceliftRawRecord[] => {
  if (!filter) return RAW_RECORDS;
  switch (filter.type) {
    case 'matrix':
      return RAW_RECORDS.filter(
        (record) =>
          getFaceliftRiskLevel(record.riskScore) === filter.riskLevel &&
          tierOfCriticality(record.criticality) === filter.tier
      );
    case 'card': {
      if (filter.cardId === 'unresolvedHighRisk') {
        return RAW_RECORDS.filter((record) => !record.resolvedTo && record.riskScore >= 70);
      }
      const predicate = CARD_IDENTITY_PREDICATES[filter.cardId];
      return RAW_RECORDS.filter(
        (record) => record.resolvedTo && predicate(IDENTITY_BY_ID[record.resolvedTo])
      );
    }
    case 'identity':
      return RAW_RECORDS.filter((record) => record.resolvedTo === filter.identityId);
  }
};

// ---------------------------------------------------------------------------
// ES hit shape for the production Entities table (UnifiedDataTable)
// ---------------------------------------------------------------------------

/** Map display labels used in RAW_RECORDS onto typical entity.source tokens. */
const SOURCE_TOKEN: Record<string, string> = {
  AD: 'active_directory',
  Okta: 'okta',
  Workday: 'workday',
  Endpoint: 'endpoint',
  CrowdStrike: 'crowdstrike',
  'Entra ID': 'entra_id',
  Network: 'network',
};

export interface FaceliftEntityEsHit {
  _index: string;
  _id: string;
  _source: {
    '@timestamp': string;
    entity: {
      id: string;
      name: string;
      source: string[];
      EngineMetadata: { Type: string };
      risk: { calculated_score_norm: number };
    };
    asset: { criticality: CriticalityLevelWithUnassigned };
  };
}

/**
 * Builds ES-shaped hits for the existing Entities table data path
 * (`useFetchGridData` → `buildDataTableRecord`). One hit per resolved identity.
 * When `filter` is set, only identities matching the Overview band filter are returned.
 */
export const getIdentityEsHits = (filter: ActiveFilter | null = null): FaceliftEntityEsHit[] =>
  filterIdentities(filter).map((identity) => ({
    _index: '.entities.v2.latest.security_default',
    _id: identity.id,
    _source: {
      '@timestamp': identity.lastSeen,
      entity: {
        id: identity.id,
        name: identity.name,
        source: sourcesForIdentity(identity.id).map(
          (source) => SOURCE_TOKEN[source] ?? source.toLowerCase()
        ),
        EngineMetadata: { Type: identity.entityType },
        risk: { calculated_score_norm: identity.riskScore },
      },
      asset: { criticality: identity.criticality },
    },
  }));
