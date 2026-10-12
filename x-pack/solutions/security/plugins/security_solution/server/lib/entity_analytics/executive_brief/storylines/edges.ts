/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { estypes } from '@elastic/elasticsearch';
import type { BriefTimeRange } from '../../../../../common/entity_analytics/executive_brief/types';
import {
  ENTITY_HOST_FIELD,
  ENTITY_USER_FIELD,
  asBucketArray,
  buildAlertScopeFilter,
  buildEntityRuntimeMappings,
  getAlertsIndex,
} from './alert_queries';
import type { AlertEntityRefs } from './alert_queries';
import {
  ENTITY_SOURCE_FIELDS,
  RELATIONSHIP_KINDS,
  getLatestEntityAlias,
  parseEntityDoc,
} from './entity_docs';
import type { EntityDoc, RelationshipKind } from './entity_docs';
import type { ClusterEdge } from './types';

/** ≥ 2 shared alerts, or ≥ 1 shared alert with a high-severity risk score (investigation 10 §10.2). */
export const CO_ALERT_MIN_SHARED_ALERTS = 2;
export const CO_ALERT_HIGH_RISK_SCORE = 73;
/**
 * Investigation 10 §5 suggests dropping "trivial" pairs (a host-scoped local user and the host it
 * lives on). The S3 ground truth (svc-build / build-runner-02) is exactly such a pair, so they are
 * kept; set to true to drop pairs whose user did not resolve to another golden entity.
 */
export const DROP_TRIVIAL_LOCAL_PAIRS = false;

const COMPOSITE_PAGE_SIZE = 1000;
const MAX_COMPOSITE_PAGES = 2;
const RULES_PER_PAIR = 3;
const REVERSE_RELATIONSHIP_LIMIT = 200;
const DEGREE_TARGET_CHUNK = 300;
const INTERACTION_KINDS = [
  'accesses_frequently',
  'accesses_infrequently',
  'communicates_with',
] as const;

const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

export interface RuleInfo {
  uuid: string;
  name: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  tacticIds: string[];
  techniqueIds: string[];
  alertCount: number;
}

export interface CoAlertPair {
  /** Raw (possibly alias) euids. */
  user: string;
  host: string;
  count: number;
  first: string;
  last: string;
  maxRisk: number;
  rules: RuleInfo[];
}

const RULE_FIELDS = [
  'kibana.alert.rule.uuid',
  'kibana.alert.rule.name',
  'kibana.alert.severity',
  'kibana.alert.rule.threat.tactic.id',
  'kibana.alert.rule.threat.technique.id',
];

interface PairBucket {
  key: { u: string; h: string };
  doc_count: number;
  first?: { value_as_string?: string };
  last?: { value_as_string?: string };
  sev?: { value?: number | null };
  rules?: {
    buckets?: Array<{
      key: string;
      doc_count: number;
      details?: { hits?: { hits?: Array<{ fields?: Record<string, unknown> }> } };
    }>;
  };
}

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];

/** Seed-prefiltered composite aggregation of (user, host) co-occurrence in alerts. */
export const fetchCoAlertPairs = async ({
  esClient,
  spaceId,
  timeRange,
  refs,
  signal,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
  timeRange: BriefTimeRange;
  refs: AlertEntityRefs;
  signal?: AbortSignal;
}): Promise<CoAlertPair[]> => {
  if (refs.euids.length === 0) {
    return [];
  }
  const pairs: CoAlertPair[] = [];
  let afterKey: Record<string, string> | undefined;
  for (let page = 0; page < MAX_COMPOSITE_PAGES; page++) {
    const response = await esClient.search<unknown>(
      {
        index: getAlertsIndex(spaceId),
        size: 0,
        allow_partial_search_results: false,
        query: buildAlertScopeFilter(timeRange, refs),
        runtime_mappings: buildEntityRuntimeMappings(),
        aggs: {
          pairs: {
            composite: {
              size: COMPOSITE_PAGE_SIZE,
              sources: [
                { u: { terms: { field: ENTITY_USER_FIELD } } },
                { h: { terms: { field: ENTITY_HOST_FIELD } } },
              ],
              ...(afterKey ? { after: afterKey } : {}),
            },
            aggs: {
              first: { min: { field: '@timestamp' } },
              last: { max: { field: '@timestamp' } },
              sev: { max: { field: 'kibana.alert.risk_score' } },
              rules: {
                terms: { field: 'kibana.alert.rule.uuid', size: RULES_PER_PAIR },
                aggs: {
                  details: {
                    top_hits: { size: 1, _source: false, fields: RULE_FIELDS },
                  },
                },
              },
            },
          },
        },
      },
      { signal }
    );
    const aggregate = (response.aggregations as Record<string, unknown> | undefined)?.pairs as
      | { buckets?: PairBucket[]; after_key?: Record<string, string> }
      | undefined;
    for (const bucket of asBucketArray<PairBucket>(aggregate)) {
      pairs.push({
        user: String(bucket.key.u),
        host: String(bucket.key.h),
        count: bucket.doc_count,
        first: bucket.first?.value_as_string ?? timeRange.from,
        last: bucket.last?.value_as_string ?? timeRange.to,
        maxRisk: bucket.sev?.value ?? 0,
        rules: (bucket.rules?.buckets ?? []).flatMap((rule) => {
          const fields = rule.details?.hits?.hits?.[0]?.fields ?? {};
          const name = strings(fields['kibana.alert.rule.name'])[0];
          if (!name) return [];
          const severity = strings(fields['kibana.alert.severity'])[0];
          return [
            {
              uuid: String(rule.key),
              name,
              severity:
                severity === 'critical' || severity === 'high' || severity === 'low'
                  ? severity
                  : 'medium',
              tacticIds: strings(fields['kibana.alert.rule.threat.tactic.id']).sort(compare),
              techniqueIds: strings(fields['kibana.alert.rule.threat.technique.id']).sort(compare),
              alertCount: rule.doc_count,
            },
          ];
        }),
      });
    }
    afterKey = aggregate?.after_key;
    if (!afterKey || (aggregate?.buckets ?? []).length < COMPOSITE_PAGE_SIZE) {
      break;
    }
  }
  return pairs;
};

