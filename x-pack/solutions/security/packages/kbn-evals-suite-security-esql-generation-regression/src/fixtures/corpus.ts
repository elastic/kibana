/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esqlGenerationDataset } from '../dataset';
import { esqlFixtureDocumentRequests } from './documents';
import { esqlFixtureIndicesCreateRequests } from './indices';

/**
 * Offline coverage check for the fixture corpus.
 *
 * The suite is only as good as the data its gold queries run against. An index
 * the fixtures create but never seed, or a gold query whose `FROM` sources
 * resolve to no seeded index, makes `ES|QL Result Equivalence` compare two
 * empty result sets and score 1.0 (`compareRowMultisets` returns a jaccard of 1
 * for 0 rows against 0 rows), i.e. the score stops depending on the model
 * entirely. This module reconstructs both relationships from the fixture
 * definitions themselves — no cluster, no query engine — so
 * `./setup.test.ts` can fail loudly instead of the suite silently regressing
 * to vacuous passes.
 *
 * The source extraction and wildcard matching below are deliberately local and
 * small: they only have to cover the query shapes the dataset holds (a leading
 * `FROM` / `TS` source command, optional quotes, comma-separated sources) and
 * the fixture index names, not ES|QL. The run-time truth stays the live
 * evaluation — `./setup.ts` re-asserts the seeded document counts against the
 * cluster before a single example runs.
 */

type Document = Record<string, unknown>;

/** Documents the corpus seeds, grouped by the index they land in. */
export function fixtureDocumentsByIndex(): Map<string, Document[]> {
  const byIndex = new Map<string, Document[]>();
  for (const request of esqlFixtureDocumentRequests) {
    const index = String(request.index);
    byIndex.set(index, [...(byIndex.get(index) ?? []), (request.document ?? {}) as Document]);
  }
  return byIndex;
}

/** Names of the indices `./indices.ts` creates. */
export const createdFixtureIndexNames: readonly string[] = esqlFixtureIndicesCreateRequests.map(
  (request) => request.index
);

/**
 * Expected document count per fixture index. Every index `./indices.ts`
 * creates is part of the corpus, so an unseeded one shows up as a `0` entry
 * rather than as a missing one.
 */
export function expectedFixtureDocumentCounts(): Map<string, number> {
  const counts = new Map(
    Array.from(fixtureDocumentsByIndex(), ([index, documents]) => [index, documents.length])
  );
  for (const name of createdFixtureIndexNames) {
    if (!counts.has(name)) counts.set(name, 0);
  }
  return counts;
}

/**
 * Fixture indices that exist but hold no documents. Every gold query that
 * targets one of these returns an empty result set.
 */
export function unseededFixtureIndices(): string[] {
  const counts = expectedFixtureDocumentCounts();
  return createdFixtureIndexNames.filter((name) => (counts.get(name) ?? 0) === 0);
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Mirrors Elasticsearch wildcard semantics for the patterns the golds use. */
export function matchesFixtureWildcard(indexName: string, pattern: string): boolean {
  const matcher = new RegExp(`^${pattern.split('*').map(escapeRegExp).join('.*')}$`);
  return matcher.test(indexName);
}

/** Sources of a gold query's `FROM` / `TS` clause. */
export function extractGoldSources(query: string): string[] {
  const match = /(?:^|\n|\|)\s*(?:from|ts)\s+([^\n|]+)/i.exec(query);
  if (!match) return [];

  return match[1]
    .split(',')
    .map((part) => part.trim().replace(/^["`]/, '').replace(/["`]$/, ''))
    .filter((part) => part.length > 0 && !part.startsWith('-'));
}

export interface GoldFixtureCoverage {
  /** Position of the example in `esqlGenerationDataset`. */
  index: number;
  question: string;
  /** Sources of the gold's `FROM` / `TS` clause. */
  sources: string[];
  /** Fixture indices those sources resolve to. */
  matchedIndices: string[];
  /** Subset of `matchedIndices` the corpus seeds with documents. */
  seededIndices: string[];
}

/**
 * Resolves every gold query's `FROM` sources against the fixture corpus. A
 * `seededIndices` of `[]` means the gold has no data to find: whatever the
 * model answers, `ES|QL Result Equivalence` can only ever compare empty result
 * sets.
 */
export function goldFixtureCoverage(
  examples: ReadonlyArray<{
    input?: { question?: string };
    output?: { query?: string };
  }> = esqlGenerationDataset
): GoldFixtureCoverage[] {
  const byIndex = fixtureDocumentsByIndex();
  const fixtureIndexNames = Array.from(byIndex.keys());

  return examples.map((example, index) => {
    const sources = extractGoldSources(example.output?.query ?? '');
    const matchedIndices = fixtureIndexNames.filter((name) =>
      sources.some((source) => matchesFixtureWildcard(name, source))
    );

    return {
      index,
      question: example.input?.question ?? '',
      sources,
      matchedIndices,
      seededIndices: matchedIndices.filter((name) => (byIndex.get(name) ?? []).length > 0),
    };
  });
}

/** Reads a dotted (`a.b.c`) field path out of a fixture document. */
export function documentField(document: Document, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (value, key) => (value && typeof value === 'object' ? (value as Document)[key] : undefined),
      document
    );
}

/** Number of documents per distinct key, e.g. requests per `source.ip`. */
export function countByKey(documents: readonly Document[], keyOf: (doc: Document) => string) {
  const counts = new Map<string, number>();
  for (const document of documents) {
    const key = keyOf(document);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/** Distinct values per key, e.g. distinct `dns.question.name` per domain. */
export function distinctValuesByKey(
  documents: readonly Document[],
  keyOf: (doc: Document) => string,
  valueOf: (doc: Document) => string
) {
  const values = new Map<string, Set<string>>();
  for (const document of documents) {
    const key = keyOf(document);
    values.set(key, (values.get(key) ?? new Set<string>()).add(valueOf(document)));
  }
  return values;
}

/** Largest count of a `countByKey` result, or 0 for an empty corpus. */
export function largestGroupSize(counts: Map<string, number>): number {
  return Array.from(counts.values()).reduce((max, count) => Math.max(max, count), 0);
}

/** Largest distinct-value count of a `distinctValuesByKey` result. */
export function largestDistinctGroupSize(values: Map<string, Set<string>>): number {
  return Array.from(values.values()).reduce((max, value) => Math.max(max, value.size), 0);
}
