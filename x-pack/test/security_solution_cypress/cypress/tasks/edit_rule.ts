/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SAVE_WITH_ERRORS_MODAL,
  SAVE_WITH_ERRORS_MODAL_CONFIRM_BTN,
} from '../screens/create_new_rule';
import { BACK_TO_RULE_DETAILS, EDIT_SUBMIT_BUTTON } from '../screens/edit_rule';
import { editRuleUrl } from '../urls/edit_rule';
import { visit } from './navigation';

export function visitEditRulePage(ruleId: string): void {
  visit(editRuleUrl(ruleId));
}

export const saveEditedRule = () => {
  cy.get(EDIT_SUBMIT_BUTTON).should('exist').click({ force: true });
  cy.get(EDIT_SUBMIT_BUTTON).should('not.exist');
};

export const saveEditedRuleWithNonBlockingErrors = () => {
  cy.get(EDIT_SUBMIT_BUTTON).click();
  cy.get(SAVE_WITH_ERRORS_MODAL).should('exist');
  cy.get(SAVE_WITH_ERRORS_MODAL_CONFIRM_BTN).first().click();
  cy.get(SAVE_WITH_ERRORS_MODAL).should('not.exist');
  cy.get(EDIT_SUBMIT_BUTTON).should('not.exist');
};

export const goBackToRuleDetails = () => {
  cy.get(BACK_TO_RULE_DETAILS).should('exist').click();
  cy.get(BACK_TO_RULE_DETAILS).should('not.exist');
};
