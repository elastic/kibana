/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  computeKeywordPageRank,
  filterEntriesByKeywords,
  MAX_RANKED_KEYWORDS,
  MAX_TREEMAP_CELLS,
  MIN_CELL_AREA,
  MIN_EDGE_WEIGHT,
  toKeywordCells,
  toTagFilterTerms,
  type KeywordEntry,
} from './keyword_page_rank';

const entry = (overrides: Partial<KeywordEntry> = {}): KeywordEntry => ({
  keywords: [],
  usefulness: 1,
  confidence: 1,
  ...overrides,
});

/** A store-shaped corpus: the graph density the live index actually has. */
const storeOfSize = (pages: number, tagsPerPage: number): KeywordEntry[] =>
  Array.from({ length: pages }, (_, page) =>
    entry({
      keywords: [
        'memory',
        // Every page shares these, so they are the hub the ranking should find.
        'agent-builder',
        'traces',
        ...Array.from({ length: tagsPerPage - 3 }, (_, i) => `topic-${page}-${i}`),
      ],
      usefulness: (page % 10) / 10,
      confidence: (page % 7) / 7,
    })
  );

describe('computeKeywordPageRank', () => {
  it('returns empty scores for empty entries', () => {
    expect(computeKeywordPageRank([]).scores).toEqual({});
  });

  it('produces scores for co-occurring keywords', () => {
    const entries: KeywordEntry[] = [
      entry({ keywords: ['foo', 'bar'] }),
      entry({ keywords: ['foo', 'baz'] }),
      entry({ keywords: ['foo', 'bar'], usefulness: 0.5 }),
    ];

    const { scores } = computeKeywordPageRank(entries, { maxIterations: 50, tolerance: 1e-8 });

    expect(Object.keys(scores).sort()).toEqual(['bar', 'baz', 'foo']);
    expect(scores.foo).toBeGreaterThan(0);
  });

  it('supports limiting to top keywords', () => {
    const entries: KeywordEntry[] = [
      entry({ keywords: ['foo', 'bar'] }),
      entry({ keywords: ['foo', 'baz'] }),
      entry({ keywords: ['qux', 'zap'] }),
    ];

    const { scores } = computeKeywordPageRank(entries, { maxKeywords: 2 });
    expect(Object.keys(scores).length).toBeLessThanOrEqual(2);
  });

  it('ranks the hub keyword above the ones only it connects', () => {
    const entries: KeywordEntry[] = [
      entry({ keywords: ['foo', 'bar'] }),
      entry({ keywords: ['foo', 'baz'] }),
      entry({ keywords: ['foo', 'bar'], usefulness: 0.5 }),
    ];

    const { scores } = computeKeywordPageRank(entries);

    expect(scores.foo).toBeGreaterThan(scores.bar);
    expect(scores.foo).toBeGreaterThan(scores.baz);
  });

  it('sums to one before normalization, so the scores are a ranking not a scale', () => {
    // Every keyword here co-occurs with another, so no mass is lost to a
    // dangling node; the dangling case is its own test below.
    const { scores } = computeKeywordPageRank([
      entry({ keywords: ['a', 'b', 'c'] }),
      entry({ keywords: ['b', 'c', 'd'] }),
      entry({ keywords: ['a', 'e'] }),
    ]);

    const total = Object.values(scores).reduce((sum, score) => sum + score, 0);
    expect(total).toBeCloseTo(1, 6);
  });

  it('still creates edges for an entry with no usefulness signal at all', () => {
    // usefulness 0 × confidence 0 is zero, and a graph built from zero edges
    // would rank nothing at all — which is what MIN_EDGE_WEIGHT is for.
    const silent: KeywordEntry[] = [
      entry({ keywords: ['foo', 'bar'], usefulness: 0, confidence: 0 }),
    ];
    const { scores } = computeKeywordPageRank(silent);

    expect(Object.keys(scores).sort()).toEqual(['bar', 'foo']);
    expect(scores.foo).toBeGreaterThan(0);
    expect(MIN_EDGE_WEIGHT).toBe(0.025);
  });

  it('weights edges by usefulness, so a proven memory outranks an unsurfaced one', () => {
    // PageRank normalizes by each node's outgoing weight, so a graph's overall
    // scale cancels out: what the usefulness signal changes is the ratio between
    // a well-supported pair and a floor-weighted one.
    const { scores } = computeKeywordPageRank([
      entry({ keywords: ['foo', 'bar'] }),
      entry({ keywords: ['foo', 'baz'], usefulness: 0, confidence: 0 }),
    ]);

    // `bar` hangs off one proven edge, `baz` off one floor-weight edge.
    expect(scores.bar).toBeGreaterThan(scores.baz);
    expect(scores.baz).toBeGreaterThan(0);
  });

  it('keeps a duplicate tag in one entry from becoming a keyword of its own', () => {
    const { scores } = computeKeywordPageRank([
      entry({ keywords: ['foo', 'foo', 'bar'] }),
    ]);

    expect(Object.keys(scores).sort()).toEqual(['bar', 'foo']);
  });

  it('scores a lone keyword as a dangling node rather than dropping it', () => {
    const { scores } = computeKeywordPageRank([
      entry({ keywords: ['alone'], usefulness: 1, confidence: 1 }),
    ]);

    // No edges to give it rank, so it keeps only its teleport mass: (1 - d) / n.
    expect(scores.alone).toBeCloseTo(0.15, 6);
  });

  it('merges tags that canonicalize to one keyword', () => {
    const { scores } = computeKeywordPageRank([
      entry({ keywords: ['invoke_agent', 'kafka'] }),
      entry({ keywords: ['invoke-agent', 'redis'] }),
      entry({ keywords: ['Invoke Agent', 'otel'] }),
    ]);

    expect(Object.keys(scores).sort()).toEqual(['invoke-agent', 'kafka', 'otel', 'redis']);
    // One node, so it collects the rank of all three spellings.
    expect(scores['invoke-agent']).toBeGreaterThan(scores.kafka);
  });

  it('leaves identifiers alone, so an index pattern is not folded into a phrase', () => {
    const { scores } = computeKeywordPageRank([
      entry({ keywords: ['traces-*', 'gen_ai.conversation.id'] }),
      entry({ keywords: ['traces-*', 'ES|QL'] }),
    ]);

    expect(Object.keys(scores).sort()).toEqual([
      'es|ql',
      'gen_ai.conversation.id',
      'traces-*',
    ]);
  });

  it('excludes the internal marker tag, which says nothing about the topic', () => {
    const { scores } = computeKeywordPageRank([
      entry({ keywords: ['memory', 'kafka', 'redis'] }),
      entry({ keywords: ['memory', 'kafka', 'otel'] }),
    ]);

    expect(Object.keys(scores)).not.toContain('memory');
    expect(Object.keys(scores).sort()).toEqual(['kafka', 'otel', 'redis']);
  });

  it('ranks 200 pages of 25 tags fast enough for the main thread', () => {
    const entries = storeOfSize(200, 25);

    const started = performance.now();
    const { scores } = computeKeywordPageRank(entries, { maxKeywords: MAX_RANKED_KEYWORDS });
    const elapsed = performance.now() - started;
    // Reported in the PR: this is the number that says a worker is not needed.
    console.log(`pagerank: 200 pages x 25 tags in ${elapsed.toFixed(1)} ms`);

    expect(Object.keys(scores).length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(50);
  });
});

describe('toKeywordCells', () => {
  const store: KeywordEntry[] = [
    entry({ keywords: ['memory', 'agent-builder', 'traces-*'], usefulness: 1, confidence: 1 }),
    entry({ keywords: ['memory', 'agent-builder', 'Cart Cache'], usefulness: 1, confidence: 1 }),
    entry({ keywords: ['memory', 'agent builder', 'redis'], usefulness: 1, confidence: 1 }),
    entry({ keywords: ['memory', 'redis'], usefulness: 0, confidence: 0 }),
  ];

  it('ranks by PageRank and labels each cell with the commonest spelling', () => {
    const cells = toKeywordCells(store);

    expect(cells[0].keyword).toBe('agent-builder');
    // `agent-builder` is spelled two ways and `agent builder` once, so the
    // hyphenated spelling is the one a person wrote most often.
    expect(cells[0].display).toBe('agent-builder');
    expect(cells.map((cell) => cell.display)).toContain('Cart Cache');
  });

  it('drops selected keywords rather than restyling them', () => {
    const cells = toKeywordCells(store, ['agent-builder']);

    expect(cells.map((cell) => cell.keyword)).not.toContain('agent-builder');
    expect(cells.length).toBe(store[0].keywords.length + store[2].keywords.length - 3);
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

describe('filterEntriesByKeywords', () => {
  const store: KeywordEntry[] = [
    entry({ keywords: ['kafka', 'redis'] }),
    entry({ keywords: ['kafka'] }),
    entry({ keywords: ['redis'] }),
  ];

  it('returns everything when nothing is selected', () => {
    expect(filterEntriesByKeywords(store, [])).toHaveLength(3);
  });

  it('ANDs the selected keywords, as the server-side filter does', () => {
    expect(filterEntriesByKeywords(store, ['kafka'])).toHaveLength(2);
    expect(filterEntriesByKeywords(store, ['kafka', 'redis'])).toHaveLength(1);
    expect(filterEntriesByKeywords(store, ['kafka', 'otel'])).toHaveLength(0);
  });

  it('matches a keyword however it was spelled', () => {
    const spelled = [entry({ keywords: ['Cart Cache', 'kafka'] })];

    expect(filterEntriesByKeywords(spelled, ['cart-cache'])).toHaveLength(1);
    expect(filterEntriesByKeywords(spelled, ['CART_CACHE'])).toHaveLength(1);
  });
});

describe('toTagFilterTerms', () => {
  const store: KeywordEntry[] = [
    entry({ keywords: ['memory', 'Cart Cache', 'cart-cache'] }),
    entry({ keywords: ['memory', 'CART_CACHE'] }),
  ];

  it('sends the canonical key plus every spelling of it', () => {
    expect(toTagFilterTerms(store, ['cart-cache']).sort()).toEqual([
      'CART_CACHE',
      'Cart Cache',
      'cart-cache',
      'cart-cache',
    ]);
  });

  it('sends nothing but the selected keywords and their spellings', () => {
    expect(toTagFilterTerms(store, [])).toEqual([]);
    // The marker tag is not a keyword, so it is never in the selection.
    expect(toTagFilterTerms(store, ['cart-cache'])).not.toContain('memory');
  });
});