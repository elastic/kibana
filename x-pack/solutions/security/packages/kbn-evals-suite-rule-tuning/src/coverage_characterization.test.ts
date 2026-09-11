/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

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
 */

const read = (relativePath: string) => readFileSync(join(__dirname, '..', relativePath), 'utf8');

const readWorkflow = () =>
  readFileSync(
    join(
      __dirname,
      '../../../../../../src/platform/packages/shared/kbn-workflows/managed/definitions/pnd/rule_tuning.yaml'
    ),
    'utf8'
  );

const readSeeder = () => read('evals/seed_fp_cluster.ts');

const readSpec = () => read('evals/rule_tuning_decision.spec.ts');

/**
 * Extract the golden label contract (fixture id -> expected change_type) from the eval spec.
 * Only the fixture specs use a 4-space-indented `id:` / `expected: '...'` string form; the
 * evaluator-control examples use `expected: { ... }` and `metadata: { ruleType: ... }`, which
 * the anchored regexes below do not match.
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

describe('rule-tuning coverage characterization', () => {
  it('characterizes seeded alert scoring as a shared medium/40 literal', () => {
    // The seeder writes the SAME severity/risk_score onto every alert row and every rule,
    // regardless of fixture. A `risk_score` fixture is a rule scored HIGHER than its activity
    // warrants, but with a hardcoded medium/40 there is no mis-rating for the diagnose step to
    // read back — a `risk_score` rule is byte-identical to a correctly-rated `manual` rule at
    // the alert level. Pin the literal so threading per-fixture scoring through is a visible,
    // deliberate change rather than an unnoticed one.
    const seeder = readSeeder();
    expect(seeder).toMatch(/'kibana\.alert\.severity': 'medium'/);
    expect(seeder).toMatch(/'kibana\.alert\.risk_score': 40/);
  });

  it('characterizes seeded alerts as uniformly closed false positives with no true-positive minority', () => {
    // Every seeded alert is `workflow_status: closed` / `workflow_reason: false_positive`. An
    // `fp-unfixable-*` fixture is defined by "no field separates benign from malicious", but a
    // cluster of pure FPs is indistinguishable from a low-value rule — the true positives that
    // would prove the discriminator is absent are never seeded. Pin the absence of any open /
    // true-positive alert so seeding that minority is a deliberate, reviewable change.
    const seeder = readSeeder();
    expect(seeder).toMatch(/'kibana\.alert\.workflow_status': 'closed'/);
    expect(seeder).toMatch(/'kibana\.alert\.workflow_reason': 'false_positive'/);
    expect(seeder).not.toMatch(/'kibana\.alert\.workflow_status': 'open'/);
    expect(seeder).not.toMatch(/true.?positive/i);
  });

  it('characterizes the harvest as reading only closed false positives', () => {
    // The harvest and the per-rule entity aggregation both select alerts the analyst has
    // already closed as FPs. Alerts that are still OPEN never reach the diagnose step, so any
    // signal that lives only on open alerts is invisible to the agent. Pin the closed/FP filter
    // AND the absence of any open-alert fetch step, so surfacing still-open alerts is a
    // deliberate workflow change rather than drift.
    const workflow = readWorkflow();
    expect(workflow).toMatch(/kibana\.alert\.workflow_status` == "closed"/);
    expect(workflow).toMatch(/kibana\.alert\.workflow_reason` == "false_positive"/);
    expect(workflow).not.toMatch(/name: fetch_open_entities/);
  });

  it('characterizes the diagnose step budget as 10 minutes', () => {
    // The diagnose ai.agent step is capped at 10m. A frontier model that runs its slowest
    // diagnose past that cap scores zero fixtures, and its accuracy is then unmeasurable — a
    // model failure that is really a budget failure. Pin the cap so raising (or removing) it is
    // a deliberate, separately-reviewed change rather than an accidental widening.
    const workflow = readWorkflow();
    const diagnose = workflow.slice(workflow.indexOf('- name: diagnose_rule'));
    expect(diagnose).toMatch(/timeout: "10m"/);
  });

  it('characterizes the golden label contract of all 35 fixtures', () => {
    // The golden labels are the ground truth every score is measured against. A relabel that
    // preserves the per-class counts but swaps WHICH fixture maps to which label would not trip
    // the existing count/coverage guards, yet it changes what the suite measures. Pin the exact
    // mapping so any relabel is a deliberate, reviewed decision.
    expect(goldenLabels()).toEqual(
      new Map<string, string>([
        ['fp-host-exception', 'exception'],
        ['fp-host-exception-ci', 'exception'],
        ['fp-host-exception-backup', 'exception'],
        ['fp-host-exception-av', 'exception'],
        ['fp-host-exception-print', 'exception'],
        ['fp-host-exception-mdm', 'exception'],
        ['fp-overbroad-query', 'query'],
        ['fp-overbroad-wildcard-cmd', 'query'],
        ['fp-overbroad-any-user', 'query'],
        ['fp-overbroad-port-range', 'query'],
        ['fp-overbroad-parent-any', 'query'],
        ['fp-overbroad-ext-match', 'query'],
        ['fp-low-value-risk', 'risk_score'],
        ['fp-low-value-admin-tools', 'risk_score'],
        ['fp-low-value-devtools', 'risk_score'],
        ['fp-low-value-remote-support', 'risk_score'],
        ['fp-low-value-archive', 'risk_score'],
        ['fp-low-value-scripting', 'risk_score'],
        ['fp-volume-suppression', 'manual'],
        ['fp-unfixable-noise', 'manual'],
        ['fp-suppression-incapable-rule-type', 'manual'],
        ['fp-suppression-healthcheck', 'manual'],
        ['fp-suppression-vulnscan', 'manual'],
        ['fp-suppression-inventory', 'manual'],
        ['fp-suppression-patchagent', 'manual'],
        ['fp-suppression-logship', 'manual'],
        ['fp-unfixable-telemetry', 'manual'],
        ['fp-unfixable-agentmesh', 'manual'],
        ['fp-unfixable-buildfarm', 'manual'],
        ['fp-unfixable-imaging', 'manual'],
        ['fp-unfixable-mailflow', 'manual'],
        ['fp-manual-newterms-dns', 'manual'],
        ['fp-manual-newterms-proxy', 'manual'],
        ['fp-manual-newterms-vpn', 'manual'],
        ['fp-manual-newterms-ntp', 'manual'],
      ])
    );
  });
});
