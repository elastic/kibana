/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityRoleName } from '@kbn/security-solution-plugin/common/test';
import { BACK_TO_RULE_DETAILS, EDIT_SUBMIT_BUTTON } from '../screens/edit_rule';
import { editRuleUrl } from '../urls/edit_rule';
import { visit } from './navigation';

export function visitEditRulePage(ruleId: string, role?: SecurityRoleName): void {
  visit(editRuleUrl(ruleId), { role });
}

export const saveEditedRule = () => {
  cy.get(EDIT_SUBMIT_BUTTON).should('exist').click({ force: true });
  cy.get(EDIT_SUBMIT_BUTTON).should('not.exist');
};

export const goBackToRuleDetails = () => {
  cy.get(BACK_TO_RULE_DETAILS).should('exist').click();
  cy.get(BACK_TO_RULE_DETAILS).should('not.exist');
};
