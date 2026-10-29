/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  computeKeywordPageRank,
  MAX_RANKED_KEYWORDS,
  MAX_TREEMAP_CELLS,
  MIN_CELL_AREA,
  MIN_EDGE_WEIGHT,
  toKeywordCells,
  type KeywordEntry,
} from './keyword_page_rank';
import { MEMORY_KEYWORD_MAX_REQUESTS, MEMORY_KEYWORD_SIZE } from './use_memory';

const entry = (overrides: Partial<KeywordEntry> = {}): KeywordEntry => ({
  tags: [],
  usefulness: 1,
  confidence: 1,
  ...overrides,
});

/** A store-shaped corpus: the graph density the live index actually has. */
const storeOfSize = (pages: number, tagsPerPage: number): KeywordEntry[] =>
  Array.from({ length: pages }, (_, page) =>
    entry({
      tags: [
        'memory',
        // Every page shares these, so they are the hub the ranking should find.
        'agent-builder',
        'traces',
        ...Array.from({ length: tagsPerPage - 3 }, (_unused, index) => `topic-${page}-${index}`),
      ],
      usefulness: (page % 10) / 10,
      confidence: (page % 7) / 7,
    })
  );

const WARMUP_RUNS = 2;
const TIMED_RUNS = 10;
const CALIBRATION_RUNS = 15;

/**
 * A fixed CPU-bound workload, used to measure how much CPU this worker is being given right
 * now. Deliberately independent of `computeKeywordPageRank`: calibrating against the code
 * under test would let a regression inflate its own budget and hide itself.
 */
const calibrationWorkload = (): void => {
  const counts = new Map<string, number>();
  let tail = '';
  for (let i = 0; i < 20_000; i++) {
    const key = `k${i % 997}`;
    counts.set(key, (counts.get(key) ?? 0) + Math.sqrt(i));
    if (i % 100 === 0) tail = `${tail}${key}`.slice(-64);
  }
  // Prevent dead-code elimination.
  if (tail.length === 0 || counts.size === 0) throw new Error('dead-code-eliminated');
};

/** Fastest of `runs`, so a busy agent's scheduling counts less than the work itself. */
const fastestOf = (runs: number, work: () => void): number => {
  let fastest = Infinity;
  for (let run = 0; run < runs; run++) {
    const started = performance.now();
    work();
    fastest = Math.min(fastest, performance.now() - started);
  }
  return fastest;
};

/** Measured cost of ranking the largest store, expressed in calibration workloads. */
const RANKING_COST_IN_CALIBRATIONS = 6;

/** How many times its measured cost the ranking may take before this is a regression. */
const BUDGET_MULTIPLIER = 2;

