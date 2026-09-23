/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FULL_PROFILE_BACKGROUND_ALERT_COUNT,
  FULL_PROFILE_LOUD_CLUSTER_ALERT_COUNT,
  buildBackgroundNoiseAlerts,
  buildLoudClusterAlerts,
  getBackgroundNoiseAlertIds,
} from './background_noise';
import { AD2_FULL_SCENARIO_KEYS, buildAd2SeedPlan, getAd2Scenario } from './registry';

describe('AD2 full profile seed plan', () => {
  const fixedBaseTime = new Date('2026-07-01T12:00:00.000Z');

  const runMarker = 'test-run-marker';

  it('builds deterministic background and loud-cluster noise alerts', () => {
    expect(buildBackgroundNoiseAlerts(runMarker, fixedBaseTime)).toHaveLength(
      FULL_PROFILE_BACKGROUND_ALERT_COUNT
    );
    expect(buildLoudClusterAlerts(runMarker, fixedBaseTime)).toHaveLength(
      FULL_PROFILE_LOUD_CLUSTER_ALERT_COUNT
    );
    expect(getBackgroundNoiseAlertIds(runMarker)).toHaveLength(
      FULL_PROFILE_BACKGROUND_ALERT_COUNT + FULL_PROFILE_LOUD_CLUSTER_ALERT_COUNT
    );
  });

  it('builds 28 signal alerts plus 150 noise alerts for the full profile', () => {
    const plan = buildAd2SeedPlan({ profile: 'full', baseTime: fixedBaseTime, runMarker });

    expect(plan.scenarioKeys).toHaveLength(7);
    expect(plan.noiseAlertIds).toHaveLength(150);
    expect(plan.alerts).toHaveLength(178);
    expect(plan.rawEvents.length).toBeGreaterThan(0);
  });

  // Noise cohorts represent a FEW noisy rules firing repeatedly, so all hits
  // of one rule share a single rule identity (`kibana.alert.rule.uuid` /
  // `rule_id` / `rule.id`) while every ALERT id stays unique — rule-based
  // correlation must see repeated-hit clusters, not 150 single-hit rules.
  it('shares one rule identity across each noise rule cohort, keeping alert ids unique', () => {
    const background = buildBackgroundNoiseAlerts(runMarker, fixedBaseTime);
    const loud = buildLoudClusterAlerts(runMarker, fixedBaseTime);

    const ruleIdsOf = (alerts: typeof background): Set<unknown> =>
      new Set(alerts.map((alert) => (alert.source as { rule: { id: string } }).rule.id));
    const alertIdsOf = (alerts: typeof background): Set<string> =>
      new Set(alerts.map((alert) => alert.id));

    // 110 background alerts come from 12 rules; the 40 Defender alerts from one.
    expect(ruleIdsOf(background).size).toBe(12);
    expect(ruleIdsOf(loud).size).toBe(1);
    // Alert identity is still per hit.
    expect(alertIdsOf(background).size).toBe(background.length);
    expect(alertIdsOf(loud).size).toBe(loud.length);
  });

  // A noise population entirely below the signal severity/risk range is a
  // perfect answer key (`risk_score >= 70` returns every signal alert and no
  // noise), so every signal severity and every signal risk score must be
  // matched or exceeded by some background noise — the same no-separation
  // invariant the dense profile pins in `dense_scenarios.test.ts`.
  it('does not let severity or risk score separate full-profile signal from noise', () => {
    const signalRisks: number[] = [];
    const signalSeverities = new Set<string>();
    for (const key of AD2_FULL_SCENARIO_KEYS) {
      const scenario = getAd2Scenario(key, 'full');
      expect(scenario).toBeDefined();
      for (const step of scenario?.steps ?? []) {
        signalRisks.push(step.riskScore);
        signalSeverities.add(step.severity);
      }
    }

    const noiseAlerts = [
      ...buildBackgroundNoiseAlerts(runMarker, fixedBaseTime),
      ...buildLoudClusterAlerts(runMarker, fixedBaseTime),
    ];
    const noiseRisks = noiseAlerts.map(
      (alert) => alert.source['kibana.alert.risk_score'] as number
    );
    const noiseSeverities = new Set(
      noiseAlerts.map((alert) => alert.source['kibana.alert.severity'] as string)
    );

    expect(signalRisks.length).toBeGreaterThan(0);
    expect(noiseRisks).toHaveLength(150);
    for (const risk of signalRisks) {
      expect(noiseRisks.some((candidate) => candidate >= risk)).toBe(true);
    }
    for (const severity of signalSeverities) {
      expect(noiseSeverities.has(severity)).toBe(true);
    }
  });

  // The literal `Background test alert` label on every noise alert was a
  // one-string answer key of its own; each noise alert now carries a benign
  // reading in its message instead.
  it('does not label noise alerts as test data', () => {
    const noiseAlerts = [
      ...buildBackgroundNoiseAlerts(runMarker, fixedBaseTime),
      ...buildLoudClusterAlerts(runMarker, fixedBaseTime),
    ];
    for (const alert of noiseAlerts) {
      const message = String(
        alert.source['kibana.alert.reason'] ??
          (alert.source as { rule?: { description?: string } }).rule?.description ??
          ''
      );
      expect(message.toLowerCase()).not.toContain('test alert');
      expect(message).not.toBe('');
    }
  });
});
