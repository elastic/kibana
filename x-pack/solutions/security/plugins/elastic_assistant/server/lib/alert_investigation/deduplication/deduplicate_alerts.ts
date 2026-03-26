/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { extractAlertFeatures, composeFeatureText, hashFeatureText } from './feature_extraction';
import { deduplicateWithHybridApproach } from './semantic_dedup_elser';

const DEFAULT_SIMILARITY_THRESHOLD = 0.85;

/**
 * Rule-specific similarity thresholds.
 *
 * Some detection rules produce alerts that differ only in timestamps or minor
 * fields (e.g., brute force — same rule, host, user, just different source IPs).
 * These need a LOWER threshold to dedup effectively.
 *
 * Other rules produce alerts where every field matters (e.g., malware with
 * unique file hashes). These need a HIGHER threshold to avoid false dedup.
 */
const RULE_THRESHOLD_OVERRIDES: Record<string, number> = {
  // High-volume rules with repetitive alerts → lower threshold (more dedup)
  'brute force': 0.65,
  'multiple failed': 0.65,
  'failed login': 0.65,
  'authentication failure': 0.65,

  // Rules where process/command line matters → higher threshold (less dedup)
  'suspicious process': 0.90,
  'credential dump': 0.90,
  'lateral movement': 0.90,

  // Rules where file hash is the key differentiator → highest threshold
  malware: 0.95,
  ransomware: 0.95,
};

/**
 * Get the similarity threshold for a specific rule name.
 * Falls back to the configured default if no override matches.
 */
const getThresholdForRule = (ruleName: string, defaultThreshold: number): number => {
  const lowerRule = ruleName.toLowerCase();
  for (const [pattern, threshold] of Object.entries(RULE_THRESHOLD_OVERRIDES)) {
    if (lowerRule.includes(pattern)) return threshold;
  }
  return defaultThreshold;
};

/**
 * Deduplication Strategy:
 *
 * **Phase 1 (Current)**: Jaccard similarity on lexical features
 * - Fast, deterministic, zero LLM cost
 * - Works in all deployments (no ML node required)
 * - ~85% accuracy for typical alert patterns
 *
 * **Phase 2 (Roadmap)**: ELSER semantic embeddings
 * - GitHub Issue: #16415
 * - Requires: ML node with ELSER deployed
 * - Expected improvement: +15-30% dedup rate
 * - Handles: encoded commands, randomized filenames, different log sources
 */

export interface AlertWithId {
  readonly _id: string;
  readonly _source: Record<string, unknown>;
}

interface DedupCluster {
  readonly leaderId: string;
  readonly leaderRiskScore: number;
  readonly memberIds: string[];
}

interface AlertFeatureEntry {
  readonly alert: AlertWithId;
  readonly features: ReturnType<typeof extractAlertFeatures>;
  readonly text: string;
  readonly hash: string;
}

export interface DeduplicationResult {
  readonly leaders: AlertWithId[];
  readonly clusters: DedupCluster[];
  readonly stats: {
    readonly totalAlerts: number;
    readonly uniqueClusters: number;
    readonly duplicatesRemoved: number;
    readonly deduplicationRate: number;
  };
}

const computeTextSimilarity = (textA: string, textB: string): number => {
  const tokensA = new Set(textA.toLowerCase().split(/\s+/));
  const tokensB = new Set(textB.toLowerCase().split(/\s+/));

  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) {
      intersection++;
    }
  }

  const unionSize = tokensA.size + tokensB.size - intersection;
  return unionSize > 0 ? intersection / unionSize : 0;
};

const buildFeatureMap = (alerts: AlertWithId[]): Map<string, AlertFeatureEntry> => {
  const featureMap = new Map<string, AlertFeatureEntry>();
  for (const alert of alerts) {
    const features = extractAlertFeatures(alert._source);
    const text = composeFeatureText(features);
    const hash = hashFeatureText(text);
    featureMap.set(alert._id, { alert, features, text, hash });
  }
  return featureMap;
};

