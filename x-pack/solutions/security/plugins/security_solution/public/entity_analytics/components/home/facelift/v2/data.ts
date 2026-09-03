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

import { EntityType } from '../../../../../../common/entity_analytics/types';
import type { CriticalityLevelWithUnassigned } from '../../../../../../common/entity_analytics/asset_criticality/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FaceliftRiskLevel = 'Critical' | 'High' | 'Medium' | 'Low' | 'Unknown';

/** Matrix columns: one per asset criticality level, plus unassigned. */
export type CriticalityTier = 'extreme' | 'high' | 'medium' | 'low' | 'unassigned';

export type TableView = 'resolved' | 'raw';

export type SignalCardId =
  | 'untriagedHighRisk'
  | 'newToCritical'
  | 'riskMovers'
  | 'newAndAlerting'
  | 'newAnomalies'
  | 'hiddenRisk';

export interface SignalCardData {
  id: SignalCardId;
  /** Short label shown as the card headline. */
  title: string;
  value: number;
  /** One-line explanation of what the value counts. */
  description: string;
  /** 24h change. Positive = worse (red), negative = better (green). Used to scale filtered cards. */
  delta?: number;
  /** Label shown in the dismissible filter badge when the card is active. */
  filterLabel: string;
  trend?: number[];
}

export interface FaceliftRawRecord {
  id: string;
  name: string;
  entityId: string;
  entityType: EntityType;
  domain: string;
  source: string;
  riskScore: number;
  /** 24h risk score change, in points. */
  riskDelta24h: number;
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
  /** No triage action taken yet (drives the “Untriaged” signal + badge). */
  isUntriaged?: boolean;
  /** First seen within the last 7 days. */
  isNewThisWeek?: boolean;
  topRiskContributions?: Array<{ label: string; value: number }>;
}

export type ActiveFilter =
  | { type: 'matrix'; riskLevel: FaceliftRiskLevel; tier: CriticalityTier; label: string }
  | {
      type: 'card';
      cardId: SignalCardId;
      label: string;
      /** When true, entities matching the card are excluded from page content. */
      exclude?: boolean;
    }
  | { type: 'identity'; identityId: string; label: string };

// ---------------------------------------------------------------------------
// Level / tier helpers
// ---------------------------------------------------------------------------

export const RISK_LEVELS: FaceliftRiskLevel[] = ['Critical', 'High', 'Medium', 'Low', 'Unknown'];

export interface ScoreRange {
  gt?: number;
  gte?: number;
  lt?: number;
  lte?: number;
}

/**
 * Score band per risk level, in ES range-query shape so the risk level page
 * filter and {@link getFaceliftRiskLevel} can never disagree about a boundary.
 */
export const RISK_LEVEL_SCORE_RANGE: Record<FaceliftRiskLevel, ScoreRange> = {
  Critical: { gt: 90 },
  High: { gte: 70, lte: 90 },
  Medium: { gte: 40, lt: 70 },
  Low: { gte: 20, lt: 40 },
  Unknown: { lt: 20 },
};

const inScoreRange = (score: number, range: ScoreRange): boolean =>
  (range.gt == null || score > range.gt) &&
  (range.gte == null || score >= range.gte) &&
  (range.lt == null || score < range.lt) &&
  (range.lte == null || score <= range.lte);

/** Standard mapping: Critical >90, High 70–90, Medium 40–70, Low 20–40, Unknown <20. */
export const getFaceliftRiskLevel = (score: number): FaceliftRiskLevel =>
  RISK_LEVELS.find((level) => inScoreRange(score, RISK_LEVEL_SCORE_RANGE[level])) ?? 'Unknown';

export const CRITICALITY_TIERS: CriticalityTier[] = [
  'extreme',
  'high',
  'medium',
  'low',
  'unassigned',
];

export const CRITICALITY_TIER_LABELS: Record<CriticalityTier, string> = {
  extreme: 'Extreme impact',
  high: 'High impact',
  medium: 'Medium impact',
  low: 'Low impact',
  unassigned: 'Unassigned',
};

export const tierOfCriticality = (criticality: CriticalityLevelWithUnassigned): CriticalityTier => {
  switch (criticality) {
    case 'extreme_impact':
      return 'extreme';
    case 'high_impact':
      return 'high';
    case 'medium_impact':
      return 'medium';
    case 'low_impact':
      return 'low';
    default:
      return 'unassigned';
  }
};

// ---------------------------------------------------------------------------
// Signal cards
// ---------------------------------------------------------------------------

