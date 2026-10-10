/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CORPUS_CASE_COUNTS, CORPUS_NAMES } from './constants';
import {
  capExamples,
  corporaForCohort,
  DEFAULT_MAX_EXAMPLES_PER_CORPUS,
  resolveCohort,
  hasEvidence,
  partitionByEvidence,
} from './cohort';
import { loadCorpusExamples } from './corpus_loader';

const total = (names: readonly (keyof typeof CORPUS_CASE_COUNTS)[]) =>
  names.reduce((sum, name) => sum + CORPUS_CASE_COUNTS[name], 0);

describe('resolveCohort', () => {
  it('defaults to all when unset or blank', () => {
    expect(resolveCohort(undefined)).toBe('all');
    expect(resolveCohort('  ')).toBe('all');
  });

  it('accepts the known cohorts case-insensitively', () => {
    expect(resolveCohort('scored')).toBe('scored');
    expect(resolveCohort(' SANITY ')).toBe('sanity');
  });

  it('throws on an unknown cohort rather than silently grading everything', () => {
    expect(() => resolveCohort('scorred')).toThrow(/FP_TP_COHORT 'scorred'/);
  });
});

describe('corporaForCohort', () => {
  it('all keeps every corpus (1,017 cases)', () => {
    expect(corporaForCohort('all')).toEqual(CORPUS_NAMES);
    expect(total(corporaForCohort('all'))).toBe(1017);
  });

  it('scored excludes guide-sanity and leaves the 267 non-sanity cases', () => {
    const names = corporaForCohort('scored');
    expect(names).not.toContain('guide-sanity');
    expect(names).toHaveLength(CORPUS_NAMES.length - 1);
    expect(total(names)).toBe(267);
  });

  it('sanity is only guide-sanity (750 cases)', () => {
    expect(corporaForCohort('sanity')).toEqual(['guide-sanity']);
    expect(total(corporaForCohort('sanity'))).toBe(750);
  });

  it('no loaded example in the scored cohort is flagged sanityOnly', () => {
    const flagged = corporaForCohort('scored')
      .flatMap((name) => loadCorpusExamples(name))
      .filter((example) => example.metadata.sanityOnly);
    expect(flagged).toEqual([]);
  });
});

describe('capExamples', () => {
  const items = Array.from({ length: 40 }, (_, i) => i);

  it('caps at the default when FP_TP_MAX_EXAMPLES_PER_CORPUS is unset', () => {
    expect(capExamples(items, undefined)).toHaveLength(DEFAULT_MAX_EXAMPLES_PER_CORPUS);
  });

  it('honours an explicit cap', () => {
    expect(capExamples(items, '5')).toEqual([0, 1, 2, 3, 4]);
  });

  it.each(['0', '-1', 'abc'])('treats %s as no cap (full sweep)', (raw) => {
    expect(capExamples(items, raw)).toHaveLength(40);
  });

  it('composes with the scored cohort: at most N per non-sanity corpus', () => {
    const capped = corporaForCohort('scored').flatMap((name) =>
      capExamples(loadCorpusExamples(name), '3')
    );
    expect(capped.length).toBe(
      corporaForCohort('scored').reduce(
        (sum, name) => sum + Math.min(3, CORPUS_CASE_COUNTS[name]),
        0
      )
    );
  });
});

describe('evidenced cohort', () => {
  it('uses the non-sanity corpora', () => {
    expect(corporaForCohort('evidenced')).toEqual(corporaForCohort('scored'));
    expect(resolveCohort('evidenced')).toBe('evidenced');
  });

  it('keeps rows with events and counts the rest as excluded, before any cap', () => {
    const rows = [
      { input: { payload: { events: [{}] } } },
      { input: { payload: { events: [] } } },
      { input: { payload: { matched_events: [{}] } } },
      { input: { payload: {} } },
    ];
    const { scored, excluded } = partitionByEvidence(rows);
    expect(scored).toHaveLength(1);
    expect(excluded).toBe(3);
    expect(hasEvidence({ events: [{}] })).toBe(true);
    expect(hasEvidence({ events: 'x' })).toBe(false);
  });
});
