/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  APP_HEADER_BACK,
  APP_HEADER_BACK_MENU_ITEM,
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

/**
 * Navigates back to the rules table using the app header back button. When the current page has
 * several ancestors the button opens a menu, so the rules destination is selected explicitly.
 */
export function clickRuleManagementBreadcrumb(): void {
  cy.get(APP_HEADER_BACK).then(($button) => {
    cy.wrap($button).click();
    if ($button.attr('aria-haspopup') === 'menu') {
      cy.contains(APP_HEADER_BACK_MENU_ITEM, RULE_MANAGEMENT_PAGE_TITLE).click();
    }
  });
}

export function openRuleManagementPageViaBreadcrumbs(): void {
  cy.log('Navigate back to rules table');
  clickRuleManagementBreadcrumb();
  cy.url().should('include', RULES_MANAGEMENT_URL);
}

export function visitAddRulesPage(): void {
  visit(INSTALL_PREBUILT_RULES_URL);
}

export function visitRulesUpgradeTable(): void {
  visit(RULES_UPGRADE_URL);
  cy.url().should('include', RULES_UPGRADE_URL);
}
