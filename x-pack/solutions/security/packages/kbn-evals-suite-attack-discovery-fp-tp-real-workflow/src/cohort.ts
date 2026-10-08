/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CORPUS_NAMES, SANITY_ONLY_CORPORA, type CorpusName } from './constants';

/**
 * Which corpora a run grades.
 *
 *  - `all`    every vendored corpus (1,017 cases) — the historical default.
 *  - `scored` every corpus except the sanity-only ones (267 cases). This is the
 *             cohort a scored/gating run uses: GUIDE labels are noisy and must
 *             never feed an acceptance number.
 *  - `sanity` only the sanity-only corpora (750 cases), for corpus-level
 *             sanity checks.
 */
export const FP_TP_COHORTS = ['all', 'scored', 'sanity'] as const;

export type FpTpCohort = (typeof FP_TP_COHORTS)[number];

export const DEFAULT_COHORT: FpTpCohort = 'all';

/** Reads `FP_TP_COHORT`; unset or blank means {@link DEFAULT_COHORT}. Throws on an unknown value. */
export const resolveCohort = (raw: string | undefined): FpTpCohort => {
  const value = raw?.trim().toLowerCase();
  if (value === undefined || value === '') {
    return DEFAULT_COHORT;
  }
  if (!(FP_TP_COHORTS as readonly string[]).includes(value)) {
    throw new Error(`FP_TP_COHORT '${raw}' is not one of ${FP_TP_COHORTS.join(', ')}`);
  }
  return value as FpTpCohort;
};

export const corporaForCohort = (cohort: FpTpCohort): CorpusName[] => {
  const isSanity = (name: CorpusName) => SANITY_ONLY_CORPORA.includes(name);
  switch (cohort) {
    case 'scored':
      return CORPUS_NAMES.filter((name) => !isSanity(name));
    case 'sanity':
      return CORPUS_NAMES.filter(isSanity);
    default:
      return [...CORPUS_NAMES];
  }
};

/** Live-run cap per corpus when `FP_TP_MAX_EXAMPLES_PER_CORPUS` is unset. */
export const DEFAULT_MAX_EXAMPLES_PER_CORPUS = 15;

/**
 * Applies `FP_TP_MAX_EXAMPLES_PER_CORPUS` to one corpus's examples. Unset means
 * the default cap; a non-numeric or non-positive value means no cap (full sweep).
 */
export const capExamples = <T>(examples: T[], rawMax: string | undefined): T[] => {
  const max = Number(rawMax ?? DEFAULT_MAX_EXAMPLES_PER_CORPUS);
  return Number.isFinite(max) && max > 0 ? examples.slice(0, max) : examples;
};