export const SIGNAL_CARDS: SignalCardData[] = [
  {
    id: 'untriagedHighRisk',
    title: 'Untriaged high-risk',
    value: 10,
    description: 'High- or critical-risk entities with open alerts',
    filterLabel: 'Untriaged high-risk',
  },
  {
    id: 'newToCritical',
    title: 'New to Critical',
    value: 6,
    description: 'Entities that crossed into critical risk',
    delta: 2,
    filterLabel: 'New to Critical today',
  },
  {
    id: 'riskMovers',
    title: 'Risk movers',
    value: 14,
    description: 'Entities with risk spike 20% or more',
    delta: 4,
    filterLabel: 'Risk movers (+20% in 24h)',
    trend: [6, 8, 7, 9, 11, 10, 14],
  },
  {
    id: 'newAndAlerting',
    title: 'New & alerting',
    value: 4,
    description: 'First seen entities that are already alerting',
    delta: 1,
    filterLabel: 'New this week and alerting',
  },
  {
    id: 'newAnomalies',
    title: 'New anomalies',
    value: 37,
    description: 'Entities with new anomalies',
    delta: -5,
    filterLabel: 'New anomalies',
    trend: [52, 48, 45, 41, 44, 39, 37],
  },
  {
    id: 'hiddenRisk',
    title: 'Hidden risk',
    value: 12,
    description: 'Low- or medium-risk entities containing a high- or critical-risk record',
    delta: -2,
    filterLabel: 'Hidden risk',
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

/**
 * Resolved-entity risk is always strictly below the highest raw-record risk in
 * the group (close, never equal or higher). A few identities sit further below
 * on purpose (“hidden risk” elevated raw records).
 */
export const IDENTITIES: FaceliftIdentity[] = [
  {
    id: 'id-amber',
    name: 'amber.rodriguez',
    entityType: EntityType.user,
    riskScore: 93, // max raw 96
    riskDelta24h: 24,
    criticality: 'extreme_impact',
    alerts: 14,
    lastSeen: ago(0.1),
    isPrivileged: true,
    isNewToCritical: true,
    hasNewAnomalies: true,
    isDormantActive: false,
    isUntriaged: true,
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
    riskScore: 91, // max raw 92; keep Critical (>90)
    riskDelta24h: 8,
    criticality: 'high_impact',
    alerts: 9,
    lastSeen: ago(0.5),
    isPrivileged: false,
    isNewToCritical: true,
    hasNewAnomalies: false,
    isDormantActive: false,
    isUntriaged: true,
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
    riskScore: 86, // max raw 88
    riskDelta24h: 21,
    criticality: 'extreme_impact',
    alerts: 11,
    lastSeen: ago(0.2),
    isPrivileged: false,
    isNewToCritical: false,
    hasNewAnomalies: true,
    isDormantActive: false,
    isUntriaged: true,
  },
  {
    id: 'id-james',
    name: 'james.okafor',
    entityType: EntityType.user,
    riskScore: 81, // max raw 84
    riskDelta24h: 3,
    criticality: 'high_impact',
    alerts: 6,
    lastSeen: ago(1),
    isPrivileged: true,
    isNewToCritical: false,
    hasNewAnomalies: false,
    isDormantActive: false,
    isUntriaged: true,
  },
  {
    id: 'id-db-core',
    name: 'db-core-003',
    entityType: EntityType.host,
    riskScore: 78, // max raw 81
    riskDelta24h: -4,
    criticality: 'extreme_impact',
    alerts: 4,
    lastSeen: ago(2),
    isPrivileged: false,
    isNewToCritical: false,
    hasNewAnomalies: false,
    isDormantActive: false,
    isUntriaged: true,
  },
  {
    id: 'id-maria',
    name: 'maria.chen',
    entityType: EntityType.user,
    riskScore: 75, // max raw 78
    riskDelta24h: 26,
    criticality: 'medium_impact',
    alerts: 7,
    lastSeen: ago(0.4),
    isPrivileged: false,
    isNewToCritical: false,
    hasNewAnomalies: true,
    isDormantActive: false,
    isUntriaged: true,
  },
  {
    id: 'id-vpn-gw',
    name: 'vpn-gw-eu-1',
    entityType: EntityType.host,
    riskScore: 71, // max raw 74
    riskDelta24h: 0,
    criticality: 'high_impact',
    alerts: 3,
    lastSeen: ago(3),
    isPrivileged: false,
    isNewToCritical: false,
    hasNewAnomalies: false,
    isDormantActive: false,
    isNewThisWeek: true,
    isUntriaged: true,
  },
  {
    id: 'id-svc-backup',
    name: 'svc-backup-agent',
    entityType: EntityType.service,
    riskScore: 70, // max raw 71; keep High (≥70)
    riskDelta24h: 2,
    criticality: 'medium_impact',
    alerts: 2,
    lastSeen: ago(0.7),
    isPrivileged: false,
    isNewToCritical: false,
    hasNewAnomalies: false,
    isDormantActive: true,
    isNewThisWeek: true,
    isUntriaged: true,
  },
  {
    id: 'id-liam',
    name: 'liam.novak',
    entityType: EntityType.user,
    riskScore: 70, // max raw 72; keep High (≥70)
    riskDelta24h: 22,
    criticality: 'high_impact',
    alerts: 5,
    lastSeen: ago(0.25),
    isPrivileged: true,
    isNewToCritical: false,
    hasNewAnomalies: true,
    isDormantActive: false,
    isUntriaged: true,
  },
  {
    id: 'id-kiosk',
    name: 'kiosk-lobby-2',
    entityType: EntityType.host,
    riskScore: 70, // max raw 78; High so it counts in Untriaged high-risk
    riskDelta24h: -2,
    criticality: 'low_impact',
    alerts: 1,
    lastSeen: ago(6),
    isPrivileged: false,
    isNewToCritical: false,
    hasNewAnomalies: false,
    isDormantActive: false,
    isNewThisWeek: true,
    isUntriaged: true,
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
    isNewThisWeek: true,
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
    riskScore: 30, // max raw 33
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
    riskScore: 23, // max raw 26
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
    riskScore: 15, // max raw 18
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
    riskScore: 5, // max raw 8
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

// ---------------------------------------------------------------------------
// Watchlists (prototype membership — drives the filter + Watchlists column)
// ---------------------------------------------------------------------------

export const FACELIFT_WATCHLISTS = [
  'Privileged users',
  'Departing employees',
  'My custom watchlist',
] as const;

export type FaceliftWatchlist = (typeof FACELIFT_WATCHLISTS)[number];

/**
 * Resolved-identity membership. Privileged users are on the prebuilt list;
 * others are mixed across custom lists so the column shows 0–3 badges.
 */
const IDENTITY_WATCHLISTS: Record<string, FaceliftWatchlist[]> = {
  'id-amber': ['Privileged users', 'My custom watchlist'],
  'id-james': ['Privileged users'],
  'id-liam': ['Privileged users', 'Departing employees'],
  'id-maria': ['Departing employees', 'My custom watchlist'],
  'id-sofia': ['Departing employees'],
  'id-eva': ['My custom watchlist'],
  'id-noah': ['Privileged users', 'Departing employees', 'My custom watchlist'],
  'id-tomas': ['Departing employees'],
  'id-web-prod': ['My custom watchlist'],
  'id-svc-ci': ['My custom watchlist'],
  'id-svc-backup': ['Privileged users'],
};

/** Unresolved solos that still appear on a watchlist. */
const UNRESOLVED_RECORD_WATCHLISTS: Record<string, FaceliftWatchlist[]> = {
  'rec-ad-un01': ['Privileged users', 'My custom watchlist'],
  'rec-okta-un04': ['Departing employees'],
};

export const watchlistsForIdentity = (identityId: string): FaceliftWatchlist[] =>
  IDENTITY_WATCHLISTS[identityId] ?? [];

export const watchlistsForRecord = (record: FaceliftRawRecord): FaceliftWatchlist[] => {
  if (record.resolvedTo) return watchlistsForIdentity(record.resolvedTo);
  return UNRESOLVED_RECORD_WATCHLISTS[record.id] ?? [];
};

// ---------------------------------------------------------------------------
// Cases (prototype — count of case attachments per entity)
// ---------------------------------------------------------------------------

/**
 * Per raw-record case counts. Resolved-entity totals are the sum of their
 * records (same aggregation as alerts).
 */
const RECORD_CASE_COUNTS: Record<string, number> = {
  // amber.rodriguez → 12
  'rec-ad-8f21': 7,
  'rec-okta-1a4e': 3,
  'rec-wd-77c2': 2,
  // svc-ci-deploy → 3
  'rec-okta-9b2d': 2,
  'rec-ep-4410': 1,
  // web-prod-042 → 7
  'rec-ep-a2f9': 4,
  'rec-cs-5512': 3,
  // james.okafor → 25
  'rec-ad-33d1': 10,
  'rec-okta-71b8': 8,
  'rec-wd-2091': 4,
  'rec-entra-c4a7': 3,
  // db-core-003 → 0
  'rec-ep-b7c3': 0,
  // maria.chen → 4
  'rec-ad-90ef': 3,
  'rec-okta-d3f0': 1,
  // vpn-gw-eu-1 → 1
  'rec-ep-66a1': 1,
  'rec-net-08d4': 0,
  // svc-backup-agent → 0
  'rec-ad-5b09': 0,
  // liam.novak → 18
  'rec-ad-12aa': 9,
  'rec-okta-e8b5': 6,
  'rec-wd-3358': 3,
  // kiosk-lobby-2 → 2
  'rec-ep-f00d': 2,
  // sofia.marino → 9
  'rec-ad-77e2': 6,
  'rec-entra-9f13': 3,
  // build-runner-17 → 0
  'rec-ep-31cb': 0,
  'rec-cs-8a60': 0,
  // tomas.lindqvist → 6
  'rec-ad-c9d8': 6,
  // svc-report-gen → 1
  'rec-ad-40b6': 1,
  'rec-okta-2270': 0,
  // eva.dubois → 14
  'rec-okta-ab19': 14,
  // print-srv-01 → 0
  'rec-ep-dd21': 0,
  // noah.tanaka → 21
  'rec-wd-6644': 21,
  // iot-sensor-77 → 5
  'rec-net-4f8a': 5,
};

const UNRESOLVED_CASE_COUNTS: Record<string, number> = {
  'rec-ad-un01': 8,
  'rec-ep-un02': 0,
  'rec-ad-un03': 2,
  'rec-okta-un04': 11,
};

export const casesCountForRecord = (record: FaceliftRawRecord): number => {
  if (record.resolvedTo) return RECORD_CASE_COUNTS[record.id] ?? 0;
  return UNRESOLVED_CASE_COUNTS[record.id] ?? 0;
};

// ---------------------------------------------------------------------------
// Anomalies (must match Behavioral anomalies / getFaceliftAnomalyOverview)
// ---------------------------------------------------------------------------

/**
 * Per raw-record anomaly counts for identities with `hasNewAnomalies`.
 * Resolved-entity totals are the sum of their records.
 */
const RECORD_ANOMALY_COUNTS: Record<string, number> = {
  // amber.rodriguez → 15
  'rec-ad-8f21': 8,
  'rec-okta-1a4e': 5,
  'rec-wd-77c2': 2,
  // web-prod-042 → 8
  'rec-ep-a2f9': 5,
  'rec-cs-5512': 3,
  // maria.chen → 12
  'rec-ad-90ef': 7,
  'rec-okta-d3f0': 5,
  // liam.novak → 22
  'rec-ad-12aa': 12,
  'rec-okta-e8b5': 7,
  'rec-wd-3358': 3,
  // sofia.marino → 5
  'rec-ad-77e2': 4,
  'rec-entra-9f13': 1,
};

export const anomaliesCountForRecord = (record: FaceliftRawRecord): number => {
  if (!record.resolvedTo) return 0;
  const identity = IDENTITY_BY_ID[record.resolvedTo];
  if (!identity?.hasNewAnomalies) return 0;
  return RECORD_ANOMALY_COUNTS[record.id] ?? 0;
};

// ---------------------------------------------------------------------------
// First seen / Last alert (prototype timeline fields)
// ---------------------------------------------------------------------------

const daysAgo = (days: number): string => ago(days * 24);

/**
 * Per raw-record first-seen timestamps (each distinct within a group).
 * Resolved-entity first seen = oldest among its records.
 */
const RECORD_FIRST_SEEN: Record<string, string> = {
  // amber.rodriguez → oldest daysAgo(240)
  'rec-ad-8f21': daysAgo(240),
  'rec-okta-1a4e': daysAgo(180),
  'rec-wd-77c2': daysAgo(95),
  // svc-ci-deploy → oldest daysAgo(150)
  'rec-okta-9b2d': daysAgo(150),
  'rec-ep-4410': daysAgo(80),
  // web-prod-042 → oldest daysAgo(95)
  'rec-ep-a2f9': daysAgo(95),
  'rec-cs-5512': daysAgo(40),
  // james.okafor → oldest daysAgo(380)
  'rec-ad-33d1': daysAgo(380),
  'rec-okta-71b8': daysAgo(210),
  'rec-wd-2091': daysAgo(120),
  'rec-entra-c4a7': daysAgo(55),
  // db-core-003
  'rec-ep-b7c3': daysAgo(420),
  // maria.chen → oldest daysAgo(60)
  'rec-ad-90ef': daysAgo(60),
  'rec-okta-d3f0': daysAgo(28),
  // vpn-gw-eu-1 → oldest ago(40)
  'rec-ep-66a1': ago(40),
  'rec-net-08d4': ago(18),
  // svc-backup-agent
  'rec-ad-5b09': ago(18),
  // liam.novak → oldest daysAgo(200)
  'rec-ad-12aa': daysAgo(200),
  'rec-okta-e8b5': daysAgo(110),
  'rec-wd-3358': daysAgo(45),
  // kiosk-lobby-2
  'rec-ep-f00d': ago(40),
  // sofia.marino → oldest daysAgo(5)
  'rec-ad-77e2': daysAgo(5),
  'rec-entra-9f13': daysAgo(2),
  // build-runner-17 → oldest daysAgo(110)
  'rec-ep-31cb': daysAgo(110),
  'rec-cs-8a60': daysAgo(35),
  // tomas.lindqvist
  'rec-ad-c9d8': daysAgo(310),
  // svc-report-gen → oldest daysAgo(85)
  'rec-ad-40b6': daysAgo(85),
  'rec-okta-2270': daysAgo(30),
  // eva.dubois
  'rec-okta-ab19': daysAgo(175),
  // print-srv-01
  'rec-ep-dd21': daysAgo(500),
  // noah.tanaka
  'rec-wd-6644': daysAgo(45),
  // iot-sensor-77
  'rec-net-4f8a': daysAgo(130),
};

const UNRESOLVED_FIRST_SEEN: Record<string, string> = {
  'rec-ad-un01': daysAgo(14),
  'rec-ep-un02': ago(8), // recent
  'rec-ad-un03': daysAgo(280),
  'rec-okta-un04': daysAgo(70),
};

/**
 * Per raw-record last-alert timestamps (only for records with alerts > 0;
 * each distinct within a group). Resolved-entity last alert = latest among
 * its records that have alerts.
 */
const RECORD_LAST_ALERT: Record<string, string> = {
  // amber.rodriguez → latest ago(0.2)
  'rec-ad-8f21': ago(0.2),
  'rec-okta-1a4e': ago(2),
  'rec-wd-77c2': ago(8),
  // svc-ci-deploy → latest ago(1.5)
  'rec-okta-9b2d': ago(1.5),
  'rec-ep-4410': ago(6),
  // web-prod-042 → latest ago(3)
  'rec-ep-a2f9': ago(3),
  'rec-cs-5512': ago(14),
  // james.okafor → latest ago(12)
  'rec-ad-33d1': ago(12),
  'rec-okta-71b8': ago(30),
  'rec-entra-c4a7': ago(48),
  // db-core-003
  'rec-ep-b7c3': ago(48),
  // maria.chen → latest ago(0.5)
  'rec-ad-90ef': ago(0.5),
  'rec-okta-d3f0': ago(9),
  // vpn-gw-eu-1 → latest ago(4)
  'rec-ep-66a1': ago(4),
  'rec-net-08d4': ago(20),
  // svc-backup-agent
  'rec-ad-5b09': ago(6),
  // liam.novak → latest ago(2)
  'rec-ad-12aa': ago(2),
  'rec-okta-e8b5': ago(11),
  // kiosk-lobby-2
  'rec-ep-f00d': ago(10),
  // sofia.marino → latest ago(1) (only AD has alerts)
  'rec-ad-77e2': ago(1),
  // tomas.lindqvist
  'rec-ad-c9d8': daysAgo(20),
};

const UNRESOLVED_LAST_ALERT: Record<string, string> = {
  'rec-ad-un01': ago(0.4),
  'rec-ep-un02': ago(2),
  'rec-ad-un03': ago(24),
  'rec-okta-un04': ago(5),
};

/** Ensure last alert is not earlier than first seen. */
const clampAfterFirstSeen = (firstSeen: string, lastAlert: string): string =>
  lastAlert >= firstSeen ? lastAlert : firstSeen;

export const firstSeenForRecord = (record: FaceliftRawRecord): string => {
  if (record.resolvedTo) return RECORD_FIRST_SEEN[record.id] ?? daysAgo(90);
  return UNRESOLVED_FIRST_SEEN[record.id] ?? daysAgo(90);
};

export const lastAlertForRecord = (record: FaceliftRawRecord): string | undefined => {
  if (record.alerts <= 0) return undefined;
  const firstSeen = firstSeenForRecord(record);
  const lastAlert = record.resolvedTo
    ? RECORD_LAST_ALERT[record.id] ?? ago(24)
    : UNRESOLVED_LAST_ALERT[record.id] ?? ago(24);
  return clampAfterFirstSeen(firstSeen, lastAlert);
};

/**
 * Records are listed in contribution order within each resolution group: the
 * first record of a group is the one the resolved entity takes its name from,
 * and its criticality is the highest in the group, so the aggregated row in the
 * Resolved entities table always has a visible origin. Group totals (records,
 * sources, alerts, cases, anomalies, last seen / last alert) are the sum /
 * union / max of the records below; first seen is the oldest.
 */
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
    riskDelta24h: 24,
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
    riskDelta24h: 19,
    criticality: 'high_impact',
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
    riskDelta24h: 2,
    criticality: 'medium_impact',
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
    riskDelta24h: 8,
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
    riskDelta24h: 5,
    criticality: 'medium_impact',
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
    riskDelta24h: 21,
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
    riskDelta24h: 16,
    criticality: 'high_impact',
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
    riskDelta24h: 3,
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
    riskDelta24h: 1,
    criticality: 'medium_impact',
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
    riskDelta24h: 0,
    criticality: 'unassigned',
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
    riskDelta24h: 4,
    criticality: 'medium_impact',
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
    riskDelta24h: -4,
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
    riskDelta24h: 26,
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
    riskDelta24h: 18,
    criticality: 'low_impact',
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
    riskDelta24h: 0,
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
    riskDelta24h: -1,
    criticality: 'medium_impact',
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
    riskDelta24h: 2,
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
    riskDelta24h: 22,
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
    riskDelta24h: 15,
    criticality: 'medium_impact',
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
    riskDelta24h: 0,
    criticality: 'unassigned',
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
    // Raw risk stays above the High identity score (Untriaged high-risk).
    riskScore: 78,
    riskDelta24h: 14,
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
    // Elevated raw record under a Medium identity → Hidden risk signal.
    riskScore: 91,
    riskDelta24h: 18,
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
    riskDelta24h: 2,
    criticality: 'unassigned',
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
    riskDelta24h: 1,
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
    // Elevated raw record under a Medium identity → Hidden risk signal.
    riskScore: 74,
    riskDelta24h: 22,
    criticality: 'low_impact',
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
    // Elevated raw record under a Medium identity → Hidden risk signal.
    riskScore: 86,
    riskDelta24h: 12,
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
    // Elevated raw record under a Low identity → Hidden risk signal.
    riskScore: 71,
    riskDelta24h: 2,
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
    riskDelta24h: 1,
    criticality: 'unassigned',
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
    riskDelta24h: 0,
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
    riskDelta24h: -3,
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
    riskDelta24h: 1,
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
    riskDelta24h: 0,
    criticality: 'unassigned',
    alerts: 0,
    lastSeen: ago(120),
    resolvedTo: 'id-iot-sensor',
  },
  // Unresolved high-risk solos (still in the corpus; not the Hidden risk signal)
  {
    id: 'rec-ad-un01',
    name: 'CORP\\jdoe_admin',
    entityId: 'S-1-5-21-397955417-626881126-188441444-9001',
    entityType: EntityType.user,
    domain: 'corp.acme.com',
    source: 'AD',
    riskScore: 94,
    riskDelta24h: 31,
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
    riskDelta24h: 12,
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
    riskDelta24h: -6,
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
    riskDelta24h: 9,
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
    riskDelta24h: 0,
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

export const casesCountForIdentity = (identityId: string): number =>
  recordsForIdentity(identityId).reduce(
    (total, record) => total + casesCountForRecord(record),
    0
  );

export const anomaliesCountForIdentity = (identity: FaceliftIdentity): number => {
  if (!identity.hasNewAnomalies) return 0;
  return recordsForIdentity(identity.id).reduce(
    (total, record) => total + anomaliesCountForRecord(record),
    0
  );
};

export const firstSeenForIdentity = (identityId: string): string => {
  const stamps = recordsForIdentity(identityId).map(firstSeenForRecord);
  if (stamps.length === 0) return daysAgo(90);
  return stamps.reduce((earliest, stamp) => (stamp < earliest ? stamp : earliest));
};

export const lastAlertForIdentity = (
  identityId: string,
  alerts: number
): string | undefined => {
  if (alerts <= 0) return undefined;
  const stamps = recordsForIdentity(identityId)
    .map(lastAlertForRecord)
    .filter((stamp): stamp is string => stamp != null);
  if (stamps.length === 0) return undefined;
  return stamps.reduce((latest, stamp) => (stamp > latest ? stamp : latest));
};

/** Distinct data sources present in the corpus, used to populate the page filters. */
export const ENTITY_SOURCE_LABELS: string[] = Array.from(
  new Set(RAW_RECORDS.map((record) => record.source))
).sort();

// ---------------------------------------------------------------------------
// Needs attention (mocked ranking)
// ---------------------------------------------------------------------------

export const ATTENTION_RANKING_EXPLANATION =
  'Ranked by risk score × asset criticality, boosted by 24h risk change and untriaged status.';

/**
 * Top entities to investigate, in mocked rank order. Deliberately not a plain
 * risk-score sort: web-prod-042 (88) outranks svc-ci-deploy (92) on extreme
 * criticality plus a steeper climb, and liam.novak (72) outranks db-core-003
 * (81) because he is privileged, climbing and untriaged while db-core is falling.
 */
export const ATTENTION_IDENTITY_IDS: string[] = [
  'id-amber',
  'id-web-prod',
  'id-svc-ci',
  'id-maria',
  'id-liam',
];

/** A point change expressed as a percentage of the score it started from. */
export const scoreDeltaPercent = (score: number, delta: number): number => {
  const previous = score - delta;
  if (previous <= 0) return 100;
  return Math.round((delta / previous) * 100);
};

/** 24h risk change as a percentage of yesterday's score, rather than points. */
export const riskDeltaPercent = (identity: FaceliftIdentity): number =>
  scoreDeltaPercent(identity.riskScore, identity.riskDelta24h);

/** A reason badge; `trend` renders a sort up/down icon in front of the label. */
export interface AttentionReason {
  label: string;
  trend?: 'up' | 'down';
}

/**
 * “Why” badges for the attention list, derived from the identity's own row data
 * so they can never contradict what the entities table shows. Capped at four.
 */
export const attentionReasonsFor = (identity: FaceliftIdentity): AttentionReason[] => {
  const reasons: AttentionReason[] = [];

  if (identity.isPrivileged) reasons.push({ label: 'Privileged' });
  if (identity.riskDelta24h >= 20) {
    reasons.push({ label: `${riskDeltaPercent(identity)}% in 24h`, trend: 'up' });
  }
  if (identity.isUntriaged) reasons.push({ label: 'Untriaged' });
  if (identity.criticality === 'extreme_impact') reasons.push({ label: 'Extreme-impact asset' });
  if (identity.isNewToCritical) reasons.push({ label: 'New to critical' });
  if (identity.hasNewAnomalies) reasons.push({ label: 'New anomaly' });
  if (identity.alerts >= 3) reasons.push({ label: `${identity.alerts} alerts` });

  return reasons.slice(0, 4);
};

export interface AttentionEntry {
  identity: FaceliftIdentity;
  reasons: AttentionReason[];
}

export const getAttentionList = (filters: PageFilters = EMPTY_PAGE_FILTERS): AttentionEntry[] =>
  ATTENTION_IDENTITY_IDS.map((id) => IDENTITY_BY_ID[id])
    .filter(Boolean)
    .filter((identity) => identityMatchesPageFilters(identity, filters))
    .map((identity) => ({ identity, reasons: attentionReasonsFor(identity) }));

export const sourcesForIdentity = (identityId: string): string[] =>
  Array.from(new Set(recordsForIdentity(identityId).map((record) => record.source)));

/** Low/Medium entity that still contains a High/Critical raw record (Hidden risk). */
export const isHiddenRiskIdentity = (identity: FaceliftIdentity): boolean => {
  const identityLevel = getFaceliftRiskLevel(identity.riskScore);
  if (identityLevel !== 'Low' && identityLevel !== 'Medium') {
    return false;
  }
  return recordsForIdentity(identity.id).some((record) =>
    ['High', 'Critical'].includes(getFaceliftRiskLevel(record.riskScore))
  );
};

const CARD_IDENTITY_PREDICATES: Record<SignalCardId, (identity: FaceliftIdentity) => boolean> = {
  untriagedHighRisk: (identity) =>
    Boolean(identity.isUntriaged) &&
    identity.alerts > 0 &&
    ['High', 'Critical'].includes(getFaceliftRiskLevel(identity.riskScore)),
  newToCritical: (identity) => identity.isNewToCritical,
  riskMovers: (identity) => riskDeltaPercent(identity) >= 20,
  newAndAlerting: (identity) => Boolean(identity.isNewThisWeek) && identity.alerts > 0,
  newAnomalies: (identity) => identity.hasNewAnomalies,
  hiddenRisk: isHiddenRiskIdentity,
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
    case 'card': {
      const predicate = CARD_IDENTITY_PREDICATES[filter.cardId];
      return filter.exclude
        ? IDENTITIES.filter((identity) => !predicate(identity))
        : IDENTITIES.filter(predicate);
    }
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
      const predicate = CARD_IDENTITY_PREDICATES[filter.cardId];
      return RAW_RECORDS.filter((record) => {
        if (!record.resolvedTo) return Boolean(filter.exclude);
        const matches = predicate(IDENTITY_BY_ID[record.resolvedTo]);
        return filter.exclude ? !matches : matches;
      });
    }
    case 'identity':
      return RAW_RECORDS.filter((record) => record.resolvedTo === filter.identityId);
  }
};

// ---------------------------------------------------------------------------
// ES hit shape for the production Entities table (UnifiedDataTable)
// ---------------------------------------------------------------------------

/**
 * Shared toggle for EA Facelift presentation mocks (table + grouping).
 * Keep this name free of a “mock*” path segment — Kibana’s import lint blocks
 * browser imports from paths containing “mock”.
 */
export const USE_FACELIFT_MOCK_ENTITIES = true;

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

const ENTITY_STORE_INDEX = '.entities.v2.latest.security_default';

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
      relationships?: {
        resolution?: {
          /** Present on aliases only — the target entity id. */
          resolved_to?: string;
          /** Present on targets (and optionally aliases) — group risk score. */
          risk?: { calculated_score_norm: number };
        };
      };
    };
    asset: { criticality: CriticalityLevelWithUnassigned };
  };
}

