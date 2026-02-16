/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  addEntitiesWithLimit,
  buildIgnoreMap,
  extractEntityValues,
  fieldToEntityLabel,
} from './entity_utils';
import { buildEntityShouldClauses } from './query_utils';
import type { AlertMeta, RelatedAlertsGraphOutput } from './types';
import type { DetectionAlert800 } from '../../../../common/api/detection_engine/model/alerts';

interface EsHit {
  _id?: string;
  _index: string;
  _source?: DetectionAlert800;
  sort?: unknown;
}

interface EsSearchResponse {
  hits: { hits: EsHit[] };
}

interface EsSearchClient {
  search: (request: Record<string, unknown>) => Promise<EsSearchResponse>;
}

type EdgeAccumulator = Map<
  string,
  {
    from: string;
    to: string;
    labelScores: Map<string, number>;
    score: number;
  }
>;

const toIso = (ms: number) => new Date(ms).toISOString();

const toFiniteIntOr = (value: unknown, fallback: number) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.trunc(value) : fallback;
  }

  const coerced = Number(value);
  return Number.isFinite(coerced) ? Math.trunc(coerced) : fallback;
};

const clampPositiveInt = (value: number, fallback: number) => {
  if (!Number.isFinite(value)) return fallback;
  const v = Math.trunc(value);
  return v >= 1 ? v : fallback;
};

const computePageSize = (requestedRaw: unknown, remainingRaw: unknown, fallback: number) => {
  const requested = clampPositiveInt(toFiniteIntOr(requestedRaw, fallback), fallback);
  const remaining = toFiniteIntOr(remainingRaw, requested);

  if (!Number.isFinite(remaining)) return requested;
  if (remaining <= 0) return 1;

  return Math.max(1, Math.min(requested, remaining));
};

const computeParentLinks = (params: {
  entityToAlertIds: Map<string, Set<string>>;
  parentCandidates: Set<string>;
  childEntities: Map<string, Set<string>>;
  aliasesByField: Map<string, Array<{ field: string; score?: number }>>;
  scoring: {
    /**
     * Minimum score required to link an alert to at least one eligible parent.
     * Score is computed as the sum of per-label scores (`fieldToEntityLabel(field)`).
     */
    minEntityScore: number;
    /**
     * Per-field score overrides. Any field not present falls back to `defaultScorePerField`.
     */
    entityFieldScores: Map<string, number>;
    defaultScorePerField: number;
  };
}) => {
  const { entityToAlertIds, parentCandidates, childEntities, aliasesByField, scoring } = params;

  const parents = new Map<
    string,
    {
      labels: Set<string>;
      /**
       * Per-label scores (label = top-level field segment). If multiple fields under the same
       * label match (e.g. `user.name` and `user.id`), we take the max score for that label.
       */
      labelScores: Map<string, number>;
      score: number;
    }
  >();

  for (const [field, values] of childEntities.entries()) {
    const label = fieldToEntityLabel(field);
    const fieldScore = scoring.entityFieldScores.get(field) ?? scoring.defaultScorePerField;
    const aliases = aliasesByField.get(field) ?? [];

    const matchFields: Array<{ field: string; score: number }> = [{ field, score: fieldScore }];
    for (const alias of aliases) {
      if (alias?.field && alias.field !== field) {
        const aliasScore =
          (typeof alias.score === 'number' && Number.isFinite(alias.score)
            ? alias.score
            : undefined) ??
          scoring.entityFieldScores.get(alias.field) ??
          scoring.defaultScorePerField;
        matchFields.push({ field: alias.field, score: aliasScore });
      }
    }

    for (const v of values) {
      for (const matchField of matchFields) {
        const key = `${matchField.field}\u0000${v}`;
        const neighbors = entityToAlertIds.get(key);
        if (neighbors) {
          for (const neighborId of neighbors) {
            if (parentCandidates.has(neighborId)) {
              const entry =
                parents.get(neighborId) ??
                ({
                  labels: new Set<string>(),
                  labelScores: new Map<string, number>(),
                  score: 0,
                } as { labels: Set<string>; labelScores: Map<string, number>; score: number });
              entry.labels.add(label);
              const prev = entry.labelScores.get(label) ?? 0;
              entry.labelScores.set(label, Math.max(prev, matchField.score));
              parents.set(neighborId, entry);
            }
          }
        }
      }
    }
  }

  const filtered = new Map<
    string,
    { labels: Set<string>; labelScores: Map<string, number>; score: number }
  >();
  for (const [parentId, match] of parents.entries()) {
    const score = Array.from(match.labelScores.values()).reduce((sum, s) => sum + s, 0);
    match.score = score;
    if (score >= scoring.minEntityScore) {
      filtered.set(parentId, match);
    }
  }

  return filtered;
};

