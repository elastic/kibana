/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { euid } from '@kbn/entity-store/common/euid_helpers';
import {
  ALWAYS_AVAILABLE,
  defineSignal,
  errorMessage,
  severityFromRiskScore,
} from './define_signal';
import {
  identityResolution,
  nameFromEuid,
  resolveEntities,
  typeFromEuid,
} from './resolve_entities';
import type { EntityResolution } from './resolve_entities';
import { getAlertsIndex } from './shared/indices';
import type { EntityRef, FactDraft, LinkDraft, SignalContext } from './types';

/** Entities that get an `alert_activity` summary fact and are nominated as candidates. */
export const MAX_ALERTED_ENTITIES = 15;
/** `co_alert` pairs kept, strongest first. */
export const MAX_CO_ALERT_PAIRS = 15;
/** A pair needs at least this many shared alerts, or one alert at a high risk score. */
export const CO_ALERT_MIN_SHARED_ALERTS = 2;
export const CO_ALERT_HIGH_RISK_SCORE = 73;

const ENTITY_TERMS_SIZE = 50;
const COMPOSITE_PAGE_SIZE = 1000;
const MAX_COMPOSITE_PAGES = 2;
const RULES_PER_BUCKET = 3;
const TACTICS_PER_BUCKET = 5;
const DETAIL_LIST_SIZE = 3;

const USER_FIELD = 'entity_user';
const HOST_FIELD = 'entity_host';
const NAME_FIELDS = ['user.name', 'host.name'];

const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

interface KeyCount {
  key: string;
  doc_count: number;
}

interface EntityBucket {
  key: string;
  doc_count: number;
  risk?: { value?: number | null };
  open?: { doc_count?: number };
  first?: { value_as_string?: string };
  last?: { value_as_string?: string };
  rule_count?: { value?: number };
  tactics?: { buckets?: KeyCount[] };
  rules?: { buckets?: KeyCount[] };
  latest?: { hits?: { hits?: Array<{ fields?: Record<string, unknown> }> } };
}

interface PairBucket {
  key: { u: string; h: string };
  doc_count: number;
  first?: { value_as_string?: string };
  risk?: { value?: number | null };
  tactics?: { buckets?: KeyCount[] };
  rules?: {
    buckets?: Array<KeyCount & { name?: { buckets?: KeyCount[] } }>;
  };
}

/** Raw per-entity alert summary (an entity may be an alias). */
export interface EntityAlertSummary {
  euid: string;
  name?: string;
  count: number;
  open: number;
  maxRisk?: number;
  first?: string;
  last?: string;
  ruleCount: number;
  tactics: Map<string, number>;
  rules: Map<string, number>;
}

/** Raw (user, host) co-occurrence in alerts. */
export interface CoAlertPair {
  user: string;
  host: string;
  count: number;
  first?: string;
  maxRisk: number;
  tactics: Map<string, number>;
  /** rule uuid -> { name, count } */
  rules: Map<string, { name: string; count: number }>;
}

const toCounts = (buckets: KeyCount[] | undefined): Map<string, number> =>
  new Map((buckets ?? []).map((bucket) => [String(bucket.key), bucket.doc_count]));

const addCounts = (target: Map<string, number>, source: Map<string, number>): void =>
  source.forEach((count, key) => target.set(key, (target.get(key) ?? 0) + count));

const topKeys = (counts: Map<string, number>, size = DETAIL_LIST_SIZE): string[] =>
  [...counts.entries()]
    .sort(([a, countA], [b, countB]) => countB - countA || compare(a, b))
    .slice(0, size)
    .map(([key]) => key);

const minIso = (a: string | undefined, b: string | undefined): string | undefined =>
  a === undefined ? b : b === undefined ? a : a < b ? a : b;

const maxIso = (a: string | undefined, b: string | undefined): string | undefined =>
  a === undefined ? b : b === undefined ? a : a > b ? a : b;