const groupByKey = (
  featureMap: Map<string, AlertFeatureEntry>,
  keyFn: (entry: AlertFeatureEntry) => string
): Map<string, string[]> => {
  const groups = new Map<string, string[]>();
  for (const [alertId, entry] of featureMap) {
    const key = keyFn(entry);
    const existing = groups.get(key);
    if (existing) {
      existing.push(alertId);
    } else {
      groups.set(key, [alertId]);
    }
  }
  return groups;
};

class UnionFind {
  private readonly parent = new Map<string, string>();

  init(id: string): void {
    this.parent.set(id, id);
  }

  find(id: string): string {
    let root = id;
    let resolved = this.parent.get(root);
    while (resolved !== root && resolved !== undefined) {
      root = resolved;
      resolved = this.parent.get(root);
    }
    let current = id;
    while (current !== root) {
      const next = this.parent.get(current) ?? root;
      this.parent.set(current, root);
      current = next;
    }
    return root;
  }

  union(a: string, b: string): void {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) {
      this.parent.set(rootB, rootA);
    }
  }
}

const mergeByHashGroups = (hashGroups: Map<string, string[]>, uf: UnionFind): void => {
  for (const members of hashGroups.values()) {
    for (let i = 1; i < members.length; i++) {
      uf.union(members[0], members[i]);
    }
  }
};

const MAX_PAIRWISE_GROUP = 500;

const mergeBySimilarity = (
  ruleHostGroups: Map<string, string[]>,
  featureMap: Map<string, AlertFeatureEntry>,
  similarityThreshold: number,
  uf: UnionFind
): void => {
  for (const [groupKey, members] of ruleHostGroups.entries()) {
    if (members.length < 2) {
      continue;
    }

    // Extract rule name from group key for adaptive threshold
    const firstEntry = featureMap.get(members[0]);
    const ruleName = firstEntry?.features.ruleName ?? '';
    const effectiveThreshold = getThresholdForRule(ruleName, similarityThreshold);

    if (members.length > MAX_PAIRWISE_GROUP) {
      for (let i = 1; i < members.length; i++) {
        uf.union(members[0], members[i]);
      }
    } else {
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          const entryA = featureMap.get(members[i]);
          const entryB = featureMap.get(members[j]);
          if (entryA && entryB) {
            const similarity = computeTextSimilarity(entryA.text, entryB.text);
            if (similarity >= effectiveThreshold) {
              uf.union(members[i], members[j]);
            }
          }
        }
      }
    }
  }
};

const buildClusters = (
  featureMap: Map<string, AlertFeatureEntry>,
  uf: UnionFind
): { clusters: DedupCluster[]; leaders: AlertWithId[] } => {
  const clusterMap = new Map<string, string[]>();
  for (const alertId of featureMap.keys()) {
    const root = uf.find(alertId);
    const existing = clusterMap.get(root);
    if (existing) {
      existing.push(alertId);
    } else {
      clusterMap.set(root, [alertId]);
    }
  }

  const clusters: DedupCluster[] = [];
  const leaders: AlertWithId[] = [];

  for (const memberIds of clusterMap.values()) {
    let bestLeaderId = memberIds[0];
    const firstEntry = featureMap.get(memberIds[0]);
    let bestRiskScore = firstEntry?.features.riskScore ?? 0;

    for (const memberId of memberIds) {
      const entry = featureMap.get(memberId);
      const riskScore = entry?.features.riskScore ?? 0;
      if (riskScore > bestRiskScore) {
        bestRiskScore = riskScore;
        bestLeaderId = memberId;
      }
    }

    clusters.push({ leaderId: bestLeaderId, leaderRiskScore: bestRiskScore, memberIds });

    const leaderEntry = featureMap.get(bestLeaderId);
    if (leaderEntry) {
      leaders.push(leaderEntry.alert);
    }
  }

  return { clusters, leaders };
};

