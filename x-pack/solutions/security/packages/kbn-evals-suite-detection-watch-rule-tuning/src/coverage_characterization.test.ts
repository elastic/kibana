/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { CHANGE_TYPES, CONTESTED_FIXTURE_IDS, EXCEPTION_OPERATOR_PAYLOAD } from './constants';

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
  // A duplicated fixture id silently overwrites its twin in the Map below: the
  // later entry's label wins, the earlier one is never graded, and the declared
  // fixture count (eval budget, run summaries) overcounts what actually runs.
  if (new Set(ids).size !== ids.length) {
    throw new Error(`duplicate fixture ids: ${ids.filter((x, i) => ids.indexOf(x) !== i)}`);
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

  it('characterizes the diagnose schema as the post-#288807 oneOf of const branches', () => {
    // The fork's review step declared a flat enum of six tunings; the port pinned
    // [exception, suppression, query, threshold]; upstream #288807 replaced both with a
    // root `oneOf` of const-branched objects (six branches since #291874/#294332).
    // Pin the branch SET (not the yaml's branch order, which is a formatting choice)
    // against the suite's own CHANGE_TYPES, so re-adding or renaming a branch is a
    // deliberate, reviewed change and the fixture labels can never silently include
    // an unemittable one again.
    const branches = schemaBranches();
    expect(new Set(branches.keys())).toEqual(new Set(CHANGE_TYPES));

    const review = readReview();
    const diagnose = review.slice(review.indexOf('- name: diagnose_rule'));
    const schema = diagnose.slice(diagnose.indexOf('schema:'));
    expect(schema).not.toMatch(/enum:\s*\[\s*exception/);
  });

  it('characterizes the payload fields every oneOf branch requires', () => {
    // The per-branch payload is the contract validProposal enforces: an exception
    // without entries, a query without a query, or a risk_score without a score and
    // severity can never be rendered by the gate or applied by the action. Since
    // #291874/#294332 every branch additionally requires the proposal-text fields
    // (title, fp_pattern, reasoning, confidence) the analyst's proposal card shows.
    const branches = schemaBranches();
    const shared = ['title', 'fp_pattern', 'reasoning', 'confidence'];
    expect(requiredFields(branches.get('exception') ?? '')).toEqual([
      'change_type',
      'summary',
      'exception_entries',
      ...shared,
    ]);
    expect(requiredFields(branches.get('query') ?? '')).toEqual([
      'change_type',
      'summary',
      'proposed_query',
      ...shared,
    ]);
    expect(requiredFields(branches.get('risk_score') ?? '')).toEqual([
      'change_type',
      'summary',
      'proposed_risk_score',
      'proposed_severity',
      ...shared,
    ]);
    expect(requiredFields(branches.get('threshold') ?? '')).toEqual([
      'change_type',
      'summary',
      'proposed_threshold_value',
      'proposed_threshold_field',
      'proposed_threshold_cardinality',
      ...shared,
    ]);
    expect(requiredFields(branches.get('schedule') ?? '')).toEqual([
      'change_type',
      'summary',
      ...shared,
      'proposed_interval',
      'proposed_from',
    ]);
    // `manual` carries no payload beyond the shared proposal text.
    expect(requiredFields(branches.get('manual') ?? '')).toEqual([
      'change_type',
      'summary',
      ...shared,
    ]);
  });

  it('characterizes the exception operator vocabulary validProposal mirrors', () => {
    // The evaluator maps each operator to the payload field it requires. If the yaml
    // adds or removes an operator, an entry the workflow could apply would score
    // invalid (or vice versa), so the two lists must stay identical.
    const exception = schemaBranches().get('exception') ?? '';
    const enums = [...exception.matchAll(/enum:\s*\[([^\]]+)\]/g)].map((match) => match[1]);
    // Every branch carries the confidence enum ([low, medium, high]); the operators
    // are the enums that do not.
    const operators = new Set(
      enums
        .filter((body) => !body.split(',').some((value) => value.trim() === 'low'))
        .flatMap((body) => body.split(',').map((operator) => operator.trim()))
    );
    expect(operators).toEqual(new Set(Object.keys(EXCEPTION_OPERATOR_PAYLOAD)));
  });

  it('characterizes the golden label contract of all fixtures', () => {
    // Labels are PRELIMINARY until validated on the live stack; pin the mapping so any
    // further relabel is a deliberate, reviewed decision. `manual` is the majority class
    // at 17/39 — comfortably below the 0.5 guard in eval_budget.test.ts.
    const labels = goldenLabels();
    expect(labels.size).toBe(39);

    const counts = new Map<string, number>();
    for (const label of labels.values()) counts.set(label, (counts.get(label) ?? 0) + 1);
    expect(Object.fromEntries(counts)).toEqual({
      exception: 6,
      query: 6,
      risk_score: 6,
      threshold: 2,
      schedule: 2,
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

  it('keeps CONTESTED_FIXTURE_IDS well-formed against the live fixture set', () => {
    const labels = goldenLabels();
    const contested = [...CONTESTED_FIXTURE_IDS];

    // Every contested id is a real fixture — a typo would silently shrink the
    // contested set and inflate ChangeTypeAccuracyUncontested's coverage claim.
    for (const id of contested) {
      if (!labels.has(id)) {
        throw new Error(`CONTESTED_FIXTURE_IDS references unknown fixture ${id}`);
      }
    }
    // Unique: a duplicated id double-counts one dispute.
    expect(new Set(contested).size).toBe(contested.length);

    // The dispute is exactly the volume + low-value + new_terms families plus
    // the two single-entity manual suppressions (logship, incapable-rule-type)
    // the label proposal documents (17 fixtures). If a fixture joins or leaves
    // the dispute, update g6-label-proposal.md in the same commit.
    expect(contested).toEqual([
      'fp-volume-suppression',
      'fp-suppression-healthcheck',
      'fp-suppression-vulnscan',
      'fp-suppression-inventory',
      'fp-suppression-patchagent',
      'fp-suppression-logship',
      'fp-low-value-risk',
      'fp-low-value-scripting',
      'fp-low-value-admin-tools',
      'fp-low-value-devtools',
      'fp-low-value-remote-support',
      'fp-low-value-archive',
      'fp-manual-newterms-dns',
      'fp-manual-newterms-proxy',
      'fp-manual-newterms-vpn',
      'fp-manual-newterms-ntp',
      'fp-suppression-incapable-rule-type',
    ]);

    // The uncontested subset must still exercise every branch the full set
    // labels `schedule` and `threshold` with — those fixtures are uncontested,
    // so an accidental contesting would gut the uncontested accuracy number.
    const uncontestedLabels = [...labels.entries()]
      .filter(([id]) => !(contested as readonly string[]).includes(id))
      .map(([, label]) => label);
    expect(uncontestedLabels).toContain('threshold');
    expect(uncontestedLabels).toContain('schedule');
    // ...and stays the majority of the dataset, or the uncontested number
    // stops being the headline metric.
    expect(uncontestedLabels.length).toBe(22);
  });

  it('pins the seed fix: schedule alerts land inside the lookback and entity spreads defeat exception-first', () => {
    const seeder = readSeeder();

    // (a) The schedule rule's lookback is now-24h (every other fixture stays at
    // the burst-implied now-10m default).
    expect(seeder).toMatch(
      /from: fixture\.id\.startsWith\('fp-schedule-'\) \? 'now-24h' : 'now-10m'/
    );

    // (b) Every schedule alert offset is strictly inside that window: the
    // seeder must spread timestamps as (20 - i * 4)h — oldest now-20h, all
    // five offsets (20/16/12/8/4) < 24. The pre-fix (25 - i * 5)h put the
    // oldest alert at now-25h, OUTSIDE the lookback and invisible to the
    // diagnosis the fixture exists to exercise.
    expect(seeder).toMatch(/\(20 - i \* 4\) \* 60 \* 60 \* 1000/);

    // (c) The offhours-batch schedule fixture seeds five DISTINCT user.name
    // values: a shared user would make user:<svc> the tightest single
    // condition and the prompt's exception-first preference would outrank the
    // schedule fix the fixture tests.
    const offhours = seeder.slice(
      seeder.indexOf("'fp-schedule-offhours-batch': ["),
      seeder.indexOf('],', seeder.indexOf("'fp-schedule-offhours-batch': ["))
    );
    const offhoursUsers = [...offhours.matchAll(/user: '(svc_[a-z]+)'/g)].map((m) => m[1]);
    expect(offhoursUsers.length).toBe(5);
    expect(new Set(offhoursUsers).size).toBe(5);

    // (d) The threshold fixtures spread their alerts across 3 distinct hosts,
    // each firing exactly 4 times against a threshold of 3: no host, user, ip
    // or process repeats ACROSS hosts, so exception/query have no common
    // entity to key on and the raised threshold is the only correct label.
    for (const id of ['fp-threshold-bruteforce-burst', 'fp-threshold-auditflood']) {
      const block = seeder.slice(
        seeder.indexOf(`'${id}': [`),
        seeder.indexOf('],', seeder.indexOf(`'${id}': [`))
      );
      const hosts = [...block.matchAll(/host: '([a-z0-9-]+)'/g)].map((m) => m[1]);
      expect(hosts.length).toBe(12);
      const counts = new Map<string, number>();
      hosts.forEach((h) => counts.set(h, (counts.get(h) ?? 0) + 1));
      expect([...counts.keys()].length).toBe(3);
      expect([...counts.values()].every((n) => n === 4)).toBe(true);
    }
  });

  it('seeds kibana.alert.rule.revision on every alert doc, sourced from the rule-create response', () => {
    // The worker harvest dedupes with
    // `INLINE STATS latest_revision = MAX(kibana.alert.rule.revision) BY rule.uuid
    //  | WHERE kibana.alert.rule.revision == latest_revision`.
    // ES|QL drops rows where the field is null (null == null is not true), so a
    // seeder that omits it makes the worker harvest zero rows and the eval fails
    // with "settled but opened no review children". #290665.
    const seeder = readSeeder();
    expect(seeder).toMatch(/'kibana\.alert\.rule\.revision': ruleRevision/);
    // The value must come from the rule-create response, never a hardcoded
    // literal — a later rule update bumps the real revision and orphans the
    // seeded cluster.
    expect(seeder).toMatch(/revision\?: number/);
    expect(seeder).toMatch(/ruleRevision = rule\?\.revision \?\? 0/);
    expect(seeder).not.toMatch(/'kibana\.alert\.rule\.revision': 0/);

    // And the harvest still groups by the field, so this pin tracks the worker
    // contract rather than a stale seeder detail.
    const worker = readWorker();
    expect(worker).toMatch(/MAX\(`kibana\.alert\.rule\.revision`\)/);
    expect(worker).toMatch(/WHERE `kibana\.alert\.rule\.revision` == latest_revision/);
  });
});
