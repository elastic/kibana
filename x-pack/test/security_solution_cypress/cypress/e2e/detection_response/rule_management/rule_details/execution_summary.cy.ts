/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { interceptGetGlobalRuleExecutionSummary } from '../../../../tasks/api_calls/rules';
import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { RULES_MONITORING_URL } from '../../../../urls/rules_management';
import { createRule } from '../../../../tasks/api_calls/rules';
import { getNewRule } from '../../../../objects/rule';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import {
  RULE_EXECUTION_SUMMARY_PANEL_FAILURE_COUNT_LABEL,
  RULE_EXECUTION_SUMMARY_PANEL_SUCCESS_COUNT_LABEL,
  RULE_EXECUTION_SUMMARY_PANEL_SUCCESS_RATE_LABEL,
  RULE_EXECUTION_SUMMARY_PANEL_WARNING_COUNT_LABEL,
  RULE_EXECUTION_SUMMARY_PANEL_TIME_RANGE_SELECTOR,
} from '../../../../screens/rule_details';

const executionSummaryResult = {
  executions: {
    total: 18,
    success: 9,
  },
  latestExecutionSummary: {
    success: 5,
    failure: 4,
    warning: 3,
  },
};

describe(
  'Execution summary',
  {
    tags: ['@ess', '@serverless', '@skipInServerlessMKI'],
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify([
            'storeGapsInEventLogEnabled',
          ])}`,
        ],
      },
    },
  },
  function () {
    beforeEach(() => {
      login();
      deleteAlertsAndRules();
      createRule(getNewRule());
    });

    it('attempts to fetch the summary for the selected interval ranges', function () {
      // Intercept API calls with data
      interceptGetGlobalRuleExecutionSummary({
        body: executionSummaryResult,
        statusCode: 200,
      });
      // Visit rule details and go to execution log tab
      visit(RULES_MONITORING_URL);

      cy.wait('@getGlobalRuleExecutionSummary', { timeout: 30000 }).then((interception) => {
        // Extract query parameters
        const url = new URL(interception.request.url);
        const start = Date.parse(url.searchParams.get('date_start') ?? '');
        const end = Date.parse(url.searchParams.get('date_end') ?? '');

        expect(start).to.not.equal(NaN);
        expect(end).to.not.equal(NaN);

        const time24Hours = 24 * 60 * 60 * 1000;

        // 24 hours by default
        expect(Math.round((end - start) / time24Hours)).to.be.equal(1);
      });

      cy.get(RULE_EXECUTION_SUMMARY_PANEL_TIME_RANGE_SELECTOR).click();
      cy.get('button').contains('span', 'Last 3 days').click();

      cy.wait('@getGlobalRuleExecutionSummary', { timeout: 30000 }).then((interception) => {
        // Extract query parameters
        const url = new URL(interception.request.url);
        const start = Date.parse(url.searchParams.get('date_start') ?? '');
        const end = Date.parse(url.searchParams.get('date_end') ?? '');

        expect(start).to.not.equal(NaN);
        expect(end).to.not.equal(NaN);

        const time24Hours = 24 * 60 * 60 * 1000;

        expect(Math.round((end - start) / time24Hours)).to.be.equal(3);
      });
    });

    it('displays the rule execution summary correctly', function () {
      // Intercept API calls with data
      interceptGetGlobalRuleExecutionSummary({
        body: executionSummaryResult,
        statusCode: 200,
      });
      // Visit rule details and go to execution log tab
      visit(RULES_MONITORING_URL);

      cy.wait('@getGlobalRuleExecutionSummary', { timeout: 30000 });

      cy.get(RULE_EXECUTION_SUMMARY_PANEL_SUCCESS_RATE_LABEL).should('contain', '50%');
      cy.get(RULE_EXECUTION_SUMMARY_PANEL_SUCCESS_COUNT_LABEL).should('contain', '5');
      cy.get(RULE_EXECUTION_SUMMARY_PANEL_FAILURE_COUNT_LABEL).should('contain', '4');
      cy.get(RULE_EXECUTION_SUMMARY_PANEL_WARNING_COUNT_LABEL).should('contain', '3');
    });
  }
);
