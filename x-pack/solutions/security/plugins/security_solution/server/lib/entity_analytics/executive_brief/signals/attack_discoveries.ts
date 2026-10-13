/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { getAlertEntities } from '../../../../workflows/step_types/get_alert_entities_step/get_alert_entities';
import {
  ALWAYS_AVAILABLE,
  SignalUnavailableError,
  compareStrings,
  defineSignal,
  errorMessage,
  isIndexNotFoundError,
  severityFromRiskScore,
} from './define_signal';
import { nameFromEuid, toEntityRef } from '../entity_record';
import { identityResolution, resolveEntities } from './resolve_entities';
import type { EntityResolution } from './resolve_entities';
import { getAlertsIndex, getAttackDiscoveryIndices } from './shared/indices';
import type { EntityRef, FactDraft, LinkDraft, SignalContext } from './types';

export const MAX_DISCOVERIES = 10;
const DISCOVERY_CANDIDATES = 30;
const DISCOVERY_JACCARD_THRESHOLD = 0.5;
const MAX_ALERT_IDS_PER_DISCOVERY = 1000;
export const MAX_ENTITIES_PER_DISCOVERY = 12;
/** Alert entities read per discovery, before aliases collapse onto golden entities. */
const MAX_RAW_ENTITIES_PER_DISCOVERY = 30;
/** Up to this many entities get a link between every pair; beyond it, a star from the first. */
const ALL_PAIRS_MAX_ENTITIES = 6;

const AD_USERS_PATH = 'kibana.alert.attack_discovery.users';
const AD_FIELDS = [
  '@timestamp',
  'kibana.alert.attack_discovery.alert_ids',
  'kibana.alert.attack_discovery.title',
  'kibana.alert.attack_discovery.mitre_attack_tactics',
  'kibana.alert.risk_score',
  'kibana.alert.workflow_status',
];

export interface DiscoveryInfo {
  id: string;
  title: string;
  /** 0..100, when the discovery carries one. */
  riskScore?: number;
  workflowStatus: 'open' | 'acknowledged';
  /** Unique and sorted. */
  alertIds: string[];
  at: string;
  tactics: string[];
}

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];

const first = (value: unknown): unknown => (Array.isArray(value) ? value[0] : value);

