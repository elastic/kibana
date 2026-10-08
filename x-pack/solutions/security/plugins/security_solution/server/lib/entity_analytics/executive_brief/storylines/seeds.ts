/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { estypes } from '@elastic/elasticsearch';
import {
  ATTACK_DISCOVERY_ADHOC_ALERTS_COMMON_INDEX_PREFIX,
  ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX,
} from '@kbn/elastic-assistant-common';
import { MAX_SEEDS_PER_KIND } from '../../../../../common/entity_analytics/executive_brief/constants';
import type {
  BriefTimeRange,
  SeedKind,
  TimePoint,
} from '../../../../../common/entity_analytics/executive_brief/types';
import type { Lead } from '../../../../../common/entity_analytics/lead_generation/types';
import { createLeadDataClient } from '../../lead_generation/lead_data_client';
import type { ClusterEdge, ClusterSeed } from './types';
import { classifyError } from './source';
import { findMaxPositiveDelta } from './timeline';

export const MAX_DISCOVERY_SEEDS = 10;
export const MAX_LEAD_SEEDS = 10;
const DISCOVERY_CANDIDATES = 30;
const DISCOVERY_JACCARD_THRESHOLD = 0.5;
const MAX_LEAD_RELATED = 20;
const MOVER_DELTA_BONUS_MAX = 0.1;
const MOVER_DELTA_BONUS_DIVISOR = 200;

const AD_USERS_PATH = 'kibana.alert.attack_discovery.users';

const AD_FIELDS = [
  '@timestamp',
  'kibana.alert.attack_discovery.alert_ids',
  'kibana.alert.attack_discovery.title',
  'kibana.alert.attack_discovery.mitre_attack_tactics',
  'kibana.alert.risk_score',
  'kibana.alert.workflow_status',
  'kibana.alert.case_ids',
];

export interface DiscoveryInfo {
  /** Attack discovery document id. */
  id: string;
  title: string;
  /** 0..100 */
  riskScore?: number;
  workflowStatus: 'open' | 'acknowledged' | 'closed';
  alertIds: string[];
  /** Generation time (ISO). */
  at: string;
  tacticNames: string[];
}

export interface LeadInfo {
  id: string;
  title: string;
  priority: number;
  status: string;
  entityEuid: string;
  createdAt: string;
  timestamp: string;
  related: Array<{ id: string; kinds: string[] }>;
}

const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

// ---------------------------------------------------------------------------------------------
// Attack Discovery
// ---------------------------------------------------------------------------------------------

/** Own-or-shared visibility (mirrors `getCombinedFilter`): never another analyst's private discovery. */
export const buildDiscoveryVisibilityQuery = (
  username: string | undefined
): estypes.QueryDslQueryContainer => ({
  bool: {
    should: [
      // Shared: no `users` entry at all.
      {
        bool: {
          must_not: [
            {
              nested: {
                path: AD_USERS_PATH,
                query: { exists: { field: `${AD_USERS_PATH}.name` } },
              },
            },
          ],
        },
      },
      // Own.
      ...(username
        ? [
            {
              nested: {
                path: AD_USERS_PATH,
                query: { term: { [`${AD_USERS_PATH}.name`]: username } },
              },
            },
          ]
        : []),
    ],
    minimum_should_match: 1,
  },
});

const jaccard = (a: string[], b: string[]): number => {
  const setB = new Set(b);
  const intersection = a.filter((id) => setB.has(id)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
};

/**
 * Scheduled runs regenerate overlapping discoveries for the same attack: keep the first (highest
 * risk, then newest) of any group whose alert-id overlap is at least 0.5 (Jaccard).
 */
export const dedupeDiscoveries = (
  discoveries: DiscoveryInfo[],
  max: number = MAX_DISCOVERY_SEEDS
): DiscoveryInfo[] => {
  const ordered = [...discoveries].sort(
    (a, b) =>
      (b.riskScore ?? -1) - (a.riskScore ?? -1) ||
      (a.at < b.at ? 1 : a.at > b.at ? -1 : 0) ||
      compare(a.id, b.id)
  );
  const kept: DiscoveryInfo[] = [];
  for (const candidate of ordered) {
    if (
      kept.every(
        (existing) => jaccard(existing.alertIds, candidate.alertIds) < DISCOVERY_JACCARD_THRESHOLD
      )
    ) {
      kept.push(candidate);
    }
  }
  return kept.slice(0, max);
};

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];

