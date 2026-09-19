/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { CHANGE_TYPES, EXCEPTION_OPERATOR_PAYLOAD } from './constants';

/**
 * Characterization tests for the rule-tuning eval suite.
 *
 * These do NOT assert what the code *should* do. They pin what it *does* do today, so that a
 * later change to the workflow, the seeder, or the fixtures is a DELIBERATE, reviewable diff
 * rather than an accidental drift. Each test documents the finding it guards, so a future
 * author who trips one knows exactly which behaviour changed and why it mattered.
 *
 * The contract is: these tests are GREEN on the base they characterize, and go RED when the
 * behaviour they pin changes. The follow-up PR that changes the behaviour is expected to
 * update them in the same commit as the change it makes.
 *
 * Ported 2026-09-11 to the post-#290097 split: the unified workflow became
 * worker (harvest + fan-out) + review (per-rule diagnose + approval gate),
 * under `definitions/alertzero/`. Diagnose now lives in the REVIEW yaml.
 */

const read = (relativePath: string) => readFileSync(join(__dirname, '..', relativePath), 'utf8');

const WORKER_YAML =
  '../../../../../../src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/rule_tuning_worker.yaml';
const REVIEW_YAML =
  '../../../../../../src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/rule_tuning_review.yaml';

const readWorker = () => readFileSync(join(__dirname, WORKER_YAML), 'utf8');
const readReview = () => readFileSync(join(__dirname, REVIEW_YAML), 'utf8');

const readSeeder = () => read('evals/seed_fp_cluster.ts');

const readSpec = () => read('evals/rule_tuning_decision.spec.ts');

/**
 * Extract the golden label contract (fixture id -> expected change_type) from the eval spec.
 * Only the fixture specs use a 4-space-indented `id:` / `expected: '...'` string form.
 */
const goldenLabels = () => {
  const spec = readSpec();
  const ids = [...spec.matchAll(/^ {4}id: '([^']+)'/gm)].map((m) => m[1]);
  const expected = [...spec.matchAll(/^ {4}expected: '([a-z_]+)'/gm)].map((m) => m[1]);
  if (ids.length !== expected.length) {
    throw new Error(`fixture spec id count (${ids.length}) != expected count (${expected.length})`);
  }
  return new Map(ids.map((id, i) => [id, expected[i]]));
};

/**
 * Split the diagnose step's schema into one chunk per `oneOf` branch, keyed by the
 * branch's `const:` value. A branch runs from its own `const:` to the next branch's,
 * which keeps each branch's trailing `required:` list inside its chunk (the
 * exception branch's nested entry-item unions also declare `required:` lists).
 */
const schemaBranches = (): Map<string, string> => {
  const review = readReview();
  const diagnose = review.slice(review.indexOf('- name: diagnose_rule'));
  const schema = diagnose.slice(diagnose.indexOf('schema:'));
  const consts = [...schema.matchAll(/const:\s*([a-z_]+)/g)];
  const branches = new Map<string, string>();
  consts.forEach((match, index) => {
    const start = match.index ?? 0;
    const end =
      index + 1 < consts.length ? consts[index + 1].index ?? schema.length : schema.length;
    branches.set(match[1], schema.slice(start, end));
  });
  return branches;
};

/** The branch-level `required:` list — the LAST one in a chunk, not a nested item's. */
const requiredFields = (chunk: string): string[] => {
  const matches = [...chunk.matchAll(/required:\s*\[([^\]]+)\]/g)];
  const branchRequired = matches[matches.length - 1];
  return branchRequired ? branchRequired[1].split(',').map((field) => field.trim()) : [];
};

