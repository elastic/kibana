/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * The suite runs every fixture inside ONE `evaluate()` test. The tuning workflow's concurrency
 * group is `max:1 strategy:drop`, so the experiment is pinned to `concurrency: 1` and wall time
 * scales linearly with fixture count x repetitions.
 *
 * A budget smaller than that product does not "flake" — it kills every attempt with
 * `Test timeout of Nms exceeded` no matter how good the model is, and the run reports a model
 * failure that is really a config bug. Growing the fixture list without growing the budget is
 * exactly how that happens, so assert the relationship instead of trusting a hand-tuned number.
 */
const SECONDS_PER_FIXTURE = 233; // measured: 6 fixtures ran 1396s wall on a smoke VM

const read = (relativePath: string) => readFileSync(join(__dirname, '..', relativePath), 'utf8');

const readWorkflow = () =>
  readFileSync(
    join(
      __dirname,
      '../../../../../../src/platform/packages/shared/kbn-workflows/managed/definitions/pnd/rule_tuning.yaml'
    ),
    'utf8'
  );

const countFixtures = () => {
  const spec = read('evals/rule_tuning_decision.spec.ts');
  const ids = spec.match(/^ {4}id: '/gm) ?? [];
  return ids.length;
};

const configuredTimeoutMs = () => {
  const config = read('playwright.config.ts');
  const match = config.match(/timeout:\s*([\d\s*_]+?),/);
  if (!match) throw new Error('playwright.config.ts no longer declares a `timeout`');
  // The declaration is written as a product of literals (e.g. `8 * 60 * 60_000`). Multiply the
  // factors directly rather than eval()ing repo text.
  return match[1]
    .replace(/_/g, '')
    .split('*')
    .map((factor) => Number(factor.trim()))
    .reduce((product, factor) => product * factor, 1);
};

const configuredRepetitions = () => {
  const config = read('playwright.config.ts');
  const match = config.match(/repetitions:\s*(\d+)/);
  if (!match) throw new Error('playwright.config.ts no longer declares `repetitions`');
  return Number(match[1]);
};

const labelCounts = () => {
  const spec = read('evals/rule_tuning_decision.spec.ts');
  const labels = [...spec.matchAll(/^ {4}expected: '([a-z_]+)'/gm)].map((m) => m[1]);
  const counts = new Map<string, number>();
  for (const label of labels) counts.set(label, (counts.get(label) ?? 0) + 1);
  return counts;
};

describe('rule-tuning eval budget', () => {
  it('gives the single evaluate() test enough wall clock for every fixture and repetition', () => {
    const fixtures = countFixtures();
    const repetitions = configuredRepetitions();
    const requiredMs = fixtures * repetitions * SECONDS_PER_FIXTURE * 1000;

    expect(fixtures).toBeGreaterThan(0);
    expect(configuredTimeoutMs()).toBeGreaterThanOrEqual(requiredMs);
  });

  it('keeps the fixture count at or above the n=30 threshold for a rankable result', () => {
    // Below n=30 the Wilson interval is too wide to separate models; the suite is then only
    // honest as a TIED result. Guard the sizing decision so a fixture deletion is deliberate.
    expect(countFixtures()).toBeGreaterThanOrEqual(30);
  });

  it('states the smallest accuracy gap the fixture count can actually resolve', () => {
    // Ranking two models on this suite is a PAIRED comparison: the same fixtures are graded
    // by both, so significance comes from the fixtures they DISAGREE on (McNemar), not from
    // the raw accuracy difference. With d discordant pairs, one model must win w of them for
    // a two-sided exact p < 0.05, and the accuracy gap that represents is (w - (d - w)) / n.
    //
    // At n=35 that floor is ~0.23 absolute accuracy. Anything smaller is indistinguishable
    // from sampling noise, which is why this suite reports TIED instead of a ranking. If the
    // fixture count grows, this number drops and the guard's message stays truthful.
    const n = countFixtures();
    const twoSidedExactP = (wins: number, discordant: number) => {
      // sum of binomial(discordant, k) for k >= wins, at p=0.5, doubled for two-sided
      let tail = 0;
      for (let k = wins; k <= discordant; k++) {
        let coefficient = 1;
        for (let j = 0; j < k; j++) coefficient = (coefficient * (discordant - j)) / (j + 1);
        tail += coefficient;
      }
      return (tail / 2 ** discordant) * 2;
    };

    // A realistic discordance for two models near this suite's accuracy band.
    const discordant = 12;
    let winsNeeded = discordant;
    for (let w = Math.floor(discordant / 2) + 1; w <= discordant; w++) {
      if (twoSidedExactP(w, discordant) < 0.05) {
        winsNeeded = w;
        break;
      }
    }
    const minDetectableGap = (winsNeeded - (discordant - winsNeeded)) / n;

    // The suite must not silently become one that claims to resolve gaps it cannot. If a
    // future n makes this floor better than 0.10, the TIED language in the report is stale
    // and must be revisited deliberately rather than by accident.
    expect(minDetectableGap).toBeGreaterThan(0.1);
    expect(minDetectableGap).toBeLessThanOrEqual(0.35);
  });

  it('keeps the majority class small enough that a constant answer cannot look competent', () => {
    // A single-label suite is trivially gamed: a model that always answers the most common
    // change_type scores the majority share while demonstrating no discrimination at all. That
    // baseline is the floor any reported accuracy must beat, so pin it where it stays meaningful.
    // 12 fixtures were relabelled to `manual` when the merged workflow dropped `suppression` and
    // `disable` from its enum, which pushed `manual` to 17/35 - close enough to half that the
    // guard is worth having.
    const counts = labelCounts();
    const total = [...counts.values()].reduce((sum, n) => sum + n, 0);
    const majority = Math.max(...counts.values());

    expect(total).toBeGreaterThan(0);
    expect(majority / total).toBeLessThanOrEqual(0.5);
  });

  it('states no precedence between change_types in the diagnose prompt', () => {
    const workflow = readFileSync(
      join(
        __dirname,
        '../../../../../../src/platform/packages/shared/kbn-workflows/managed/definitions/pnd/rule_tuning.yaml'
      ),
      'utf8'
    );

    // Three frontier models from three families each scored exception 6/6 and both
    // query 0/6 and risk_score 0/6, with gpt-5.5 and gemini-3.1-pro agreeing on all 35
    // fixtures (McNemar b=0 c=0). Ranking the change_types collapses the distribution
    // onto whichever is named first, so the prompt must not rank them.
    expect(workflow).not.toMatch(/in this order of preference/i);
    expect(workflow).not.toMatch(/order of preference/i);

    // `manual` must carry its own positive criteria rather than being defined as
    // "none of the above", which turns it into a catch-all for uncertainty.
    expect(workflow).not.toMatch(/manual\s+—\s*None of the above/i);
  });

  it('keeps the production concurrency lock shared when no key is passed', () => {
    // The harvest selects alerts NOT carrying `reviewed_tag`, but that tag is written by the
    // mark steps at the end of the run — after a 72h approval gate. So the filter cannot stop
    // two overlapping executions from harvesting the same alerts and diagnosing them twice:
    // the shared lock is the only thing preventing it. Parameterising the key to let eval runs
    // isolate themselves is safe ONLY while it still collapses to one constant by default.
    const workflow = readWorkflow();

    const keyMatch = workflow.match(/concurrency:\s*(?:\n\s*#[^\n]*)*\n\s*key:\s*(.+)/);
    if (!keyMatch) throw new Error('rule_tuning.yaml no longer declares a concurrency key');
    const key = keyMatch[1].trim();

    // Templated is fine; unconditionally per-execution is not. A key that interpolates
    // execution.id (or anything else always-unique) gives every production run its own lock
    // and silently removes the double-diagnosis guard.
    expect(key).not.toMatch(/execution\.id/);
    expect(key).not.toMatch(/workflow\.execution/);

    // Any interpolation must carry a `default:` filter, so an absent input yields a constant.
    if (key.includes('{{')) {
      expect(key).toMatch(/\|\s*default:/);
    }

    // And the lock must still be a real lock. Matched off `strategy:` rather than
    // `concurrency:` so an explanatory comment block cannot push `max` out of range.
    expect(workflow).toMatch(/strategy:\s*drop[\s\S]{0,80}?max:\s*1/);
  });

  it('declares concurrency_key so an isolated eval run can opt out of the shared lock', () => {
    // `additionalProperties: false` means an undeclared input is rejected at schedule time,
    // which would surface as a workflow error rather than a slow run.
    const workflow = readWorkflow();
    expect(workflow).toMatch(/concurrency_key:\s*\n\s*type: string/);
  });

  it('leaves the advisory investigate-rule skill unregistered on the eval stack', () => {
    // Removing `skill://investigate-rule` from the prompt is not enough: while the skill is
    // registered, the agent still discovers and loads it on its own (measured: 3 unprompted
    // loads in the first 2 fixtures after the prompt reference was removed). Its contract is
    // the opposite of this workflow's -- it never applies a change, forbids machine-actionable
    // output, and never mentions risk_score -- so registering it silently replaces the
    // criteria the workflow spells out. Its production default is off; keep the eval stack
    // matching production so the suite measures the workflow's own prompt.
    const config = readFileSync(
      join(
        __dirname,
        '../../../../../../src/platform/packages/shared/kbn-scout/src/servers/configs/config_sets/evals_security_rule_tuning/stateful/classic.stateful.config.ts'
      ),
      'utf8'
    );

    const args = config.slice(config.indexOf('serverArgs: ['));
    expect(args).not.toMatch(/investigateRuleSkill/);
  });

  it('gives the agent the rule fields it must ground each change_type in', () => {
    // fetch_rule retrieves the full rule, but the diagnose prompt historically passed only
    // the rule name and the entity aggregation. Without the rule's own query the agent
    // cannot populate proposed_query, and without the current risk_score/severity it cannot
    // justify lowering them - so `query` and `risk_score` collapse into `manual`.
    const workflow = readWorkflow();
    const diagnose = workflow.slice(workflow.indexOf('name: diagnose_rule'));
    const message = diagnose.slice(0, diagnose.indexOf('schema:'));

    expect(message).toMatch(/steps\.fetch_rule\.output\.query/);
    expect(message).toMatch(/steps\.fetch_rule\.output\.risk_score/);
    expect(message).toMatch(/steps\.fetch_rule\.output\.severity/);
  });

  it('does not delegate the structured decision to an advisory, human-facing skill', () => {
    // `investigate-rule` is analyst-facing guidance: it states it "never applies a change",
    // forbids emitting "an auto-applied / machine-actionable change", and mandates a
    // five-section markdown answer. The diagnose step needs the opposite — one structured
    // change_type the workflow auto-applies through security.patchRule. Measured on a full
    // 35-fixture run where the skill loaded 35/35: the skill body mentions `exception` 21x
    // and `query` 21x but `risk_score` ZERO times, so risk_score was never predicted once and
    // its 6 fixtures were unwinnable; accuracy fell 12/35 -> 10/35 versus the run where the
    // skill silently 404'd. Keep the diagnose criteria in the workflow, which already spells
    // out all four change_types.
    const workflow = readWorkflow();
    const diagnose = workflow.slice(workflow.indexOf('- name: diagnose_rule'));
    const message = diagnose.slice(0, diagnose.indexOf('schema:'));

    expect(message).not.toMatch(/skill:\/\//);
  });

  it('spells out criteria for every change_type it can emit', () => {
    // With no skill supplying guidance, the prompt is the only place the agent learns what
    // each change_type means. A label the prompt never explains is one the agent cannot pick.
    const workflow = readWorkflow();
    const diagnose = workflow.slice(workflow.indexOf('- name: diagnose_rule'));
    const message = diagnose.slice(0, diagnose.indexOf('schema:'));

    const enumMatch = workflow.match(/change_type:\s*\n\s*type: string\s*\n\s*enum: \[([^\]]+)\]/);
    if (!enumMatch) throw new Error('rule_tuning.yaml no longer declares a change_type enum');

    for (const label of enumMatch[1].split(',').map((value) => value.trim())) {
      expect(message).toMatch(new RegExp(`^\\s*${label}\\s+—`, 'm'));
    }
  });

  it('keeps every change_type the workflow can emit represented in the fixtures', () => {
    // A label the workflow can no longer emit is unscoreable: every fixture carrying it is a
    // guaranteed zero that reads as a model failure. Tie the golden labels to the enum so a
    // workflow change that drops a change_type fails here instead of silently in a 7-hour run.
    const workflow = readFileSync(
      join(
        __dirname,
        '../../../../../../src/platform/packages/shared/kbn-workflows/managed/definitions/pnd/rule_tuning.yaml'
      ),
      'utf8'
    );
    const enumMatch = workflow.match(/change_type:\s*\n\s*type: string\s*\n\s*enum: \[([^\]]+)\]/);
    if (!enumMatch) throw new Error('rule_tuning.yaml no longer declares a change_type enum');
    const allowed = enumMatch[1].split(',').map((value) => value.trim());

    for (const label of labelCounts().keys()) {
      expect(allowed).toContain(label);
    }
  });
});
