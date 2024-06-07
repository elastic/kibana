/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { visitRulesManagementTable } from '../../../../tasks/rules_management';
import {
  disableAutoRefresh,
  manuallyRunFirstRule,
  manualRuleRunFromDetailsPage,
} from '../../../../tasks/alerts_detection_rules';
import {
  filterByRunType,
  getExecutionLogTableRow,
  goToExecutionLogTab,
  refreshRuleExecutionTable,
  visitRuleDetailsPage,
} from '../../../../tasks/rule_details';
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
    createRule(getNewRule({ rule_id: 'new custom rule' })).then((rule) =>
      visitRuleDetailsPage(rule.body.id)
    );
    manualRuleRunFromDetailsPage();

    goToExecutionLogTab();
    filterByRunType('Manual');
    cy.waitUntil(
      () => {
        cy.log('Waiting for manually scheduled rule execution logs to appear');
        refreshRuleExecutionTable();
        return getExecutionLogTableRow().then((rows) => {
          return rows.length > 2;
        });
      },
      { interval: 5000, timeout: 20000 }
    );
  });

  it('schedule from rules management table', () => {
    createRule(getNewRule({ rule_id: 'new custom rule' })).then((rule) => {
      visitRulesManagementTable();
      disableAutoRefresh();
      manuallyRunFirstRule();

      visitRuleDetailsPage(rule.body.id);
      goToExecutionLogTab();
      filterByRunType('Manual');
      cy.waitUntil(
        () => {
          cy.log('Waiting for manually scheduled rule execution logs to appear');
          refreshRuleExecutionTable();
          return getExecutionLogTableRow().then((rows) => {
            return rows.length > 2;
          });
        },
        { interval: 5000, timeout: 20000 }
      );
    });
  });
});