const mergeEntities = (params: {
  known: Map<string, Set<string>>;
  added: Map<string, Set<string>>;
  maxEntitiesPerField: number;
}): Map<string, Set<string>> => {
  const { known, added, maxEntitiesPerField } = params;
  const frontier = new Map<string, Set<string>>();

  for (const [field, values] of added.entries()) {
    if (values.size) {
      const existing = known.get(field) ?? new Set<string>();
      const newValues = new Set<string>();

      for (const v of values) {
        if (existing.size >= maxEntitiesPerField) break;
        if (!existing.has(v)) {
          existing.add(v);
          newValues.add(v);
        }
      }

      known.set(field, existing);
      if (newValues.size) frontier.set(field, newValues);
    }
  }

  return frontier;
};

const indexEntitiesForAlert = (params: {
  entityToAlertIds: Map<string, Set<string>>;
  alertId: string;
  entities: Map<string, Set<string>>;
}) => {
  const { entityToAlertIds, alertId, entities } = params;

  for (const [field, values] of entities.entries()) {
    for (const v of values) {
      const key = `${field}\u0000${v}`;
      const set = entityToAlertIds.get(key) ?? new Set<string>();
      set.add(alertId);
      entityToAlertIds.set(key, set);
    }
  }
};

const addTraversalEdges = (params: {
  edgesByKey: EdgeAccumulator;
  childId: string;
  parentLinks: Map<
    string,
    { labels: Set<string>; labelScores: Map<string, number>; score: number }
  >;
}) => {
  const { edgesByKey, childId, parentLinks } = params;

  for (const [parentId, match] of parentLinks.entries()) {
    const edgeKey = `${parentId}\u0000${childId}`;
    const edge =
      edgesByKey.get(edgeKey) ??
      ({
        from: parentId,
        to: childId,
        labelScores: new Map<string, number>(),
        score: 0,
      } as {
        from: string;
        to: string;
        labelScores: Map<string, number>;
        score: number;
      });
    for (const [label, score] of match.labelScores.entries()) {
      const prev = edge.labelScores.get(label) ?? 0;
      edge.labelScores.set(label, Math.max(prev, score));
    }
    edge.score = Array.from(edge.labelScores.values()).reduce((sum, s) => sum + s, 0);
    edgesByKey.set(edgeKey, edge);
  }
};

const searchWindow = async (params: {
  esClient: EsSearchClient;
  index: string;
  gteMs: number;
  lteMs: number;
  shouldClauses: Array<Record<string, unknown>>;
  sourceFields: string[];
  pageSize: number;
  onHit: (hit: EsHit) => void;
  stop: () => boolean;
  queriesRef: { queries: number };
}) => {
  const {
    esClient,
    index,
    gteMs,
    lteMs,
    shouldClauses,
    sourceFields,
    pageSize,
    onHit,
    stop,
    queriesRef,
  } = params;

  let searchAfter: unknown[] | undefined;
  let page = 0;
  while (!stop()) {
    const response = await esClient.search({
      index,
      // Hidden indices (like `.internal.*`) don't expand on wildcards unless explicitly enabled.
      // Without this, patterns such as `.internal.alerts-security.alerts-default-*` may match 0 indices and return 0 hits.
      expand_wildcards: ['open', 'hidden'],
      size: pageSize,
      _source: sourceFields,
      track_total_hits: false,
      query: {
        bool: {
          filter: [
            {
              range: {
                '@timestamp': {
                  gte: toIso(gteMs),
                  lte: toIso(lteMs),
                },
              },
            },
            {
              bool: {
                should: shouldClauses,
                minimum_should_match: 1,
              },
            },
          ],
        },
      },
      // IMPORTANT: Do not sort on `_id`. Elasticsearch disallows fielddata on `_id` by default
      // (`indices.id_field_data.enabled=false`) which causes search failures.
      // Use `kibana.alert.uuid` as the tiebreaker instead; it is stable and keyword-mapped in alert indices.
      sort: [{ '@timestamp': 'asc' }, { 'kibana.alert.uuid': 'asc' }],
      ...(searchAfter ? { search_after: searchAfter } : {}),
    });
    queriesRef.queries++;

    const hits = response.hits.hits;
    page++;
    if (!hits.length) break;

    for (const hit of hits) {
      onHit(hit);
      if (stop()) break;
    }

    const lastSort = hits[hits.length - 1]?.sort;
    if (!lastSort || !Array.isArray(lastSort)) break;
    searchAfter = lastSort;
  }
};

