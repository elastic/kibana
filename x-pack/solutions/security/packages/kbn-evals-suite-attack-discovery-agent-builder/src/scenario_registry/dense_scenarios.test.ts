/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AD2_CLEAN_SCENARIO_KEYS } from './clean_scenarios';
import { AD2_DENSE_BACKGROUND_TEMPLATES, AD2_DENSE_TARGET_ALERTS } from './dense_scenarios';
import { AD2_SCENARIO_ID_PREFIX } from './constants';
import {
  buildAd2SeedPlan,
  getAd2Scenario,
  getAd2ScenarioAlertIds,
  listAd2ScenarioKeys,
} from './registry';

const fixedBaseTime = new Date('2026-07-01T00:00:00.000Z');

/** ids are `${prefix}${scenarioKey}-alert-${n}`. */
const scenarioKeyOf = (alertId: string): string =>
  alertId.replace(/-alert-\d+$/, '').replace(AD2_SCENARIO_ID_PREFIX, '');

const countAlertsPerScenario = (alerts: readonly { id: string }[]): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const alert of alerts) {
    const key = scenarioKeyOf(alert.id);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
};

const isBackgroundScenarioKey = (scenarioKey: string): boolean =>
  AD2_DENSE_BACKGROUND_TEMPLATES.some((template) => scenarioKey.startsWith(`${template.key}-`));

describe('AD2 scenario registry (dense profile)', () => {
  it('seeds exactly the target alert volume', () => {
    const plan = buildAd2SeedPlan({ profile: 'dense', baseTime: fixedBaseTime });

    // The whole point of the profile is the volume. If this drifts, a "dense"
    // board silently stops being magnitude-comparable to the reference trial.
    expect(plan.alerts).toHaveLength(AD2_DENSE_TARGET_ALERTS);
    expect(AD2_DENSE_TARGET_ALERTS).toBe(95);
  });

  it('is a strict superset of the clean profile', () => {
    const clean = buildAd2SeedPlan({ profile: 'clean', baseTime: fixedBaseTime });
    const dense = buildAd2SeedPlan({ profile: 'dense', baseTime: fixedBaseTime });

    const denseIds = new Set(dense.alerts.map((alert) => alert.id));
    for (const alert of clean.alerts) {
      expect(denseIds.has(alert.id)).toBe(true);
    }
    expect(dense.alerts.length).toBeGreaterThan(clean.alerts.length);
  });

  it('keeps the four target chains addressable', () => {
    const denseKeys = listAd2ScenarioKeys('dense');
    for (const key of AD2_CLEAN_SCENARIO_KEYS) {
      expect(denseKeys).toContain(key);
    }
  });

  it('spreads background alerts across distinct hosts', () => {
    const dense = buildAd2SeedPlan({ profile: 'dense', baseTime: fixedBaseTime });
    const hosts = new Set(
      dense.alerts.map((alert) => {
        const source = alert.source as { host?: { name?: string } };
        return source.host?.name;
      })
    );

    // A crowded index that is really one host would correlate trivially and
    // would not test triage at volume at all.
    expect(hosts.size).toBeGreaterThan(10);
  });

  it('emits every background chain at its template length, never truncated', () => {
    const dense = buildAd2SeedPlan({ profile: 'dense', baseTime: fixedBaseTime });
    const perScenario = countAlertsPerScenario(dense.alerts);

    // The expectation is read from the TEMPLATE, never from the emitted
    // scenario: a builder that trims `steps` to fit the residual budget shrinks
    // the emitted definition in lockstep, so any comparison drawn from it stays
    // green while a partial chain is seeded. (Measured: with
    // `steps: template.steps.slice(0, budget)` in `buildBackgroundScenarios`,
    // the previous version of this test passed 6/6 and emitted a one-step
    // `bg-rdp-bruteforce` chain.)
    const emittedBackground = [...perScenario].filter(([key]) => isBackgroundScenarioKey(key));
    expect(emittedBackground.length).toBeGreaterThan(0);
    // The comparison is only meaningful while a multi-step template exists.
    expect(AD2_DENSE_BACKGROUND_TEMPLATES.some((template) => template.steps.length > 1)).toBe(true);

    for (const [scenarioKey, alertCount] of emittedBackground) {
      const template = AD2_DENSE_BACKGROUND_TEMPLATES.find((candidate) =>
        scenarioKey.startsWith(`${candidate.key}-`)
      );
      expect(alertCount).toBe(template?.steps.length);
    }
  });

  it('keeps background chains non-actionable', () => {
    const dense = buildAd2SeedPlan({ profile: 'dense', baseTime: fixedBaseTime });
    const backgroundKeys = dense.scenarioKeys.filter(isBackgroundScenarioKey);
    const steps = backgroundKeys.flatMap((key) => getAd2Scenario(key, 'dense')?.steps ?? []);

    expect(backgroundKeys.length).toBeGreaterThan(0);
    expect(steps.length).toBeGreaterThan(0);

    // The dense ground truth is the four clean chains alone and the Rubric
    // scores a submission on alertId overlap with that reference, so a
    // background step reporting a successful authentication — after the failure
    // burst that precedes it — reads as a compromise chain and costs a model
    // that correctly surfaces it. Text proxy on the observable fields; the
    // point is that reintroducing a success step has to be deliberate.
    for (const step of steps) {
      expect(`${step.ruleName} ${step.message}`).not.toMatch(/successful|succeeded|success/i);
    }
    // ...and the failure burst is contained by a control rather than escalating.
    expect(steps.map((step) => step.ruleName)).toContain('Account Lockout Policy Triggered');
  });

  it('resolves alert ids for every key the dense profile lists', () => {
    const denseKeys = listAd2ScenarioKeys('dense');

    expect(denseKeys.length).toBeGreaterThan(AD2_CLEAN_SCENARIO_KEYS.length);

    for (const key of denseKeys) {
      const steps = getAd2Scenario(key, 'dense')?.steps ?? [];
      expect(steps.length).toBeGreaterThan(0);
      // Resolving ids without the profile returns [] for dense-only keys, which
      // silently drops them for any caller that enumerates the profile.
      expect(getAd2ScenarioAlertIds(key, 'dense')).toHaveLength(steps.length);
    }
  });

  it('still returns the clean profile by default', () => {
    const plan = buildAd2SeedPlan({ baseTime: fixedBaseTime });
    expect(plan.profile).toBe('clean');
    expect(plan.alerts).toHaveLength(16);
  });
});
