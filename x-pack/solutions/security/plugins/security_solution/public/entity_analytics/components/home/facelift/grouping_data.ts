/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Client-side stand-ins for Entity Store grouping aggregations and target
 * metadata, driven by the Facelift Entity Store hit corpus in `./data.ts`.
 */

import type { GenericBuckets } from '@kbn/grouping/src';
import type {
  EntitiesGroupingAggregation,
  EntitiesGroupingQuery,
  EntitiesRootGroupingAggregation,
  TargetEntityMetadata,
  TargetMetadataMap,
} from '../entities_table/grouping/use_fetch_grouped_data';
import type { EntityType } from '../../../../../common/entity_analytics/types';
import { type FaceliftEntityEsHit, getEntityStoreEsHits, IDENTITY_BY_ID } from './data';

// ---------------------------------------------------------------------------
// Field accessors
// ---------------------------------------------------------------------------

const getSourceField = (hit: FaceliftEntityEsHit, field: string): unknown => {
  const source = hit._source as Record<string, unknown>;
  const parts = field.split('.');
  let current: unknown = source;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
};

const getResolvedTo = (hit: FaceliftEntityEsHit): string | undefined =>
  hit._source.entity.relationships?.resolution?.resolved_to;

const getResolutionGroupKey = (hit: FaceliftEntityEsHit): string =>
  getResolvedTo(hit) ?? hit._source.entity.id;

const getBucketRiskScore = (hit: FaceliftEntityEsHit): number | null => {
  // Mirrors the resolution grouping runtime mapping: aliases do not contribute.
  if (getResolvedTo(hit)) return null;
  return (
    hit._source.entity.relationships?.resolution?.risk?.calculated_score_norm ??
    hit._source.entity.risk.calculated_score_norm
  );
};

const getResolutionRiskScore = (hit: FaceliftEntityEsHit): number | null =>
  hit._source.entity.relationships?.resolution?.risk?.calculated_score_norm ?? null;

// ---------------------------------------------------------------------------
// Lightweight ES query matcher (enough for group expand + type filter)
// ---------------------------------------------------------------------------

type EsClause = Record<string, unknown>;

/** ES allows a single clause object or an array — normalize to an array. */
const asClauseArray = (value: unknown): unknown[] => {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
};

/** Keyword fields can hold one value or many (e.g. `entity.source`). */
const getFieldValues = (hit: FaceliftEntityEsHit, field: string): unknown[] => {
  const value = getSourceField(hit, field);
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
};

const clauseMatches = (hit: FaceliftEntityEsHit, clause: unknown): boolean => {
  if (!clause || typeof clause !== 'object') return true;
  const c = clause as EsClause;

  // Painless scripts from @kbn/grouping (field-size checks) are not evaluated
  // client-side; they must not exclude docs from nested grouping.
  if (c.script) return true;

  if (c.bool) {
    const bool = c.bool as {
      filter?: unknown;
      must?: unknown;
      should?: unknown;
      must_not?: unknown;
      minimum_should_match?: number | string;
    };
    const filters = [...asClauseArray(bool.filter), ...asClauseArray(bool.must)];
    if (!filters.every((f) => clauseMatches(hit, f))) return false;
    if (asClauseArray(bool.must_not).some((f) => clauseMatches(hit, f))) return false;

    const should = asClauseArray(bool.should);
    if (should.length > 0) {
      // ES defaults minimum_should_match to 1 when a bool has only should clauses.
      const hasFilterOrMust = filters.length > 0;
      const rawMin = bool.minimum_should_match;
      const min = rawMin != null ? Number(rawMin) : hasFilterOrMust ? 0 : 1;
      const matched = should.filter((f) => clauseMatches(hit, f)).length;
      if (matched < min) return false;
    }
    return true;
  }

  if (c.term) {
    const [field, raw] = Object.entries(c.term as Record<string, unknown>)[0] ?? [];
    if (!field) return true;
    const expected =
      raw && typeof raw === 'object' && 'value' in (raw as object)
        ? (raw as { value: unknown }).value
        : raw;
    return getFieldValues(hit, field).includes(expected);
  }

  if (c.terms) {
    const [field, values] = Object.entries(c.terms as Record<string, unknown>)[0] ?? [];
    if (!field || !Array.isArray(values)) return true;
    return getFieldValues(hit, field).some((value) => values.includes(value));
  }

  if (c.range) {
    const [field, conditions] = Object.entries(c.range as Record<string, unknown>)[0] ?? [];
    if (!field || !conditions || typeof conditions !== 'object') return true;
    const { gt, gte, lt, lte } = conditions as {
      gt?: number;
      gte?: number;
      lt?: number;
      lte?: number;
    };
    return getFieldValues(hit, field).some((raw) => {
      const value = Number(raw);
      if (Number.isNaN(value)) return false;
      if (gt != null && !(value > gt)) return false;
      if (gte != null && !(value >= gte)) return false;
      if (lt != null && !(value < lt)) return false;
      if (lte != null && !(value <= lte)) return false;
      return true;
    });
  }

  if (c.match_phrase) {
    const [field, raw] = Object.entries(c.match_phrase as Record<string, unknown>)[0] ?? [];
    if (!field) return true;
    const expected =
      typeof raw === 'string'
        ? raw
        : raw && typeof raw === 'object' && 'query' in (raw as object)
        ? (raw as { query: string }).query
        : raw;
    return getFieldValues(hit, field).includes(expected);
  }

  if (c.match) {
    const [field, raw] = Object.entries(c.match as Record<string, unknown>)[0] ?? [];
    if (!field) return true;
    const expected =
      typeof raw === 'string'
        ? raw
        : raw && typeof raw === 'object' && 'query' in (raw as object)
        ? (raw as { query: string }).query
        : raw;
    return getFieldValues(hit, field).includes(expected);
  }

  if (c.exists) {
    const field = (c.exists as { field?: string }).field;
    if (!field) return true;
    return getSourceField(hit, field) != null;
  }

  // Unknown clause shapes are treated as non-restrictive for the prototype.
  return true;
};

