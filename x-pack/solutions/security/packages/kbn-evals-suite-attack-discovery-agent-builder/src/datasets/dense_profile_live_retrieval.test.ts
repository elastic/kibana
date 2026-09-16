/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AD2_CLEAN_SCENARIO_KEYS, getAd2ScenarioAlertIds } from '../scenario_registry';
import { AD2_DENSE_TARGET_ALERTS } from '../scenario_registry/dense_scenarios';
import { denseProfileLiveRetrievalExample } from './dense_profile_live_retrieval';

describe('dense profile live-retrieval dataset', () => {
  // Rubric is structurally N/A without reference attackDiscoveries (it skips
  // when `expected.attackDiscoveries` is empty) — measured 7/7 N/A on golden
  // for the dense profile before the reference was wired in. Pin the reference
  // so the suite's main quality signal cannot silently drop off dense again.
  it('carries the four clean chains as reference attack discoveries', () => {
    const reference = denseProfileLiveRetrievalExample.output?.attackDiscoveries ?? [];
    // `?? []` keeps this non-vacuous: an absent output makes the length fail.
    expect(reference).toHaveLength(AD2_CLEAN_SCENARIO_KEYS.length);

    const expectedRealAlertIds = AD2_CLEAN_SCENARIO_KEYS.flatMap((key) => [
      ...getAd2ScenarioAlertIds(key),
    ]);
    const referencedAlertIds = reference.flatMap((discovery) => discovery.alertIds);
    expect([...referencedAlertIds].sort()).toEqual([...expectedRealAlertIds].sort());
  });

  // The WorkflowEvidence evaluator reads `null` as "assert the run reports
  // null" (its Fix-3 contract), so a `null` here makes dense unwinnable: any
  // run that passes alerts scores 0 (measured on golden). The passed count
  // must stay UNSCORED, which the contract expresses only as an absent key.
  it('leaves the passed alert count unscored (absent, not null)', () => {
    expect(
      Object.prototype.hasOwnProperty.call(
        denseProfileLiveRetrievalExample.output,
        'expectedPassedAlertCount'
      )
    ).toBe(false);
  });

  it('still expects retrieval of the whole seeded population', () => {
    expect(denseProfileLiveRetrievalExample.output?.expectedRetrievedAlertCount).toBe(
      AD2_DENSE_TARGET_ALERTS
    );
  });
});
