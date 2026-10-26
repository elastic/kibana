/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAttacksTourSteps } from './tour_steps_config';

describe('getAttacksTourSteps', () => {
  it('returns all 3 steps when attacks are present', () => {
    const steps = getAttacksTourSteps(true);
    expect(steps).toHaveLength(3);
    expect(steps.map((s) => s.stepId)).toEqual(['run_schedule', 'filters', 'flyout']);
  });

  it('returns only 2 steps (omitting flyout) when no attacks are present', () => {
    const steps = getAttacksTourSteps(false);
    expect(steps).toHaveLength(2);
    expect(steps.map((s) => s.stepId)).toEqual(['run_schedule', 'filters']);
  });

  it('uses a downward position for the filters step to prevent viewport cutoff', () => {
    const steps = getAttacksTourSteps(true);
    const filtersStep = steps.find((step) => step.stepId === 'filters');

    expect(filtersStep).toBeDefined();
    expect(filtersStep?.anchorPosition?.startsWith('down')).toBe(true);
  });
});
