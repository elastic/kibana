/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ROLES } from '@kbn/security-solution-plugin/common/test';
import { EMPTY_ALERT_TABLE } from '../../screens/alerts';
import { PAGE_CONTENT_SPINNER } from '../../screens/common/page';
import {
  ALERTS_TAB,
  FIELDS_BROWSER_BTN,
  LAST_EXECUTION_STATUS_REFRESH_BUTTON,
  RULE_SWITCH,
  DETAILS_TITLE,
  DETAILS_DESCRIPTION,
  EDIT_RULE_SETTINGS_LINK,
  BACK_TO_RULES_TABLE,
  RULE_NAME_HEADER,
  RULE_STATUS,
} from '../../screens/rule_details';
import { ALERTS_TABLE_COUNT } from '../../screens/timeline';
import { RuleDetailsTabs, ruleDetailsUrl } from '../../urls/rule_details';
import { waitForAlerts } from '../alerts';
import { addsFields, closeFieldsBrowser, filterFieldsBrowser } from '../fields_browser';
import { visit } from '../navigation';
import { refreshPage } from '../security_header';

interface VisitRuleDetailsPageOptions {
  tab?: RuleDetailsTabs;
  role?: ROLES;
}

export function visitRuleDetailsPage(ruleId: string, options?: VisitRuleDetailsPageOptions): void {
  visit(ruleDetailsUrl(ruleId, options?.tab), { role: options?.role });
}

export const enablesRule = () => {
  // Rules get enabled via _bulk_action endpoint
  cy.intercept('POST', '/api/detection_engine/rules/_bulk_action?dry_run=false').as('bulk_action');
  cy.get(RULE_SWITCH).should('be.visible');
  cy.get(RULE_SWITCH).click();
  cy.wait('@bulk_action').then(({ response }) => {
    cy.wrap(response?.statusCode).should('eql', 200);
  });
};

export const addsFieldsToTimeline = (search: string, fields: string[]) => {
  cy.get(FIELDS_BROWSER_BTN).click();
  filterFieldsBrowser(search);
  addsFields(fields);
  closeFieldsBrowser();
};

export const goToAlertsTab = () => {
  cy.get(ALERTS_TAB).click();
};

/**
 * Waits for rule details page to be loaded
 *
 * @param ruleName rule's name
 */
export const waitForPageToBeLoaded = (ruleName: string): void => {
  cy.get(PAGE_CONTENT_SPINNER).should('be.visible');
  cy.contains(RULE_NAME_HEADER, ruleName).should('be.visible');
  cy.get(PAGE_CONTENT_SPINNER).should('not.exist');
};

export const waitForTheRuleToBeExecuted = () => {
  cy.waitUntil(() => {
    cy.log('Waiting for the rule to be executed');
    cy.get(LAST_EXECUTION_STATUS_REFRESH_BUTTON).click();

    return cy
      .get(RULE_STATUS)
      .invoke('text')
      .then((ruleStatus) => ruleStatus === 'succeeded');
  });
};

export const goBackToRulesTable = () => {
  cy.get(BACK_TO_RULES_TABLE).click();
};

export const getDetails = (title: string | RegExp) =>
  cy.contains(DETAILS_TITLE, title).next(DETAILS_DESCRIPTION);

export const assertDetailsNotExist = (title: string | RegExp) =>
  cy.get(DETAILS_TITLE).contains(title).should('not.exist');

export const goToRuleEditSettings = () => {
  cy.get(EDIT_RULE_SETTINGS_LINK).click();
};

export const waitForAlertsToPopulate = (alertCountThreshold = 1) => {
  cy.waitUntil(
    () => {
      cy.log('Waiting for alerts to appear');
      refreshPage();
      return cy.root().then(($el) => {
        const emptyTableState = $el.find(EMPTY_ALERT_TABLE);
        if (emptyTableState.length > 0) {
          cy.log('Table is empty', emptyTableState.length);
          return false;
        }
        const countEl = $el.find(ALERTS_TABLE_COUNT);
        const alertCount = parseInt(countEl.text(), 10) || 0;
        return alertCount >= alertCountThreshold;
      });
    },
    { interval: 500, timeout: 12000 }
  );
  waitForAlerts();
};

export const checkRuleDetailsRuleName = (ruleName: string = '') => {
  cy.get(RULE_NAME_HEADER).should('contain', ruleName);
};
