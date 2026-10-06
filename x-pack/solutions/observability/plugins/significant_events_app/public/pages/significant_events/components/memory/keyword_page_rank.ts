/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { canonicalizeTag } from '@kbn/nightshift-investigations-plugin/common';

/**
 * Keyword ranking by PageRank over memory tags: nodes are keywords, an edge joins
 * the tags of one memory, and its usefulness × confidence weights the edge.
 */

/** One memory, reduced to what the graph is built from. */
export interface KeywordEntry {
  tags: readonly string[];
  usefulness: number;
  confidence: number;
}

export interface KeywordPageRankOptions {
  tolerance?: number;
  maxIterations?: number;
  /** Keeps only the N most frequent keywords before any edge is built. */
  maxKeywords?: number;
}

export interface KeywordCell {
  /** Canonical key: what filtering, selection, and the graph compare. */
  keyword: string;
  /** Most frequent original spelling, which is what a person recognizes. */
  display: string;
  /** Min-max normalized PageRank in [0, 1]. What the tooltip reports. */
  score: number;
  /** What the partition sizes by: the normalized score, floored so it is visible. */
  area: number;
  /** How many memories carry this keyword. */
  memories: number;
}

const DEFAULT_DAMPING = 0.85;
const DEFAULT_TOLERANCE = 1e-6;
const DEFAULT_MAX_ITERATIONS = 100;

/** Floor so an unsurfaced memory (0 × 0) still contributes to the graph. */
export const MIN_EDGE_WEIGHT = 0.5 * 0.05;

/** Keywords kept before edges are built, bounding the node count. */
export const MAX_RANKED_KEYWORDS = 200;

/** Past this the cells stop being readable, and a treemap that big says nothing. */
export const MAX_TREEMAP_CELLS = 20;

/** Area for a zero-score keyword, so it still has a clickable cell. */
export const MIN_CELL_AREA = 1e-6;

/** The marker tag every document carries, which says nothing about its content. */
export const MEMORY_MARKER_TAG = 'memory';

const asUnit = (value: number): number => Math.min(Math.max(value, 0), 1);

/** Canonical keywords of one entry, in order, marker tag dropped. */
const entryKeywords = (keywords: readonly string[] | undefined): string[] => {
  const canonical: string[] = [];
  for (const keyword of keywords ?? []) {
    const key = canonicalizeTag(keyword);
    if (key === null || key === MEMORY_MARKER_TAG || canonical.includes(key)) continue;
    canonical.push(key);
  }
  return canonical;
};

/** Raw PageRank over the co-occurrence graph, keyed by canonical keyword. */
export function computeKeywordPageRank(
  entries: readonly KeywordEntry[],
  options: KeywordPageRankOptions = {}
): Record<string, number> {
  const tolerance = options.tolerance ?? DEFAULT_TOLERANCE;
  const maxIterations = options.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  const maxKeywords = options.maxKeywords;

  let allowedKeywords: Set<string> | null = null;
  // Canonicalized once per entry and reused by both passes.
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
    // Split across the entry's pairs rather than giving each pair the whole
    // weight: a memory with six keywords would otherwise inject six times the
    // graph volume of one with two keywords about the same thing.
    const pairs = (allowed.length * (allowed.length - 1)) / 2;
    const share = weight / pairs;

    // Nodes are created before the pair check, so a keyword that only ever
    // appears on its own is still a node — a dangling one, ranking at its
    // teleport mass rather than disappearing from the treemap.
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
  // Flattened once: the iteration below runs it up to a hundred times, and
  // walking the nested map on every pass would cost more than the arithmetic.
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
      // A keyword that co-occurs with nothing keeps only its teleport mass, which
      // is how an isolated keyword settles at (1 - damping) / nodes rather than
      // pulling rank from keywords that are actually connected.
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

/**
 * Every spelling of every keyword, with how often each was written, keyed first by
 * the canonical keyword.
 *
 * Tags are stored verbatim, so `Cart Cache` and `cart-cache` are one keyword with
 * two spellings. A tie goes to the first seen, which keeps the choice stable
 * across renders.
 */
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

/**
 * The spelling to show for each keyword, keyed canonically.
 */
export const toKeywordDisplayNames = (entries: readonly KeywordEntry[]): Map<string, string> =>
  new Map(
    [...countSpellings(entries)].map(([key, bySpelling]) => [key, mostFrequentSpelling(bySpelling)])
  );

/**
 * The treemap's rows: the top keywords of the whole set, ranked and capped.
 *
 * Selected keywords are dropped rather than restyled, so the chart never shows
 * the filter that produced it; the chip row above it names what is filtered.
 */
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
      // The commonest spelling is the one a person recognizes, and it is what
      // the cell is labelled with.
      display: mostFrequentSpelling(spellings.get(keyword)),
      // A flat set of scores has no meaningful order, so every keyword that has
      // any score is drawn at full size rather than one of them at 0.
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

/** Most frequent spelling of a keyword; the first seen wins a tie. */
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

/**
 * The tag terms to send the server for the selected keywords: each keyword's
 * canonical key plus every original spelling of it.
 *
 * Documents written before the write layer canonicalized their tags hold every
 * spelling, and the server matches a keyword against all of the terms that fold
 * to it. Selected keywords are stored as canonical keys, so the caller only ever
 * passes those.
 */
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
    // The canonical key is usually one of the spellings, so it is deduped rather
    // than sent twice: the terms travel in a URL.
    return [...new Set([key, ...(spellings.get(key) ?? [])])];
  });
};
