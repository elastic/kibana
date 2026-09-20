/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
  SYSTEM_SECURITY_WORKER_IDS,
} from '@kbn/alertzero-common';
import { getWorkerCustomSettingsComponent } from './registry';
import { HuntSettings } from './hunt/hunt_settings';

describe('getWorkerCustomSettingsComponent', () => {
  it('returns the Hunt settings component for the Continuous Threat Hunt Worker', () => {
    expect(
      getWorkerCustomSettingsComponent(SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID)
    ).toBe(HuntSettings);
  });

  // The scope guarantee. The agent picker ships for the Hunt Watch only, so every other Worker —
  // including the one that has custom settings of its own — must not get it. Listing the Workers
  // from the catalog rather than by hand means a newly added Worker is covered the day it lands.
  it('gives no Worker other than Continuous Threat Hunt the Hunt agent picker', () => {
    const otherWorkerIds = SYSTEM_SECURITY_WORKER_IDS.filter(
      (workerId) => workerId !== SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID
    );

    expect(otherWorkerIds.length).toBeGreaterThan(0);
    for (const workerId of otherWorkerIds) {
      expect(getWorkerCustomSettingsComponent(workerId)).not.toBe(HuntSettings);
    }
  });

  it('leaves a Worker with no custom settings rendering only the shared controls', () => {
    expect(
      getWorkerCustomSettingsComponent(SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID)
    ).toBeUndefined();
  });

  it('still returns the Rule Tuning component for the Rule Tuning Worker', () => {
    expect(
      getWorkerCustomSettingsComponent(SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID)
    ).toBeDefined();
  });
});
