/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { canonicalizeTag } from '@kbn/nightshift-investigations-plugin/common';

/** PageRank over memory tags: nodes are keywords, an edge joins one memory's tags. */
export interface KeywordEntry {
  tags: readonly string[];
  usefulness: number;
  confidence: number;
}

export interface KeywordPageRankOptions {
  tolerance?: number;
  maxIterations?: number;
  maxKeywords?: number;
}

export interface KeywordCell {
  /** Canonical key: what filtering, selection, and the graph compare. */
  keyword: string;
  display: string;
  /** Min-max normalized PageRank in [0, 1]. */
  score: number;
  area: number;
  memories: number;
}

const DEFAULT_DAMPING = 0.85;
const DEFAULT_TOLERANCE = 1e-6;
const DEFAULT_MAX_ITERATIONS = 100;

/** Floor so an unsurfaced memory (0 × 0) still contributes to the graph. */
export const MIN_EDGE_WEIGHT = 0.5 * 0.05;

/** Caps the node count before edges are built. */
export const MAX_RANKED_KEYWORDS = 200;

export const MAX_TREEMAP_CELLS = 20;

export const MIN_CELL_AREA = 1e-6;

/** The marker tag every document carries, which says nothing about its content. */
export const MEMORY_MARKER_TAG = 'memory';

const asUnit = (value: number): number => Math.min(Math.max(value, 0), 1);

const entryKeywords = (keywords: readonly string[] | undefined): string[] => {
  const canonical: string[] = [];
  for (const keyword of keywords ?? []) {
    const key = canonicalizeTag(keyword);
    if (key === null || key === MEMORY_MARKER_TAG || canonical.includes(key)) continue;
    canonical.push(key);
  }
  return canonical;
};

export function computeKeywordPageRank(
  entries: readonly KeywordEntry[],
  options: KeywordPageRankOptions = {}
): Record<string, number> {
  const tolerance = options.tolerance ?? DEFAULT_TOLERANCE;
  const maxIterations = options.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  const maxKeywords = options.maxKeywords;

  let allowedKeywords: Set<string> | null = null;
  const keywordsByEntry = entries.map((entry) => entryKeywords(entry.tags));
  if (maxKeywords !== undefined) {
    const counts = new Map<string, number>();
    for (const keywords of keywordsByEntry) {
      for (const keyword of keywords) {
        counts.set(keyword, (counts.get(keyword) ?? 0) + 1);
      }
    }
    allowedKeywords = new Set(
      [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, maxKeywords)
        .map(([keyword]) => keyword)
    );
  }

  const keywordToId = new Map<string, number>();
  const weights = new Map<number, Map<number, number>>();
  let nextId = 0;

  const getId = (keyword: string): number => {
    const existing = keywordToId.get(keyword);
    if (existing !== undefined) return existing;
    keywordToId.set(keyword, nextId);
    return nextId++;
  };

  for (const [index, entry] of entries.entries()) {
    const keywords = keywordsByEntry[index];
    const allowed = allowedKeywords
      ? keywords.filter((keyword) => allowedKeywords!.has(keyword))
      : keywords;
    if (allowed.length === 0) continue;

    const weight = Math.max(asUnit(entry.usefulness) * asUnit(entry.confidence), MIN_EDGE_WEIGHT);
    const pairs = (allowed.length * (allowed.length - 1)) / 2;
    const share = weight / pairs;

    const ids = allowed.map(getId);
    if (ids.length < 2) continue;

    for (let i = 0; i < ids.length; i += 1) {
      for (let j = i + 1; j < ids.length; j += 1) {
        const a = ids[i];
        const b = ids[j];
        const fromA = weights.get(a) ?? new Map<number, number>();
        fromA.set(b, (fromA.get(b) ?? 0) + share);
        weights.set(a, fromA);
        const fromB = weights.get(b) ?? new Map<number, number>();
        fromB.set(a, (fromB.get(a) ?? 0) + share);
        weights.set(b, fromB);
      }
    }
  }

  const nodeCount = keywordToId.size;
  if (nodeCount === 0) return {};

  const outgoing = new Array<number>(nodeCount).fill(0);
  const edges: Array<{ from: number; to: number; weight: number }> = [];
  weights.forEach((targets, from) => {
    targets.forEach((weight, to) => {
      outgoing[from] += weight;
      edges.push({ from, to, weight });
    });
  });

  let ranks = new Array<number>(nodeCount).fill(1 / nodeCount);
  const teleport = 1 / nodeCount;

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const next = new Array<number>(nodeCount).fill((1 - DEFAULT_DAMPING) * teleport);
    for (const { from, to, weight } of edges) {
      const outWeight = outgoing[from];
      if (outWeight <= 0) continue;
      next[to] += (DEFAULT_DAMPING * ranks[from] * weight) / outWeight;
    }

    let change = 0;
    for (let i = 0; i < nodeCount; i += 1) change += Math.abs(next[i] - ranks[i]);
    ranks = next;
    if (change < tolerance) break;
  }

  const scores: Record<string, number> = {};
  keywordToId.forEach((id, keyword) => {
    scores[keyword] = ranks[id] ?? 0;
  });
  return scores;
}

