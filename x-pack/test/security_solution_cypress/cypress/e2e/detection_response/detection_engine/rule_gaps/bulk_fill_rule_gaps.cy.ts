/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  disableSelectedRules,
  scheduleBulkFillGapsForSelectedRules,
} from '../../../../tasks/rules_bulk_actions';
import { MODAL_ERROR_BODY, TOASTER_BODY } from '../../../../screens/alerts_detection_rules';
import { visitRulesManagementTable } from '../../../../tasks/rules_management';
import { clickErrorToastBtn, selectRulesByName } from '../../../../tasks/alerts_detection_rules';
import { getNewRule } from '../../../../objects/rule';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import { createRule } from '../../../../tasks/api_calls/rules';
import { login } from '../../../../tasks/login';
import { interceptBulkFillRulesGaps } from '../../../../tasks/api_calls/gaps';

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

      Array.from({ length: 5 }).forEach((_, idx) => {
        const ruleId = String(idx + 1);
        createRule(
          getNewRule({
            rule_id: ruleId,
            name: `Rule ${ruleId}`,
            enabled: true,
            interval: '1m',
            from: 'now-1m',
          })
        );
      });
      visitRulesManagementTable();
    });

    it('schedule gap fills for enabled rules', () => {
      const enabledRules = ['Rule 1', 'Rule 2', 'Rule 4'] as const;
      interceptBulkFillRulesGaps({ succeeded: 3, failed: 0, skipped: 0 });
      selectRulesByName(enabledRules);

      const enabledCount = enabledRules.length;
      const disabledCount = 0;
      scheduleBulkFillGapsForSelectedRules(enabledCount, disabledCount);
      cy.wait('@bulkFillRulesGaps');

      cy.contains(
        TOASTER_BODY,
        `You've successfully scheduled gap fills for ${enabledCount} rules`
      );
    });

    it('schedule gap fills for enabled rules and show warning about disabled rules', () => {
      const enabledRules = ['Rule 1', 'Rule 2', 'Rule 4'] as const;
      const disabledRules = ['Rule 3', 'Rule 5'] as const;

      interceptBulkFillRulesGaps({ succeeded: 3, failed: 0, skipped: 0 });

      selectRulesByName(disabledRules);
      disableSelectedRules();

      selectRulesByName([...enabledRules, ...disabledRules]);

      const enabledCount = enabledRules.length;
      const disabledCount = disabledRules.length;
      scheduleBulkFillGapsForSelectedRules(enabledCount, disabledCount);
      cy.wait('@bulkFillRulesGaps');

      cy.contains(
        TOASTER_BODY,
        `You've successfully scheduled gap fills for ${enabledCount} rules`
      );
    });

    it('handle gap fills result with skipped rules', () => {
      const enabledRules = ['Rule 1', 'Rule 2', 'Rule 4'] as const;
      interceptBulkFillRulesGaps({ succeeded: 2, failed: 0, skipped: 1 });
      selectRulesByName(enabledRules);

      scheduleBulkFillGapsForSelectedRules(enabledRules.length, 0);
      cy.wait('@bulkFillRulesGaps');

      cy.contains(
        TOASTER_BODY,
        `You've successfully scheduled gap fills for 2 rules. 1 rule was excluded from the bulk schedule gap fill action.`
      );
    });

    it('handle gap fills result when all rules are skipped', () => {
      const enabledRules = ['Rule 1', 'Rule 2', 'Rule 4'] as const;
      interceptBulkFillRulesGaps({ succeeded: 0, failed: 0, skipped: 3 });
      selectRulesByName(enabledRules);

      const enabledCount = enabledRules.length;
      scheduleBulkFillGapsForSelectedRules(enabledCount, 0);
      cy.wait('@bulkFillRulesGaps');

      cy.contains(TOASTER_BODY, 'No gaps were detected for the selected time range.');
    });

    it('handle the case when the request is slow', () => {
      const enabledRules = ['Rule 1', 'Rule 2', 'Rule 4'] as const;
      interceptBulkFillRulesGaps({ succeeded: 3, failed: 0, skipped: 0, delay: 6000 });
      selectRulesByName(enabledRules);

      const enabledCount = enabledRules.length;
      scheduleBulkFillGapsForSelectedRules(enabledCount, 0);
      cy.contains(TOASTER_BODY, `Scheduling gap fills for ${enabledCount} rules`);
      cy.wait('@bulkFillRulesGaps');

      cy.contains(
        TOASTER_BODY,
        `You've successfully scheduled gap fills for ${enabledCount} rules`
      );
    });

    it('schedule gap fills for enabled rules and show partial error for errored rules when all rules are selected', () => {
      const enabledRules = ['Rule 1', 'Rule 2', 'Rule 4'] as const;
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
        {
          message: 'SCHEDULING - some error 2',
          status_code: 500,
          rules: [
            {
              id: '2d4b54da-3a6d-4508-b4f0-aaeb25859e11',
              name: 'Rule 2',
            },
          ],
        },
      ];
      interceptBulkFillRulesGaps({ succeeded: 1, failed: 2, skipped: 0, errorsArray: errors });
      selectRulesByName(enabledRules);

      const enabledCount = enabledRules.length;
      scheduleBulkFillGapsForSelectedRules(enabledCount, 0);
      cy.wait('@bulkFillRulesGaps');

      cy.contains(TOASTER_BODY, `Unable to schedule gap fills for 2 rules`);

      clickErrorToastBtn();

      errors.forEach((error) => {
        cy.contains(MODAL_ERROR_BODY, error.message);
      });
    });
  }
);
