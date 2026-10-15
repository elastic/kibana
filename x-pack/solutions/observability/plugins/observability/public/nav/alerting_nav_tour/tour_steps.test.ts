/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities, CoreStart } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { getAlertingNavTourSteps } from './tour_steps';

const FULL_CAPABILITIES = {
  alerting_v2_alerts: { read: true },
  alerting_v2_rules: { all: true, read: true },
  alerting_v2_action_policies: { read: true },
  alerting_v2_execution_history: { read: true },
  observabilityAlerts: { show: true },
  management: {
    insightsAndAlerting: {
      triggersActionsRules: true,
      maintenanceWindows: true,
    },
  },
};

const createCore = (capabilities: Record<string, unknown>): CoreStart => {
  const core = coreMock.createStart();
  core.application.capabilities = {
    ...core.application.capabilities,
    ...capabilities,
  } as Capabilities;
  return core;
};

const getStepIds = (capabilities: Record<string, unknown>) =>
  getAlertingNavTourSteps(createCore(capabilities)).map(({ stepId }) => stepId);

describe('getAlertingNavTourSteps', () => {
  it('defines the Alerts-through-create tour with safe anchors and navigation targets', () => {
    const steps = getAlertingNavTourSteps(createCore(FULL_CAPABILITIES));

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

    expect(byId.rules.anchor).toBe(
      '[data-test-subj~="nav-item-deepLinkId-observabilityAlerting:rules-v2"]'
    );
    expect(byId.rules.path).toBe('/rules/v2');
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

  it('targets Classic rules and omits Universal-only steps for a Classic-only user', () => {
    const core = createCore({
      observabilityAlerts: { show: true },
      management: { insightsAndAlerting: { triggersActionsRules: true } },
    });
    const steps = getAlertingNavTourSteps(core);

    expect(steps.map(({ stepId }) => stepId)).toEqual(['alerts', 'rules']);
    const rules = steps.find(({ stepId }) => stepId === 'rules');
    expect(rules?.anchor).toBe(
      '[data-test-subj~="nav-item-deepLinkId-observabilityAlerting:rules-v1"]'
    );
    expect(rules?.path).toBe('/rules/v1');
  });

  it('omits the rules tabs step when only Universal rules are visible', () => {
    expect(
      getStepIds({
        alerting_v2_alerts: { read: true },
        alerting_v2_rules: { all: true, read: true },
      })
    ).toEqual(['alerts', 'rules', 'createFirstRule']);
  });

  it('omits the create rule step for read-only Universal rules users', () => {
    expect(
      getStepIds({ ...FULL_CAPABILITIES, alerting_v2_rules: { all: false, read: true } })
    ).not.toContain('createFirstRule');
  });

  it('omits steps whose nav item is hidden by missing capabilities', () => {
    const stepIds = getStepIds({
      ...FULL_CAPABILITIES,
      alerting_v2_action_policies: { read: false },
      alerting_v2_execution_history: { read: false },
      management: { insightsAndAlerting: { triggersActionsRules: true } },
    });

    expect(stepIds).not.toContain('actionPolicies');
    expect(stepIds).not.toContain('executionHistory');
    expect(stepIds).not.toContain('maintenanceWindows');
  });
});
