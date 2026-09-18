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
 * into a shape the gates cannot interpret.
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

      const from = Date.parse(scenario.scope.timeRange.from);
      const to = Date.parse(scenario.scope.timeRange.to);
      expect(Number.isNaN(from)).toBe(false);
      expect(Number.isNaN(to)).toBe(false);
      expect(from).toBeLessThan(to);
    }
  });

  it('expects non-negative integer counts', () => {
    for (const scenario of SCENARIOS) {
      for (const value of [scenario.expected.corroboratedCount, scenario.expected.gapCount]) {
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('encodes the intended semantics of each named scenario', () => {
    // The three scenarios are deliberately ordered by corroboration strength.
    // If an expectation drifts, the suite silently stops testing what its name
    // claims — which is exactly the kind of edit this file should catch.
    const byId = new Map(SCENARIOS.map((s) => [s.id, s]));

    const full = byId.get('full-corroboration');
    expect(full).toBeDefined();
    expect(full?.expected.gapCount).toBe(0);
    expect(full?.expected.corroboratedCount).toBeGreaterThan(0);

    const partial = byId.get('partial-gap');
    expect(partial).toBeDefined();
    expect(partial?.expected.gapCount).toBe(1);

    const none = byId.get('no-raw-telemetry');
    expect(none).toBeDefined();
    expect(none?.expected.corroboratedCount).toBe(0);
    expect(none?.expected.gapCount).toBeGreaterThanOrEqual(1);
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
