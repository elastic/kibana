/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import {
  CORPUS_CASE_COUNTS,
  CORPUS_NAMES,
  LABELS,
  LABEL_PROVENANCES,
  PROVISIONAL_CORPORA,
  SANITY_ONLY_CORPORA,
  type CorpusName,
  type Label,
  type LabelProvenance,
} from './constants';

/**
 * One canonical corpus case, as produced by the alertzero-datasets corpora
 * (schema mirrors `validate.py` in the external `alertzero-datasets` repo).
 */
export interface CorpusCase {
  case_id: string;
  corpus: CorpusName;
  label: Label;
  label_provenance: LabelProvenance;
  source_ref: string;
  payload: Record<string, unknown>;
  gold_rationale: string;
  /** Present on every adversarial-mutation case; names the broken invariant. */
  mutation_spec?: {
    type: string;
    description: string;
    broken_invariant: string;
  };
}

/** A corpus case mapped onto the `@kbn/evals` Example shape. */
export interface CorpusExample {
  input: { caseId: string; payload: Record<string, unknown> };
  output: { classification: Label };
  expected: { label: Label };
  metadata: {
    caseId: string;
    corpus: CorpusName;
    label: Label;
    labelProvenance: LabelProvenance;
    sourceRef: string;
    goldRationale: string;
    /** True for corpora whose labels must never gate releases (GUIDE noise). */
    sanityOnly: boolean;
    /** True for corpora whose labels are still PROVISIONAL (pending review). */
    provisional: boolean;
    mutationSpec?: CorpusCase['mutation_spec'];
  };
}

/** Re-exported Example-compatible type for the suite spec. */
export type { CorpusExample as Example };

const CORPORA_DIR = join(__dirname, '..', 'corpora');

const corpusPath = (name: CorpusName) => join(CORPORA_DIR, `${name.replaceAll('-', '_')}.jsonl`);

const assertNonEmpty = (value: unknown, field: string, where: string): void => {
  if (value === undefined || value === null) {
    throw new Error(`${where}: missing required field '${field}'`);
  }
  if (typeof value === 'string' && value.trim() === '') {
    throw new Error(`${where}: required field '${field}' is empty`);
  }
  if (Array.isArray(value) && value.length === 0) {
    throw new Error(`${where}: required field '${field}' is empty`);
  }
};

/**
 * Validates a single parsed line against the canonical schema — the same
 * checks `validate.py` performs, ported to TS: required fields present and
 * non-empty, label/provenance enums, consistent corpus column, unique ids.
 * Throws on the first violation.
 */
export const parseCase = (line: string, where: string, seenIds: Set<string>): CorpusCase => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch (error) {
    throw new Error(`${where}: invalid JSON: ${(error as Error).message}`);
  }

  const c = parsed as Record<string, unknown>;
  const requiredFields = [
    'case_id',
    'corpus',
    'label',
    'label_provenance',
    'source_ref',
    'payload',
    'gold_rationale',
  ] as const;
  for (const field of requiredFields) {
    assertNonEmpty(c[field], field, where);
  }

  if (!(LABELS as readonly string[]).includes(c.label as string)) {
    throw new Error(`${where}: label '${String(c.label)}' not in ${LABELS.join(', ')}`);
  }
  if (!(LABEL_PROVENANCES as readonly string[]).includes(c.label_provenance as string)) {
    throw new Error(
      `${where}: label_provenance '${String(c.label_provenance)}' not in ${LABEL_PROVENANCES.join(
        ', '
      )}`
    );
  }
  if (!CORPUS_NAMES.includes(c.corpus as CorpusName)) {
    throw new Error(`${where}: unknown corpus '${String(c.corpus)}'`);
  }
  if (seenIds.has(c.case_id as string)) {
    throw new Error(`${where}: duplicate case_id '${String(c.case_id)}'`);
  }
  seenIds.add(c.case_id as string);

  const caseObj = c as unknown as CorpusCase;
  if (caseObj.label_provenance === 'adversarial-mutation' && caseObj.mutation_spec === undefined) {
    throw new Error(
      `${where}: adversarial-mutation case '${caseObj.case_id}' is missing mutation_spec`
    );
  }

  return caseObj;
};

/**
 * Loads and validates one vendored JSONL corpus. Throws on any schema,
 * enum, count, or duplication violation — a corrupt corpus must never reach
 * the eval runner silently.
 */
export const loadCorpus = (name: CorpusName): CorpusCase[] => {
  const raw = readFileSync(corpusPath(name), 'utf8');
  const cases: CorpusCase[] = [];
  const seenIds = new Set<string>();

  raw.split('\n').forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed === '') {
      return;
    }
    cases.push(parseCase(trimmed, `${name}.jsonl:${index + 1}`, seenIds));
  });

  const expected = CORPUS_CASE_COUNTS[name];
  if (cases.length !== expected) {
    throw new Error(
      `${name}.jsonl: case count ${cases.length} does not match known value ${expected}`
    );
  }

  // Every case in `<name>.jsonl` must declare that same corpus name. The mutation
  // corpora used to be stamped `tp-chains` in the data, which folded 33 cases
  // (3 tp-chains + 15 adversarial-twins + 15 perturbations) into a single
  // reporting bucket. The data is corrected at the source; the loader fails
  // loudly instead of compensating with a family remap.
  const foreign = cases.find((c) => c.corpus !== name);
  if (foreign) {
    throw new Error(`${name}.jsonl: mixed corpus values in file (found '${foreign.corpus}')`);
  }

  return cases;
};

/** Maps a validated case onto an `@kbn/evals` Example with usage flags. */
export const toExample = (c: CorpusCase): CorpusExample => ({
  input: { caseId: c.case_id, payload: c.payload },
  output: { classification: c.label },
  expected: { label: c.label },
  metadata: {
    caseId: c.case_id,
    corpus: c.corpus,
    label: c.label,
    labelProvenance: c.label_provenance,
    sourceRef: c.source_ref,
    goldRationale: c.gold_rationale,
    sanityOnly: SANITY_ONLY_CORPORA.includes(c.corpus),
    provisional: PROVISIONAL_CORPORA.includes(c.corpus),
    mutationSpec: c.mutation_spec,
  },
});

/** Loads a corpus and returns its cases mapped to eval Examples. */
export const loadCorpusExamples = (name: CorpusName): CorpusExample[] =>
  loadCorpus(name).map(toExample);

/** Loads all six vendored corpora keyed by name. */
export const loadAllCorpora = (): Record<CorpusName, CorpusCase[]> =>
  Object.fromEntries(CORPUS_NAMES.map((name) => [name, loadCorpus(name)])) as Record<
    CorpusName,
    CorpusCase[]
  >;
