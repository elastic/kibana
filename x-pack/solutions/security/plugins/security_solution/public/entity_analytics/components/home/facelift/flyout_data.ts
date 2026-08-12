/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Rich Entity Store–shaped documents + section payloads for EA Facelift
 * entity flyouts. Built from the identities / raw records in `./data.ts`.
 */

import type {
  HostEntity,
  UserEntity,
  ServiceEntity,
  GetAnomalyOverviewResponse,
} from '../../../../../common/api/entity_analytics';
import { EntityRiskLevelsEnum } from '../../../../../common/api/entity_analytics/common';
import type { CriticalityLevelWithUnassigned } from '../../../../../common/entity_analytics/asset_criticality/types';
import { EntityType } from '../../../../../common/entity_analytics/types';
import type { EntityRiskScore, RiskStats } from '../../../../../common/search_strategy';
import type { RiskScoreState } from '../../../api/hooks/use_risk_score';
import type { ResolutionGroup } from '../../entity_resolution/hooks/use_resolution_group';
import type { FaceliftIdentity, FaceliftRawRecord, FaceliftRiskLevel } from './data';
import {
  IDENTITY_BY_ID,
  IDENTITIES,
  RAW_RECORDS,
  getFaceliftRiskLevel,
  recordsForIdentity,
  sourcesForIdentity,
} from './data';

export const USE_FACELIFT_MOCK_FLYOUT = true;

/** Entity Store document shape used by flyout short-circuits. */
export type FaceliftEntityStoreRecord = HostEntity | UserEntity | ServiceEntity;

const rawRecordByEntityId = Object.fromEntries(
  RAW_RECORDS.map((record) => [record.entityId, record])
);

/** Map alias entity ids to their target identity id; pass through for targets. */
const resolveIdentityId = (entityId: string): string | undefined => {
  if (IDENTITY_BY_ID[entityId]) return entityId;
  return rawRecordByEntityId[entityId]?.resolvedTo;
};

/** True for targets, aliases, and unresolved solos in the facelift corpus. */
export const isFaceliftMockEntityId = (entityId: string | undefined | null): boolean =>
  Boolean(entityId && (IDENTITY_BY_ID[entityId] || rawRecordByEntityId[entityId]));

const SOURCE_TOKEN: Record<string, string> = {
  AD: 'active_directory',
  Okta: 'okta',
  Workday: 'workday',
  Endpoint: 'endpoint',
  CrowdStrike: 'crowdstrike',
  'Entra ID': 'entra_id',
  Network: 'network',
};

const toRiskLevel = (
  score: number
): (typeof EntityRiskLevelsEnum)[keyof typeof EntityRiskLevelsEnum] => {
  const level: FaceliftRiskLevel = getFaceliftRiskLevel(score);
  // Product uses "Moderate" where the facelift matrix label says "Medium".
  if (level === 'Medium') return EntityRiskLevelsEnum.Moderate;
  return EntityRiskLevelsEnum[level];
};

const firstSeenFor = (identity: FaceliftIdentity): string => {
  // Dormant accounts: first seen long ago; others ~90 days.
  const days = identity.isDormantActive ? 400 : 90;
  return new Date(Date.now() - days * 24 * 36e5).toISOString();
};

const domainFor = (identity: FaceliftIdentity): string => {
  const record = recordsForIdentity(identity.id)[0];
  return record?.domain ?? 'corp.acme.com';
};

const sourceTokensFor = (identity: FaceliftIdentity): string[] =>
  sourcesForIdentity(identity.id).map((source) => SOURCE_TOKEN[source] ?? source.toLowerCase());

const assetCriticalityFor = (criticality: FaceliftIdentity['criticality']): UserEntity['asset'] => {
  if (criticality === 'unassigned') {
    return { criticality: null };
  }
  return { criticality };
};

const buildUserEntity = (identity: FaceliftIdentity): UserEntity => {
  const domain = domainFor(identity);
  const emailLocal = identity.name.includes('@') ? identity.name : `${identity.name}@acme.com`;
  const fullName = identity.name
    .split('.')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

  return {
    '@timestamp': identity.lastSeen,
    entity: {
      id: identity.id,
      name: identity.name,
      type: 'user',
      EngineMetadata: { Type: 'user' },
      source: sourceTokensFor(identity),
      lifecycle: {
        first_seen: firstSeenFor(identity),
        last_activity: identity.lastSeen,
      },
      attributes: {
        managed: true,
        mfa_enabled: !identity.isDormantActive,
        ...(identity.isPrivileged ? { watchlists: ['privileged_users'] } : {}),
      },
      risk: {
        calculated_score_norm: identity.riskScore,
        calculated_level: toRiskLevel(identity.riskScore),
        calculated_score: identity.riskScore,
      },
    },
    user: {
      name: identity.name,
      id: [`S-1-5-21-${identity.id.length * 1000}`, `uid-${identity.id}`],
      domain: [domain.split('.')[0]?.toUpperCase() ?? 'CORP', domain],
      full_name: [fullName],
      email: [emailLocal],
      roles: identity.isPrivileged ? ['Domain Admins', 'Privileged Users'] : ['Domain Users'],
    },
    asset: assetCriticalityFor(identity.criticality),
  };
};