const sourceTokens = (sources: string[]): string[] =>
  sources.map((source) => SOURCE_TOKEN[source] ?? source.toLowerCase());

/** Target document: no `resolved_to`, carries resolution group risk. */
const targetHitFromIdentity = (identity: FaceliftIdentity): FaceliftEntityEsHit => ({
  _index: ENTITY_STORE_INDEX,
  _id: `target-${identity.id}`,
  _source: {
    '@timestamp': identity.lastSeen,
    entity: {
      id: identity.id,
      name: identity.name,
      source: sourceTokens(sourcesForIdentity(identity.id)),
      EngineMetadata: { Type: identity.entityType },
      risk: { calculated_score_norm: identity.riskScore },
      relationships: {
        resolution: {
          risk: { calculated_score_norm: identity.riskScore },
        },
      },
    },
    asset: { criticality: identity.criticality },
  },
});

/** Alias document: `resolved_to` points at the identity / target id. */
const aliasHitFromRecord = (record: FaceliftRawRecord): FaceliftEntityEsHit => {
  const target = record.resolvedTo ? IDENTITY_BY_ID[record.resolvedTo] : undefined;
  return {
    _index: ENTITY_STORE_INDEX,
    _id: `alias-${record.id}`,
    _source: {
      '@timestamp': record.lastSeen,
      entity: {
        id: record.entityId,
        name: record.name,
        source: sourceTokens([record.source]),
        EngineMetadata: { Type: record.entityType },
        risk: { calculated_score_norm: record.riskScore },
        relationships: {
          resolution: {
            resolved_to: record.resolvedTo,
            ...(target ? { risk: { calculated_score_norm: target.riskScore } } : {}),
          },
        },
      },
      asset: { criticality: record.criticality },
    },
  };
};

