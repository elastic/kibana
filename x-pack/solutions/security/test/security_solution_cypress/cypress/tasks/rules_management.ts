/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  APP_HEADER_BACK,
  APP_HEADER_BACK_MENU_ITEM,
  RULE_MANAGEMENT_PAGE_BREADCRUMB,
  RULE_MANAGEMENT_PAGE_TITLE,
} from '../screens/breadcrumbs';
import {
  INSTALL_PREBUILT_RULES_URL,
  RULES_MANAGEMENT_URL,
  RULES_UPGRADE_URL,
} from '../urls/rules_management';
import { resetRulesTableState } from './common';
import { visit } from './navigation';

export function visitRulesManagementTable(): void {
  resetRulesTableState(); // Clear persistent rules filter data before page loading
  visit(RULES_MANAGEMENT_URL);
}

export function navigateBackToRulesManagement(): void {
  cy.get(`${APP_HEADER_BACK},${RULE_MANAGEMENT_PAGE_BREADCRUMB}`)
    .filter(':visible')
    .first()
    .should('be.visible')
    .then(($control) => {
      const opensMenu = $control.attr('aria-haspopup') === 'menu';

      cy.wrap($control).click();
      if (opensMenu) {
        cy.contains(APP_HEADER_BACK_MENU_ITEM, RULE_MANAGEMENT_PAGE_TITLE)
          .should('be.visible')
          .click();
      }
    });
  cy.url().should('include', RULES_MANAGEMENT_URL);
}

export function visitAddRulesPage(): void {
  visit(INSTALL_PREBUILT_RULES_URL);
}

export function visitRulesUpgradeTable(): void {
  visit(RULES_UPGRADE_URL);
  cy.url().should('include', RULES_UPGRADE_URL);
}
