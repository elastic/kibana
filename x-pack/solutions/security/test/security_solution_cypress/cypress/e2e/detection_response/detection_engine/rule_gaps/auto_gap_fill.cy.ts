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
} from '../../../../screens/rule_gaps';
import { TOASTER_BODY } from '../../../../screens/alerts_detection_rules';
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
      cy.waitUntil(() =>
        getGapAutoFillSchedulerApi().then(
          (response) => response.status === 200 && response.body.enabled === true
        )
      );
      closeRuleSettingsModal();
    });
};

describe(
  'Rule gaps auto fill status',
  { tags: ['@ess', '@serverless', '@skipInServerlessMKI'] },
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
        closeRuleSettingsModal();

        cy.waitUntil(() =>
          getGapAutoFillSchedulerApi().then(
            (response) => response.status === 200 && response.body.enabled === false
          )
        );
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