/** Unresolved solo document: no resolution relationship. */
const unresolvedHitFromRecord = (record: FaceliftRawRecord): FaceliftEntityEsHit => ({
  _index: ENTITY_STORE_INDEX,
  _id: `unresolved-${record.id}`,
  _source: {
    '@timestamp': record.lastSeen,
    entity: {
      id: record.entityId,
      name: record.name,
      source: sourceTokens([record.source]),
      EngineMetadata: { Type: record.entityType },
      risk: { calculated_score_norm: record.riskScore },
    },
    asset: { criticality: record.criticality },
  },
});

/**
 * Full Entity Store latest-index corpus for the prototype:
 * - one target per resolved identity (no `resolved_to`, has resolution risk)
 * - one alias per raw record that resolves to an identity (`resolved_to` set)
 * - one solo doc per unresolved raw record
 */
export const buildAllEntityStoreHits = (): FaceliftEntityEsHit[] => {
  const targets = IDENTITIES.map(targetHitFromIdentity);
  const aliases = RAW_RECORDS.filter((record) => record.resolvedTo).map(aliasHitFromRecord);
  const unresolved = RAW_RECORDS.filter((record) => !record.resolvedTo).map(
    unresolvedHitFromRecord
  );
  return [...targets, ...aliases, ...unresolved];
};