const maxNumber = (a: number | undefined, b: number | undefined): number | undefined =>
  a === undefined ? b : b === undefined ? a : Math.max(a, b);

const buildRuntimeMappings = (): Record<string, estypes.MappingRuntimeField> => ({
  [USER_FIELD]: euid.painless.getEuidRuntimeMapping('user'),
  [HOST_FIELD]: euid.painless.getEuidRuntimeMapping('host'),
});

const buildScopeQuery = (ctx: SignalContext): estypes.QueryDslQueryContainer => ({
  bool: {
    filter: [{ range: { '@timestamp': { gte: ctx.timeRange.from, lte: ctx.timeRange.to } } }],
    must_not: [{ exists: { field: 'kibana.alert.building_block_type' } }],
  },
});

const entityTermsAgg = (field: string): estypes.AggregationsAggregationContainer => ({
  terms: {
    field,
    size: ENTITY_TERMS_SIZE,
    order: [{ _count: 'desc' }, { _key: 'asc' }],
  },
  aggs: {
    risk: { max: { field: 'kibana.alert.risk_score' } },
    open: { filter: { term: { 'kibana.alert.workflow_status': 'open' } } },
    first: { min: { field: '@timestamp' } },
    last: { max: { field: '@timestamp' } },
    rule_count: { cardinality: { field: 'kibana.alert.rule.uuid' } },
    tactics: { terms: { field: 'kibana.alert.rule.threat.tactic.name', size: TACTICS_PER_BUCKET } },
    rules: { terms: { field: 'kibana.alert.rule.name', size: RULES_PER_BUCKET } },
    latest: {
      top_hits: {
        size: 1,
        _source: false,
        fields: NAME_FIELDS,
        sort: [{ '@timestamp': { order: 'desc' } }],
      },
    },
  },
});

const parseEntityBucket = (bucket: EntityBucket, nameField: string): EntityAlertSummary => {
  const latestName = bucket.latest?.hits?.hits?.[0]?.fields?.[nameField];
  const name = Array.isArray(latestName) ? latestName[0] : undefined;
  return {
    euid: String(bucket.key),
    ...(typeof name === 'string' && name.length > 0 ? { name } : {}),
    count: bucket.doc_count,
    open: bucket.open?.doc_count ?? 0,
    ...(typeof bucket.risk?.value === 'number' ? { maxRisk: bucket.risk.value } : {}),
    ...(bucket.first?.value_as_string ? { first: bucket.first.value_as_string } : {}),
    ...(bucket.last?.value_as_string ? { last: bucket.last.value_as_string } : {}),
    ruleCount: bucket.rule_count?.value ?? 0,
    tactics: toCounts(bucket.tactics?.buckets),
    rules: toCounts(bucket.rules?.buckets),
  };
};

/** Per-entity alert summaries (users and hosts, by Entity Store EUID) in the window. */
export const fetchEntityAlertSummaries = async (
  ctx: SignalContext,
  abortSignal: AbortSignal
): Promise<EntityAlertSummary[]> => {
  const response = await ctx.esClient.search<unknown>(
    {
      index: getAlertsIndex(ctx.spaceId),
      size: 0,
      allow_partial_search_results: false,
      query: buildScopeQuery(ctx),
      runtime_mappings: buildRuntimeMappings(),
      aggs: { users: entityTermsAgg(USER_FIELD), hosts: entityTermsAgg(HOST_FIELD) },
    },
    { signal: abortSignal }
  );
  const aggregations = (response.aggregations ?? {}) as Record<
    string,
    { buckets?: EntityBucket[] } | undefined
  >;
  return [
    ...(aggregations.users?.buckets ?? []).map((bucket) => parseEntityBucket(bucket, 'user.name')),
    ...(aggregations.hosts?.buckets ?? []).map((bucket) => parseEntityBucket(bucket, 'host.name')),
  ];
};