describe('computeKeywordPageRank', () => {
  it('returns empty scores for empty entries', () => {
    expect(computeKeywordPageRank([])).toEqual({});
  });

  it('produces scores for co-occurring keywords', () => {
    const entries: KeywordEntry[] = [
      entry({ tags: ['foo', 'bar'] }),
      entry({ tags: ['foo', 'baz'] }),
      entry({ tags: ['foo', 'bar'], usefulness: 0.5 }),
    ];

    const scores = computeKeywordPageRank(entries, { maxIterations: 50, tolerance: 1e-8 });

    expect(Object.keys(scores).sort()).toEqual(['bar', 'baz', 'foo']);
    expect(scores.foo).toBeGreaterThan(0);
  });

  it('supports limiting to top keywords', () => {
    const entries: KeywordEntry[] = [
      entry({ tags: ['foo', 'bar'] }),
      entry({ tags: ['foo', 'baz'] }),
      entry({ tags: ['qux', 'zap'] }),
    ];

    const scores = computeKeywordPageRank(entries, { maxKeywords: 2 });
    expect(Object.keys(scores).length).toBeLessThanOrEqual(2);
  });

  it('ranks the hub keyword above the ones only it connects', () => {
    const entries: KeywordEntry[] = [
      entry({ tags: ['foo', 'bar'] }),
      entry({ tags: ['foo', 'baz'] }),
      entry({ tags: ['foo', 'bar'], usefulness: 0.5 }),
    ];

    const scores = computeKeywordPageRank(entries);

    expect(scores.foo).toBeGreaterThan(scores.bar);
    expect(scores.foo).toBeGreaterThan(scores.baz);
  });

  it('sums to one before normalization, so the scores are a ranking not a scale', () => {
    // Every keyword here co-occurs with another, so no mass is lost to a
    // dangling node; the dangling case is its own test below.
    const scores = computeKeywordPageRank([
      entry({ tags: ['a', 'b', 'c'] }),
      entry({ tags: ['b', 'c', 'd'] }),
      entry({ tags: ['a', 'e'] }),
    ]);

    const total = Object.values(scores).reduce((sum, score) => sum + score, 0);
    expect(total).toBeCloseTo(1, 6);
  });

  it('still creates edges for an entry with no usefulness signal at all', () => {
    // usefulness 0 × confidence 0 is zero, and a graph built from zero edges
    // would rank nothing at all — which is what MIN_EDGE_WEIGHT is for.
    const silent: KeywordEntry[] = [entry({ tags: ['foo', 'bar'], usefulness: 0, confidence: 0 })];
    const scores = computeKeywordPageRank(silent);

    expect(Object.keys(scores).sort()).toEqual(['bar', 'foo']);
    expect(scores.foo).toBeGreaterThan(0);
    expect(MIN_EDGE_WEIGHT).toBe(0.025);
  });

  it('weights edges by usefulness, so a proven memory outranks an unsurfaced one', () => {
    // PageRank normalizes by each node's outgoing weight, so a graph's overall
    // scale cancels out: what the usefulness signal changes is the ratio between
    // a well-supported pair and a floor-weighted one.
    const scores = computeKeywordPageRank([
      entry({ tags: ['foo', 'bar'] }),
      entry({ tags: ['foo', 'baz'], usefulness: 0, confidence: 0 }),
    ]);

    // `bar` hangs off one proven edge, `baz` off one floor-weight edge.
    expect(scores.bar).toBeGreaterThan(scores.baz);
    expect(scores.baz).toBeGreaterThan(0);
  });

  it('keeps a duplicate tag in one entry from becoming a keyword of its own', () => {
    const scores = computeKeywordPageRank([entry({ tags: ['foo', 'foo', 'bar'] })]);

    expect(Object.keys(scores).sort()).toEqual(['bar', 'foo']);
  });

  it('scores a lone keyword as a dangling node rather than dropping it', () => {
    const scores = computeKeywordPageRank([
      entry({ tags: ['alone'], usefulness: 1, confidence: 1 }),
    ]);

    // No edges to give it rank, so it keeps only its teleport mass: (1 - d) / n.
    expect(scores.alone).toBeCloseTo(0.15, 6);
  });

  it('merges tags that canonicalize to one keyword', () => {
    const scores = computeKeywordPageRank([
      entry({ tags: ['invoke_agent', 'kafka'] }),
      entry({ tags: ['invoke-agent', 'redis'] }),
      entry({ tags: ['Invoke Agent', 'otel'] }),
    ]);

    expect(Object.keys(scores).sort()).toEqual(['invoke-agent', 'kafka', 'otel', 'redis']);
    // One node, so it collects the rank of all three spellings.
    expect(scores['invoke-agent']).toBeGreaterThan(scores.kafka);
  });

  it('leaves identifiers alone, so an index pattern is not folded into a phrase', () => {
    const scores = computeKeywordPageRank([
      entry({ tags: ['traces-*', 'gen_ai.conversation.id'] }),
      entry({ tags: ['traces-*', 'ES|QL'] }),
    ]);

    expect(Object.keys(scores).sort()).toEqual(['es|ql', 'gen_ai.conversation.id', 'traces-*']);
  });

  it('excludes the internal marker tag, which says nothing about the topic', () => {
    const scores = computeKeywordPageRank([
      entry({ tags: ['memory', 'kafka', 'redis'] }),
      entry({ tags: ['memory', 'kafka', 'otel'] }),
    ]);

    expect(Object.keys(scores)).not.toContain('memory');
    expect(Object.keys(scores).sort()).toEqual(['kafka', 'otel', 'redis']);
  });

  it('ranks the largest store the keyword query fetches fast enough for the main thread', () => {
    const entries = storeOfSize(MEMORY_KEYWORD_SIZE * MEMORY_KEYWORD_MAX_REQUESTS, 25);
    let scores: Record<string, number> = {};
    const rank = () => {
      scores = computeKeywordPageRank(entries, { maxKeywords: MAX_RANKED_KEYWORDS });
    };

    fastestOf(WARMUP_RUNS, rank);
    const fastestMs = fastestOf(TIMED_RUNS, rank);

    fastestOf(WARMUP_RUNS, calibrationWorkload);
    const calibrationMs = fastestOf(CALIBRATION_RUNS, calibrationWorkload);

    expect(Object.keys(scores).length).toBeGreaterThan(0);
    // Relative to this machine, so the budget measures the algorithm and not how much
    // CPU the Jest worker happened to get.
    expect(fastestMs / calibrationMs).toBeLessThan(
      RANKING_COST_IN_CALIBRATIONS * BUDGET_MULTIPLIER
    );
  });
});

