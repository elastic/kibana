/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertingNavTourSteps } from './tour_steps';

const TOUR_STEPS = getAlertingNavTourSteps();

describe('getAlertingNavTourSteps', () => {
  it('covers alerts through create-first-rule, including maintenance windows', () => {
    expect(TOUR_STEPS.map((step) => step.stepId)).toEqual([
      'alerts',
      'rules',
      'rulesTabs',
      'actionPolicies',
      'maintenanceWindows',
      'executionHistory',
      'createFirstRule',
    ]);
  });

  it('anchors the rules step to the Rules nav item', () => {
    const rulesStep = TOUR_STEPS.find((step) => step.stepId === 'rules');
    expect(rulesStep?.anchor).toContain('nav-item-deepLinkId-observabilityAlerting:rules');
    expect(rulesStep?.anchorPosition).toBe('rightCenter');
  });

  it('anchors the rules tabs step to the Universal tab', () => {
    const rulesTabsStep = TOUR_STEPS.find((step) => step.stepId === 'rulesTabs');
    expect(rulesTabsStep?.anchor).toBe('[data-test-subj="v2RulesTab"]');
    expect(rulesTabsStep?.anchorPosition).toBe('downLeft');
  });

  it('navigates to Management for maintenance windows and anchors to the nav item', () => {
    const maintenanceStep = TOUR_STEPS.find((step) => step.stepId === 'maintenanceWindows');
    expect(maintenanceStep?.appId).toBe('management');
    expect(maintenanceStep?.path).toBe('/insightsAndAlerting/maintenanceWindows');
    expect(maintenanceStep?.anchor).toContain('nav-item-id-management:maintenanceWindows');
    expect(maintenanceStep?.anchorPosition).toBe('rightCenter');
    // Page content remains as a fallback when the Alerting panel is closed.
    expect(maintenanceStep?.anchor).toContain('mw-empty-prompt');
    // AppMenu create button must not be an anchor — EuiWrappingPopover relocates it and crashes.
    expect(maintenanceStep?.anchor).not.toContain('mw-create-button');

    const createFirstRuleStep = TOUR_STEPS.find((step) => step.stepId === 'createFirstRule');
    expect(createFirstRuleStep?.appId).toBe('observabilityAlerting');
    expect(createFirstRuleStep?.path).toBe('/rules/v2');
    expect(createFirstRuleStep?.anchor).toContain('createRuleButton');
    expect(createFirstRuleStep?.anchor).toContain('ruleCreateOptionsPanel');
    expect(createFirstRuleStep?.anchor).toContain('h2');
    expect(createFirstRuleStep?.anchorPosition).toBe('downCenter');
  });

  it('navigates within Alerting for every step except maintenance windows', () => {
    for (const step of TOUR_STEPS) {
      if (step.stepId === 'maintenanceWindows') {
        expect(step.appId).toBe('management');
      } else {
        expect(step.appId).toBe('observabilityAlerting');
      }
    }
  });
});
