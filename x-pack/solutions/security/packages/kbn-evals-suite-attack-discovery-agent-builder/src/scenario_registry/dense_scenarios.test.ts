/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AD2_CLEAN_SCENARIO_KEYS } from './clean_scenarios';
import { AD2_DENSE_BACKGROUND_TEMPLATES, AD2_DENSE_TARGET_ALERTS } from './dense_scenarios';
import {
  buildAd2SeedPlan,
  getAd2Scenario,
  getAd2ScenarioAlertIds,
  listAd2ScenarioKeys,
} from './registry';
import type { Ad2ScenarioDefinition, Ad2ScenarioStep, Ad2SeedPlan, Ad2SeedProfile } from './types';

const fixedBaseTime = new Date('2026-07-01T00:00:00.000Z');

/**
 * Ids are opaque digests of `(scenarioKey, stepNumber)`, so a test cannot read
 * the key back out of one. Grouping therefore goes through the resolver the
 * datasets use — which is the property that has to hold anyway: whatever the
 * seeder writes, the reference `alertIds` have to name.
 */
const scenarioKeyByAlertId = (profile: Ad2SeedProfile): Map<string, string> => {
  const byId = new Map<string, string>();
  for (const key of listAd2ScenarioKeys(profile)) {
    for (const id of getAd2ScenarioAlertIds(key, profile)) {
      byId.set(id, key);
    }
  }
  return byId;
};

const countAlertsPerScenario = (
  alerts: readonly { id: string }[],
  byId: Map<string, string>
): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const alert of alerts) {
    const key = byId.get(alert.id);
    if (key === undefined) {
      throw new Error(`no scenario key resolves the seeded alert id ${alert.id}`);
    }
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
};

const isBackgroundScenarioKey = (scenarioKey: string): boolean =>
  AD2_DENSE_BACKGROUND_TEMPLATES.some((template) => scenarioKey.startsWith(`${template.key}-`));

/**
 * The steps of one side of the dense split — background noise, or the four
 * reference chains — read through the resolver the datasets use, the same way
 * `scenarioKeyByAlertId` does: whatever the fixture emits, the discriminator
 * checks below have to see it.
 */
const denseStepsBySide = (dense: Ad2SeedPlan, background: boolean): Ad2ScenarioStep[] =>
  dense.scenarioKeys
    .filter((scenarioKey) => isBackgroundScenarioKey(scenarioKey) === background)
    .flatMap((scenarioKey) => getAd2Scenario(scenarioKey, 'dense')?.steps ?? []);

