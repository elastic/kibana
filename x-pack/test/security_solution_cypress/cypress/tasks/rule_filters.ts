/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RULE_EXECUTION_STATUS_BADGE,
  EXECUTION_STATUS_FILTER_BUTTON,
  EXECUTION_STATUS_FILTER_OPTION,
} from '../screens/alerts_detection_rules';

export const expectRulesWithExecutionStatus = (expectedCount: number, status: string) => {
  cy.get(`${RULE_EXECUTION_STATUS_BADGE}:contains("${status}")`).should(
    'have.length',
    expectedCount
  );
};

export const expectNumberOfRulesShownOnPage = (expectedCount: number) =>
  cy.get(RULE_EXECUTION_STATUS_BADGE).should('have.length', expectedCount);

export const filterByExecutionStatus = (status: string) => {
  cy.get(EXECUTION_STATUS_FILTER_BUTTON).click();
  cy.get(`${EXECUTION_STATUS_FILTER_OPTION}:contains("${status}")`).click();
};