// ---------------------------------------------------------------------------
// Page filters (the filter group under the page title)
// ---------------------------------------------------------------------------

/**
 * Facet selections from the page filter group. An empty facet means
 * "everything"; several facets combine with AND, values within one with OR —
 * the same semantics as the filter pills these selections write to the KQL bar.
 */
export interface PageFilters {
  entityTypes: EntityType[];
  /** Display labels, e.g. `Okta`. See {@link entitySourceToken} for the doc value. */
  sources: string[];
  riskLevels: FaceliftRiskLevel[];
  criticalities: CriticalityLevelWithUnassigned[];
  /** Watchlist display names from {@link FACELIFT_WATCHLISTS}. */
  watchlists: FaceliftWatchlist[];
}

export const EMPTY_PAGE_FILTERS: PageFilters = {
  entityTypes: [],
  sources: [],
  riskLevels: [],
  criticalities: [],
  watchlists: [],
};

export const isPageFiltersEmpty = (filters: PageFilters): boolean =>
  !filters.entityTypes.length &&
  !filters.sources.length &&
  !filters.riskLevels.length &&
  !filters.criticalities.length &&
  !filters.watchlists.length;

/** The `entity.source` value stored on documents for a source display label. */
export const entitySourceToken = (label: string): string =>
  SOURCE_TOKEN[label] ?? label.toLowerCase();

