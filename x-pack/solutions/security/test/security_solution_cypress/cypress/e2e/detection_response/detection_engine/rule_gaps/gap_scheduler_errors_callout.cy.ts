/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  GAP_SCHEDULER_ERRORS_CALLOUT,
  GAP_SCHEDULER_ERRORS_LOGS_LINK,
  GAP_SCHEDULER_ERRORS_CALLOUT_DISMISS_BUTTON,
  GAP_AUTO_FILL_LOGS_FLYOUT,
  RULE_GAPS_OVERVIEW_PANEL,
} from '../../../../screens/rule_gaps';
import { RULES_MONITORING_TAB } from '../../../../screens/alerts_detection_rules';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import {
  deleteGapAutoFillScheduler,
  interceptGapAutoFillSchedulerLogsWithErrors,
  interceptGapAutoFillScheduler,
} from '../../../../tasks/api_calls/gaps';
import { login } from '../../../../tasks/login';
import { visitRulesManagementTable } from '../../../../tasks/rules_management';
import { createRule } from '../../../../tasks/api_calls/rules';
import { getCustomQueryRuleParams } from '../../../../objects/rule';

const GAP_SCHEDULER_ERRORS_CALLOUT_STORAGE_KEY = 'gap-scheduler-errors-callout-dismissed';

const clearCalloutDismissalState = () => {
  cy.window().then((win) => {
    win.localStorage.removeItem(GAP_SCHEDULER_ERRORS_CALLOUT_STORAGE_KEY);
  });
};

describe(
  'Gap scheduler errors callout',
  {
    tags: ['@ess'],
    env: {
      ftrConfig: {
        kbnServerArgs: [
          '--xpack.alerting.gapAutoFillScheduler.enabled=true',
          `--xpack.securitySolution.enableExperimental=${JSON.stringify([
            'gapAutoFillSchedulerEnabled',
          ])}`,
        ],
      },
    },
  },
  () => {
    beforeEach(() => {
      login();
      deleteAlertsAndRules();
      deleteGapAutoFillScheduler();
      clearCalloutDismissalState();
      createRule(
        getCustomQueryRuleParams({ rule_id: '1', name: 'Rule 1', interval: '1m', from: 'now-1m' })
      );
    });

    afterEach(() => {
      deleteGapAutoFillScheduler();
      clearCalloutDismissalState();
    });

    it('does not show the callout when scheduler is disabled', () => {
      interceptGapAutoFillScheduler({ enabled: false });
      interceptGapAutoFillSchedulerLogsWithErrors();

      visitRulesManagementTable();
      cy.get(RULES_MONITORING_TAB).click();
      cy.get(RULE_GAPS_OVERVIEW_PANEL).should('exist');
      cy.get(GAP_SCHEDULER_ERRORS_CALLOUT).should('not.exist');
    });

    it('shows callout with errors, opens logs flyout, and dismisses correctly', () => {
      interceptGapAutoFillScheduler({ enabled: true });
      interceptGapAutoFillSchedulerLogsWithErrors();

      visitRulesManagementTable();
      cy.get(RULES_MONITORING_TAB).click();

      cy.get(RULE_GAPS_OVERVIEW_PANEL).should('exist');
      cy.wait('@getGapAutoFillScheduler');
      cy.wait('@getGapAutoFillSchedulerLogsWithErrors');

      // Verify callout is visible with correct message
      cy.get(GAP_SCHEDULER_ERRORS_CALLOUT).should('exist');
      cy.get(GAP_SCHEDULER_ERRORS_CALLOUT).should(
        'contain.text',
        'We encountered errors while scheduling gap fills'
      );

      // Click the logs link and verify flyout opens
      cy.get(GAP_SCHEDULER_ERRORS_LOGS_LINK).click();
      cy.get(GAP_AUTO_FILL_LOGS_FLYOUT).should('exist');

      // Close the flyout by pressing Escape
      cy.get('body').type('{esc}');
      cy.get(GAP_AUTO_FILL_LOGS_FLYOUT).should('not.exist');

      // Dismiss the callout
      cy.get(GAP_SCHEDULER_ERRORS_CALLOUT)
        .find(GAP_SCHEDULER_ERRORS_CALLOUT_DISMISS_BUTTON)
        .click();

      cy.get(GAP_SCHEDULER_ERRORS_CALLOUT).should('not.exist');

      // Refresh and verify callout stays dismissed (proves localStorage persistence)
      cy.reload();

      // Re-intercept after reload
      interceptGapAutoFillScheduler({ enabled: true });
      interceptGapAutoFillSchedulerLogsWithErrors();

      cy.get(RULES_MONITORING_TAB).click();
      cy.get(RULE_GAPS_OVERVIEW_PANEL).should('exist');

      // Callout should still be hidden after refresh
      cy.get(GAP_SCHEDULER_ERRORS_CALLOUT).should('not.exist');
    });
  }
);
