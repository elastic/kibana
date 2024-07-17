/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TOASTER } from '../../../../screens/alerts_detection_rules';
import { visitRulesManagementTable } from '../../../../tasks/rules_management';
import {
  disableAutoRefresh,
  manuallyRunFirstRule,
  manualRuleRunFromDetailsPage,
} from '../../../../tasks/alerts_detection_rules';
import { visitRuleDetailsPage } from '../../../../tasks/rule_details';
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
  });

  it('schedule from rule details page', () => {
    createRule(getNewRule({ rule_id: 'new custom rule', interval: '5m', from: 'now-6m' })).then(
      (rule) => visitRuleDetailsPage(rule.body.id)
    );
    manualRuleRunFromDetailsPage();

    cy.get(TOASTER).should('have.text', 'Successfully scheduled manual run for 1 rule');
  });

  it('schedule from rules management table', () => {
    createRule(getNewRule({ rule_id: 'new custom rule', interval: '5m', from: 'now-6m' })).then(
      (rule) => {
        visitRulesManagementTable();
        disableAutoRefresh();
        manuallyRunFirstRule();

        cy.get(TOASTER).should('have.text', 'Successfully scheduled manual run for 1 rule');
      }
    );
  });
});
