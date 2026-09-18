/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SCENARIOS } from './dataset';
import { planSeedEvents } from './data_generators/forensic_data';

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

  // ── Scenario isolation ─────────────────────────────────────────────────────
  // Every scenario is seeded into the same `logs-*` indices before any of them
  // runs, so the scope the prompt hands the agent is the only thing separating
  // one scenario's telemetry from another's. Both axes are pinned here.

  it('no host appears in two scenarios, so host scoping isolates them', () => {
    const hostsToScenarios = new Map<string, string[]>();
    for (const scenario of SCENARIOS) {
      for (const host of scenario.scope.hosts) {
        hostsToScenarios.set(host, [...(hostsToScenarios.get(host) ?? []), scenario.id]);
      }
    }

    const shared = [...hostsToScenarios.entries()].filter(([, ids]) => ids.length > 1);
    expect(shared).toEqual([]);
  });

  it('scenario time windows are pairwise disjoint, so time scoping isolates them', () => {
    const windows = SCENARIOS.map((scenario) => ({
      id: scenario.id,
      from: Date.parse(scenario.scope.timeRange.from),
      to: Date.parse(scenario.scope.timeRange.to),
    }));

    for (let i = 0; i < windows.length; i++) {
      for (let j = i + 1; j < windows.length; j++) {
        const overlaps = windows[i].from <= windows[j].to && windows[j].from <= windows[i].to;
        expect({
          pair: [windows[i].id, windows[j].id],
          overlaps,
        }).toEqual({ pair: [windows[i].id, windows[j].id], overlaps: false });
      }
    }
  });

  it('the seed plan puts every in-scope event inside its own scenario scope', () => {
    // The invariant that makes the two above load-bearing: an in-scope event
    // that lands outside its scenario's hosts/window is exactly what let the
    // "no raw telemetry" premise be answered from another scenario's documents.
    for (const scenario of SCENARIOS) {
      const from = Date.parse(scenario.scope.timeRange.from);
      const to = Date.parse(scenario.scope.timeRange.to);

      for (const event of planSeedEvents(scenario)) {
        const at = Date.parse(event.timestamp);
        expect(Number.isNaN(at)).toBe(false);

        if (event.decoy) {
          const outOfScope = !scenario.scope.hosts.includes(event.host) || at < from || at > to;
          expect({ id: event.id, outOfScope }).toEqual({ id: event.id, outOfScope: true });
        } else {
          expect(scenario.scope.hosts).toContain(event.host);
          expect(at).toBeGreaterThanOrEqual(from);
          expect(at).toBeLessThanOrEqual(to);
        }
      }
    }
  });

  it('seeds exactly the corroborated stages in scope and the decoy stages out of it', () => {
    for (const scenario of SCENARIOS) {
      const plan = planSeedEvents(scenario);
      const inScopeStages = scenario.stages.filter(
        (stage) => stage.corroborated && stage.decoy === undefined
      );
      const decoyStages = scenario.stages.filter((stage) => stage.decoy !== undefined);

      expect(plan.filter((event) => !event.decoy)).toHaveLength(inScopeStages.length * 2);
      expect(plan.filter((event) => event.decoy)).toHaveLength(decoyStages.length * 2);
      // Deterministic ids — cleanup deletes by `<scenarioId>` prefix.
      expect(new Set(plan.map((event) => event.id)).size).toBe(plan.length);
      for (const event of plan) {
        expect(event.id.startsWith(`${scenario.id}-`)).toBe(true);
      }
    }
  });

  it('declares a usable confidence floor for every scenario', () => {
    // The L2 gate reads this field; a missing/NaN/out-of-range floor would make
    // `confidenceOk` silently false (or vacuously true) for that scenario.
    for (const scenario of SCENARIOS) {
      const floor = scenario.expected.minConfidence;
      expect(Number.isFinite(floor)).toBe(true);
      expect(floor).toBeGreaterThan(0);
      expect(floor).toBeLessThanOrEqual(1);
    }
  });
});
