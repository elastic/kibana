/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addEntitiesWithLimit, buildIgnoreMap, extractEntityValues } from './entity_utils';
import { buildEntityShouldClauses } from './query_utils';
import { clampPositiveInt, computePageSize, toIso } from './number_utils';
import { symmetrizeAliases, expandEntitiesByAliases } from './alias_utils';
import { computeParentLinks } from './scoring';
import { mergeEntities, indexEntitiesForAlert, addTraversalEdges } from './traversal_utils';
import { searchWindow } from './search_window';
import type {
  AlertMeta,
  EsHit,
  EsSearchClient,
  EdgeAccumulator,
  ScoringConfig,
  RelatedAlertsGraphOutput,
} from './types';

// ── Public parameter interface ──────────────────────────────────────────────

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

// ── Input sanitization ──────────────────────────────────────────────────────

const sanitizeParams = (params: BuildRelatedAlertsGraphParams) => {
  // Workflow step inputs may arrive as non-numbers (or NaN).
  // JSON serialization of NaN becomes `null`, which Elasticsearch rejects.
  const maxAlerts = clampPositiveInt(params.maxAlerts, 300);
  const pageSize = clampPositiveInt(params.pageSize, 200);
  const maxTermsPerQuery = clampPositiveInt(params.maxTermsPerQuery, 500);
  const maxEntitiesPerField = clampPositiveInt(params.maxEntitiesPerField, 200);

  const ignoreMap = buildIgnoreMap(
    Array.isArray(params.ignoreEntities) ? params.ignoreEntities : []
  );

  const minEntityScore =
    typeof params.minEntityScore === 'number' &&
    Number.isFinite(params.minEntityScore) &&
    params.minEntityScore > 0
      ? params.minEntityScore
      : 2;

  const entityFieldScores = new Map<string, number>(
    Object.entries(params.entityFieldScores ?? {}).filter(
      ([, v]) => typeof v === 'number' && Number.isFinite(v)
    )
  );

  const aliasMap = symmetrizeAliases(params.entityFieldAliases);

  const scoring: ScoringConfig = {
    minEntityScore,
    entityFieldScores,
    defaultScorePerField: 1,
  };

  return {
    maxAlerts,
    pageSize,
    maxTermsPerQuery,
    maxEntitiesPerField,
    ignoreMap,
    aliasMap,
    scoring,
  };
};

// ── Seed alert fetching ─────────────────────────────────────────────────────

const fetchSeedAlert = async (
  esClient: EsSearchClient,
  seed: { alertId: string; alertIndex: string },
  sourceFields: string[]
) => {
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
  const seedTimestamp = seedSource?.['@timestamp'];
  const seedTsMs = typeof seedTimestamp === 'string' ? Date.parse(seedTimestamp) : NaN;
  if (!Number.isFinite(seedTsMs)) {
    throw new Error(`Seed alert ${seed.alertId} does not have a valid @timestamp`);
  }

  return { seedHit, seedSource, seedTimestamp, seedTsMs };
};

// ── Alert metadata extraction ───────────────────────────────────────────────

const extractAlertMeta = (id: string, hit: EsHit): AlertMeta => {
  const source = hit._source as Record<string, unknown> | undefined;
  const ts = source?.['@timestamp'];
  const tsMs = typeof ts === 'string' ? Date.parse(ts) : NaN;

  return {
    alert_id: id,
    alert_index: hit._index,
    timestamp: typeof ts === 'string' ? ts : undefined,
    rule_name: source?.['kibana.alert.rule.name'] as string | undefined,
    severity: source?.['kibana.alert.severity'] as string | undefined,
    ts_ms: Number.isFinite(tsMs) ? tsMs : undefined,
  };
};

// ── Output formatting ───────────────────────────────────────────────────────