const first = (value: unknown): unknown => (Array.isArray(value) ? value[0] : value);

export const parseDiscoveryHit = (hit: estypes.SearchHit<unknown>): DiscoveryInfo | undefined => {
  const fields = (hit.fields ?? {}) as Record<string, unknown>;
  const alertIds = toStringArray(fields['kibana.alert.attack_discovery.alert_ids']);
  const at = first(fields['@timestamp']);
  const title = first(fields['kibana.alert.attack_discovery.title']);
  if (!hit._id || alertIds.length === 0 || typeof at !== 'string') {
    return undefined;
  }
  const risk = first(fields['kibana.alert.risk_score']);
  const status = first(fields['kibana.alert.workflow_status']);
  return {
    id: hit._id,
    title: typeof title === 'string' ? title : 'Attack discovery',
    riskScore: typeof risk === 'number' ? risk : undefined,
    workflowStatus: status === 'closed' || status === 'acknowledged' ? status : 'open',
    alertIds: [...new Set(alertIds)].sort(compare),
    at,
    tacticNames: toStringArray(fields['kibana.alert.attack_discovery.mitre_attack_tactics']),
  };
};

export interface DiscoveryFetchResult {
  discoveries: DiscoveryInfo[];
  /** False when the current user could not be resolved: only shared discoveries were read. */
  ownVisibility: boolean;
}

export const fetchDiscoveries = async ({
  esClient,
  spaceId,
  timeRange,
  signal,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
  timeRange: BriefTimeRange;
  signal?: AbortSignal;
}): Promise<DiscoveryFetchResult> => {
  let username: string | undefined;
  try {
    username = (await esClient.security.authenticate({}, { signal })).username;
  } catch {
    username = undefined; // Fail closed: shared discoveries only, reported via `ownVisibility`.
  }

  const query: estypes.QueryDslQueryContainer = {
    bool: {
      filter: [
        { range: { '@timestamp': { gte: timeRange.from, lte: timeRange.to } } },
        buildDiscoveryVisibilityQuery(username),
      ],
      must_not: [{ term: { 'kibana.alert.workflow_status': 'closed' } }],
    },
  };

  const indices = [
    `${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-${spaceId}`,
    `${ATTACK_DISCOVERY_ADHOC_ALERTS_COMMON_INDEX_PREFIX}-${spaceId}`,
  ];
  const settled = await Promise.allSettled(
    indices.map((index) =>
      esClient.search<unknown>(
        {
          index,
          size: DISCOVERY_CANDIDATES,
          _source: false,
          fields: AD_FIELDS,
          query,
          sort: [
            { 'kibana.alert.risk_score': { order: 'desc', unmapped_type: 'float' } },
            { '@timestamp': 'desc' },
          ],
        },
        { signal }
      )
    )
  );
  // A missing index (no scheduled or no ad hoc discoveries yet) is fine, but not both.
  const failures = settled.filter(
    (result): result is PromiseRejectedResult => result.status === 'rejected'
  );
  const hardFailure = failures.find((failure) => classifyError(failure.reason) !== 'missing_index');
  if (hardFailure) {
    throw hardFailure.reason;
  }
  if (failures.length === indices.length) {
    throw failures[0].reason;
  }

  const hits = settled.flatMap((result) =>
    result.status === 'fulfilled' ? result.value.hits.hits : []
  );
  const discoveries = hits.flatMap((hit) => {
    const parsed = parseDiscoveryHit(hit);
    return parsed ? [parsed] : [];
  });
  return { discoveries: dedupeDiscoveries(discoveries), ownVisibility: username !== undefined };
};

export const discoveryToSeed = (discovery: DiscoveryInfo, entityEuids: string[]): ClusterSeed => ({
  kind: 'attack_discovery',
  refKey: `ad:${discovery.id}`,
  entityEuids,
  severity: clamp01((discovery.riskScore ?? 50) / 100),
  at: discovery.at,
});