const buildHostEntity = (identity: FaceliftIdentity): HostEntity => {
  const domain = domainFor(identity);
  return {
    '@timestamp': identity.lastSeen,
    entity: {
      id: identity.id,
      name: identity.name,
      type: 'host',
      EngineMetadata: { Type: 'host' },
      source: sourceTokensFor(identity),
      lifecycle: {
        first_seen: firstSeenFor(identity),
        last_activity: identity.lastSeen,
      },
      risk: {
        calculated_score_norm: identity.riskScore,
        calculated_level: toRiskLevel(identity.riskScore),
        calculated_score: identity.riskScore,
      },
    },
    host: {
      name: identity.name,
      id: [`host-${identity.id}`, `uuid-${identity.id}-aaaa-bbbb`],
      ip: [`10.40.${identity.riskScore % 50}.${(identity.alerts % 200) + 1}`, '10.0.0.1'],
      mac: ['0a:1b:2c:3d:4e:5f', 'aa:bb:cc:dd:ee:ff'],
      architecture: ['x86_64'],
      type: identity.name.startsWith('iot') ? ['iot'] : ['server'],
      os: {
        name: 'Ubuntu',
        family: 'debian',
        version: '22.04',
        platform: 'linux',
      },
      hostname: [`${identity.name}.${domain}`],
    },
    asset: assetCriticalityFor(identity.criticality),
  };
};

const buildServiceEntity = (identity: FaceliftIdentity): ServiceEntity => {
  return {
    '@timestamp': identity.lastSeen,
    entity: {
      id: identity.id,
      name: identity.name,
      type: 'service',
      EngineMetadata: { Type: 'service' },
      source: sourceTokensFor(identity),
      lifecycle: {
        first_seen: firstSeenFor(identity),
        last_activity: identity.lastSeen,
      },
      risk: {
        calculated_score_norm: identity.riskScore,
        calculated_level: toRiskLevel(identity.riskScore),
        calculated_score: identity.riskScore,
      },
    },
    service: {
      name: identity.name,
      id: `svc-${identity.id}`,
      type: 'application',
      environment: 'production',
      version: '1.4.2',
      address: `${identity.name}.svc.cluster.local`,
      state: 'running',
      node: {
        name: `node-${identity.id}`,
        roles: ['backend'],
      },
    },
    asset: assetCriticalityFor(identity.criticality),
  };
};

/**
 * Entity Store docs for individual raw records, so opening an alias or an
 * unresolved solo from the table shows that row's risk / criticality / source
 * rather than the parent's aggregated identity (or an empty Observed flyout).
 */