const matchesFacets = (
  filters: PageFilters,
  candidate: {
    entityType: EntityType | string;
    sources: string[];
    riskScore: number;
    criticality: CriticalityLevelWithUnassigned;
    watchlists: FaceliftWatchlist[];
  }
): boolean => {
  const { entityTypes, sources, riskLevels, criticalities, watchlists } = filters;

  if (entityTypes.length && !entityTypes.includes(candidate.entityType as EntityType)) return false;
  if (sources.length && !candidate.sources.some((source) => sources.includes(source))) return false;
  if (riskLevels.length && !riskLevels.includes(getFaceliftRiskLevel(candidate.riskScore))) {
    return false;
  }
  if (criticalities.length && !criticalities.includes(candidate.criticality)) return false;
  if (
    watchlists.length &&
    !candidate.watchlists.some((watchlist) => watchlists.includes(watchlist))
  ) {
    return false;
  }

  return true;
};

export const identityMatchesPageFilters = (
  identity: FaceliftIdentity,
  filters: PageFilters
): boolean =>
  matchesFacets(filters, {
    entityType: identity.entityType,
    sources: sourcesForIdentity(identity.id),
    riskScore: identity.riskScore,
    criticality: identity.criticality,
    watchlists: watchlistsForIdentity(identity.id),
  });

