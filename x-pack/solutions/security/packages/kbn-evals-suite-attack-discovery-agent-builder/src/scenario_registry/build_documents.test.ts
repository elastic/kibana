/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AD2_SCENARIO_SEED_LABEL } from './constants';
import { buildAd2SeedPlan, getAd2ScenarioAlertIds } from './registry';

describe('AD2 scenario registry (clean profile)', () => {
  const fixedBaseTime = new Date('2026-07-13T12:00:00.000Z');

  it('builds 16 alerts and raw events for the clean profile', () => {
    const plan = buildAd2SeedPlan({ profile: 'clean', baseTime: fixedBaseTime });

    expect(plan.scenarioKeys).toEqual([
      'encoded-powershell',
      'bits-mshta',
      'linux-curl',
      'wmi-lateral',
    ]);
    expect(plan.alerts).toHaveLength(16);
    expect(plan.rawEvents.length).toBeGreaterThan(16);
    expect(
      plan.alerts.every(
        (alert) =>
          typeof alert.source.labels === 'object' &&
          alert.source.labels !== null &&
          'ad_portable_seed' in (alert.source.labels as Record<string, unknown>)
      )
    ).toBe(true);
  });

  it('carries the fixture marker in root tags, the field a retrieval can filter on', () => {
    const plan = buildAd2SeedPlan({ profile: 'dense', baseTime: fixedBaseTime });

    // `labels` is the cleanup marker; root `tags` is the RETRIEVAL marker — an
    // ECS keyword field, which is what the live-retrieval datasets scope their
    // query by. Losing it silently turns the dense profile's exact-population
    // expectation into a count of whatever else is in the shared alerts index.
    const tagged = plan.alerts.filter((alert) =>
      ((alert.source.tags as string[] | undefined) ?? []).includes(AD2_SCENARIO_SEED_LABEL)
    );
    expect(tagged).toHaveLength(plan.alerts.length);
    expect(plan.alerts.length).toBeGreaterThan(0);
  });

  it('uses deterministic scenario-registry ids and labels', () => {
    const plan = buildAd2SeedPlan({
      profile: 'clean',
      scenarioKey: 'encoded-powershell',
      baseTime: fixedBaseTime,
    });

    expect(plan.alerts).toHaveLength(4);
    expect(plan.alerts[0]?.id).toBe('ad-scenario-encoded-powershell-alert-1');
    expect(plan.alerts[0]?.source).toMatchObject({
      labels: {
        ad_portable_seed: 'ad-scenario-registry-2026-07',
        ad_test_scenario: 'encoded-powershell',
      },
      host: { name: 'wks-alice-01' },
    });
    expect(getAd2ScenarioAlertIds('encoded-powershell')).toEqual([
      'ad-scenario-encoded-powershell-alert-1',
      'ad-scenario-encoded-powershell-alert-2',
      'ad-scenario-encoded-powershell-alert-3',
      'ad-scenario-encoded-powershell-alert-4',
    ]);
  });

  it('emits network and file raw events for multi-stage chains', () => {
    const plan = buildAd2SeedPlan({
      profile: 'clean',
      scenarioKey: 'linux-curl',
      baseTime: fixedBaseTime,
    });

    const indices = new Set(plan.rawEvents.map((event) => event.index));
    expect(indices.has('logs-endpoint.events.process-default')).toBe(true);
    expect(indices.has('logs-endpoint.events.network-default')).toBe(true);
    expect(indices.has('logs-endpoint.events.file-default')).toBe(true);
  });
});
