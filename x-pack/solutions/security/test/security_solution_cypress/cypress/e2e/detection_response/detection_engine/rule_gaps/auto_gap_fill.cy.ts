/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ROLES } from '@kbn/security-solution-plugin/common/test';
import {
  GAP_AUTO_FILL_STATUS_BADGE,
  RULE_GAPS_OVERVIEW_PANEL,
  RULE_SETTINGS_ENABLE_SWITCH,
  RULE_SETTINGS_MODAL,
  RULE_SETTINGS_SAVE_BUTTON,
  GAP_FILL_SCHEDULER_LOGS_LINK,
  GAP_AUTO_FILL_LOGS_FLYOUT,
  GAP_AUTO_FILL_LOGS_STATUS_FILTER_POPOVER_BUTTON,
  GAP_AUTO_FILL_LOGS_TABLE,
} from '../../../../screens/rule_gaps';
import { TOASTER_BODY } from '../../../../screens/alerts_detection_rules';
import { TOOLTIP } from '../../../../screens/common';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import {
  deleteGapAutoFillScheduler,
  getGapAutoFillSchedulerApi,
} from '../../../../tasks/api_calls/gaps';
import { RULES_MONITORING_TAB } from '../../../../screens/alerts_detection_rules';
import { login } from '../../../../tasks/login';
import { visitRulesManagementTable } from '../../../../tasks/rules_management';
import { createRule } from '../../../../tasks/api_calls/rules';
import { getCustomQueryRuleParams } from '../../../../objects/rule';
import { getGapAutoFillLogsTableRows } from '../../../../tasks/rule_details';

const visitMonitoringTab = () => {
  visitRulesManagementTable();
  cy.get(RULES_MONITORING_TAB).click();
  cy.get(RULE_GAPS_OVERVIEW_PANEL).should('exist');
};

const openRuleSettingsModalViaBadge = () => {
  cy.get(RULE_GAPS_OVERVIEW_PANEL).within(() => {
    cy.get(GAP_AUTO_FILL_STATUS_BADGE).click();
  });
  cy.get(RULE_SETTINGS_MODAL).should('exist');
};

const closeRuleSettingsModal = () => {
  cy.get(RULE_SETTINGS_MODAL).within(() => {
    cy.contains('button', 'Cancel').click();
  });
};

const ensureAutoGapFillEnabledViaUi = () => {
  visitMonitoringTab();
  openRuleSettingsModalViaBadge();
  cy.get(RULE_SETTINGS_ENABLE_SWITCH)
    .invoke('attr', 'aria-checked')
    .then((checked) => {
      if (checked === 'true') {
        closeRuleSettingsModal();
        return;
      }

      cy.get(RULE_SETTINGS_ENABLE_SWITCH).click();
      cy.get(RULE_SETTINGS_SAVE_BUTTON).click();
      cy.contains(TOASTER_BODY, 'Auto gap fill settings updated successfully');
      cy.get(RULE_SETTINGS_MODAL).should('not.exist');
      cy.waitUntil(() =>
        getGapAutoFillSchedulerApi().then(
          (response) => response.status === 200 && response.body.enabled === true
        )
      );
    });
};