const buildUserEntityFromRecord = (record: FaceliftRawRecord): UserEntity => {
  const domain = record.domain;
  const emailLocal = record.name.includes('@') ? record.name : `${record.name}@acme.com`;
  const fullName = record.name
    .replace(/^CORP\\/i, '')
    .split(/[.@\s(]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

  return {
    '@timestamp': record.lastSeen,
    entity: {
      id: record.entityId,
      name: record.name,
      type: 'user',
      EngineMetadata: { Type: 'user' },
      source: [SOURCE_TOKEN[record.source] ?? record.source.toLowerCase()],
      lifecycle: {
        first_seen: new Date(new Date(record.lastSeen).getTime() - 90 * 24 * 36e5).toISOString(),
        last_activity: record.lastSeen,
      },
      attributes: {
        managed: true,
        mfa_enabled: true,
      },
      risk: {
        calculated_score_norm: record.riskScore,
        calculated_level: toRiskLevel(record.riskScore),
        calculated_score: record.riskScore,
      },
    },
    user: {
      name: record.name,
      id: [record.entityId, `uid-${record.id}`],
      domain: [domain.split('.')[0]?.toUpperCase() ?? 'CORP', domain],
      full_name: [fullName || record.name],
      email: [emailLocal],
      roles: ['Domain Users'],
    },
    asset: assetCriticalityFor(record.criticality),
  };
};

const buildHostEntityFromRecord = (record: FaceliftRawRecord): HostEntity => ({
  '@timestamp': record.lastSeen,
  entity: {
    id: record.entityId,
    name: record.name,
    type: 'host',
    EngineMetadata: { Type: 'host' },
    source: [SOURCE_TOKEN[record.source] ?? record.source.toLowerCase()],
    lifecycle: {
      first_seen: new Date(new Date(record.lastSeen).getTime() - 90 * 24 * 36e5).toISOString(),
      last_activity: record.lastSeen,
    },
    risk: {
      calculated_score_norm: record.riskScore,
      calculated_level: toRiskLevel(record.riskScore),
      calculated_score: record.riskScore,
    },
  },
  host: {
    name: record.name,
    id: [record.entityId, `uuid-${record.id}-aaaa-bbbb`],
    ip: [`10.40.${record.riskScore % 50}.${(record.alerts % 200) + 1}`, '10.0.0.1'],
    mac: ['0a:1b:2c:3d:4e:5f', 'aa:bb:cc:dd:ee:ff'],
    architecture: ['x86_64'],
    type: record.name.startsWith('iot') ? ['iot'] : ['server'],
    os: {
      name: 'Ubuntu',
      family: 'debian',
      version: '22.04',
      platform: 'linux',
    },
    hostname: [`${record.name}.${record.domain}`],
  },
  asset: assetCriticalityFor(record.criticality),
});

const buildServiceEntityFromRecord = (record: FaceliftRawRecord): ServiceEntity => ({
  '@timestamp': record.lastSeen,
  entity: {
    id: record.entityId,
    name: record.name,
    type: 'service',
    EngineMetadata: { Type: 'service' },
    source: [SOURCE_TOKEN[record.source] ?? record.source.toLowerCase()],
    lifecycle: {
      first_seen: new Date(new Date(record.lastSeen).getTime() - 90 * 24 * 36e5).toISOString(),
      last_activity: record.lastSeen,
    },
    risk: {
      calculated_score_norm: record.riskScore,
      calculated_level: toRiskLevel(record.riskScore),
      calculated_score: record.riskScore,
    },
  },
  service: {
    name: record.name,
    id: record.entityId,
    type: 'application',
    environment: 'production',
    version: '1.4.2',
    address: `${record.name}.svc.cluster.local`,
    state: 'running',
    node: {
      name: `node-${record.id}`,
      roles: ['backend'],
    },
  },
  asset: assetCriticalityFor(record.criticality),
});

const storeRecordFromIdentity = (identity: FaceliftIdentity): FaceliftEntityStoreRecord => {
  switch (identity.entityType) {
    case EntityType.host:
      return buildHostEntity(identity);
    case EntityType.service:
      return buildServiceEntity(identity);
    default:
      return buildUserEntity(identity);
  }
};

const storeRecordFromRawRecord = (record: FaceliftRawRecord): FaceliftEntityStoreRecord => {
  switch (record.entityType) {
    case EntityType.host:
      return buildHostEntityFromRecord(record);
    case EntityType.service:
      return buildServiceEntityFromRecord(record);
    default:
      return buildUserEntityFromRecord(record);
  }
};

const ENTITY_STORE_BY_ID: Record<string, FaceliftEntityStoreRecord> = {
  ...Object.fromEntries(
    IDENTITIES.map((identity) => [identity.id, storeRecordFromIdentity(identity)])
  ),
  ...Object.fromEntries(
    RAW_RECORDS.map((record) => [record.entityId, storeRecordFromRawRecord(record)])
  ),
};

export const getFaceliftEntityStoreRecord = (
  entityId: string | undefined | null
): FaceliftEntityStoreRecord | null => {
  if (!entityId) return null;
  return ENTITY_STORE_BY_ID[entityId] ?? null;
};

/** Display contributions for the Risk score summary table (not product modifiers). */
const CRITICALITY_TABLE_CONTRIBUTION: Record<CriticalityLevelWithUnassigned, number> = {
  extreme_impact: 12,
  high_impact: 8,
  medium_impact: 4,
  low_impact: 2,
  unassigned: 0,
};

const noopRefetch = () => undefined;

/**
 * RiskScoreState for the flyout Risk score section: category inputs sum toward
 * the entity's risk score so the contributions table matches the rest of the mock.
 */
export const getFaceliftRiskScoreState = <T extends EntityType>(
  entityType: T,
  entityId: string
): RiskScoreState<T> | null => {
  const storeRecord = getFaceliftEntityStoreRecord(entityId);
  if (!storeRecord) return null;

  const rawRecord = rawRecordByEntityId[entityId] as FaceliftRawRecord | undefined;
  const identityId = resolveIdentityId(entityId);
  const identity = identityId ? IDENTITY_BY_ID[identityId] : undefined;

  const riskScore = rawRecord?.riskScore ?? identity?.riskScore ?? 0;
  const alerts = rawRecord?.alerts ?? identity?.alerts ?? 0;
  const criticality: CriticalityLevelWithUnassigned =
    rawRecord?.criticality ?? identity?.criticality ?? 'unassigned';

  const criticalityScore = CRITICALITY_TABLE_CONTRIBUTION[criticality] ?? 0;
  const alertsScore = Math.max(0, Number((riskScore - criticalityScore).toFixed(2)));

  const name =
    entityType === EntityType.host && 'host' in storeRecord
      ? storeRecord.host?.name ?? storeRecord.entity?.name ?? ''
      : entityType === EntityType.service && 'service' in storeRecord
      ? storeRecord.service?.name ?? storeRecord.entity?.name ?? ''
      : 'user' in storeRecord
      ? storeRecord.user?.name ?? storeRecord.entity?.name ?? ''
      : storeRecord.entity?.name ?? '';

  const idField =
    entityType === EntityType.host
      ? 'host.name'
      : entityType === EntityType.service
      ? 'service.name'
      : 'user.name';

  const timestamp = storeRecord['@timestamp'] ?? new Date().toISOString();
  const level = toRiskLevel(riskScore);

  const modifiers: RiskStats['modifiers'] =
    criticality !== 'unassigned'
      ? [
          {
            type: 'asset_criticality',
            contribution: criticalityScore,
            metadata: { criticality_level: criticality },
          },
        ]
      : undefined;

  const riskStats: RiskStats = {
    '@timestamp': timestamp,
    id_field: idField,
    id_value: name,
    calculated_level: level,
    calculated_score: riskScore,
    calculated_score_norm: riskScore,
    category_1_score: alertsScore,
    category_1_count: alerts,
    category_2_score: criticalityScore,
    inputs: [],
    notes: [],
    rule_risks: [],
    multipliers: [],
    ...(modifiers ? { modifiers } : {}),
  };

  const dataItem = {
    '@timestamp': timestamp,
    [entityType]: { name, risk: riskStats },
  } as unknown as EntityRiskScore<T>;

  return {
    data: [dataItem] as RiskScoreState<T>['data'],
    inspect: { dsl: [], response: [] },
    isInspected: false,
    refetch: noopRefetch,
    totalCount: 1,
    isAuthorized: true,
    hasEngineBeenInstalled: true,
    loading: false,
    error: null,
  };
};

interface AnomalyTimeBucket {
  timestamp: string;
  maxScore: number;
  threatTactics: string[];
  tacticCounts: Record<string, number>;
}

export const getFaceliftAnomalyOverview = (entityId: string): GetAnomalyOverviewResponse | null => {
  const identityId = resolveIdentityId(entityId);
  const identity = identityId ? IDENTITY_BY_ID[identityId] : undefined;
  if (!identity || !identityId) return null;
  // Normalize so downstream payload ids match the target identity.
  entityId = identityId;

  const now = Date.now();
  const from = now - 30 * 24 * 36e5;
  const to = now;

  if (!identity.hasNewAnomalies) {
    return {
      entityId,
      entityType: identity.entityType,
      anomalyByTimeBucket: [],
      recentAnomalies: [],
      tacticCounts: {},
      totalAnomaliesCount: 0,
      from,
      to,
      hasJobsMissingThreatTactics: false,
    };
  }

  const buckets = [6, 5, 4, 3, 2, 1, 0].map((daysAgo, index): AnomalyTimeBucket => {
    const timestamp = new Date(now - daysAgo * 24 * 36e5).toISOString();
    const maxScore = 45 + index * 7 + (identity.riskScore % 10);
    return {
      timestamp,
      maxScore,
      threatTactics: index % 2 === 0 ? ['TA0001', 'TA0006'] : ['TA0003'],
      tacticCounts:
        index % 2 === 0 ? { TA0001: 2 + index, TA0006: 1 } : { TA0003: 1 + (index % 3) },
    };
  });

  return {
    entityId,
    entityType: identity.entityType,
    anomalyByTimeBucket: buckets,
    recentAnomalies: [
      {
        recordId: `${entityId}-anom-1`,
        jobId: 'auth_rare_user',
        jobName: 'Rare user authentication',
        timestamp: new Date(now - 2 * 36e5).toISOString(),
        anomalousValue: identity.name,
      },
      {
        recordId: `${entityId}-anom-2`,
        jobId: 'host_rare_process',
        jobName: 'Rare process execution',
        timestamp: new Date(now - 8 * 36e5).toISOString(),
        anomalousValue: 'powershell.exe',
      },
      {
        recordId: `${entityId}-anom-3`,
        jobId: 'lateral_movement',
        jobName: 'Suspicious lateral movement',
        timestamp: new Date(now - 20 * 36e5).toISOString(),
        anomalousValue: '10.20.0.55',
      },
    ],
    tacticCounts: { TA0001: 8, TA0003: 4, TA0006: 3 },
    totalAnomaliesCount: 15,
    from,
    to,
    hasJobsMissingThreatTactics: false,
  };
};

export interface FaceliftAlertsByStatus {
  open: { total: number; severities: Array<{ key: string; value: number }> };
  acknowledged: { total: number; severities: Array<{ key: string; value: number }> };
}

/** Alert counts by status for the Insights → Alerts preview. */
export const getFaceliftAlertsByStatus = (entityId: string): FaceliftAlertsByStatus | null => {
  // Prefer the specific raw record when the flyout was opened from one, so the
  // Insights preview matches the Alerts column in the table.
  const rawRecord = rawRecordByEntityId[entityId];
  const identity = IDENTITY_BY_ID[entityId] ?? IDENTITY_BY_ID[resolveIdentityId(entityId) ?? ''];
  const alerts = rawRecord && !IDENTITY_BY_ID[entityId] ? rawRecord.alerts : identity?.alerts ?? 0;
  if (alerts <= 0) return null;

  const openCount = Math.max(1, Math.ceil(alerts * 0.7));
  const ackCount = Math.max(0, alerts - openCount);
  const critical = Math.min(openCount, Math.max(1, Math.round(alerts * 0.35)));
  const high = Math.min(openCount - critical, Math.max(0, Math.round(alerts * 0.3)));
  const medium = Math.max(0, openCount - critical - high);

  return {
    open: {
      total: openCount,
      severities: [
        ...(critical > 0 ? [{ key: 'critical', value: critical }] : []),
        ...(high > 0 ? [{ key: 'high', value: high }] : []),
        ...(medium > 0 ? [{ key: 'medium', value: medium }] : []),
      ],
    },
    acknowledged: {
      total: ackCount,
      severities:
        ackCount > 0
          ? [
              { key: 'high', value: Math.max(1, Math.floor(ackCount / 2)) },
              {
                key: 'medium',
                value: Math.max(0, ackCount - Math.max(1, Math.floor(ackCount / 2))),
              },
            ].filter((bucket) => bucket.value > 0)
          : [],
    },
  };
};

/**
 * Resolution group: target + raw-record aliases when the identity has 2+ records.
 */
export const getFaceliftResolutionGroup = (entityId: string): ResolutionGroup | null => {
  const identityId = resolveIdentityId(entityId);
  const identity = identityId ? IDENTITY_BY_ID[identityId] : undefined;
  if (!identity || !identityId) return null;

  const records = recordsForIdentity(identityId);
  // A resolution group needs at least two raw records.
  if (records.length < 2) return null;

  const storeRecord = ENTITY_STORE_BY_ID[identityId];

  const target = {
    entity: {
      id: identity.id,
      name: identity.name,
      type: identity.entityType,
      risk: {
        calculated_score_norm: identity.riskScore,
        calculated_level: toRiskLevel(identity.riskScore),
        calculated_score: identity.riskScore,
      },
    },
    ...(storeRecord && 'user' in storeRecord
      ? { user: storeRecord.user }
      : storeRecord && 'host' in storeRecord
      ? { host: storeRecord.host }
      : storeRecord && 'service' in storeRecord
      ? { service: storeRecord.service }
      : {}),
  };

  const aliases = records.map((record) => ({
    entity: {
      id: record.entityId,
      name: record.name,
      type: record.entityType,
      source: [SOURCE_TOKEN[record.source] ?? record.source.toLowerCase()],
      risk: {
        calculated_score_norm: record.riskScore,
        calculated_level: toRiskLevel(record.riskScore),
        calculated_score: record.riskScore,
      },
    },
  }));

  return {
    target,
    aliases,
    group_size: 1 + aliases.length,
  };
};
