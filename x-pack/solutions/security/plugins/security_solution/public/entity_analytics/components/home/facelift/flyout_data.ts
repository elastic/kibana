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
import { EntityType } from '../../../../../common/entity_analytics/types';
import type { ResolutionGroup } from '../../entity_resolution/hooks/use_resolution_group';
import type { FaceliftIdentity, FaceliftRiskLevel } from './data';
import {
  IDENTITY_BY_ID,
  IDENTITIES,
  getFaceliftRiskLevel,
  recordsForIdentity,
  sourcesForIdentity,
} from './data';

export const USE_FACELIFT_MOCK_FLYOUT = true;

/** Entity Store document shape used by flyout short-circuits. */
export type FaceliftEntityStoreRecord = HostEntity | UserEntity | ServiceEntity;

/** Shared flag used by table + flyout short-circuits. */
export const isFaceliftMockEntityId = (entityId: string | undefined | null): boolean =>
  Boolean(entityId && IDENTITY_BY_ID[entityId]);

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

const assetCriticalityFor = (
  criticality: FaceliftIdentity['criticality']
): UserEntity['asset'] => {
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

const ENTITY_STORE_BY_ID: Record<string, FaceliftEntityStoreRecord> = Object.fromEntries(
  IDENTITIES.map((identity) => {
    let record: FaceliftEntityStoreRecord;
    switch (identity.entityType) {
      case EntityType.host:
        record = buildHostEntity(identity);
        break;
      case EntityType.service:
        record = buildServiceEntity(identity);
        break;
      default:
        record = buildUserEntity(identity);
    }
    return [identity.id, record];
  })
);

export const getFaceliftEntityStoreRecord = (
  entityId: string | undefined | null
): FaceliftEntityStoreRecord | null => {
  if (!entityId) return null;
  return ENTITY_STORE_BY_ID[entityId] ?? null;
};

export const getFaceliftAnomalyOverview = (
  entityId: string
): GetAnomalyOverviewResponse | null => {
  const identity = IDENTITY_BY_ID[entityId];
  if (!identity) return null;

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

  const buckets = [6, 5, 4, 3, 2, 1, 0].map((daysAgo, index) => {
    const timestamp = new Date(now - daysAgo * 24 * 36e5).toISOString();
    const maxScore = 45 + index * 7 + (identity.riskScore % 10);
    return {
      timestamp,
      maxScore,
      threatTactics: index % 2 === 0 ? ['TA0001', 'TA0006'] : ['TA0003'],
      tacticCounts:
        index % 2 === 0
          ? { TA0001: 2 + index, TA0006: 1 }
          : { TA0003: 1 + (index % 3) },
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
  const identity = IDENTITY_BY_ID[entityId];
  if (!identity || identity.alerts <= 0) return null;

  const openCount = Math.max(1, Math.ceil(identity.alerts * 0.7));
  const ackCount = Math.max(0, identity.alerts - openCount);
  const critical = Math.min(openCount, Math.max(1, Math.round(identity.alerts * 0.35)));
  const high = Math.min(openCount - critical, Math.max(0, Math.round(identity.alerts * 0.3)));
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
              { key: 'medium', value: Math.max(0, ackCount - Math.max(1, Math.floor(ackCount / 2))) },
            ].filter((bucket) => bucket.value > 0)
          : [],
    },
  };
};

/**
 * Resolution group: target + raw-record aliases when the identity has 2+ records.
 */
export const getFaceliftResolutionGroup = (entityId: string): ResolutionGroup | null => {
  const identity = IDENTITY_BY_ID[entityId];
  if (!identity) return null;

  const records = recordsForIdentity(entityId);
  const storeRecord = ENTITY_STORE_BY_ID[entityId];

  const target = {
    entity: {
      id: identity.id,
      name: identity.name,
      type: identity.entityType,
    },
    ...(storeRecord && 'user' in storeRecord
      ? { user: storeRecord.user }
      : storeRecord && 'host' in storeRecord
      ? { host: storeRecord.host }
      : storeRecord && 'service' in storeRecord
      ? { service: storeRecord.service }
      : {}),
  };

  const aliases = records.slice(1).map((record) => ({
    entity: {
      id: record.id,
      name: record.name,
      type: record.entityType,
      source: [SOURCE_TOKEN[record.source] ?? record.source.toLowerCase()],
    },
  }));

  return {
    target,
    aliases,
    group_size: 1 + aliases.length,
  };
};