export const recordMatchesPageFilters = (
  record: FaceliftRawRecord,
  filters: PageFilters
): boolean =>
  matchesFacets(filters, {
    entityType: record.entityType,
    sources: [record.source],
    riskScore: record.riskScore,
    criticality: record.criticality,
    watchlists: watchlistsForRecord(record),
  });

const hitMatchesPageFilters = (hit: FaceliftEntityEsHit, filters: PageFilters): boolean => {
  const { entity, asset } = hit._source;
  const resolvedTo = entity.relationships?.resolution?.resolved_to;
  let watchlists: FaceliftWatchlist[] = [];
  if (resolvedTo) {
    watchlists = watchlistsForIdentity(resolvedTo);
  } else if (IDENTITY_BY_ID[entity.id]) {
    watchlists = watchlistsForIdentity(entity.id);
  } else if (hit._id.startsWith('unresolved-')) {
    const record = RAW_RECORDS.find((entry) => entry.id === hit._id.slice('unresolved-'.length));
    watchlists = record ? watchlistsForRecord(record) : [];
  }

  return matchesFacets(
    { ...filters, sources: filters.sources.map(entitySourceToken) },
    {
      entityType: entity.EngineMetadata.Type,
      sources: entity.source,
      riskScore: entity.risk.calculated_score_norm,
      criticality: asset.criticality,
      watchlists,
    }
  );
};