export interface BuildRelatedAlertsGraphParams {
  esClient: EsSearchClient;
  seed: { alertId: string; alertIndex: string };
  searchIndex: string;
  entityFields: string[];
  /**
   * Optional mapping of "field -> alias fields". When a seed alert has a value for `field`,
   * we also search for alerts with that same value in each alias field.
   *
   * This supports cases like lateral movement where `source.ip` in one alert can correspond to
   * `destination.ip` in another.
   */
  entityFieldAliases?: Record<string, Array<{ field: string; score?: number }>>;
  seedWindowMs: number;
  expandWindowMs: number;
  maxDepth: number;
  maxAlerts: number;
  pageSize: number;
  maxTermsPerQuery: number;
  maxEntitiesPerField: number;
  ignoreEntities: Array<{ field: string; values: string[] }>;
  /**
   * Per-field score overrides.
   * Keys are entity field names (e.g. "host.name", "process.entity_id").
   */
  entityFieldScores?: Record<string, number>;
  /**
   * Link alerts when the sum of per-label scores meets/exceeds this threshold.
   */
  minEntityScore: number;
  includeSeed: boolean;
}

export const buildRelatedAlertsGraph = async (
  params: BuildRelatedAlertsGraphParams
): Promise<RelatedAlertsGraphOutput> => {
  const {
    esClient,
    seed,
    searchIndex,
    entityFields,
    entityFieldAliases,
    seedWindowMs,
    expandWindowMs,
    maxDepth,
    maxAlerts,
    pageSize,
    maxTermsPerQuery,
    maxEntitiesPerField,
    ignoreEntities,
    entityFieldScores,
    minEntityScore,
    includeSeed,
  } = params;

  // Defensive normalization: workflow step inputs may arrive as non-numbers (or NaN),
  // and JSON serialization of NaN becomes `null`, which Elasticsearch rejects (e.g. `size: null`).
  const safeMaxAlerts = clampPositiveInt(maxAlerts, 300);
  const safePageSize = clampPositiveInt(pageSize, 200);
  // NOTE: If `maxTermsPerQuery` is `undefined`/`NaN` at runtime, it will cause `buildEntityShouldClauses`
  // to emit empty `terms` arrays (because `slice(0, NaN)` => `[]`), making the query match nothing.
  // Clamp these values defensively to keep the query valid even if input defaults weren't applied.
  const safeMaxTermsPerQuery = clampPositiveInt(maxTermsPerQuery, 500);
  const safeMaxEntitiesPerField = clampPositiveInt(maxEntitiesPerField, 200);

  const ignoreMap = buildIgnoreMap(Array.isArray(ignoreEntities) ? ignoreEntities : []);
  const safeMinEntityScore =
    typeof minEntityScore === 'number' && Number.isFinite(minEntityScore) && minEntityScore > 0
      ? minEntityScore
      : 2;
  const safeEntityFieldScores = new Map<string, number>(
    Object.entries(entityFieldScores ?? {}).filter(
      ([, v]) => typeof v === 'number' && Number.isFinite(v)
    )
  );

  const safeEntityFieldAliases = (() => {
    const map = new Map<string, Array<{ field: string; score?: number }>>();

    for (const [from, aliases] of Object.entries(entityFieldAliases ?? {})) {
      if (from.length > 0 && Array.isArray(aliases) && aliases.length > 0) {
        const cleaned = aliases
          .filter(
            (a): a is { field: string; score?: number } =>
              typeof a?.field === 'string' && a.field.length > 0
          )
          .filter((a) => a.field !== from);
        if (cleaned.length) {
          map.set(from, cleaned);
        }
      }
    }

    // Symmetrize for expansion/linking so either side can drive matching.
    for (const [from, aliases] of map.entries()) {
      for (const alias of aliases) {
        const to = alias.field;
        const reverse = map.get(to) ?? [];
        const hasReverse = reverse.some((r) => r.field === from);
        if (!hasReverse) {
          reverse.push({ field: from, score: alias.score });
          map.set(to, reverse);
        }
      }
    }

    return map;
  })();

  const scoring = {
    minEntityScore: safeMinEntityScore,
    entityFieldScores: safeEntityFieldScores,
    defaultScorePerField: 1,
  };

  const expandEntitiesByAliases = (
    entitiesByField: Map<string, Set<string>>
  ): Map<string, Set<string>> => {
    const out = new Map<string, Set<string>>();

    for (const [field, values] of entitiesByField.entries()) {
      if (values.size) {
        const own = out.get(field) ?? new Set<string>();
        for (const v of values) own.add(v);
        out.set(field, own);

        const aliases = safeEntityFieldAliases.get(field) ?? [];
        for (const alias of aliases) {
          const aliasSet = out.get(alias.field) ?? new Set<string>();
          for (const v of values) aliasSet.add(v);
          out.set(alias.field, aliasSet);
        }
      }
    }

    return out;
  };

  const sourceFields = Array.from(
    new Set<string>([
      '@timestamp',
      'kibana.alert.rule.name',
      'kibana.alert.severity',
      ...entityFields,
    ])
  );

  // Fetch seed alert.
  const seedResponse = await esClient.search({
    index: seed.alertIndex,
    expand_wildcards: ['open', 'hidden'],
    size: 1,
    _source: sourceFields,
    query: { term: { _id: seed.alertId } },
  });

  const seedHit = seedResponse.hits.hits[0];
  if (!seedHit?._id) {
    throw new Error(`Alert with ID ${seed.alertId} not found`);
  }

  const seedSource = seedHit._source;
  const seedTimestamp = (seedSource as Record<string, unknown> | undefined)?.['@timestamp'];
  const seedTsMs = typeof seedTimestamp === 'string' ? Date.parse(seedTimestamp) : NaN;
  if (!Number.isFinite(seedTsMs)) {
    throw new Error(`Seed alert ${seed.alertId} does not have a valid @timestamp`);
  }

  // No debug logging (intentionally).

  const seenAlertIds = new Set<string>([seed.alertId]);
  const alertMetaById = new Map<string, AlertMeta>();
  const nodesInternal = new Set<string>([seed.alertId]);

  const edgesByKey: EdgeAccumulator = new Map();

  // Key: `${field}\u0000${value}` -> alert IDs that have this value
  const entityToAlertIds = new Map<string, Set<string>>();

  const knownEntitiesByField = new Map<string, Set<string>>();
  const seedEntities = new Map<string, Set<string>>();
  for (const field of entityFields) {
    const values = extractEntityValues(seedSource, field, ignoreMap);
    seedEntities.set(field, values);
    addEntitiesWithLimit({
      known: knownEntitiesByField,
      field,
      values,
      maxEntitiesPerField: safeMaxEntitiesPerField,
    });
  }

  alertMetaById.set(seed.alertId, {
    alert_id: seed.alertId,
    alert_index: seedHit._index,
    timestamp: typeof seedTimestamp === 'string' ? seedTimestamp : undefined,
    rule_name: (seedSource as Record<string, unknown> | undefined)?.['kibana.alert.rule.name'] as
      | string
      | undefined,
    severity: (seedSource as Record<string, unknown> | undefined)?.['kibana.alert.severity'] as
      | string
      | undefined,
    ts_ms: seedTsMs,
  });

  // Seed should always be a parent candidate internally.
  indexEntitiesForAlert({ entityToAlertIds, alertId: seed.alertId, entities: seedEntities });

  const hasAnyEntity = Array.from(knownEntitiesByField.values()).some((s) => s.size > 0);
  if (!hasAnyEntity) {
    const nodes = includeSeed ? [{ id: seed.alertId }] : [];
    return {
      nodes,
      edges: [],
      alerts_sorted: includeSeed
        ? [
            {
              alert_id: seed.alertId,
              alert_index: seedHit._index,
              timestamp: typeof seedTimestamp === 'string' ? seedTimestamp : undefined,
            },
          ]
        : [],
      stats: {
        depth_reached: 0,
        nodes: nodes.length,
        edges: 0,
        queries: 1,
        time_range: { gte: toIso(seedTsMs), lte: toIso(seedTsMs) },
      },
    };
  }

  let minTs = seedTsMs;
  let maxTs = seedTsMs;

  // Searched time span (for entity-delta searches).
  let searchedFromMs = seedTsMs - seedWindowMs;
  let searchedToMs = seedTsMs + seedWindowMs;

  // Frontier entities start with seed entities.
  let frontierEntitiesByField = new Map<string, Set<string>>(seedEntities);
  let frontierAlertIds = new Set<string>([seed.alertId]);

  const queriesRef = { queries: 1 };
  let depthReached = 0;

  const stop = () => seenAlertIds.size >= safeMaxAlerts;

  for (let depth = 1; depth <= maxDepth; depth++) {
    if (stop()) break;

    const expandedFromMs = minTs - expandWindowMs;
    const expandedToMs = maxTs + expandWindowMs;

    const timeDeltas: Array<{ gte: number; lte: number }> = [];
    if (expandedFromMs < searchedFromMs) {
      timeDeltas.push({ gte: expandedFromMs, lte: searchedFromMs });
    }
    if (expandedToMs > searchedToMs) {
      timeDeltas.push({ gte: searchedToMs, lte: expandedToMs });
    }

    const frontierShould = buildEntityShouldClauses({
      entitiesByField: expandEntitiesByAliases(frontierEntitiesByField),
      maxTermsPerQuery: safeMaxTermsPerQuery,
    });

    if (!frontierShould.length && !timeDeltas.length) {
      break;
    }

    const newlyDiscoveredEntitiesByField = new Map<string, Set<string>>();
    const newlyDiscoveredAlertIds: string[] = [];
    let ignoredAlreadySeen = 0;
    let ignoredNoParentLink = 0;

    const processHit = (params2: { hit: EsHit; parentCandidates: Set<string> }) => {
      const { hit, parentCandidates } = params2;
      const id: string | undefined = hit?._id;
      if (!id) return;
      if (seenAlertIds.has(id)) {
        ignoredAlreadySeen++;
        return;
      }

      const source = hit._source;
      const ts = (source as Record<string, unknown> | undefined)?.['@timestamp'];
      const tsMs = typeof ts === 'string' ? Date.parse(ts) : NaN;

      // Extract entities for this alert (needed to decide if it truly links to a parent).
      const entitiesForAlert = new Map<string, Set<string>>();
      for (const field of entityFields) {
        const values = extractEntityValues(source, field, ignoreMap);
        entitiesForAlert.set(field, values);
      }

      const parentLinks = computeParentLinks({
        entityToAlertIds,
        parentCandidates,
        childEntities: entitiesForAlert,
        aliasesByField: safeEntityFieldAliases,
        scoring,
      });

      // If it doesn't meet the linking criteria to any eligible parent, ignore it.
      if (parentLinks.size === 0) {
        ignoredNoParentLink++;
        return;
      }

      seenAlertIds.add(id);
      nodesInternal.add(id);
      newlyDiscoveredAlertIds.push(id);

      if (Number.isFinite(tsMs)) {
        minTs = Math.min(minTs, tsMs);
        maxTs = Math.max(maxTs, tsMs);
      }

      alertMetaById.set(id, {
        alert_id: id,
        alert_index: hit._index,
        timestamp: typeof ts === 'string' ? ts : undefined,
        rule_name: (source as Record<string, unknown> | undefined)?.['kibana.alert.rule.name'] as
          | string
          | undefined,
        severity: (source as Record<string, unknown> | undefined)?.['kibana.alert.severity'] as
          | string
          | undefined,
        ts_ms: Number.isFinite(tsMs) ? tsMs : undefined,
      });

      // Record newly discovered entities for future expansion
      for (const [field, values] of entitiesForAlert.entries()) {
        const set = newlyDiscoveredEntitiesByField.get(field) ?? new Set<string>();
        for (const v of values) set.add(v);
        newlyDiscoveredEntitiesByField.set(field, set);
      }

      // Add traversal edges from parents discovered in this query.
      addTraversalEdges({
        edgesByKey,
        childId: id,
        parentLinks,
      });

      // Index this alert for future parent lookups.
      indexEntitiesForAlert({ entityToAlertIds, alertId: id, entities: entitiesForAlert });
    };

    // 1) Entity-delta search: new entities over already-searched time range.
    if (frontierShould.length) {
      await searchWindow({
        esClient,
        index: searchIndex,
        gteMs: searchedFromMs,
        lteMs: searchedToMs,
        shouldClauses: frontierShould,
        sourceFields,
        pageSize: computePageSize(safePageSize, safeMaxAlerts - seenAlertIds.size, 200),
        onHit: (hit) => processHit({ hit, parentCandidates: frontierAlertIds }),
        stop,
        queriesRef,
      });
    }

    // 2) Time-delta search: expanded time slices over all known entities.
    if (timeDeltas.length && !stop()) {
      const knownShould = buildEntityShouldClauses({
        entitiesByField: expandEntitiesByAliases(knownEntitiesByField),
        maxTermsPerQuery: safeMaxTermsPerQuery,
      });

      for (const delta of timeDeltas) {
        if (!knownShould.length || stop()) break;
        await searchWindow({
          esClient,
          index: searchIndex,
          gteMs: delta.gte,
          lteMs: delta.lte,
          shouldClauses: knownShould,
          sourceFields,
          pageSize: computePageSize(safePageSize, safeMaxAlerts - seenAlertIds.size, 200),
          onHit: (hit) => processHit({ hit, parentCandidates: nodesInternal }),
          stop,
          queriesRef,
        });
      }
    }

    if (!newlyDiscoveredAlertIds.length) {
      break;
    }

    depthReached = depth;

    // Update frontier alerts and entities for next round.
    frontierAlertIds = new Set<string>(newlyDiscoveredAlertIds);
    frontierEntitiesByField = mergeEntities({
      known: knownEntitiesByField,
      added: newlyDiscoveredEntitiesByField,
      maxEntitiesPerField: safeMaxEntitiesPerField,
    });

    // Expand searched time window to cover the current expanded bounds.
    searchedFromMs = Math.min(searchedFromMs, expandedFromMs);
    searchedToMs = Math.max(searchedToMs, expandedToMs);
  }

  const allMetas = Array.from(alertMetaById.values());
  const seedId = seed.alertId;
  const nodesFiltered = includeSeed
    ? nodesInternal
    : new Set(Array.from(nodesInternal).filter((id) => id !== seedId));

  const alertsSorted = allMetas
    .filter((m) => nodesFiltered.has(m.alert_id))
    .sort((a, b) => (a.ts_ms ?? 0) - (b.ts_ms ?? 0));

  const nodes = alertsSorted.map((m) => ({ id: m.alert_id }));
  const edges = Array.from(edgesByKey.values())
    .filter((e) => nodesFiltered.has(e.from) && nodesFiltered.has(e.to))
    .map((e) => ({
      from: e.from,
      to: e.to,
      score: e.score,
      label_scores: Object.fromEntries(
        Array.from(e.labelScores.entries()).sort(([a], [b]) => a.localeCompare(b))
      ),
    }))
    .sort((a, b) => (a.from === b.from ? a.to.localeCompare(b.to) : a.from.localeCompare(b.from)));

  return {
    nodes,
    edges,
    alerts_sorted: alertsSorted.map(({ ts_ms: _tsMs, ...rest }) => rest),
    stats: {
      depth_reached: depthReached,
      nodes: nodes.length,
      edges: edges.length,
      queries: queriesRef.queries,
      time_range: { gte: toIso(searchedFromMs), lte: toIso(searchedToMs) },
    },
  };
};