/** (user, host) pairs that appear together in the same alerts, with their rules. */
export const fetchCoAlertPairs = async (
  ctx: SignalContext,
  abortSignal: AbortSignal
): Promise<CoAlertPair[]> => {
  const pairs: CoAlertPair[] = [];
  let afterKey: Record<string, string> | undefined;
  for (let page = 0; page < MAX_COMPOSITE_PAGES; page++) {
    const response = await ctx.esClient.search<unknown>(
      {
        index: getAlertsIndex(ctx.spaceId),
        size: 0,
        allow_partial_search_results: false,
        query: buildScopeQuery(ctx),
        runtime_mappings: buildRuntimeMappings(),
        aggs: {
          pairs: {
            composite: {
              size: COMPOSITE_PAGE_SIZE,
              sources: [
                { u: { terms: { field: USER_FIELD } } },
                { h: { terms: { field: HOST_FIELD } } },
              ],
              ...(afterKey ? { after: afterKey } : {}),
            },
            aggs: {
              first: { min: { field: '@timestamp' } },
              risk: { max: { field: 'kibana.alert.risk_score' } },
              tactics: {
                terms: { field: 'kibana.alert.rule.threat.tactic.name', size: TACTICS_PER_BUCKET },
              },
              rules: {
                terms: { field: 'kibana.alert.rule.uuid', size: RULES_PER_BUCKET },
                aggs: { name: { terms: { field: 'kibana.alert.rule.name', size: 1 } } },
              },
            },
          },
        },
      },
      { signal: abortSignal }
    );
    const aggregate = (response.aggregations as Record<string, unknown> | undefined)?.pairs as
      | { buckets?: PairBucket[]; after_key?: Record<string, string> }
      | undefined;
    const buckets = aggregate?.buckets ?? [];
    for (const bucket of buckets) {
      pairs.push({
        user: String(bucket.key.u),
        host: String(bucket.key.h),
        count: bucket.doc_count,
        ...(bucket.first?.value_as_string ? { first: bucket.first.value_as_string } : {}),
        maxRisk: bucket.risk?.value ?? 0,
        tactics: toCounts(bucket.tactics?.buckets),
        rules: new Map(
          (bucket.rules?.buckets ?? []).map((rule) => [
            String(rule.key),
            { name: String(rule.name?.buckets?.[0]?.key ?? rule.key), count: rule.doc_count },
          ])
        ),
      });
    }
    afterKey = aggregate?.after_key;
    if (!afterKey || buckets.length < COMPOSITE_PAGE_SIZE) {
      break;
    }
  }
  return pairs;
};

/** One golden entity's merged summary. */
interface GoldenSummary extends Omit<EntityAlertSummary, 'name'> {
  ref: EntityRef;
}

/** Folds alias summaries onto their golden entities and keeps the most alerted. */
export const mergeSummaries = (
  summaries: EntityAlertSummary[],
  resolution: EntityResolution
): GoldenSummary[] => {
  const byGolden = new Map<string, GoldenSummary>();
  for (const summary of [...summaries].sort((a, b) => compare(a.euid, b.euid))) {
    const golden = resolution.golden(summary.euid);
    const resolved = resolution.get(golden);
    const existing = byGolden.get(golden);
    if (!existing) {
      byGolden.set(golden, {
        ref: {
          euid: golden,
          type: resolved?.type ?? typeFromEuid(golden),
          name:
            resolved?.name ??
            (golden === summary.euid && summary.name ? summary.name : nameFromEuid(golden)),
        },
        euid: golden,
        count: summary.count,
        open: summary.open,
        maxRisk: summary.maxRisk,
        first: summary.first,
        last: summary.last,
        ruleCount: summary.ruleCount,
        tactics: new Map(summary.tactics),
        rules: new Map(summary.rules),
      });
    } else {
      existing.count += summary.count;
      existing.open += summary.open;
      existing.maxRisk = maxNumber(existing.maxRisk, summary.maxRisk);
      existing.first = minIso(existing.first, summary.first);
      existing.last = maxIso(existing.last, summary.last);
      // Distinct rules can't be summed exactly across aliases; the max is a safe lower bound.
      existing.ruleCount = Math.max(existing.ruleCount, summary.ruleCount);
      addCounts(existing.tactics, summary.tactics);
      addCounts(existing.rules, summary.rules);
    }
  }
  return [...byGolden.values()]
    .sort(
      (a, b) =>
        b.count - a.count || (b.maxRisk ?? -1) - (a.maxRisk ?? -1) || compare(a.euid, b.euid)
    )
    .slice(0, MAX_ALERTED_ENTITIES);
};