const countSpellings = (entries: readonly KeywordEntry[]): Map<string, Map<string, number>> => {
  const spellings = new Map<string, Map<string, number>>();
  for (const entry of entries) {
    for (const original of entry.tags ?? []) {
      const key = canonicalizeTag(original);
      if (key === null || key === MEMORY_MARKER_TAG) continue;
      const bySpelling = spellings.get(key) ?? new Map<string, number>();
      bySpelling.set(original, (bySpelling.get(original) ?? 0) + 1);
      spellings.set(key, bySpelling);
    }
  }
  return spellings;
};

export const toKeywordDisplayNames = (entries: readonly KeywordEntry[]): Map<string, string> =>
  new Map(
    [...countSpellings(entries)].map(([key, bySpelling]) => [key, mostFrequentSpelling(bySpelling)])
  );

export const toKeywordCells = (
  entries: readonly KeywordEntry[],
  selectedKeywords: readonly string[] = []
): KeywordCell[] => {
  const selected = new Set(selectedKeywords);

  const spellings = countSpellings(entries);
  const memories = new Map<string, number>();
  for (const entry of entries) {
    const counted = new Set<string>();
    for (const keyword of entryKeywords(entry.tags)) {
      if (counted.has(keyword)) continue;
      counted.add(keyword);
      memories.set(keyword, (memories.get(keyword) ?? 0) + 1);
    }
  }

  const scores = computeKeywordPageRank(entries, { maxKeywords: MAX_RANKED_KEYWORDS });
  const ranked = Object.entries(scores).filter(([keyword]) => !selected.has(keyword));
  if (ranked.length === 0) return [];

  const values = ranked.map(([, score]) => score);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  return ranked
    .map(([keyword, score]) => ({
      keyword,
      display: mostFrequentSpelling(spellings.get(keyword)),
      // A flat score set has no order, so any positive score is drawn at full size.
      score: range === 0 ? (score > 0 ? 1 : 0) : (score - min) / range,
      area: 0,
      memories: memories.get(keyword) ?? 0,
    }))
    .map((cell) => ({
      ...cell,
      area: cell.score > 0 ? cell.score : MIN_CELL_AREA,
    }))
    .sort((a, b) => b.area - a.area || a.keyword.localeCompare(b.keyword))
    .slice(0, MAX_TREEMAP_CELLS);
};

const mostFrequentSpelling = (bySpelling: Map<string, number> | undefined): string => {
  if (bySpelling === undefined) return '';
  let best = '';
  let bestCount = -1;
  for (const [spelling, count] of bySpelling) {
    if (count > bestCount) {
      best = spelling;
      bestCount = count;
    }
  }
  return best;
};

/** Canonical key plus every stored spelling, for pre-canonicalization documents. */
export const toTagFilterTerms = (
  entries: readonly KeywordEntry[],
  keywords: readonly string[]
): string[] => {
  const spellings = new Map<string, Set<string>>();
  for (const entry of entries) {
    for (const original of entry.tags ?? []) {
      const key = canonicalizeTag(original);
      if (key === null || key === MEMORY_MARKER_TAG) continue;
      const seen = spellings.get(key) ?? new Set<string>();
      seen.add(original);
      spellings.set(key, seen);
    }
  }
  return keywords.flatMap((keyword) => {
    const key = canonicalizeTag(keyword);
    if (key === null) return [];
    return [...new Set([key, ...(spellings.get(key) ?? [])])];
  });
};
