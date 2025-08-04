/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULE_FILL_ALL_GAPS_BUTTON } from '../../../../screens/rule_details';
import {
  MODAL_CONFIRMATION_BTN,
  MODAL_ERROR_BODY,
  TOASTER_BODY,
} from '../../../../screens/alerts_detection_rules';
import { clickErrorToastBtn } from '../../../../tasks/alerts_detection_rules';
import { getNewRule } from '../../../../objects/rule';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import { createRule, interceptGetManualRuns } from '../../../../tasks/api_calls/rules';
import { login } from '../../../../tasks/login';
import { interceptBulkFillRulesGaps, interceptGetRuleGaps } from '../../../../tasks/api_calls/gaps';
import { visit } from '../../../../tasks/navigation';
import { ruleDetailsUrl } from '../../../../urls/rule_details';
import { goToExecutionLogTab } from '../../../../tasks/rule_details';

describe(
  'bulk fill rule gaps',
  {
    tags: ['@ess', '@serverless', '@skipInServerlessMKI'],
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify([
            'storeGapsInEventLogEnabled',
            'bulkFillRuleGapsEnabled',
          ])}`,
        ],
      },
    },
  },
  () => {
    beforeEach(() => {
      login();
      deleteAlertsAndRules();

      createRule(
        getNewRule({ rule_id: '1', name: `Rule 1`, enabled: true, interval: '1m', from: 'now-1m' })
      ).then((response) => {
        cy.wrap(response.body.id).as('ruleId');
      });
    });

    it('schedule gap fills for the rule when it is enabled', function () {
      interceptBulkFillRulesGaps({ succeeded: 1, failed: 0, skipped: 0 });
      interceptGetRuleGaps();
      interceptGetManualRuns(this.ruleId);

      // Visit rule details and go to execution log tab
      visit(ruleDetailsUrl(this.ruleId));
      goToExecutionLogTab();

      // the gaps and manual runs are fetched when navigating to the execution log tab
      cy.wait('@getRuleGaps');
      cy.wait('@getRuleManualRuns');

      interceptGetRuleGaps();
      interceptGetManualRuns(this.ruleId);

      // Schedule the backfill
      cy.get(RULE_FILL_ALL_GAPS_BUTTON).click();
      cy.get(MODAL_CONFIRMATION_BTN).click();
      cy.wait('@bulkFillRulesGaps');

      // After scheduling the backfill, the gaps and manual runs are refreshed
      cy.wait('@getRuleGaps');
      cy.wait('@getRuleManualRuns');

      cy.contains(TOASTER_BODY, `You've successfully scheduled gap fills for 1 rule.`);
    });

    it('handle the case when the rule is disabled', function () {
      interceptGetRuleGaps();
      interceptGetManualRuns(this.ruleId);

      // Visit rule details and go to execution log tab
      visit(ruleDetailsUrl(this.ruleId));
      goToExecutionLogTab();

      // the gaps and manual runs are fetched when navigating to the execution log tab
      cy.wait('@getRuleGaps');
      cy.wait('@getRuleManualRuns');

      // Disable the rule
      cy.get('[data-test-subj="ruleSwitch"]').click();

      cy.waitUntil(() =>
        cy
          .get('[data-test-subj="ruleSwitch"]')
          .invoke('attr', 'aria-checked')
          .then((checked) => checked === 'false')
      );

      // Attempt to schedule the backfill
      cy.get(RULE_FILL_ALL_GAPS_BUTTON).click();

      // Verify that an error modal is displayed
      cy.get('[data-test-subj="bulkActionRejectModal"]').should(
        'have.text',
        `Unable to schedule gap fills for a disabled ruleEnable the rule to schedule gap fills.Close`
      );

      cy.get(MODAL_CONFIRMATION_BTN).click();
    });

    it('handle gap fills result when the rule is skipped', function () {
      interceptBulkFillRulesGaps({ succeeded: 0, failed: 0, skipped: 1 });
      interceptGetRuleGaps();
      interceptGetManualRuns(this.ruleId);

      // Visit rule details and go to execution log tab
      visit(ruleDetailsUrl(this.ruleId));
      goToExecutionLogTab();

      // the gaps and manual runs are fetched when navigating to the execution log tab
      cy.wait('@getRuleGaps');
      cy.wait('@getRuleManualRuns');

      interceptGetRuleGaps();
      interceptGetManualRuns(this.ruleId);

      // Schedule the backfill
      cy.get(RULE_FILL_ALL_GAPS_BUTTON).click();
      cy.get(MODAL_CONFIRMATION_BTN).click();
      cy.wait('@bulkFillRulesGaps');

      // After scheduling the backfill, the gaps and manual runs are refreshed
      cy.wait('@getRuleGaps');
      cy.wait('@getRuleManualRuns');

      cy.contains(TOASTER_BODY, 'No gaps were detected for the selected time range.');
    });

    it('handle the case when the request is slow', function () {
      interceptBulkFillRulesGaps({ succeeded: 1, failed: 0, skipped: 0, delay: 6000 });
      interceptGetRuleGaps();
      interceptGetManualRuns(this.ruleId);

      // Visit rule details and go to execution log tab
      visit(ruleDetailsUrl(this.ruleId));
      goToExecutionLogTab();

      // the gaps and manual runs are fetched when navigating to the execution log tab
      cy.wait('@getRuleGaps');
      cy.wait('@getRuleManualRuns');

      interceptGetRuleGaps();
      interceptGetManualRuns(this.ruleId);

      // Schedule the backfill
      cy.get(RULE_FILL_ALL_GAPS_BUTTON).click();
      cy.get(MODAL_CONFIRMATION_BTN).click();
      cy.contains(TOASTER_BODY, `Scheduling gap fills for 1 rule`);
      cy.wait('@bulkFillRulesGaps');

      // After scheduling the backfill, the gaps and manual runs are refreshed
      cy.wait('@getRuleGaps');
      cy.wait('@getRuleManualRuns');

      cy.contains(TOASTER_BODY, `You've successfully scheduled gap fills for 1 rule.`);
    });

    it('handle the case when the request to fill gaps errors', function () {
      const errors = [
        {
          message: 'SCHEDULING - some error 1',
          status_code: 500,
          rules: [
            {
              id: '2d4b54da-3a6d-4508-b4f0-aaeb25859e11',
              name: 'Rule 1',
            },
          ],
        },
      ];
      interceptBulkFillRulesGaps({ succeeded: 0, failed: 1, skipped: 0, errorsArray: errors });
      interceptGetRuleGaps();
      interceptGetManualRuns(this.ruleId);

      // Visit rule details and go to execution log tab
      visit(ruleDetailsUrl(this.ruleId));
      goToExecutionLogTab();

      // the gaps and manual runs are fetched when navigating to the execution log tab
      cy.wait('@getRuleGaps');
      cy.wait('@getRuleManualRuns');

      // Schedule the backfill
      cy.get(RULE_FILL_ALL_GAPS_BUTTON).click();
      cy.get(MODAL_CONFIRMATION_BTN).click();
      cy.wait('@bulkFillRulesGaps');

      cy.contains(TOASTER_BODY, `Unable to schedule gap fills for 1 rule`);

      clickErrorToastBtn();

      errors.forEach((error) => {
        cy.contains(MODAL_ERROR_BODY, error.message);
      });
    });
  }
);