/** Apply an ES bool query (as produced by the Entities table) to facelift hits. */
export const filterHitsByEsQuery = (
  hits: FaceliftEntityEsHit[],
  query: unknown
): FaceliftEntityEsHit[] => {
  if (!query) return hits;
  return hits.filter((hit) => clauseMatches(hit, query));
};

export const getSortedEntityStoreHits = (
  query: unknown,
  sort: string[][] = []
): FaceliftEntityEsHit[] => {
  const hits = filterHitsByEsQuery(getEntityStoreEsHits(), query);
  if (!sort.length) return hits;

  const [[field, direction] = []] = sort;
  if (!field) return hits;
  const dir = direction === 'asc' ? 1 : -1;

  return [...hits].sort((a, b) => {
    const av = getSourceField(a, field);
    const bv = getSourceField(b, field);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
    return String(av).localeCompare(String(bv)) * dir;
  });
};

// ---------------------------------------------------------------------------
// Grouping aggregations
// ---------------------------------------------------------------------------

const extractPagination = (query: EntitiesGroupingQuery): { from: number; size: number } => {
  const truncate = (
    query as {
      aggs?: {
        groupByFields?: {
          aggs?: { bucket_truncate?: { bucket_sort?: { from?: number; size?: number } } };
        };
      };
    }
  ).aggs?.groupByFields?.aggs?.bucket_truncate?.bucket_sort;
  return {
    from: truncate?.from ?? 0,
    size: truncate?.size ?? 10,
  };
};

const isResolutionGroupingQuery = (query: EntitiesGroupingQuery): boolean =>
  Boolean(
    (query as { aggs?: { groupByFields?: { aggs?: { resolutionRiskScore?: unknown } } } }).aggs
      ?.groupByFields?.aggs?.resolutionRiskScore
  );

const extractQueryFilters = (query: EntitiesGroupingQuery): unknown =>
  (query as { query?: unknown }).query;

interface ResolutionBucketAcc {
  key: string;
  docCount: number;
  bucketRiskScore: number | null;
  resolutionRiskScore: number | null;
}

