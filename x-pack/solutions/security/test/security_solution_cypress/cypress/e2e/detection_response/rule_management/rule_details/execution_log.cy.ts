/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { installMockPrebuiltRulesPackage } from '../../../../tasks/api_calls/prebuilt_rules';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { ruleDetailsUrl } from '../../../../urls/rule_details';
import { createRule } from '../../../../tasks/api_calls/rules';
import {
  goToExecutionLogTab,
  getExecutionLogTableRow,
  filterByRunType,
  waitForExecutionLogTabToBePopulated,
} from '../../../../tasks/rule_details';
import { getCustomQueryRuleParams } from '../../../../objects/rule';
import { EXECUTION_SHOWING } from '../../../../screens/rule_details';
import { manualRuleRun } from '../../../../tasks/api_calls/backfill';

// TODO: https://github.com/elastic/kibana/issues/244006
describe(
  'Event log',
  {
    tags: ['@ess', '@serverless', '@skipInServerlessMKI'],
  },
  function () {
    before(() => {
      installMockPrebuiltRulesPackage();
    });

    before(() => {
      login();
      deleteAlertsAndRules();
      createRule({
        ...getCustomQueryRuleParams({
          enabled: true,
        }),
      }).then((rule) => {
        cy.wrap(rule.body.id).as('ruleId');
      });
    });

    it('should display the execution log', function () {
      visit(ruleDetailsUrl(this.ruleId));
      goToExecutionLogTab();

      waitForExecutionLogTabToBePopulated(1);

      cy.get(EXECUTION_SHOWING).contains('Showing 1 rule execution');
      getExecutionLogTableRow().should('have.length', 1);

      cy.log('Scheduling a manual rule run');
      manualRuleRun({
        ruleId: this.ruleId,
        start: moment().subtract(5, 'm').toISOString(),
        end: moment().toISOString(),
      });

      waitForExecutionLogTabToBePopulated(2);

      cy.get(EXECUTION_SHOWING).contains('Showing 2 rule executions');
      getExecutionLogTableRow().should('have.length', 2);

      filterByRunType('Manual');
      getExecutionLogTableRow().should('have.length', 1);
    });
  }
);