describe('toKeywordCells', () => {
  const store: KeywordEntry[] = [
    entry({ tags: ['memory', 'agent-builder', 'traces-*'], usefulness: 1, confidence: 1 }),
    entry({ tags: ['memory', 'agent-builder', 'cart-cache'], usefulness: 1, confidence: 1 }),
    entry({ tags: ['memory', 'cart-cache', 'redis'], usefulness: 1, confidence: 1 }),
    entry({ tags: ['memory', 'redis'], usefulness: 0, confidence: 0 }),
  ];

  it('ranks by PageRank and keys each cell by its canonical keyword', () => {
    const cells = toKeywordCells(store);

    expect(cells[0].keyword).toBe('agent-builder');
    expect(cells.map((cell) => cell.keyword)).toContain('cart-cache');
  });

  it('drops selected keywords rather than restyling them', () => {
    const cells = toKeywordCells(store, ['agent-builder']);

    expect(cells.map((cell) => cell.keyword)).not.toContain('agent-builder');
    // Four keywords in the fixture, one of them selected.
    expect(cells).toHaveLength(3);
  });

  it('normalizes the scores into [0, 1] and sizes the cells by them', () => {
    const cells = toKeywordCells(store);

    expect(Math.max(...cells.map((cell) => cell.score))).toBeCloseTo(1, 6);
    expect(Math.min(...cells.map((cell) => cell.score))).toBeCloseTo(0, 6);
    cells.forEach((cell) => {
      expect(cell.area).toBe(cell.score > 0 ? cell.score : MIN_CELL_AREA);
    });
  });

  it('counts the memories carrying each keyword, for the tooltip', () => {
    const cells = toKeywordCells(store);

    expect(cells.find((cell) => cell.keyword === 'redis')?.memories).toBe(2);
    expect(cells.find((cell) => cell.keyword === 'traces-*')?.memories).toBe(1);
  });

  it('caps the cells so the chart stays readable', () => {
    const wide = storeOfSize(200, 25);

    expect(toKeywordCells(wide)).toHaveLength(MAX_TREEMAP_CELLS);
  });

  it('has nothing to draw when every keyword is selected or no memory carries one', () => {
    expect(toKeywordCells([])).toEqual([]);
    expect(toKeywordCells(store, ['agent-builder', 'redis', 'cart-cache', 'traces-*'])).toEqual([]);
  });
});