const buildResolutionBuckets = (hits: FaceliftEntityEsHit[]): GenericBuckets[] => {
  const byKey = new Map<string, ResolutionBucketAcc>();

  for (const hit of hits) {
    const key = getResolutionGroupKey(hit);
    const existing = byKey.get(key) ?? {
      key,
      docCount: 0,
      bucketRiskScore: null,
      resolutionRiskScore: null,
    };
    existing.docCount += 1;

    const bucketRisk = getBucketRiskScore(hit);
    if (bucketRisk != null) {
      existing.bucketRiskScore =
        existing.bucketRiskScore == null
          ? bucketRisk
          : Math.max(existing.bucketRiskScore, bucketRisk);
    }

    const resolutionRisk = getResolutionRiskScore(hit);
    if (resolutionRisk != null) {
      existing.resolutionRiskScore =
        existing.resolutionRiskScore == null
          ? resolutionRisk
          : Math.max(existing.resolutionRiskScore, resolutionRisk);
    }

    byKey.set(key, existing);
  }

  return Array.from(byKey.values())
    .sort((a, b) => {
      const riskDelta = (b.bucketRiskScore ?? -1) - (a.bucketRiskScore ?? -1);
      if (riskDelta !== 0) return riskDelta;
      return b.docCount - a.docCount;
    })
    .map((bucket): GenericBuckets & EntitiesGroupingAggregation => ({
      key: bucket.key,
      key_as_string: bucket.key,
      doc_count: bucket.docCount,
      bucketRiskScore: { value: bucket.bucketRiskScore },
      resolutionRiskScore: { value: bucket.resolutionRiskScore },
    }));
};

const buildEntityTypeBuckets = (hits: FaceliftEntityEsHit[]): GenericBuckets[] => {
  const byType = new Map<string, number>();
  for (const hit of hits) {
    const type = hit._source.entity.EngineMetadata.Type;
    byType.set(type, (byType.get(type) ?? 0) + 1);
  }

  return Array.from(byType.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([type, docCount]) => {
      // Mirror the ES runtime field: `groupValues.join(uniqueValue)`. For a single
      // value that is just the type itself — do NOT append uniqueValue as a suffix.
      // A trailing uniqueValue makes parseGroupingQuery split into ['user', ''],
      // which renders "User," and adds an empty match_phrase that empties nested groups.
      const bucket: GenericBuckets & EntitiesGroupingAggregation = {
        key: type,
        doc_count: docCount,
        entityType: {
          buckets: [{ key: type, doc_count: docCount }],
        },
      };
      // The grouping table reads this cardinality agg to decide single vs multi value.
      return { ...bucket, groupByField: { value: 1 } };
    });
};

/**
 * Builds the aggregations object that `useFetchGroupedData` would normally
 * receive from Elasticsearch, for Resolution or Entity type grouping.
 */
export const getFaceliftGroupingAggregations = (
  query: EntitiesGroupingQuery
): EntitiesRootGroupingAggregation => {
  const hits = filterHitsByEsQuery(getEntityStoreEsHits(), extractQueryFilters(query));
  const { from, size } = extractPagination(query);

  const allBuckets = isResolutionGroupingQuery(query)
    ? buildResolutionBuckets(hits)
    : buildEntityTypeBuckets(hits);

  const page = allBuckets.slice(from, from + size);

  return {
    groupByFields: { buckets: page },
    groupsCount: { value: allBuckets.length },
    unitsCount: { value: hits.length },
  };
};

/**
 * Target metadata for resolution group headers (name, type, risk).
 */
export const getFaceliftTargetMetadata = (entityIds: string[]): TargetMetadataMap => {
  const result: TargetMetadataMap = new Map();
  const hits = buildTargetsOnly();

  for (const id of entityIds) {
    const fromHit = hits.get(id);
    if (fromHit) {
      result.set(id, fromHit);
      continue;
    }
    // Unresolved solos: group key is the solo entity id — synthesize metadata from store hits.
    const solo = getEntityStoreEsHits(null).find(
      (hit) => hit._source.entity.id === id && !getResolvedTo(hit)
    );
    if (solo) {
      result.set(id, {
        name: solo._source.entity.name,
        type: solo._source.entity.EngineMetadata.Type as EntityType,
        riskScore:
          solo._source.entity.relationships?.resolution?.risk?.calculated_score_norm ?? null,
        individualRiskScore: solo._source.entity.risk.calculated_score_norm,
      });
    }
  }

  return result;
};

const buildTargetsOnly = (): Map<string, TargetEntityMetadata> => {
  const map = new Map<string, TargetEntityMetadata>();
  for (const identity of Object.values(IDENTITY_BY_ID)) {
    map.set(identity.id, {
      name: identity.name,
      type: identity.entityType,
      riskScore: identity.riskScore,
      individualRiskScore: identity.riskScore,
    });
  }
  return map;
};
