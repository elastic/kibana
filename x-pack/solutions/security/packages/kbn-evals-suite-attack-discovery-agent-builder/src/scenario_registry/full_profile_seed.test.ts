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
import { buildAd2SeedPlan } from './registry';

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
});
