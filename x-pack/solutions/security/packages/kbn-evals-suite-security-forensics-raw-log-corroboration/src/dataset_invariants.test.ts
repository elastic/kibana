/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SCENARIOS } from './dataset';

/**
 * Dataset invariants for the raw-log corroboration suite.
 *
 * These assert properties of the *dataset*, not of the agent under test — the
 * agent's behaviour is measured by evals/leaf_quality.spec.ts against a live
 * stack. The value of this file is that it fails when someone edits SCENARIOS
 * into a shape the fixture and the gates disagree about.
 *
 * This file previously contained assertions that could not fail: it built a
 * `CorroborationReport` object literal and asserted that literal's own fields
 * (which the type already guarantees at compile time), plus a series of
 * `expect(scenario.x).toBeDefined()` calls on a hand-written constant. It was
 * named "schema conformance", but no schema-conformance evaluator exists in
 * this suite, so the name advertised a layer that was not there.
 */
describe('raw_log_corroboration dataset invariants', () => {
  it('has at least one scenario, with unique ids', () => {
    const ids = SCENARIOS.map((s) => s.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every scenario is queryable: non-empty scope and a forward time range', () => {
    for (const scenario of SCENARIOS) {
      expect(scenario.scope.hosts.length).toBeGreaterThan(0);
      expect(scenario.alertIds.length).toBeGreaterThan(0);
      expect(scenario.narrative.length).toBeGreaterThan(0);
      expect(scenario.stages.length).toBeGreaterThan(0);

      const from = Date.parse(scenario.scope.timeRange.from);
      const to = Date.parse(scenario.scope.timeRange.to);
      expect(Number.isNaN(from)).toBe(false);
      expect(Number.isNaN(to)).toBe(false);
      expect(from).toBeLessThan(to);
    }
  });

  // The invariant that keeps fixture and expectation honest. The seeder writes
  // telemetry for exactly the corroborated stages, so the bounds must describe
  // that same set. Without this, editing `stages` silently changes what the eval
  // measures while `expected` keeps asserting the old numbers.
  it('corroboration bounds match the stages the seeder will seed', () => {
    for (const scenario of SCENARIOS) {
      const corroborated = scenario.stages.filter((s) => s.corroborated).length;
      expect(scenario.expected.minCorroboratedCount).toBe(corroborated);
      expect(scenario.expected.maxCorroboratedCount).toBe(corroborated);
    }
  });

  it('gap bounds match the stages with no in-scope telemetry', () => {
    for (const scenario of SCENARIOS) {
      const gaps = scenario.stages.filter((s) => !s.corroborated).length;
      expect(scenario.expected.maxGapCount).toBe(gaps);
      expect(scenario.expected.minGapCount).toBeLessThanOrEqual(gaps);
    }
  });

  it('bounds are ordered, non-negative integers', () => {
    for (const scenario of SCENARIOS) {
      const { minCorroboratedCount, maxCorroboratedCount, minGapCount, maxGapCount } =
        scenario.expected;
      for (const value of [minCorroboratedCount, maxCorroboratedCount, minGapCount, maxGapCount]) {
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
      }
      expect(minCorroboratedCount).toBeLessThanOrEqual(maxCorroboratedCount);
      expect(minGapCount).toBeLessThanOrEqual(maxGapCount);
    }
  });

  it('encodes the intended semantics of each named scenario', () => {
    const byId = new Map(SCENARIOS.map((s) => [s.id, s]));

    const full = byId.get('full-corroboration');
    expect(full).toBeDefined();
    expect(full?.expected.minGapCount).toBe(0);
    expect(full?.expected.minCorroboratedCount).toBeGreaterThan(0);

    const partial = byId.get('partial-gap');
    expect(partial).toBeDefined();
    expect(partial?.expected.minGapCount).toBe(1);

    const none = byId.get('no-raw-telemetry');
    expect(none).toBeDefined();
    expect(none?.expected.maxCorroboratedCount).toBe(0);
    expect(none?.expected.minGapCount).toBeGreaterThanOrEqual(1);
  });

  it('a decoy stage is never corroborated and never in scope', () => {
    for (const scenario of SCENARIOS) {
      const decoyStages = scenario.stages.flatMap((stage) =>
        stage.decoy === undefined ? [] : [{ stage, decoy: stage.decoy }]
      );
      for (const { stage, decoy } of decoyStages) {
        expect(stage.corroborated).toBe(false);
        // A decoy must be out of scope on at least one axis, otherwise it is
        // just normal corroborating telemetry wearing the wrong name.
        expect(scenario.scope.hosts.includes(decoy.host)).toBe(false);
      }
    }
  });

  it('keeps at least one scenario with a decoy, so over-claiming stays detectable', () => {
    const withDecoy = SCENARIOS.filter((s) => s.stages.some((stage) => stage.decoy !== undefined));
    expect(withDecoy.length).toBeGreaterThan(0);
    // And such a scenario must permit no corroboration, or the decoy proves
    // nothing: over-claiming has to be able to fail.
    for (const scenario of withDecoy) {
      expect(scenario.expected.maxCorroboratedCount).toBe(0);
    }
  });

  it('uses comparison-safe scenario ids', () => {
    // leaf_quality.spec.ts derives example ids as `raw-log-${scenario.id}`, and
    // eval results are compared run-to-run by that id. A non-slug id would
    // silently rename eval cases and break comparison.
    for (const scenario of SCENARIOS) {
      expect(scenario.id).toMatch(/^[a-z0-9-]+$/);
    }
  });
});
