/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_POLICIES_PATH } from '@kbn/security-solution-plugin/common/constants';

export const visitPolicyDetails = (policyId: string): Cypress.Chainable => {
  return cy.visit(`${APP_POLICIES_PATH}/${policyId}`);
};
