/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { canonicalizeTag } from '@kbn/nightshift-investigations-plugin/common';

/**
 * Keyword ranking by PageRank over memory tags.
 *
 * A port of Deductive's `computeKeywordPageRank`: the graph is keywords, two
 * keywords share an edge when one memory carries both, and a memory's
 * usefulness × confidence decides how much weight each of its co-occurrence
 * pairs contributes. PageRank then finds the keywords that sit at the centre of
 * that graph — the ones that tie many memories together — rather than the ones
 * merely repeated often.
 */

/** One memory, reduced to what the graph is built from. */
export interface KeywordEntry {
  keywords: readonly string[];
  usefulness: number;
  confidence: number;
}

export interface KeywordPageRankOptions {
  dampingFactor?: number;
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

/**
 * Floor for a co-occurring pair: half a useful × five percent confident.
 *
 * A memory nobody has surfaced yet scores 0 × 0, and a graph that dropped those
 * edges would describe only the memories that happened to be read. The floor
 * keeps an unsurfaced memory contributing, at a fraction of a proven one's
 * weight.
 */
export const MIN_EDGE_WEIGHT = 0.5 * 0.05;

/**
 * Keywords kept before edges are built. The store's list route caps at
 * `MAX_PAGE_SIZE` pages, so this bounds the node count without cutting a real
 * store's vocabulary in practice.
 */
export const MAX_RANKED_KEYWORDS = 200;

/** Past this the cells stop being readable, and a treemap that big says nothing. */
export const MAX_TREEMAP_CELLS = 40;

/**
 * Area given to a keyword whose score is zero, so it still has a cell to be
 * clicked. A cell this small is a sliver, not a claim.
 */
export const MIN_CELL_AREA = 1e-6;

/**
 * The marker tag every stored document carries. It says "this is a memory", not
 * what the memory is about, so ranking it would only ever prove that the store
 * has memories.
 */
export const MEMORY_MARKER_TAG = 'memory';

type KeywordPairKey = `${number},${number}`;

const asUnit = (value: number): number => Math.min(Math.max(value, 0), 1);

/**
 * The canonical keywords of one entry, in order, marker tag dropped.
 *
 * Canonicalization is the only deviation from the original port, which trimmed
 * and lowercased. Real tags arrive as `invoke_agent`, `invoke-agent`, and
 * `Invoke Agent` for one concept, and a graph that ranked those separately would
 * report three weak keywords where there is one strong one.
 */
const entryKeywords = (keywords: readonly string[] | undefined): string[] => {
  const canonical: string[] = [];
  for (const keyword of keywords ?? []) {
    const key = canonicalizeTag(String(keyword));
    if (key === null || key === MEMORY_MARKER_TAG || canonical.includes(key)) continue;
    canonical.push(key);
  }
  return canonical;
};

/**
 * Raw PageRank over the co-occurrence graph, keyed by canonical keyword.
 *
 * Scores sum to 1 across all keywords; the treemap normalizes them for display.
 */
export function computeKeywordPageRank(
  entries: readonly KeywordEntry[],
  options: KeywordPageRankOptions = {}
): { scores: Record<string, number> } {
  const damping = options.dampingFactor ?? DEFAULT_DAMPING;
  const tolerance = options.tolerance ?? DEFAULT_TOLERANCE;
  const maxIterations = options.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  const maxKeywords = options.maxKeywords;

  let allowedKeywords: Set<string> | null = null;
  // Canonicalized once per entry and reused by both passes: `normalize('NFKC')`
  // is the most expensive thing in here, and this runs on the render path.
  const keywordsByEntry = entries.map((entry) => entryKeywords(entry.keywords));
  if (maxKeywords && maxKeywords > 0) {
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
  const weights = new Map<KeywordPairKey, number>();
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
        const ab = `${a},${b}` as KeywordPairKey;
        const ba = `${b},${a}` as KeywordPairKey;
        weights.set(ab, (weights.get(ab) ?? 0) + share);
        weights.set(ba, (weights.get(ba) ?? 0) + share);
      }
    }
  }

  const nodeCount = keywordToId.size;
  if (nodeCount === 0) return { scores: {} };

  const outgoing = new Array<number>(nodeCount).fill(0);
  // Flattened once: the iteration below runs it up to a hundred times, and
  // re-parsing `from,to` keys on every pass costs more than the arithmetic.
  const edges: Array<{ from: number; to: number; weight: number }> = [];
  weights.forEach((weight, key) => {
    const comma = key.indexOf(',');
    const from = Number(key.slice(0, comma));
    const to = Number(key.slice(comma + 1));
    outgoing[from] += weight;
    edges.push({ from, to, weight });
  });

  let ranks = new Array<number>(nodeCount).fill(1 / nodeCount);
  const teleport = 1 / nodeCount;

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const next = new Array<number>(nodeCount).fill((1 - damping) * teleport);
    for (const { from, to, weight } of edges) {
      const outWeight = outgoing[from];
      // A keyword that co-occurs with nothing keeps only its teleport mass, which
      // is how an isolated keyword settles at (1 - damping) / nodes rather than
      // pulling rank from keywords that are actually connected.
      if (outWeight <= 0) continue;
      next[to] += (damping * ranks[from] * weight) / outWeight;
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
  return { scores };
}

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

  const spellings = new Map<string, Map<string, number>>();
  const memories = new Map<string, number>();
  for (const entry of entries) {
    const counted = new Set<string>();
    for (const original of entry.keywords ?? []) {
      const key = canonicalizeTag(String(original));
      if (key === null || key === MEMORY_MARKER_TAG) continue;
      const bySpelling = spellings.get(key) ?? new Map<string, number>();
      bySpelling.set(String(original), (bySpelling.get(String(original)) ?? 0) + 1);
      spellings.set(key, bySpelling);
      if (!counted.has(key)) {
        counted.add(key);
        memories.set(key, (memories.get(key) ?? 0) + 1);
      }
    }
  }

  const { scores } = computeKeywordPageRank(entries, { maxKeywords: MAX_RANKED_KEYWORDS });
  const ranked = Object.entries(scores).filter(([keyword]) => !selected.has(keyword));
  if (ranked.length === 0) return [];

  const values = ranked.map(([, score]) => score);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  return ranked
    .map(([keyword, score]) => ({
      keyword,
      // Tags are stored verbatim, so `Cart Cache` and `cart-cache` are one
      // keyword with two spellings: the commonest one is what a person
      // recognizes, and it is what the cell is labelled with.
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
 * Pages carrying every selected keyword. AND, like the server-side filter.
 */
export const filterEntriesByKeywords = <T extends KeywordEntry>(
  entries: readonly T[],
  keywords: readonly string[]
): T[] => {
  const selected = keywords.map((keyword) => canonicalizeTag(keyword)).filter((kw) => kw !== null);
  if (selected.length === 0) return [...entries];
  return entries.filter((entry) => {
    const present = new Set(entryKeywords(entry.keywords));
    return selected.every((keyword) => present.has(keyword));
  });
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
    for (const original of entry.keywords ?? []) {
      const key = canonicalizeTag(String(original));
      if (key === null || key === MEMORY_MARKER_TAG) continue;
      const seen = spellings.get(key) ?? new Set<string>();
      seen.add(String(original));
      spellings.set(key, seen);
    }
  }
  return keywords.flatMap((keyword) => {
    const key = canonicalizeTag(keyword);
    if (key === null) return [];
    return [key, ...(spellings.get(key) ?? [])];
  });
};