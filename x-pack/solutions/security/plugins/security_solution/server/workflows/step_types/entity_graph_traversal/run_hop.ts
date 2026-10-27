/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  TraversalExclusion,
  TraversalEdge,
  TraversalHop,
  TraversalLimits,
  TraversalNode,
  TraversalStopReason,
} from '../../../../common/workflows/step_types/entity_graph_traversal/entity_graph_traversal_common';
import { TRAVERSAL_NODE_ID_FIELD } from '../../../../common/workflows/step_types/entity_graph_traversal/entity_graph_traversal_common';
import {
  buildHopQuery,
  frontierForMatchField,
  HOP_COUNT_COLUMN,
  HOP_SOURCE_COLUMN,
  HOP_TARGET_COLUMN,
  hopPayloadColumn,
  type HopQuery,
  type HopTarget,
} from './build_hop_query';

export interface EsqlResult {
  columns: Array<{ name: string; type: string }>;
  values: unknown[][];
}

export type ExecuteHopQuery = (query: HopQuery) => Promise<EsqlResult>;

export interface RunHopInput {
  hop: TraversalHop;
  frontier: string[];
  visited: string[];
  edgesSoFar: number;
  truncatedSoFar: boolean;
  limits: TraversalLimits;
  lookback?: string;
  exclusions?: TraversalExclusion[];
}

export interface RunHopStats {
  frontier_size: number;
  frontier_expanded: number;
  dropped_frontier: number;
  queries: number;
  rows_returned: number;
  edges_added: number;
  dropped_edges: number;
  /** Frontier ids removed by an `entity.id` exclusion. */
  excluded_frontier: number;
  /** Edges removed because their target is excluded on `entity.id`. */
  excluded_edges: number;
  closing_edges: number;
  new_nodes: number;
  hubs_skipped: string[];
}

export interface RunHopResult {
  hop_number: number;
  hop_name: string;
  edges: TraversalEdge[];
  nodes: TraversalNode[];
  next_frontier: string[];
  visited: string[];
  truncated: boolean;
  stop_reason: TraversalStopReason;
  stats: RunHopStats;
}

const toId = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return undefined;
};

const toCount = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 1;

/**
 * Parse one ES|QL result into edges. Rows whose source is not in the frontier (possible when
 * the match field is multi-valued) are dropped.
 */
const parseRows = ({
  result,
  hop,
  relation,
  frontier,
}: {
  result: EsqlResult;
  hop: TraversalHop;
  relation: string;
  frontier: Set<string>;
}): TraversalEdge[] => {
  const columnIndex = (name: string): number => result.columns.findIndex((c) => c.name === name);
  const sourceIdx = columnIndex(HOP_SOURCE_COLUMN);
  const targetIdx = columnIndex(HOP_TARGET_COLUMN);
  const countIdx = columnIndex(HOP_COUNT_COLUMN);
  if (sourceIdx < 0 || targetIdx < 0) {
    throw new Error(
      `Hop "${hop.name}" query returned no ${HOP_SOURCE_COLUMN}/${HOP_TARGET_COLUMN} columns`
    );
  }
  const payloadColumns = hop.payload_fields
    .map((field, index) => ({ field, idx: columnIndex(hopPayloadColumn(index)) }))
    .filter(({ idx }) => idx >= 0);

  const edges: TraversalEdge[] = [];
  for (const row of result.values) {
    const source = toId(row[sourceIdx]);
    const target = toId(row[targetIdx]);
    if (source !== undefined && target !== undefined && frontier.has(source)) {
      const payloadEntries = payloadColumns
        .map(({ field, idx }) => [field, row[idx]] as const)
        .filter(([, value]) => value !== null && value !== undefined)
        .map(([field, value]) => [field, Array.isArray(value) ? value : [value]] as const);
      const payload = payloadEntries.length > 0 ? Object.fromEntries(payloadEntries) : undefined;

      edges.push({
        hop: hop.hop_number,
        relation,
        source,
        target,
        count: countIdx >= 0 ? toCount(row[countIdx]) : 1,
        ...(payload && { payload }),
      });
    }
  }
  return edges;
};

/** Sources with more distinct targets than `hubDegree`. */
const findHubs = (edges: TraversalEdge[], hubDegree: number): Set<string> => {
  const targetsBySource = new Map<string, Set<string>>();
  for (const edge of edges) {
    const targets = targetsBySource.get(edge.source) ?? new Set<string>();
    targets.add(edge.target);
    targetsBySource.set(edge.source, targets);
  }
  const hubs = new Set<string>();
  for (const [source, targets] of targetsBySource) {
    if (targets.size > hubDegree) hubs.add(source);
  }
  return hubs;
};