const formatOutput = (params: {
  nodesInternal: Set<string>;
  edgesByKey: EdgeAccumulator;
  alertMetaById: Map<string, AlertMeta>;
  seedId: string;
  includeSeed: boolean;
  depthReached: number;
  queriesRef: { queries: number };
  searchedFromMs: number;
  searchedToMs: number;
}): RelatedAlertsGraphOutput => {
  const {
    nodesInternal,
    edgesByKey,
    alertMetaById,
    seedId,
    includeSeed,
    depthReached,
    queriesRef,
    searchedFromMs,
    searchedToMs,
  } = params;

  const nodesFiltered = includeSeed
    ? nodesInternal
    : new Set(Array.from(nodesInternal).filter((id) => id !== seedId));

  const alertsSorted = Array.from(alertMetaById.values())
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
    alerts: alertsSorted.map(({ ts_ms: _tsMs, ...rest }) => rest),
    stats: {
      depth_reached: depthReached,
      nodes: nodes.length,
      edges: edges.length,
      queries: queriesRef.queries,
      time_range: { gte: toIso(searchedFromMs), lte: toIso(searchedToMs) },
    },
  };
};

// ── Main orchestrator ───────────────────────────────────────────────────────

export const buildRelatedAlertsGraph = async (
  params: BuildRelatedAlertsGraphParams
): Promise<RelatedAlertsGraphOutput> => {
  const {
    esClient,
    seed,
    searchIndex,
    entityFields,
    seedWindowMs,
    expandWindowMs,
    maxDepth,
    includeSeed,
  } = params;
  const {
    maxAlerts,
    pageSize,
    maxTermsPerQuery,
    maxEntitiesPerField,
    ignoreMap,
    aliasMap,
    scoring,
  } = sanitizeParams(params);

  const sourceFields = Array.from(
    new Set<string>([
      '@timestamp',
      'kibana.alert.rule.name',
      'kibana.alert.severity',
      ...entityFields,
    ])
  );

  // ── Step 1: Fetch the seed alert ────────────────────────────────────────

  const { seedHit, seedSource, seedTimestamp, seedTsMs } = await fetchSeedAlert(
    esClient,
    seed,
    sourceFields
  );

  // ── Step 2: Initialize traversal state ──────────────────────────────────

  const seenAlertIds = new Set<string>([seed.alertId]);
  const alertMetaById = new Map<string, AlertMeta>();
  const nodesInternal = new Set<string>([seed.alertId]);
  const edgesByKey: EdgeAccumulator = new Map();
  const entityToAlertIds = new Map<string, Set<string>>();
  const knownEntitiesByField = new Map<string, Set<string>>();

  // Extract entities from the seed alert.
  const seedEntities = new Map<string, Set<string>>();
  for (const field of entityFields) {
    const values = extractEntityValues(seedSource, field, ignoreMap);
    seedEntities.set(field, values);
    addEntitiesWithLimit({ known: knownEntitiesByField, field, values, maxEntitiesPerField });
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

  indexEntitiesForAlert({ entityToAlertIds, alertId: seed.alertId, entities: seedEntities });

  // ── Step 3: Early exit if the seed has no usable entities ───────────────

  const hasAnyEntity = Array.from(knownEntitiesByField.values()).some((s) => s.size > 0);
  if (!hasAnyEntity) {
    const nodes = includeSeed ? [{ id: seed.alertId }] : [];
    return {
      nodes,
      edges: [],
      alerts: includeSeed
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

  // ── Step 4: BFS expansion loop ──────────────────────────────────────────

  let minTs = seedTsMs;
  let maxTs = seedTsMs;
  let searchedFromMs = seedTsMs - seedWindowMs;
  let searchedToMs = seedTsMs + seedWindowMs;
  let frontierEntitiesByField = new Map<string, Set<string>>(seedEntities);
  let frontierAlertIds = new Set<string>([seed.alertId]);
  const queriesRef = { queries: 1 };
  let depthReached = 0;
  const stop = () => seenAlertIds.size >= maxAlerts;

  for (let depth = 1; depth <= maxDepth; depth++) {
    if (stop()) break;

    // Compute expanded time bounds for this depth.
    const expandedFromMs = minTs - expandWindowMs;
    const expandedToMs = maxTs + expandWindowMs;

    // Determine time slices that haven't been searched yet.
    const timeDeltas: Array<{ gte: number; lte: number }> = [];
    if (expandedFromMs < searchedFromMs) {
      timeDeltas.push({ gte: expandedFromMs, lte: searchedFromMs });
    }
    if (expandedToMs > searchedToMs) {
      timeDeltas.push({ gte: searchedToMs, lte: expandedToMs });
    }

    const frontierShould = buildEntityShouldClauses({
      entitiesByField: expandEntitiesByAliases(frontierEntitiesByField, aliasMap),
      maxTermsPerQuery,
    });

    if (!frontierShould.length && !timeDeltas.length) break;

    // Accumulators for this depth level.
    const newlyDiscoveredEntitiesByField = new Map<string, Set<string>>();
    const newlyDiscoveredAlertIds: string[] = [];

    /** Processes a single ES hit: validates, scores, and records the alert. */
    const processHit = (hit: EsHit, parentCandidates: Set<string>) => {
      const id = hit?._id;
      if (!id || seenAlertIds.has(id)) return;

      // Extract entities for scoring.
      const entitiesForAlert = new Map<string, Set<string>>();
      for (const field of entityFields) {
        entitiesForAlert.set(field, extractEntityValues(hit._source, field, ignoreMap));
      }

      // Compute parent links based on shared entities.
      const parentLinks = computeParentLinks({
        entityToAlertIds,
        parentCandidates,
        childEntities: entitiesForAlert,
        aliasesByField: aliasMap,
        scoring,
      });

      if (parentLinks.size === 0) return;

      // Accept the alert.
      seenAlertIds.add(id);
      nodesInternal.add(id);
      newlyDiscoveredAlertIds.push(id);

      const meta = extractAlertMeta(id, hit);
      if (meta.ts_ms != null) {
        minTs = Math.min(minTs, meta.ts_ms);
        maxTs = Math.max(maxTs, meta.ts_ms);
      }
      alertMetaById.set(id, meta);

      // Record newly discovered entities for future expansion.
      for (const [field, values] of entitiesForAlert.entries()) {
        const set = newlyDiscoveredEntitiesByField.get(field) ?? new Set<string>();
        for (const v of values) set.add(v);
        newlyDiscoveredEntitiesByField.set(field, set);
      }

      addTraversalEdges({ edgesByKey, childId: id, parentLinks });
      indexEntitiesForAlert({ entityToAlertIds, alertId: id, entities: entitiesForAlert });
    };

    // 4a) Entity-delta search: new entities over the already-searched time range.
    if (frontierShould.length) {
      await searchWindow({
        esClient,
        index: searchIndex,
        gteMs: searchedFromMs,
        lteMs: searchedToMs,
        shouldClauses: frontierShould,
        sourceFields,
        pageSize: computePageSize(pageSize, maxAlerts - seenAlertIds.size, 200),
        onHit: (hit) => processHit(hit, frontierAlertIds),
        stop,
        queriesRef,
      });
    }

    // 4b) Time-delta search: expanded time slices over all known entities.
    if (timeDeltas.length && !stop()) {
      const knownShould = buildEntityShouldClauses({
        entitiesByField: expandEntitiesByAliases(knownEntitiesByField, aliasMap),
        maxTermsPerQuery,
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
          pageSize: computePageSize(pageSize, maxAlerts - seenAlertIds.size, 200),
          onHit: (hit) => processHit(hit, nodesInternal),
          stop,
          queriesRef,
        });
      }
    }

    if (!newlyDiscoveredAlertIds.length) break;
    depthReached = depth;

    // Update frontier for the next round.
    frontierAlertIds = new Set<string>(newlyDiscoveredAlertIds);
    frontierEntitiesByField = mergeEntities({
      known: knownEntitiesByField,
      added: newlyDiscoveredEntitiesByField,
      maxEntitiesPerField,
    });

    searchedFromMs = Math.min(searchedFromMs, expandedFromMs);
    searchedToMs = Math.max(searchedToMs, expandedToMs);
  }

  // ── Step 5: Format and return the output ────────────────────────────────

  return formatOutput({
    nodesInternal,
    edgesByKey,
    alertMetaById,
    seedId: seed.alertId,
    includeSeed,
    depthReached,
    queriesRef,
    searchedFromMs,
    searchedToMs,
  });
};