const backgroundOccurrences = (templateKey: string): Ad2ScenarioDefinition[] =>
  listAd2ScenarioKeys('dense')
    .filter((key) => key.startsWith(`${templateKey}-`))
    .map((key) => getAd2Scenario(key, 'dense'))
    .filter((scenario): scenario is Ad2ScenarioDefinition => scenario !== undefined);

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

  it('keeps each background chain length occurrence-independent', () => {
    for (const template of AD2_DENSE_BACKGROUND_TEMPLATES) {
      const lengths = new Set(
        [1, 2, 3, 7, 12].map(
          (occurrence) => template.stepsFor({ occurrence, host: `host-${occurrence}` }).length
        )
      );

      // The truncation test below reads its expectation from the template, so
      // that expectation is only meaningful while the template's length does
      // not depend on which occurrence it is being expanded for.
      expect(lengths.size).toBe(1);
    }
  });

  it('emits every background chain at its template length, never truncated', () => {
    const dense = buildAd2SeedPlan({ profile: 'dense', baseTime: fixedBaseTime });
    const perScenario = countAlertsPerScenario(dense.alerts, scenarioKeyByAlertId('dense'));

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
    expect(
      AD2_DENSE_BACKGROUND_TEMPLATES.some(
        (template) => template.stepsFor({ occurrence: 1, host: template.host }).length > 1
      )
    ).toBe(true);

    for (const [scenarioKey, alertCount] of emittedBackground) {
      const template = AD2_DENSE_BACKGROUND_TEMPLATES.find((candidate) =>
        scenarioKey.startsWith(`${candidate.key}-`)
      );
      expect(alertCount).toBe(template?.stepsFor({ occurrence: 1, host: template.host }).length);
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
    for (const backgroundStep of steps) {
      expect(`${backgroundStep.ruleName} ${backgroundStep.message}`).not.toMatch(
        /successful|succeeded|success/i
      );
    }
    // ...and the failure burst is contained by a control rather than escalating.
    expect(steps.map((backgroundStep) => backgroundStep.ruleName)).toContain(
      'Account Lockout Policy Triggered'
    );
  });

  it('does not let severity separate target from noise', () => {
    const dense = buildAd2SeedPlan({ profile: 'dense', baseTime: fixedBaseTime });
    const backgroundSteps = denseStepsBySide(dense, true);
    const targetSteps = denseStepsBySide(dense, false);

    // Non-vacuity: "no separation" means nothing if either side is empty, and an
    // empty background would satisfy the overlap below.
    expect(backgroundSteps.length).toBeGreaterThan(0);
    expect(targetSteps.length).toBeGreaterThan(0);

    // THE leak this replaces: `severity IN ('high', 'critical')` returned
    // exactly the four reference chains — every target step was high|critical
    // and every background step low|medium — so a model could drop the whole
    // background on one field of the alert it reads and regroup the remainder by
    // host. A severity the targets use and the background does not is that key
    // again, so no severity may be exclusive to the targets.
    const backgroundSeverities = new Set(backgroundSteps.map((step) => step.severity));
    for (const targetSeverity of new Set(targetSteps.map((step) => step.severity))) {
      expect(backgroundSeverities).toContain(targetSeverity);
    }
  });

  it('does not let the risk score separate target from noise either', () => {
    const dense = buildAd2SeedPlan({ profile: 'dense', baseTime: fixedBaseTime });
    const backgroundRiskScores = denseStepsBySide(dense, true).map((step) => step.riskScore);
    const targetRiskScores = denseStepsBySide(dense, false).map((step) => step.riskScore);

    expect(backgroundRiskScores.length).toBeGreaterThan(0);
    expect(targetRiskScores.length).toBeGreaterThan(0);

    // `kibana.alert.risk_score` is written into every seeded alert
    // (`build_documents.ts`), the evaluator's own default query SORTs on it, and
    // the two sides were disjoint there as well (targets 72-96, background
    // 18-47) — the same answer key in a second field. A background maximum
    // merely ABOVE the target minimum is not enough: `risk_score >= 90` then
    // still returned one alert per target HOST, and grouping each of those
    // hosts' alerts recovers the four chains exactly.
    //
    // So the invariant is per target value, not "some background step sits
    // inside the band": for EVERY risk score a target step carries, some
    // background step scores at least as high — which is what leaves no
    // threshold that keeps a target host's alerts and drops the noise.
    for (const targetRiskScore of targetRiskScores) {
      expect(backgroundRiskScores.some((riskScore) => riskScore >= targetRiskScore)).toBe(true);
    }
  });

  it('keeps every escalated background step benign on its own fields', () => {
    // A background step is only allowed to be high|critical when its own fields
    // carry the benign reading: without one it is a recall target the reference
    // does not contain, and the Criteria evaluator then scores a model that read
    // the alert correctly as a false positive. So the escalation is not a
    // severity value to copy onto another template — the marker below is the
    // observable `bg-vendor-update`'s comment names, and escalating anything
    // else means putting the wording in that template's fields and extending
    // this table first.
    const escalatedMarkerByTemplate: Record<string, string> = {
      'bg-vendor-update': 'vendor-signed',
    };

    const dense = buildAd2SeedPlan({ profile: 'dense', baseTime: fixedBaseTime });
    const escalatedTemplateKeys = new Set(
      dense.scenarioKeys
        .filter(isBackgroundScenarioKey)
        .filter((scenarioKey) =>
          (getAd2Scenario(scenarioKey, 'dense')?.steps ?? []).some(
            (step) => step.severity === 'high' || step.severity === 'critical'
          )
        )
        .map((scenarioKey) => scenarioKey.replace(/-\d+$/, ''))
    );

    // Non-vacuity: the escalation is what breaks the severity key, so it has to
    // exist for this test to be about anything.
    expect(escalatedTemplateKeys.size).toBeGreaterThan(0);
    expect([...escalatedTemplateKeys].sort()).toEqual(
      Object.keys(escalatedMarkerByTemplate).sort()
    );

    for (const [templateKey, marker] of Object.entries(escalatedMarkerByTemplate)) {
      const occurrences = backgroundOccurrences(templateKey);
      expect(occurrences.length).toBeGreaterThan(0);

      for (const scenario of occurrences) {
        const escalatedSteps = scenario.steps.filter(
          (step) => step.severity === 'high' || step.severity === 'critical'
        );
        expect(escalatedSteps.length).toBeGreaterThan(0);

        for (const backgroundStep of escalatedSteps) {
          // Text proxy on the alert's own observable fields (rule name, message,
          // command line, file/network context), the same shape as the
          // non-actionable check above: the reading has to be in the document
          // the model reads, not only in this file's comments.
          const observables = `${backgroundStep.ruleName} ${backgroundStep.message} ${
            backgroundStep.commandLine ?? ''
          } ${backgroundStep.context ?? ''}`;
          expect(observables.toLowerCase()).toContain(marker);
        }
      }
    }
  });

  it('keeps the two de-campaigned patterns low severity and occurrence-owned', () => {
    // The two patterns flagged as campaign-shaped stay benign the way they were
    // fixed: low severity, and an observable owned by the occurrence itself
    // rather than shared across hosts. Raising either would re-open the finding
    // that fixed them, so the escalation above happens in its own template.
    for (const templateKey of ['bg-dns-telemetry', 'bg-macos-mdm']) {
      const occurrences = backgroundOccurrences(templateKey);
      expect(occurrences.length).toBeGreaterThan(0);

      for (const scenario of occurrences) {
        expect(scenario.steps.length).toBeGreaterThan(0);
        for (const templateStep of scenario.steps) {
          expect(templateStep.severity).toBe('low');
          expect(`${templateStep.context ?? ''}${templateStep.commandLine ?? ''}`).toContain(
            scenario.host
          );
        }
      }
    }
  });

  it('never repeats a background observable across occurrences', () => {
    for (const template of AD2_DENSE_BACKGROUND_TEMPLATES) {
      const occurrences = backgroundOccurrences(template.key);
      expect(occurrences.length).toBeGreaterThan(1);

      const stepCount = occurrences[0].steps.length;
      expect(new Set(occurrences.map((scenario) => scenario.steps.length))).toEqual(
        new Set([stepCount])
      );

      for (let stepIndex = 0; stepIndex < stepCount; stepIndex++) {
        const observables = occurrences.map((scenario) => {
          const occurrenceStep = scenario.steps[stepIndex];
          return `${occurrenceStep.context}|${occurrenceStep.commandLine}`;
        });

        // One indicator repeated on every host — the same DNS zone, the same
        // plist name, the same source address — is campaign-shaped: it
        // correlates into a single actor across a dozen machines, so a model
        // that groups it is reading the fixture correctly and still scores as a
        // false positive against a four-chain reference. Each occurrence has to
        // carry its own.
        expect(new Set(observables).size).toBe(observables.length);
      }
    }
  });

  it('does not leak a scenario key into anything a seeded document returns', () => {
    const dense = buildAd2SeedPlan({ profile: 'dense', baseTime: fixedBaseTime });

    // Non-vacuity: an empty population would satisfy the assertions below.
    expect(dense.alerts).toHaveLength(AD2_DENSE_TARGET_ALERTS);

    // `_id` comes back in the dense ES|QL result and every background key
    // starts with `bg-`, so an identifier — or a label — that spells the key
    // out lets a model discard the noise and regroup the remainder on the
    // shared `<key>-alert-` prefix without reading a content field, which is
    // the measurement this profile exists to make. Whole-document, so a new
    // field carrying the key cannot slip in unnoticed either.
    const serialized = JSON.stringify([...dense.alerts, ...dense.rawEvents]);
    for (const key of dense.scenarioKeys) {
      expect(serialized).not.toContain(key);
    }
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

  it('resolves exactly the ids the seeder writes, for every dense key', () => {
    const dense = buildAd2SeedPlan({ profile: 'dense', baseTime: fixedBaseTime });
    const seededIds = dense.alerts.map((alert) => alert.id);
    const resolvedIds = dense.scenarioKeys.flatMap((key) => [
      ...getAd2ScenarioAlertIds(key, 'dense'),
    ]);

    // Same ids and same count: a digest collision between two keys would show
    // up as a shortfall, and a drifted id shape as a mismatch — either way the
    // reference discoveries would name alerts the population does not hold.
    expect(new Set(seededIds).size).toBe(seededIds.length);
    expect(resolvedIds).toHaveLength(seededIds.length);
    expect(new Set(resolvedIds)).toEqual(new Set(seededIds));
  });

  it('still returns the clean profile by default', () => {
    const plan = buildAd2SeedPlan({ baseTime: fixedBaseTime });
    expect(plan.profile).toBe('clean');
    expect(plan.alerts).toHaveLength(16);
  });
});
