/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { scheduleManualRuleRunForSelectedRules } from '../../../../tasks/rules_bulk_actions';
import { MODAL_ERROR_BODY, TOASTER_BODY } from '../../../../screens/alerts_detection_rules';
import { visitRulesManagementTable } from '../../../../tasks/rules_management';
import {
  disableAutoRefresh,
  clickErrorToastBtn,
  selectAllRules,
  selectRulesByName,
} from '../../../../tasks/alerts_detection_rules';
import { getNewRule } from '../../../../objects/rule';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import { createRule } from '../../../../tasks/api_calls/rules';
import { login } from '../../../../tasks/login';

// Currently FF are not supported on MKI environments, so this test should be skipped from MKI environments.
// Once `manualRuleRunEnabled` FF is removed, we can remove `@skipInServerlessMKI` as well
describe('Manual rule run', { tags: ['@ess', '@serverless', '@skipInServerlessMKI'] }, () => {
  beforeEach(() => {
    login();
    deleteAlertsAndRules();

    const defaultValues = { enabled: true, interval: '5m', from: 'now-6m' };
    createRule(getNewRule({ rule_id: '1', name: 'Rule 1', ...defaultValues }));
    createRule(getNewRule({ rule_id: '2', name: 'Rule 2', ...defaultValues }));
    createRule(getNewRule({ rule_id: '3', name: 'Rule 3', ...defaultValues, enabled: false }));
    createRule(getNewRule({ rule_id: '4', name: 'Rule 4', ...defaultValues }));
    createRule(getNewRule({ rule_id: '5', name: 'Rule 5', ...defaultValues, enabled: false }));

    visitRulesManagementTable();
    disableAutoRefresh();
  });

  it('schedule enabled rules', () => {
    const enabledRules = ['Rule 1', 'Rule 2', 'Rule 4'] as const;
    selectRulesByName(enabledRules);

    const enabledCount = enabledRules.length;
    const disabledCount = 0;
    scheduleManualRuleRunForSelectedRules(enabledCount, disabledCount);

    cy.contains(TOASTER_BODY, `Successfully scheduled manual rule run for ${enabledCount} rule`);
  });

  it('schedule enable rules and show warning about disabled rules', () => {
    const enabledRules = ['Rule 1', 'Rule 2', 'Rule 4'] as const;
    const disabledRules = ['Rule 3', 'Rule 5'] as const;
    selectRulesByName([...enabledRules, ...disabledRules]);

    const enabledCount = enabledRules.length;
    const disabledCount = disabledRules.length;
    scheduleManualRuleRunForSelectedRules(enabledCount, disabledCount);

    cy.contains(TOASTER_BODY, `Successfully scheduled manual rule run for ${enabledCount} rule`);
  });

  it('schedule enable rules and show partial error for disabled rules when all rules are selected', () => {
    selectAllRules();

    const enabledCount = 3;
    const disabledCount = 2;
    scheduleManualRuleRunForSelectedRules(enabledCount, disabledCount);

    cy.contains(
      TOASTER_BODY,
      `${disabledCount} rules failed to schedule manual rule run.See the full error`
    );

    // on error toast button click display error that it is not possible to schedule manual rule run for disabled rules
    clickErrorToastBtn();
    cy.contains(MODAL_ERROR_BODY, 'Cannot schedule manual rule run for a disabled rule');
  });
});
