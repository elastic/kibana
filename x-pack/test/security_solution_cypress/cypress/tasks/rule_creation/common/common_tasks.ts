/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CREATE_AND_ENABLE_BTN,
  CREATE_WITHOUT_ENABLING_BTN,
} from '../../../screens/create_new_rule';
import { BACK_TO_RULES_TABLE } from '../../../screens/rule_details';

export const createEnabledRule = () => {
  cy.get(CREATE_AND_ENABLE_BTN).click({ force: true });
  cy.get(CREATE_AND_ENABLE_BTN).should('not.exist');
};

export const createDisabledRule = () => {
  cy.get(CREATE_WITHOUT_ENABLING_BTN).click();
  cy.get(CREATE_WITHOUT_ENABLING_BTN).should('not.exist');
};

export const createEnabledRuleGoToRuleDetails = () => {
  createEnabledRule();
  cy.get(BACK_TO_RULES_TABLE).click({ force: true });
};

export const createDisabledRuleGoToRuleDetails = () => {
  createDisabledRule();
  cy.get(BACK_TO_RULES_TABLE).click({ force: true });
  cy.get(BACK_TO_RULES_TABLE).should('not.exist');
};
