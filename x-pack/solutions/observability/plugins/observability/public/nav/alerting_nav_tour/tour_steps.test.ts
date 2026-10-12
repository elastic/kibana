/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertingNavTourSteps } from './tour_steps';

describe('getAlertingNavTourSteps', () => {
  it('defines the Alerts-through-create tour with safe anchors and navigation targets', () => {
    const steps = getAlertingNavTourSteps();

    expect(steps.map((step) => step.stepId)).toEqual([
      'alerts',
      'rules',
      'rulesTabs',
      'actionPolicies',
      'maintenanceWindows',
      'executionHistory',
      'createFirstRule',
    ]);

    const byId = Object.fromEntries(steps.map((step) => [step.stepId, step]));

    expect(byId.rules.anchor).toContain('nav-item-deepLinkId-observabilityAlerting:rules');
    expect(byId.rulesTabs.anchor).toBe('[data-test-subj="v2RulesTab"]');

    expect(byId.maintenanceWindows.appId).toBe('management');
    expect(byId.maintenanceWindows.path).toBe('/insightsAndAlerting/maintenanceWindows');
    expect(byId.maintenanceWindows.anchor).toContain('nav-item-id-management:maintenanceWindows');
    expect(byId.maintenanceWindows.anchor).not.toContain('mw-create-button');

    expect(byId.createFirstRule.appId).toBe('observabilityAlerting');
    expect(byId.createFirstRule.path).toBe('/rules/v2');
    expect(byId.createFirstRule.anchor).toContain('createRuleButton');
    expect(byId.createFirstRule.anchor).toContain('ruleCreateOptionsEmptyStateTitle');
    expect(byId.createFirstRule.anchor).not.toContain(' h2');

    for (const step of steps) {
      if (step.stepId === 'maintenanceWindows') {
        expect(step.appId).toBe('management');
      } else {
        expect(step.appId).toBe('observabilityAlerting');
      }
    }
  });
});