describe(
  'Rule gaps auto fill status',
  {
    tags: ['@ess'],
  },
  () => {
    describe('Platinum user flows', () => {
      beforeEach(() => {
        login();
        deleteAlertsAndRules();
        deleteGapAutoFillScheduler();
        createRule(
          getCustomQueryRuleParams({ rule_id: '1', name: 'Rule 1', interval: '1m', from: 'now-1m' })
        );
      });

      afterEach(() => {
        deleteGapAutoFillScheduler();
      });

      it('Enable/disable auto gap fill', () => {
        ensureAutoGapFillEnabledViaUi();

        openRuleSettingsModalViaBadge();

        cy.get(RULE_SETTINGS_MODAL).should('exist');
        cy.get(RULE_SETTINGS_ENABLE_SWITCH).should('have.attr', 'aria-checked', 'true').click();
        cy.get(RULE_SETTINGS_SAVE_BUTTON).should('not.be.disabled').click();
        cy.contains(TOASTER_BODY, 'Auto gap fill settings updated successfully');
        cy.get(RULE_SETTINGS_MODAL).should('not.exist');

        cy.waitUntil(() =>
          getGapAutoFillSchedulerApi().then(
            (response) => response.status === 200 && response.body.enabled === false
          )
        );
      });

      it('View gap fill scheduler logs and filter by status', () => {
        ensureAutoGapFillEnabledViaUi();

        openRuleSettingsModalViaBadge();
        cy.get(RULE_SETTINGS_MODAL).should('exist');

        // Click on the logs link to open the flyout
        cy.get(GAP_FILL_SCHEDULER_LOGS_LINK).click();
        cy.get(GAP_AUTO_FILL_LOGS_FLYOUT).should('exist');

        // Wait for the table to load
        cy.get(GAP_AUTO_FILL_LOGS_TABLE).should('be.visible');

        // By default, filter is set to success/error
        // Check table is displayed
        cy.get(GAP_AUTO_FILL_LOGS_TABLE).should('exist');

        // Open the status filter popover
        getGapAutoFillLogsTableRows().then(() => {
          cy.get(GAP_AUTO_FILL_LOGS_STATUS_FILTER_POPOVER_BUTTON).click();

          // Wait for the popover to be visible and interact with selectable items
          cy.get('[data-test-subj="gap-auto-fill-logs-status-filter-item"]').should('be.visible');

          // Find and click on "Success" to uncheck it (it's checked by default)
          cy.get('[data-test-subj="gap-auto-fill-logs-status-filter-item"]')
            .contains('Success')
            .click();

          // Find and click on "Error" to uncheck it (it's checked by default)
          cy.get('[data-test-subj="gap-auto-fill-logs-status-filter-item"]')
            .contains('Error')
            .click();

          // Find and click on "No gaps" to check it
          cy.get('[data-test-subj="gap-auto-fill-logs-status-filter-item"]')
            .contains('No gaps')
            .click();

          // Close the popover by clicking outside
          cy.get('body').click(0, 0);

          // Verify the filter was applied - the table should update
          cy.get(GAP_AUTO_FILL_LOGS_TABLE).should('be.visible');

          // Verify that after filtering, rows have the expected status in the status column
          getGapAutoFillLogsTableRows()
            .should('exist')
            .each(($row) => {
              cy.wrap($row).find('td').eq(1).contains('No gaps');

              // Verify tooltip appears on hover and contains the expected text
              cy.wrap($row).find('td').eq(1).find('.euiBadge').realHover();

              // Check that the tooltip is visible and contains the expected message
              cy.get(TOOLTIP)
                .should('be.visible')
                .should('contain.text', "Gaps in rule executions don't currently exist.");
            });
        });
      });
    });

    describe('Read-only user', () => {
      beforeEach(() => {
        deleteAlertsAndRules();
        deleteGapAutoFillScheduler();
        createRule(
          getCustomQueryRuleParams({ rule_id: '1', name: 'Rule 1', interval: '1m', from: 'now-1m' })
        );
        login();
        ensureAutoGapFillEnabledViaUi();
        login(ROLES.t1_analyst);
      });

      afterEach(() => {
        deleteGapAutoFillScheduler();
      });

      it('shows the modal but disables edits for users without CRUD permissions', () => {
        visitRulesManagementTable();
        cy.get(RULES_MONITORING_TAB).click();

        cy.get(GAP_AUTO_FILL_STATUS_BADGE).click();
        cy.get(RULE_SETTINGS_MODAL).should('exist');
        cy.get(RULE_SETTINGS_ENABLE_SWITCH).should('be.disabled');
        cy.get(RULE_SETTINGS_SAVE_BUTTON).should('be.disabled');
      });
    });
  }
);