interface GoldenPair {
  user: EntityRef;
  host: EntityRef;
  count: number;
  first?: string;
  maxRisk: number;
  tactics: Map<string, number>;
  rules: Map<string, { name: string; count: number }>;
}

/**
 * Collapses raw pairs onto golden pairs, drops pairs that collapse onto one entity or touch none
 * of the top alerted entities, and keeps the pairs that meet the co-alert threshold.
 */
export const mergePairs = (
  pairs: CoAlertPair[],
  resolution: EntityResolution,
  refOf: (golden: string) => EntityRef,
  focus: ReadonlySet<string>
): GoldenPair[] => {
  const byKey = new Map<string, GoldenPair>();
  const usable = [...pairs]
    .sort((a, b) => compare(`${a.user}|${a.host}`, `${b.user}|${b.host}`))
    .map((pair) => ({
      pair,
      user: resolution.golden(pair.user),
      host: resolution.golden(pair.host),
    }))
    .filter(({ user, host }) => user !== host && (focus.has(user) || focus.has(host)));
  for (const { pair, user, host } of usable) {
    const key = `${user}|${host}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, {
        user: refOf(user),
        host: refOf(host),
        count: pair.count,
        first: pair.first,
        maxRisk: pair.maxRisk,
        tactics: new Map(pair.tactics),
        rules: new Map([...pair.rules].map(([uuid, rule]) => [uuid, { ...rule }])),
      });
    } else {
      existing.count += pair.count;
      existing.first = minIso(existing.first, pair.first);
      existing.maxRisk = Math.max(existing.maxRisk, pair.maxRisk);
      addCounts(existing.tactics, pair.tactics);
      pair.rules.forEach((rule, uuid) => {
        const current = existing.rules.get(uuid);
        existing.rules.set(uuid, { name: rule.name, count: (current?.count ?? 0) + rule.count });
      });
    }
  }
  return [...byKey.entries()]
    .filter(
      ([, pair]) =>
        pair.count >= CO_ALERT_MIN_SHARED_ALERTS || pair.maxRisk >= CO_ALERT_HIGH_RISK_SCORE
    )
    .sort(
      ([keyA, a], [keyB, b]) => b.count - a.count || b.maxRisk - a.maxRisk || compare(keyA, keyB)
    )
    .slice(0, MAX_CO_ALERT_PAIRS)
    .map(([, pair]) => pair);
};

const alertsLabel = (count: number): string => (count === 1 ? '1 alert' : `${count} alerts`);

const summaryFact = (summary: GoldenSummary): FactDraft => {
  const severity = severityFromRiskScore(summary.maxRisk);
  const tactics = topKeys(summary.tactics);
  const rules = topKeys(summary.rules);
  return {
    kind: 'alert_activity',
    title: `${summary.ref.name}: ${alertsLabel(summary.count)}`,
    ...(summary.first ? { at: summary.first } : {}),
    ...(severity ? { severity } : {}),
    entities: [summary.ref],
    numbers: { alerts: summary.count, openAlerts: summary.open, rules: summary.ruleCount },
    details: {
      ...(tactics.length > 0 ? { tactics: tactics.join(', ') } : {}),
      ...(rules.length > 0 ? { topRules: rules.join(', ') } : {}),
      ...(summary.last ? { lastAlert: summary.last } : {}),
    },
  };
};

const pairFact = (pair: GoldenPair): FactDraft => {
  const severity = severityFromRiskScore(pair.maxRisk);
  const tactics = topKeys(pair.tactics);
  const rules = [...pair.rules.entries()].sort(
    ([uuidA, a], [uuidB, b]) => b.count - a.count || compare(uuidA, uuidB)
  );
  const [topRule] = rules;
  return {
    kind: 'alert_activity',
    title: `${pair.user.name} and ${pair.host.name}: ${alertsLabel(pair.count)} together`,
    ...(pair.first ? { at: pair.first } : {}),
    ...(severity ? { severity } : {}),
    entities: [pair.user, pair.host],
    numbers: { alerts: pair.count },
    details: {
      ...(rules.length > 0 ? { rules: rules.map(([, rule]) => rule.name).join(', ') } : {}),
      ...(tactics.length > 0 ? { tactics: tactics.join(', ') } : {}),
    },
    ...(topRule
      ? { source: { type: 'rule' as const, id: topRule[0], name: topRule[1].name } }
      : {}),
  };
};

/**
 * Detection alerts in the window by entity (Entity Store EUIDs derived from each alert), folded
 * onto golden entities: a summary fact per top alerted entity, and `co_alert` links between users
 * and hosts that appear together in alerts, each backed by a fact naming the shared rules.
 */
export const alertActivitySignal = defineSignal({
  id: 'alert_activity',
  title: 'Alert activity',
  capability: 'detections',
  scope: 'tenant',
  isAvailable: async () => ALWAYS_AVAILABLE,
  run: async (ctx, _input, abortSignal) => {
    const [summaries, pairs] = await Promise.all([
      fetchEntityAlertSummaries(ctx, abortSignal),
      fetchCoAlertPairs(ctx, abortSignal),
    ]);
    if (summaries.length === 0) {
      return { facts: [] };
    }

    const nameOf = new Map(summaries.map((summary) => [summary.euid, summary.name]));
    const refs: EntityRef[] = [
      ...new Set([...summaries.map((s) => s.euid), ...pairs.flatMap((p) => [p.user, p.host])]),
    ].map((id) => ({ euid: id, type: typeFromEuid(id), name: nameOf.get(id) ?? nameFromEuid(id) }));
    const resolution = await resolveEntities({
      esClient: ctx.esClient,
      spaceId: ctx.spaceId,
      refs,
      abortSignal,
    }).catch((error: unknown) => {
      ctx.logger.debug(`[executive brief] alert entity resolution failed: ${errorMessage(error)}`);
      return identityResolution(refs);
    });

    const top = mergeSummaries(summaries, resolution);
    const refOf = (golden: string): EntityRef => {
      const resolved = resolution.get(golden);
      return resolved
        ? { euid: golden, type: resolved.type, name: resolved.name }
        : { euid: golden, type: typeFromEuid(golden), name: nameFromEuid(golden) };
    };
    const goldenPairs = mergePairs(pairs, resolution, refOf, new Set(top.map((s) => s.euid)));

    const facts: FactDraft[] = top.map(summaryFact);
    const summaryIndex = new Map(top.map((summary, index) => [summary.euid, index]));
    const links: LinkDraft[] = goldenPairs.map((pair) => {
      facts.push(pairFact(pair));
      const backing = [
        facts.length - 1,
        summaryIndex.get(pair.user.euid),
        summaryIndex.get(pair.host.euid),
      ].filter((index): index is number => index !== undefined);
      return {
        type: 'co_alert',
        from: pair.user,
        to: pair.host,
        factIndexes: backing,
        ...(pair.first ? { firstSeen: pair.first } : {}),
      };
    });

    return { facts, links, candidates: top.map(({ ref }) => ref) };
  },
});