describe('rule-tuning coverage characterization', () => {
  it('characterizes seeded alert scoring as a shared medium/40 literal', () => {
    // The seeder writes the SAME severity/risk_score onto every alert row and every rule,
    // regardless of fixture. Pin the literal so threading per-fixture scoring through is a
    // visible, deliberate change rather than an unnoticed one.
    const seeder = readSeeder();
    expect(seeder).toMatch(/'kibana\.alert\.severity': 'medium'/);
    expect(seeder).toMatch(/'kibana\.alert\.risk_score': 40/);
  });

  it('characterizes seeded alerts as uniformly closed false positives with no true-positive minority', () => {
    const seeder = readSeeder();
    expect(seeder).toMatch(/'kibana\.alert\.workflow_status': 'closed'/);
    expect(seeder).toMatch(/'kibana\.alert\.workflow_reason': 'false_positive'/);
    expect(seeder).not.toMatch(/'kibana\.alert\.workflow_status': 'open'/);
    expect(seeder).not.toMatch(/true.?positive/i);
  });

  it('characterizes the harvest as reading only closed false positives', () => {
    const worker = readWorker();
    expect(worker).toMatch(/kibana\.alert\.workflow_status` == "closed"/);
    expect(worker).toMatch(/kibana\.alert\.workflow_reason` == "false_positive"/);
    expect(worker).not.toMatch(/name: fetch_open_entities/);
  });

  it('characterizes the diagnose step budget as 10 minutes', () => {
    const review = readReview();
    const diagnose = review.slice(review.indexOf('- name: diagnose_rule'));
    expect(diagnose).toMatch(/timeout: "10m"/);
  });

  it('characterizes the diagnose schema as the post-#288807 oneOf of four const branches', () => {
    // The fork's review step declared a flat enum of six tunings; the port pinned
    // [exception, suppression, query, threshold]; upstream #288807 replaced both with a
    // root `oneOf` of four const-branched objects. Pin the branch SET (not the yaml's
    // branch order, which is a formatting choice) against the suite's own CHANGE_TYPES,
    // so re-adding or renaming a branch is a deliberate, reviewed change and the fixture
    // labels can never silently include an unemittable one again.
    const branches = schemaBranches();
    expect(new Set(branches.keys())).toEqual(new Set(CHANGE_TYPES));

    const review = readReview();
    const diagnose = review.slice(review.indexOf('- name: diagnose_rule'));
    const schema = diagnose.slice(diagnose.indexOf('schema:'));
    expect(schema).not.toMatch(/enum:\s*\[\s*exception/);
  });

  it('characterizes the payload field every oneOf branch requires', () => {
    // The per-branch payload is the contract validProposal enforces: an exception
    // without entries, a query without a query, or a risk_score without a score and
    // severity can never be rendered by the gate or applied by the apply steps.
    const branches = schemaBranches();
    expect(requiredFields(branches.get('exception') ?? '')).toEqual([
      'change_type',
      'summary',
      'exception_entries',
    ]);
    expect(requiredFields(branches.get('query') ?? '')).toEqual([
      'change_type',
      'summary',
      'proposed_query',
    ]);
    expect(requiredFields(branches.get('risk_score') ?? '')).toEqual([
      'change_type',
      'summary',
      'proposed_risk_score',
      'proposed_severity',
    ]);
    // `manual` carries no payload beyond the summary every branch requires.
    expect(requiredFields(branches.get('manual') ?? '')).toEqual(['change_type', 'summary']);
  });

  it('characterizes the exception operator vocabulary validProposal mirrors', () => {
    // The evaluator maps each operator to the payload field it requires. If the yaml
    // adds or removes an operator, an entry the workflow could apply would score
    // invalid (or vice versa), so the two lists must stay identical.
    const exception = schemaBranches().get('exception') ?? '';
    const operators = new Set(
      [...exception.matchAll(/enum:\s*\[([^\]]+)\]/g)].flatMap((match) =>
        match[1].split(',').map((operator) => operator.trim())
      )
    );
    expect(operators).toEqual(new Set(Object.keys(EXCEPTION_OPERATOR_PAYLOAD)));
  });

  it('characterizes the golden label contract of all fixtures', () => {
    // Labels are PRELIMINARY until validated on the live stack; pin the mapping so any
    // further relabel is a deliberate, reviewed decision. `manual` is the majority class
    // at 17/35 — one fixture below the 0.5 guard in eval_budget.test.ts.
    const labels = goldenLabels();
    expect(labels.size).toBe(35);

    const counts = new Map<string, number>();
    for (const label of labels.values()) counts.set(label, (counts.get(label) ?? 0) + 1);
    expect(Object.fromEntries(counts)).toEqual({
      exception: 6,
      query: 6,
      risk_score: 6,
      manual: 17,
    });

    // No label may sit outside the emittable oneOf branches — the suite's core invariant.
    for (const [id, label] of labels) {
      if (!(CHANGE_TYPES as readonly string[]).includes(label)) {
        throw new Error(`fixture ${id} carries unemittable label ${label}`);
      }
    }
    // ...and every branch must be exercised, or the accuracy number silently stops
    // saying anything about the branch nothing is labeled with.
    for (const changeType of CHANGE_TYPES) {
      expect(counts.get(changeType) ?? 0).toBeGreaterThan(0);
    }
  });
});
