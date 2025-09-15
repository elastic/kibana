/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  USER_BY_RISK_TABLE_FILTER,
  USER_BY_RISK_TABLE_FILTER_LOW,
} from '../screens/users/user_risk_score';

export const openUserRiskTableFilterAndSelectTheLowOption = (eq = 0) => {
  cy.get(USER_BY_RISK_TABLE_FILTER).eq(eq).click();
  cy.get(USER_BY_RISK_TABLE_FILTER_LOW).click();
};

export const removeLowFilterAndCloseUserRiskTableFilter = () => {
  cy.get(USER_BY_RISK_TABLE_FILTER_LOW).click();
  cy.get(USER_BY_RISK_TABLE_FILTER).first().click();
};
