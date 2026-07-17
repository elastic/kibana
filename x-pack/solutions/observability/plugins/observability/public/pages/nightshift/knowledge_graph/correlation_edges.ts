/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  FixtureDetection,
  FixtureFeature,
  FixtureQuery,
  FixtureSignificantEvent,
} from '../fixtures';

export interface CorrelationEdge {
  id: string;
  source: string;
  target: string;
  /** Shared queries or stream-level detections */
  detectionCount: number;
  /** Shared promoted/acknowledged significant events */
  sigEventCount: number;
}

function canonicalPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

function pairKey(a: string, b: string): string {
  const [source, target] = canonicalPair(a, b);
  return `${source}<->${target}`;
}

function addPairs(
  ids: string[],
  edgeCounts: Map<string, { detectionCount: number; sigEventCount: number }>,
  kind: 'detection' | 'sigEvent'
) {
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const key = pairKey(ids[i], ids[j]);
      const existing = edgeCounts.get(key) ?? { detectionCount: 0, sigEventCount: 0 };
      if (kind === 'detection') {
        existing.detectionCount += 1;
      } else {
        existing.sigEventCount += 1;
      }
      edgeCounts.set(key, existing);
    }
  }
}

/**
 * Compute implicit correlation edges between visible KIs based on
 * significant events. For each active event, we collect linked entity KIs via:
 * 1. dependency_edges (source/target matching visible entities)
 * 2. cause_ki_ids (direct attribution)
 * 3. rule_names → queries → feature_ids (resolving rules to monitored KIs)
 *
 * If an event links to 2+ visible entities through any combination of these
 * paths, we create correlation edges between all pairs.
 */
export function computeCorrelationEdges(
  visibleNodeIds: Set<string>,
  _allFeatures: FixtureFeature[],
  allQueries: FixtureQuery[],
  _allDetections: FixtureDetection[],
  allSignificantEvents: FixtureSignificantEvent[]
): CorrelationEdge[] {
  const edgeCounts = new Map<string, { detectionCount: number; sigEventCount: number }>();

  const activeEvents = allSignificantEvents.filter(
    (e) => e.status === 'promoted' || e.status === 'acknowledged'
  );

  const queryByTitle = new Map<string, FixtureQuery>();
  for (const q of allQueries) {
    queryByTitle.set(q.title, q);
  }

  for (const event of activeEvents) {
    const linkedEntityIds = new Set<string>();

    // Path 1: dependency_edges source/target matching visible entities
    if (event.dependency_edges) {
      for (const edge of event.dependency_edges) {
        if (visibleNodeIds.has(edge.source)) linkedEntityIds.add(edge.source);
        if (visibleNodeIds.has(edge.target)) linkedEntityIds.add(edge.target);
      }
    }

    // Path 2: cause_ki_ids directly
    if (event.cause_ki_ids) {
      for (const id of event.cause_ki_ids) {
        if (visibleNodeIds.has(id)) linkedEntityIds.add(id);
      }
    }

    // Path 3: rule_names → queries → feature_ids
    if (event.rule_names) {
      for (const ruleName of event.rule_names) {
        const query = queryByTitle.get(ruleName);
        if (query) {
          for (const fid of query.feature_ids) {
            if (visibleNodeIds.has(fid)) linkedEntityIds.add(fid);
          }
        }
      }
    }

    // Create pairs from all linked entities for this event
    const ids = [...linkedEntityIds];
    if (ids.length >= 2) {
      addPairs(ids, edgeCounts, 'sigEvent');
    }
  }

  return Array.from(edgeCounts.entries()).map(([key, counts]) => {
    const [source, target] = key.split('<->');
    return {
      id: `corr-${source}-${target}`,
      source,
      target,
      detectionCount: counts.detectionCount,
      sigEventCount: counts.sigEventCount,
    };
  });
}

export function correlationEdgeWeight(edge: CorrelationEdge): number {
  return edge.detectionCount + edge.sigEventCount;
}

export function correlationStrokeWidth(edge: CorrelationEdge): number {
  const count = correlationEdgeWeight(edge);
  return Math.min(1.5 + 0.5 * count, 4);
}

export function correlationEdgeColor(
  edge: CorrelationEdge,
  colors: { warning: string; danger: string }
): string {
  return edge.sigEventCount > 0 ? colors.danger : colors.warning;
}