/** A local user whose euid is scoped to this very host (`user:<name>@<host.id>@local`). */
export const isTrivialLocalPair = (user: string, host: string): boolean => {
  const match = /^user:.+@([^@]+)@local$/.exec(user);
  return match !== null && host === `host:${match[1]}`;
};

export interface CoAlertEdgeResult {
  edges: ClusterEdge[];
  rules: Map<string, RuleInfo>;
  /** Earliest co-occurrence per edge key `from|to`. */
  firstSeen: Map<string, string>;
}

/**
 * Collapses raw pairs to golden pairs, applies the co-alert threshold on the collapsed totals and
 * returns `co_alert` edges whose evidence is the rules (`rule:<uuid>`). Only pairs that touch a
 * seed entity are kept (the alert prefilter can match through names alone).
 */
export const buildCoAlertEdges = ({
  pairs,
  golden,
  seedGoldens,
  dropTrivial = DROP_TRIVIAL_LOCAL_PAIRS,
}: {
  pairs: CoAlertPair[];
  golden: (euid: string) => string;
  seedGoldens: ReadonlySet<string>;
  dropTrivial?: boolean;
}): CoAlertEdgeResult => {
  interface Acc {
    from: string;
    to: string;
    count: number;
    first: string;
    maxRisk: number;
    rules: Map<string, RuleInfo>;
  }
  const accumulated = new Map<string, Acc>();
  const rules = new Map<string, RuleInfo>();

  const usable = [...pairs]
    .sort((a, b) => compare(`${a.user}|${a.host}`, `${b.user}|${b.host}`))
    .map((pair) => ({ pair, userGolden: golden(pair.user), hostGolden: golden(pair.host) }))
    .filter(
      ({ pair, userGolden, hostGolden }) =>
        userGolden !== hostGolden &&
        (seedGoldens.has(userGolden) || seedGoldens.has(hostGolden)) &&
        !(dropTrivial && userGolden === pair.user && isTrivialLocalPair(pair.user, pair.host))
    );

  for (const { pair, userGolden, hostGolden } of usable) {
    const [from, to] =
      userGolden < hostGolden ? [userGolden, hostGolden] : [hostGolden, userGolden];
    const key = `${from}|${to}`;
    const acc = accumulated.get(key) ?? {
      from,
      to,
      count: 0,
      first: pair.first,
      maxRisk: 0,
      rules: new Map<string, RuleInfo>(),
    };
    acc.count += pair.count;
    acc.first = pair.first < acc.first ? pair.first : acc.first;
    acc.maxRisk = Math.max(acc.maxRisk, pair.maxRisk);
    for (const rule of pair.rules) {
      const existing = acc.rules.get(rule.uuid);
      acc.rules.set(rule.uuid, {
        ...rule,
        alertCount: (existing?.alertCount ?? 0) + rule.alertCount,
      });
    }
    accumulated.set(key, acc);
  }

  const edges: ClusterEdge[] = [];
  const firstSeen = new Map<string, string>();
  const qualifying = [...accumulated]
    .sort(([a], [b]) => compare(a, b))
    .filter(
      ([, acc]) =>
        acc.count >= CO_ALERT_MIN_SHARED_ALERTS || acc.maxRisk >= CO_ALERT_HIGH_RISK_SCORE
    );
  for (const [key, acc] of qualifying) {
    edges.push({
      type: 'co_alert',
      from: acc.from,
      to: acc.to,
      refKeys: [...acc.rules.keys()].sort(compare).map((uuid) => `rule:${uuid}`),
    });
    firstSeen.set(key, acc.first);
    for (const [uuid, info] of acc.rules) {
      const existing = rules.get(uuid);
      rules.set(uuid, {
        ...info,
        alertCount: Math.max(existing?.alertCount ?? 0, info.alertCount),
      });
    }
  }
  return { edges, rules, firstSeen };
};

