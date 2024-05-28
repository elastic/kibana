/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { ruleDetailsUrl } from '../../../../urls/rule_details';
import { createRule } from '../../../../tasks/api_calls/rules';
import { waitForAlertsToPopulate } from '../../../../tasks/create_new_rule';
import {
  goToExecutionLogTab,
  getExecutionLogTableRow,
  refreshRuleExecutionTable,
  filterByRunType,
} from '../../../../tasks/rule_details';
import { getNewRule } from '../../../../objects/rule';
import { EXECUTION_SHOWING } from '../../../../screens/rule_details';
import { manualRuleRun } from '../../../../tasks/api_calls/backfill';

describe(
  'Event log',
  {
    tags: ['@ess', '@serverless'],
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify(['manualRuleRunEnabled'])}`,
        ],
      },
    },
  },
  function () {
    before(() => {
      login();
      deleteAlertsAndRules();
      createRule({
        ...getNewRule(),
      }).then((rule) => {
        cy.wrap(rule.body.id).as('ruleId');
      });
    });

    it('should display the execution log', function () {
      visit(ruleDetailsUrl(this.ruleId));
      waitForAlertsToPopulate();
      goToExecutionLogTab();

      cy.get(EXECUTION_SHOWING).contains('Showing 1 rule execution');
      getExecutionLogTableRow().should('have.length', 1);
      manualRuleRun({
        ruleId: this.ruleId,
        start: moment().subtract(5, 'm').toISOString(),
        end: moment().toISOString(),
      });

      cy.waitUntil(
        () => {
          cy.log('Waiting for assignees to appear in popover');
          refreshRuleExecutionTable();
          return getExecutionLogTableRow().then((rows) => {
            return rows.length === 2;
          });
        },
        { interval: 5000, timeout: 20000 }
      );
      cy.get(EXECUTION_SHOWING).contains('Showing 2 rule executions');
      filterByRunType('Manual');

      getExecutionLogTableRow().should('have.length', 1);
    });
  }
);