const createEmptyResult = (): DeduplicationResult => ({
  leaders: [],
  clusters: [],
  stats: { totalAlerts: 0, uniqueClusters: 0, duplicatesRemoved: 0, deduplicationRate: 0 },
});

/**
 * Jaccard-based deduplication (fallback when ELSER unavailable)
 */
const deduplicateWithJaccard = async (
  alerts: AlertWithId[],
  featureMap: Map<string, AlertFeatureEntry>,
  similarityThreshold: number
): Promise<Map<string, string[]>> => {
  const hashGroups = groupByKey(featureMap, (entry) => entry.hash);
  const ruleHostGroups = groupByKey(
    featureMap,
    (entry) => `${entry.features.ruleName}::${entry.features.hostName ?? 'unknown'}`
  );

  const uf = new UnionFind();
  for (const alertId of featureMap.keys()) {
    uf.init(alertId);
  }

  mergeByHashGroups(hashGroups, uf);
  mergeBySimilarity(ruleHostGroups, featureMap, similarityThreshold, uf);

  // Build cluster map
  const clusters = new Map<string, string[]>();
  for (const alertId of featureMap.keys()) {
    const root = uf.find(alertId);
    const members = clusters.get(root) ?? [];
    members.push(alertId);
    clusters.set(root, members);
  }

  return clusters;
};

export const deduplicateAlerts = async ({
  alerts,
  esClient,
  logger,
  similarityThreshold = DEFAULT_SIMILARITY_THRESHOLD,
}: {
  alerts: AlertWithId[];
  esClient: ElasticsearchClient;
  logger: Logger;
  similarityThreshold?: number;
}): Promise<DeduplicationResult> => {
  if (alerts.length === 0) {
    return createEmptyResult();
  }

  const featureMap = buildFeatureMap(alerts);

  // Try ELSER semantic dedup first, fall back to Jaccard
  let clusterMap: Map<string, string[]>;
  let method: string;

  const elserClusters = await deduplicateWithHybridApproach(
    alerts,
    esClient,
    similarityThreshold ?? DEFAULT_SIMILARITY_THRESHOLD,
    logger
  );

  if (elserClusters) {
    clusterMap = elserClusters;
    method = 'elser';
    logger.info('Using ELSER semantic deduplication');
  } else {
    logger.info('Using Jaccard similarity deduplication (ELSER unavailable or failed)');
    clusterMap = await deduplicateWithJaccard(alerts, featureMap, similarityThreshold ?? DEFAULT_SIMILARITY_THRESHOLD);
    method = 'jaccard';
  }

  // Convert cluster map to cluster objects with leaders
  const clusters: DedupCluster[] = [];
  const leaders: AlertWithId[] = [];

  for (const [root, memberIds] of clusterMap) {
    let bestLeaderId = memberIds[0];
    const firstEntry = featureMap.get(memberIds[0]);
    let bestRiskScore = firstEntry?.features.riskScore ?? 0;

    for (const memberId of memberIds) {
      const entry = featureMap.get(memberId);
      const riskScore = entry?.features.riskScore ?? 0;
      if (riskScore > bestRiskScore) {
        bestRiskScore = riskScore;
        bestLeaderId = memberId;
      }
    }

    clusters.push({ leaderId: bestLeaderId, leaderRiskScore: bestRiskScore, memberIds });

    const leaderEntry = featureMap.get(bestLeaderId);
    if (leaderEntry) {
      leaders.push(leaderEntry.alert);
    }
  }

  const duplicatesRemoved = alerts.length - clusters.length;
  const deduplicationRate = alerts.length > 0 ? duplicatesRemoved / alerts.length : 0;

  logger.info(
    `deduplicateAlerts: ${alerts.length} alerts -> ${
      clusters.length
    } clusters (${duplicatesRemoved} duplicates removed, ${Math.round(
      deduplicationRate * 100
    )}% dedup rate)`
  );

  return {
    leaders,
    clusters,
    stats: {
      totalAlerts: alerts.length,
      uniqueClusters: clusters.length,
      duplicatesRemoved,
      deduplicationRate,
    },
  };
};