/** Own-or-shared visibility: never another analyst's private discovery. */
export const buildDiscoveryVisibilityQuery = (
  username: string | undefined
): estypes.QueryDslQueryContainer => ({
  bool: {
    should: [
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

export const parseDiscoveryHit = (hit: estypes.SearchHit<unknown>): DiscoveryInfo | undefined => {
  const fields = (hit.fields ?? {}) as Record<string, unknown>;
  const alertIds = [...new Set(strings(fields['kibana.alert.attack_discovery.alert_ids']))].sort(
    compareStrings
  );
  const at = first(fields['@timestamp']);
  if (!hit._id || alertIds.length === 0 || typeof at !== 'string') {
    return undefined;
  }
  const title = first(fields['kibana.alert.attack_discovery.title']);
  const risk = first(fields['kibana.alert.risk_score']);
  return {
    id: hit._id,
    title: typeof title === 'string' && title.length > 0 ? title : 'Attack discovery',
    ...(typeof risk === 'number' ? { riskScore: risk } : {}),
    workflowStatus:
      first(fields['kibana.alert.workflow_status']) === 'acknowledged' ? 'acknowledged' : 'open',
    alertIds,
    at,
    tactics: strings(fields['kibana.alert.attack_discovery.mitre_attack_tactics']),
  };
};

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
export const dedupeDiscoveries = (discoveries: DiscoveryInfo[]): DiscoveryInfo[] => {
  const ordered = [...discoveries].sort(
    (a, b) =>
      (b.riskScore ?? -1) - (a.riskScore ?? -1) ||
      compareStrings(b.at, a.at) ||
      compareStrings(a.id, b.id)
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
  return kept.slice(0, MAX_DISCOVERIES);
};

const fetchDiscoveries = async (
  ctx: SignalContext,
  abortSignal: AbortSignal
): Promise<DiscoveryInfo[]> => {
  const query: estypes.QueryDslQueryContainer = {
    bool: {
      filter: [
        { range: { '@timestamp': { gte: ctx.timeRange.from, lte: ctx.timeRange.to } } },
        buildDiscoveryVisibilityQuery(ctx.user.username || undefined),
      ],
      must_not: [{ term: { 'kibana.alert.workflow_status': 'closed' } }],
    },
  };
  const indices = getAttackDiscoveryIndices(ctx.spaceId);
  const settled = await Promise.allSettled(
    indices.map((index) =>
      ctx.esClient.search<unknown>(
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
        { signal: abortSignal }
      )
    )
  );
  // A missing scheduled or ad hoc index is normal; both missing means no discovery ever ran.
  const failures = settled.flatMap((result) =>
    result.status === 'rejected' ? [result.reason as unknown] : []
  );
  const hardFailure = failures.find((reason) => !isIndexNotFoundError(reason));
  if (hardFailure !== undefined) {
    throw hardFailure;
  }
  if (failures.length === indices.length) {
    throw new SignalUnavailableError('Attack Discovery has not run in this space yet.');
  }
  const discoveries = settled.flatMap((result) =>
    result.status === 'fulfilled'
      ? result.value.hits.hits.flatMap((hit) => {
          const parsed = parseDiscoveryHit(hit);
          return parsed ? [parsed] : [];
        })
      : []
  );
  return dedupeDiscoveries(discoveries);
};

/** Highest risk score of each discovery's alerts, for discoveries that carry none themselves. */
const fetchAlertRiskScores = async (
  ctx: SignalContext,
  discoveries: DiscoveryInfo[],
  abortSignal: AbortSignal
): Promise<Map<string, number>> => {
  const scores = new Map<string, number>();
  const unscored = discoveries.filter(({ riskScore }) => riskScore === undefined);
  if (unscored.length === 0) {
    return scores;
  }
  const idsOf = (discovery: DiscoveryInfo): string[] =>
    discovery.alertIds.slice(0, MAX_ALERT_IDS_PER_DISCOVERY);
  const response = await ctx.esClient.search<unknown>(
    {
      index: getAlertsIndex(ctx.spaceId),
      size: 0,
      query: { ids: { values: [...new Set(unscored.flatMap(idsOf))] } },
      aggs: {
        discoveries: {
          filters: {
            filters: Object.fromEntries(
              unscored.map((discovery) => [discovery.id, { ids: { values: idsOf(discovery) } }])
            ),
          },
          aggs: { risk: { max: { field: 'kibana.alert.risk_score' } } },
        },
      },
    },
    { signal: abortSignal }
  );
  const buckets = (
    response.aggregations as
      | { discoveries?: { buckets?: Record<string, { risk?: { value?: number | null } }> } }
      | undefined
  )?.discoveries?.buckets;
  Object.entries(buckets ?? {}).forEach(([id, bucket]) => {
    if (typeof bucket.risk?.value === 'number') scores.set(id, bucket.risk.value);
  });
  return scores;
};

const discoveryEntities = async (
  ctx: SignalContext,
  discovery: DiscoveryInfo,
  abortSignal: AbortSignal
): Promise<EntityRef[]> => {
  const { entities } = await getAlertEntities({
    abortSignal,
    alertIds: discovery.alertIds.slice(0, MAX_ALERT_IDS_PER_DISCOVERY),
    entityTypes: ['user', 'host', 'service'],
    esClient: ctx.esClient,
    maxEntities: MAX_RAW_ENTITIES_PER_DISCOVERY,
    spaceId: ctx.spaceId,
  });
  return entities.map(({ id, name, type }) => ({ euid: id, type, name: name ?? nameFromEuid(id) }));
};

/** A discovery's entities as golden entities, most alerted first, without duplicates. */
export const toGoldenEntities = (
  entities: EntityRef[],
  resolution: EntityResolution
): EntityRef[] => {
  const byGolden = new Map<string, EntityRef>();
  for (const entity of entities) {
    const golden = resolution.golden(entity.euid);
    if (!byGolden.has(golden)) {
      const record = resolution.get(golden);
      byGolden.set(golden, record ? toEntityRef(record, golden) : { ...entity, euid: golden });
    }
  }
  return [...byGolden.values()].slice(0, MAX_ENTITIES_PER_DISCOVERY);
};

/** Every pair for small discoveries; a star from the most-alerted entity for larger ones. */
export const sameAttackLinks = (entities: EntityRef[], factIndex: number): LinkDraft[] => {
  if (entities.length <= ALL_PAIRS_MAX_ENTITIES) {
    return entities.flatMap((from, i) =>
      entities
        .slice(i + 1)
        .map((to): LinkDraft => ({ type: 'same_attack', from, to, factIndexes: [factIndex] }))
    );
  }
  const [hub, ...rest] = entities;
  return rest.map(
    (to): LinkDraft => ({
      type: 'same_attack',
      from: hub,
      to,
      factIndexes: [factIndex],
    })
  );
};

/**
 * Attack discoveries in the window the user can see (own or shared), not closed, with overlapping
 * regenerations collapsed. Each discovery's alerts are resolved to entities, which are linked as
 * `same_attack` and nominated as candidates.
 */
export const attackDiscoveriesSignal = defineSignal({
  id: 'attack_discoveries',
  title: 'Attack discoveries',
  capability: 'attack_discovery',
  scope: 'tenant',
  isAvailable: async () => ALWAYS_AVAILABLE,
  run: async (ctx, _input, abortSignal) => {
    const discoveries = await fetchDiscoveries(ctx, abortSignal);
    if (discoveries.length === 0) {
      return { facts: [] };
    }

    const [alertScores, entitiesByDiscovery] = await Promise.all([
      fetchAlertRiskScores(ctx, discoveries, abortSignal).catch((error: unknown) => {
        ctx.logger.debug(
          `[executive brief] discovery severity lookup failed: ${errorMessage(error)}`
        );
        return new Map<string, number>();
      }),
      Promise.all(
        discoveries.map((discovery) =>
          discoveryEntities(ctx, discovery, abortSignal).catch((error: unknown) => {
            ctx.logger.warn(
              `[executive brief] could not resolve entities of discovery ${
                discovery.id
              }: ${errorMessage(error)}`
            );
            return [];
          })
        )
      ),
    ]);

    const rawEntities = entitiesByDiscovery.flat();
    const resolution = await resolveEntities({
      esClient: ctx.esClient,
      spaceId: ctx.spaceId,
      refs: rawEntities,
      abortSignal,
    }).catch((error: unknown) => {
      ctx.logger.debug(
        `[executive brief] discovery entity resolution failed: ${errorMessage(error)}`
      );
      return identityResolution();
    });
    const goldenByDiscovery = entitiesByDiscovery.map((entities) =>
      toGoldenEntities(entities, resolution)
    );

    const facts: FactDraft[] = [];
    const links: LinkDraft[] = [];
    discoveries.forEach((discovery, index) => {
      const entities = goldenByDiscovery[index];
      const severity = severityFromRiskScore(discovery.riskScore ?? alertScores.get(discovery.id));
      facts.push({
        kind: 'attack_discovery',
        title: discovery.title,
        at: discovery.at,
        ...(severity ? { severity } : {}),
        entities,
        numbers: { alerts: discovery.alertIds.length },
        details: {
          status: discovery.workflowStatus,
          ...(discovery.tactics.length > 0 ? { tactics: discovery.tactics.join(', ') } : {}),
        },
        source: { type: 'attack_discovery', id: discovery.id, name: discovery.title },
      });
      links.push(...sameAttackLinks(entities, index));
    });

    const seen = new Set<string>();
    const candidates = goldenByDiscovery.flat().filter(({ euid }) => {
      if (seen.has(euid)) return false;
      seen.add(euid);
      return true;
    });
    return { facts, links, candidates };
  },
});
