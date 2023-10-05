/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CREATE_AND_ENABLE_BTN, CREATE_WITHOUT_ENABLING_BTN } from '../../../screens/rule_creation';

export const createAndEnableRule = () => {
  cy.get(CREATE_AND_ENABLE_BTN).click();
  cy.get(CREATE_AND_ENABLE_BTN).should('not.exist');
};

export const createRuleWithoutEnabling = () => {
  cy.get(CREATE_WITHOUT_ENABLING_BTN).click();
  cy.get(CREATE_WITHOUT_ENABLING_BTN).should('not.exist');
};
