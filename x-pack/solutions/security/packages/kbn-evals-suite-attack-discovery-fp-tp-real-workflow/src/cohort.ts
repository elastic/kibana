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
 *  - `evidenced` (DEFAULT) the non-sanity rows that carry raw events and an
 *             uncontested gold label. Only these can be seeded with entity and event
 *             evidence, so only these can produce a verdict; every other row is
 *             excluded (not scored, not counted as an abstention failure).
 *  - `scored` every corpus except the sanity-only ones (267 cases). EXPLORATORY: rows
 *             without raw events abstain by design, so accuracy over this cohort
 *             measures missing harness evidence, not model correctness.
 *  - `all`    every vendored corpus (1,017 cases) — full sweep, same caveat as `scored`.
 *  - `sanity` only the sanity-only corpora (750 cases), for corpus-level sanity checks.
 *
 * Contested-label rows (see {@link CONTESTED_MUTATION_TYPES}) are excluded from every
 * cohort.
 */
export const FP_TP_COHORTS = ['all', 'scored', 'sanity', 'evidenced'] as const;

export type FpTpCohort = (typeof FP_TP_COHORTS)[number];

export const DEFAULT_COHORT: FpTpCohort = 'evidenced';

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
    case 'evidenced':
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

/**
 * The cap value a cohort actually uses. `evidenced` is a small, fully eligible set,
 * so an unset cap means no cap there: the default of 15 would silently drop eligible
 * rows. An explicit value still wins.
 */
export const effectiveMaxExamples = (
  cohort: FpTpCohort,
  rawMax: string | undefined
): string | undefined => (cohort === 'evidenced' && rawMax === undefined ? '0' : rawMax);

/** True when the case payload carries raw events the seeder can index. */
export const hasEvidence = (payload: Record<string, unknown>): boolean =>
  Array.isArray(payload.events) && payload.events.length > 0;

export interface EvidencePartition<T> {
  readonly scored: T[];
  readonly excluded: number;
}

/**
 * Splits examples into those that carry raw events and the count of those that do
 * not. Run before {@link capExamples} so the cap never hides eligible rows.
 */
export const partitionByEvidence = <T extends { input: { payload: Record<string, unknown> } }>(
  examples: T[]
): EvidencePartition<T> => {
  const scored = examples.filter((example) => hasEvidence(example.input.payload));
  return { scored, excluded: examples.length - scored.length };
};

/**
 * Adversarial-twin mutation types whose gold label is CONTESTED, per
 * `docs/label_integrity_findings.md` and the reviewer findings on the corpus:
 *
 *  - `domain-swap`, `entity-role-swap`, `parent-process-spoof` (gold `false_positive`)
 *    rewrite one field but keep the base chain's malicious event messages (and, for
 *    domain-swap, the original C2 indicator), so the seeded evidence still describes the
 *    attack. A verdict that reads it and answers `true_positive` may be right.
 *  - `chain-reorder` (gold `inconclusive`) only reverses the array: timestamps, sequence
 *    numbers and parent pids still describe the intact TP chain, and the workflow sorts
 *    events chronologically before judging them.
 *
 * Scoring either against its gold label penalizes evidence-based verdicts and rewards
 * unsafe closes. The corpus's own rule is that a mutation leaving the documented
 * invariants intact is discarded, never relabelled, so these rows stay vendored (the
 * corpus is owned elsewhere) but are never graded; the exclusion is printed at startup.
 */
export const CONTESTED_MUTATION_TYPES: readonly string[] = [
  'domain-swap',
  'entity-role-swap',
  'parent-process-spoof',
  'chain-reorder',
];

interface GradeableExample {
  input: { payload: Record<string, unknown> };
  metadata: {
    labelProvenance: string;
    mutationSpec?: { type: string };
  };
}

/** True when this row is an adversarial mutation whose gold label is documented as contested. */
export const hasContestedLabel = (example: GradeableExample): boolean =>
  example.metadata.labelProvenance === 'adversarial-mutation' &&
  CONTESTED_MUTATION_TYPES.includes(example.metadata.mutationSpec?.type ?? '');

export interface GradingSelection<T> {
  readonly graded: T[];
  /** Rows dropped because their gold label is contested (see {@link CONTESTED_MUTATION_TYPES}). */
  readonly excludedContested: number;
  /** Rows dropped because they carry no raw events (`evidenced` cohort only). */
  readonly excludedNoEvidence: number;
}

/**
 * The rows of one corpus that a cohort grades: contested-label rows are dropped from
 * every cohort, and the `evidenced` cohort additionally drops rows with no raw events.
 * The counts let the run report why the denominator shrank.
 */
export const selectGradedRows = <T extends GradeableExample>(
  examples: T[],
  cohort: FpTpCohort
): GradingSelection<T> => {
  const uncontested = examples.filter((example) => !hasContestedLabel(example));
  const excludedContested = examples.length - uncontested.length;
  if (cohort !== 'evidenced') {
    return { graded: uncontested, excludedContested, excludedNoEvidence: 0 };
  }
  const { scored, excluded } = partitionByEvidence(uncontested);
  return { graded: scored, excludedContested, excludedNoEvidence: excluded };
};