/** Drop edges from hub sources and repeated (relation, source, target) triples. */
const dedupeEdges = (edges: TraversalEdge[], hubs: Set<string>): TraversalEdge[] => {
  const seen = new Set<string>();
  return edges.filter((edge) => {
    if (hubs.has(edge.source)) return false;
    const key = `${edge.relation}\u0000${edge.source}\u0000${edge.target}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/**
 * Expand one hop. Pure apart from `execute`, so the bounding logic is unit-testable without
 * Elasticsearch.
 *
 * Order of operations, each a circuit breaker on its own:
 * 1. Frontier beyond `max_frontier` is dropped before any query.
 * 2. Remaining node and edge capacity is checked before any query; none left means stop.
 * 3. One query per target (each target field, or the single EUID target), each capped by
 *    `LIMIT max_edges_per_hop`. A `match_fields` hop whose fields can bind none of the
 *    frontier's values runs no query.
 * 4. Sources with more distinct targets than `hub_degree` are dropped (hubs).
 * 5. Edges are deduplicated and capped by the remaining edge capacity.
 * 6. New nodes are capped by the remaining node capacity; targets already visited only
 *    produce closing edges.
 */
export const runHop = async (
  input: RunHopInput,
  execute: ExecuteHopQuery
): Promise<RunHopResult> => {
  const { hop, limits, lookback, exclusions = [] } = input;
  const visitedSet = new Set(input.visited);
  const excludedIds = new Set(
    exclusions.filter((e) => e.field === TRAVERSAL_NODE_ID_FIELD).flatMap((e) => e.values)
  );
  const distinctFrontier = Array.from(new Set(input.frontier));
  const uniqueFrontier = distinctFrontier.filter((id) => !excludedIds.has(id));
  let truncated = input.truncatedSoFar;
  let stopReason: TraversalStopReason = '';

  const stats: RunHopStats = {
    frontier_size: distinctFrontier.length,
    frontier_expanded: 0,
    dropped_frontier: 0,
    queries: 0,
    rows_returned: 0,
    edges_added: 0,
    dropped_edges: 0,
    excluded_frontier: distinctFrontier.length - uniqueFrontier.length,
    excluded_edges: 0,
    closing_edges: 0,
    new_nodes: 0,
    hubs_skipped: [],
  };

  const finish = (edges: TraversalEdge[], nodes: TraversalNode[]): RunHopResult => ({
    hop_number: hop.hop_number,
    hop_name: hop.name,
    edges,
    nodes,
    next_frontier: nodes.map((n) => n.id),
    visited: Array.from(visitedSet),
    truncated,
    stop_reason: stopReason,
    stats,
  });

  if (uniqueFrontier.length === 0) {
    stopReason = 'frontier_exhausted';
    return finish([], []);
  }

  // 1. Frontier cap
  const frontier = uniqueFrontier.slice(0, limits.max_frontier);
  stats.dropped_frontier = uniqueFrontier.length - frontier.length;
  if (stats.dropped_frontier > 0) truncated = true;
  stats.frontier_expanded = frontier.length;
  const frontierSet = new Set(frontier);

  // 2. Remaining capacity
  const nodeCapacity = limits.max_nodes - visitedSet.size;
  const edgeCapacity = limits.max_edges_total - input.edgesSoFar;
  if (edgeCapacity <= 0) {
    stopReason = 'max_edges_total';
    truncated = true;
    return finish([], []);
  }
  if (nodeCapacity <= 0) {
    stopReason = 'max_nodes';
    truncated = true;
    return finish([], []);
  }

  // 3. One query per target
  const collected: TraversalEdge[] = [];
  const targets: Array<{ target: HopTarget; relation: string }> = hop.target_euid
    ? [{ target: { euid: hop.target_euid.type }, relation: hop.target_euid.relation }]
    : hop.target_fields.map(({ field, relation }) => ({ target: { field }, relation }));
  const bindable =
    hop.match_fields === undefined ||
    hop.match_fields.some((match) => frontierForMatchField(match, frontier).length > 0);
  for (const { target, relation } of bindable ? targets : []) {
    const query = buildHopQuery({
      hop,
      target,
      frontier,
      limit: limits.max_edges_per_hop,
      lookback,
      exclusions,
    });
    const result = await execute(query);
    stats.queries += 1;
    stats.rows_returned += result.values.length;
    if (result.values.length >= limits.max_edges_per_hop) truncated = true;
    collected.push(...parseRows({ result, hop, relation, frontier: frontierSet }));
  }

  // 4. Excluded targets (exclusions on the hop's own target field were applied in the query;
  //    this covers target fields named differently from entity.id)
  const kept = collected.filter((edge) => !excludedIds.has(edge.target));
  stats.excluded_edges = collected.length - kept.length;

  // 5. Hub exclusion
  const hubs = findHubs(kept, limits.hub_degree);
  if (hubs.size > 0) {
    truncated = true;
    stats.hubs_skipped = Array.from(hubs);
  }

  // 6. Dedupe and edge cap
  const deduped = dedupeEdges(kept, hubs);
  const edges = deduped.slice(0, edgeCapacity);
  stats.dropped_edges = deduped.length - edges.length;
  stats.edges_added = edges.length;
  if (stats.dropped_edges > 0) {
    truncated = true;
    stopReason = 'max_edges_total';
  }

  // 7. New nodes and node cap
  const nodes: TraversalNode[] = [];
  const admitted = new Set<string>();
  let nodeCapHit = false;
  for (const edge of edges) {
    if (visitedSet.has(edge.target)) {
      stats.closing_edges += 1;
    } else if (!admitted.has(edge.target)) {
      if (nodes.length >= nodeCapacity) {
        nodeCapHit = true;
      } else {
        admitted.add(edge.target);
        nodes.push({
          id: edge.target,
          hop: hop.hop_number,
          via: edge.relation,
          ...(hop.target_type && { type: hop.target_type }),
        });
      }
    }
  }
  for (const node of nodes) visitedSet.add(node.id);
  stats.new_nodes = nodes.length;
  if (nodeCapHit) {
    truncated = true;
    if (stopReason === '') stopReason = 'max_nodes';
  }
  if (stopReason === '' && nodes.length === 0) {
    stopReason = 'frontier_exhausted';
  }

  return finish(edges, nodes);
};