// ---------------------------------------------------------------------------------------------
// Relationship edges
// ---------------------------------------------------------------------------------------------

const idsField = (kind: RelationshipKind): string => `entity.relationships.${kind}.ids`;

/** Entities that point at any of `targetEuids` (who accesses / owns / administers ... them). */
export const fetchReverseRelationshipDocs = async ({
  esClient,
  spaceId,
  targetEuids,
  signal,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
  targetEuids: string[];
  signal?: AbortSignal;
}): Promise<EntityDoc[]> => {
  const targets = [...new Set(targetEuids)].sort(compare);
  if (targets.length === 0) {
    return [];
  }
  const response = await esClient.search<unknown>(
    {
      index: getLatestEntityAlias(spaceId),
      size: REVERSE_RELATIONSHIP_LIMIT,
      _source: ENTITY_SOURCE_FIELDS,
      sort: [{ 'entity.id': 'asc' }],
      query: {
        bool: {
          should: RELATIONSHIP_KINDS.map((kind) => ({ terms: { [idsField(kind)]: targets } })),
          minimum_should_match: 1,
        },
      },
    },
    { signal }
  );
  return response.hits.hits.flatMap((hit) => {
    const doc = parseEntityDoc(hit._source);
    return doc ? [doc] : [];
  });
};

/** Edges from reverse-lookup actors to the (golden) seed targets they point at. */
export const buildReverseRelationshipEdges = ({
  docs,
  targetGoldenOf,
  golden,
}: {
  docs: EntityDoc[];
  /** raw target euid -> golden seed euid, for the targets that were looked up. */
  targetGoldenOf: ReadonlyMap<string, string>;
  golden: (euid: string) => string;
}): ClusterEdge[] =>
  docs.flatMap((doc) =>
    RELATIONSHIP_KINDS.flatMap((kind) =>
      (doc.relationships[kind] ?? []).flatMap((target) => {
        const targetGolden = targetGoldenOf.get(target);
        if (!targetGolden || golden(doc.euid) === targetGolden) return [];
        return [
          { type: kind, from: golden(doc.euid), to: targetGolden, refKeys: [] } as ClusterEdge,
        ];
      })
    )
  );

// ---------------------------------------------------------------------------------------------
// Hub degree
// ---------------------------------------------------------------------------------------------

type InteractionAggregations = Record<
  string,
  { buckets?: Array<{ key: string; doc_count: number }> }
>;

/**
 * In-degree per target: how many distinct entities interact with it, as the max over the
 * interaction kinds. Same query as lead-gen `countInteractingEntities`, but errors propagate so a
 * failure becomes a source status instead of silently reading as "no hubs".
 */
export const fetchInteractionDegrees = async ({
  esClient,
  spaceId,
  euids,
  signal,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
  euids: string[];
  signal?: AbortSignal;
}): Promise<Map<string, number>> => {
  const counts = new Map<string, number>();
  const targets = [...new Set(euids)].sort(compare);
  for (let offset = 0; offset < targets.length; offset += DEGREE_TARGET_CHUNK) {
    const chunk = targets.slice(offset, offset + DEGREE_TARGET_CHUNK);
    const aggs: Record<string, estypes.AggregationsAggregationContainer> = Object.fromEntries(
      INTERACTION_KINDS.map((kind) => [
        kind,
        { terms: { field: idsField(kind), include: chunk, size: chunk.length } },
      ])
    );
    const response = await esClient.search<unknown>(
      {
        index: getLatestEntityAlias(spaceId),
        size: 0,
        query: {
          bool: {
            should: INTERACTION_KINDS.map((kind) => ({ terms: { [idsField(kind)]: chunk } })),
            minimum_should_match: 1,
          },
        },
        aggs,
      },
      { signal }
    );
    const aggregations = (response.aggregations ?? {}) as InteractionAggregations;
    for (const kind of INTERACTION_KINDS) {
      for (const bucket of aggregations[kind]?.buckets ?? []) {
        const key = String(bucket.key);
        counts.set(key, Math.max(counts.get(key) ?? 0, bucket.doc_count));
      }
    }
  }
  return counts;
};