/**
 * Resolved-entity rows that match a signal card — same membership as
 * {@link filterIdentities} for `type: 'card'`, plus page filters. Only identities
 * that appear in the Entities table (have at least one raw record) are counted.
 */
const identitiesForCard = (cardId: SignalCardId, filters: PageFilters): FaceliftIdentity[] => {
  const predicate = CARD_IDENTITY_PREDICATES[cardId];
  return IDENTITIES.filter((identity) => {
    if (!predicate(identity)) return false;
    if (!recordsForIdentity(identity.id).length) return false;
    return identityMatchesPageFilters(identity, filters);
  });
};

/**
 * Raw-record rows that belong to identities matching a signal card — same
 * membership rules as {@link filterRawRecords} for `type: 'card'`.
 */
const rawRecordsForCard = (cardId: SignalCardId, filters: PageFilters): FaceliftRawRecord[] => {
  const predicate = CARD_IDENTITY_PREDICATES[cardId];
  return RAW_RECORDS.filter((record) => {
    if (!record.resolvedTo) return false;
    const identity = IDENTITY_BY_ID[record.resolvedTo];
    if (!identity || !predicate(identity)) return false;
    return recordMatchesPageFilters(record, filters);
  });
};

/**
 * Metric cards for the Overview band. Values are live corpus counts for the
 * active table view so each card equals the row count after Filter for / out:
 * - Resolved: matching identities (lower)
 * - Raw: matching raw records (higher — multiple records per identity)
 * Designed {@link SIGNAL_CARDS} baselines only scale deltas / trends.
 */
export const getSignalCards = (
  filters: PageFilters = EMPTY_PAGE_FILTERS,
  tableView: TableView = 'resolved'
): SignalCardData[] =>
  SIGNAL_CARDS.map((card) => {
    const count =
      tableView === 'raw'
        ? rawRecordsForCard(card.id, filters).length
        : identitiesForCard(card.id, filters).length;
    const baseline = card.value;
    const ratio = baseline > 0 ? count / baseline : 0;
    return {
      ...card,
      value: count,
      ...(card.delta === undefined ? {} : { delta: Math.round(card.delta * ratio) }),
      ...(card.trend
        ? { trend: card.trend.map((value) => Math.round(value * ratio)) }
        : {}),
    };
  });

/**
 * Risk level × asset criticality counts for the Overview matrix, counted over the
 * same corpus the Entities table renders. Every cell therefore equals the number
 * of rows the table shows once that cell is clicked, and the grid totals the
 * entity count on the page.
 */
export const getRiskMatrixCounts = (
  filters: PageFilters = EMPTY_PAGE_FILTERS
): Record<FaceliftRiskLevel, Record<CriticalityTier, number>> => {
  const counts = {} as Record<FaceliftRiskLevel, Record<CriticalityTier, number>>;
  for (const level of RISK_LEVELS) {
    counts[level] = {} as Record<CriticalityTier, number>;
    for (const tier of CRITICALITY_TIERS) {
      counts[level][tier] = 0;
    }
  }

  const matching = buildAllEntityStoreHits().filter((hit) => hitMatchesPageFilters(hit, filters));
  for (const hit of matching) {
    const level = getFaceliftRiskLevel(hit._source.entity.risk.calculated_score_norm);
    const tier = tierOfCriticality(hit._source.asset.criticality);
    counts[level][tier] += 1;
  }

  return counts;
};

const hitMatchesActiveFilter = (hit: FaceliftEntityEsHit, filter: ActiveFilter | null): boolean => {
  if (!filter) return true;

  const { entity, asset } = hit._source;
  const resolvedTo = entity.relationships?.resolution?.resolved_to;
  const riskScore = entity.risk.calculated_score_norm;
  const criticality = asset.criticality;

  switch (filter.type) {
    case 'matrix':
      return (
        getFaceliftRiskLevel(riskScore) === filter.riskLevel &&
        tierOfCriticality(criticality) === filter.tier
      );
    case 'card': {
      const isTarget = !resolvedTo && Boolean(IDENTITY_BY_ID[entity.id]);
      const isUnresolvedSolo = !resolvedTo && !IDENTITY_BY_ID[entity.id];
      // Card filters are identity-centric: keep matching targets and their aliases.
      if (isUnresolvedSolo) return Boolean(filter.exclude);
      const identityId = resolvedTo ?? entity.id;
      const identity = IDENTITY_BY_ID[identityId];
      if (!identity || (!resolvedTo && !isTarget)) return Boolean(filter.exclude);
      const matches = CARD_IDENTITY_PREDICATES[filter.cardId](identity);
      return filter.exclude ? !matches : matches;
    }
    case 'identity':
      return entity.id === filter.identityId || resolvedTo === filter.identityId;
  }
};

/**
 * Builds ES-shaped hits for the Entities table / grouping paths.
 * Includes targets, aliases (with Resolved to filled), and unresolved solos.
 * When `filter` is set, only docs matching the Overview band filter are returned.
 */
export const getEntityStoreEsHits = (filter: ActiveFilter | null = null): FaceliftEntityEsHit[] =>
  buildAllEntityStoreHits().filter((hit) => hitMatchesActiveFilter(hit, filter));

/** @deprecated Use {@link getEntityStoreEsHits} — kept for existing call sites. */
export const getIdentityEsHits = getEntityStoreEsHits;