// ---------------------------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------------------------

export const toLeadInfo = (lead: Lead): LeadInfo => ({
  id: lead.id,
  title: lead.title,
  priority: lead.priority,
  status: lead.status,
  entityEuid: lead.entity.id,
  createdAt: lead.createdAt,
  timestamp: lead.timestamp,
  related: [...lead.topRelatedEntities]
    .sort((a, b) => compare(a.id, b.id))
    .slice(0, MAX_LEAD_RELATED)
    .map((related) => ({ id: related.id, kinds: related.kinds })),
});

export const fetchLeads = async ({
  esClient,
  logger,
  spaceId,
}: {
  esClient: ElasticsearchClient;
  logger: Parameters<typeof createLeadDataClient>[0]['logger'];
  spaceId: string;
}): Promise<LeadInfo[]> => {
  const client = createLeadDataClient({ esClient, logger, spaceId });
  const { leads } = await client.findLeads({
    status: 'active',
    perPage: MAX_LEAD_SEEDS,
    sortField: 'priority',
    sortOrder: 'desc',
  });
  return leads.filter((lead) => lead.status === 'active').map(toLeadInfo);
};

/** Priority 1..10 normalised to 0..1. */
export const leadToSeed = (lead: LeadInfo, goldenEuid: string): ClusterSeed => ({
  kind: 'lead',
  refKey: `lead:${lead.id}`,
  entityEuids: [goldenEuid],
  severity: clamp01(lead.priority / 10),
  at: lead.timestamp,
});

/** `lead_related` edges: attach-only, from the lead subject to its top related entities. */
export const leadRelatedEdges = (lead: LeadInfo, golden: (euid: string) => string): ClusterEdge[] =>
  lead.related.map((related) => ({
    type: 'lead_related',
    from: golden(lead.entityEuid),
    to: golden(related.id),
    refKeys: [`lead:${lead.id}`],
  }));

// ---------------------------------------------------------------------------------------------
// Material risk and risk movers
// ---------------------------------------------------------------------------------------------

export interface RiskSeedCandidate {
  /** Golden euid. */
  euid: string;
  /** 0..100, undefined when the entity has no score (it is then not seeded). */
  scoreNorm?: number;
  series?: TimePoint[];
}

/**
 * Severity = score / 100; movers add a bonus for the largest day-over-day rise (up to 0.1).
 * Top MAX_SEEDS_PER_KIND by severity, then euid. Entities without a score are returned in
 * `skipped` so the caller can report them.
 */
export const buildRiskSeeds = ({
  kind,
  candidates,
  fallbackAt,
}: {
  kind: Extract<SeedKind, 'material_risk' | 'risk_mover'>;
  candidates: RiskSeedCandidate[];
  fallbackAt: string;
}): { seeds: ClusterSeed[]; skipped: string[] } => {
  const sorted = [...candidates].sort((a, b) => compare(a.euid, b.euid));
  const skipped = sorted.filter((c) => c.scoreNorm === undefined).map((c) => c.euid);
  const seeds = sorted.flatMap((candidate): ClusterSeed[] => {
    const { scoreNorm, series } = candidate;
    if (scoreNorm === undefined) {
      return [];
    }
    const delta = series ? findMaxPositiveDelta(series) : 0;
    const bonus =
      kind === 'risk_mover'
        ? Math.min(MOVER_DELTA_BONUS_MAX, Math.max(0, delta) / MOVER_DELTA_BONUS_DIVISOR)
        : 0;
    const lastPoint = series?.length ? series[series.length - 1].t : undefined;
    return [
      {
        kind,
        refKey: `ent:${candidate.euid}`,
        entityEuids: [candidate.euid],
        severity: clamp01(scoreNorm / 100 + bonus),
        at: lastPoint ?? fallbackAt,
      },
    ];
  });
  return {
    seeds: seeds
      .sort((a, b) => b.severity - a.severity || compare(a.refKey, b.refKey))
      .slice(0, MAX_SEEDS_PER_KIND),
    skipped,
  };
};
