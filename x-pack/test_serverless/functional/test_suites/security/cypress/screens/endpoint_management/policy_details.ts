/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_POLICIES_PATH } from '@kbn/security-solution-plugin/common/constants';
import { UserAuthzAccessLevel } from './types';
import { getNoPrivilegesPage } from './common';

export const visitPolicyDetails = (policyId: string): Cypress.Chainable => {
  return cy.visit(`${APP_POLICIES_PATH}/${policyId}`);
};

export const ensurePolicyDetailsPageAuthzAccess = (
  policyId: string,
  accessLevel: UserAuthzAccessLevel,
  visitPage: boolean = false
): Cypress.Chainable => {
  if (visitPage) {
    visitPolicyDetails(policyId);
  }

  if (accessLevel === 'none') {
    return getNoPrivilegesPage().should('exist');
  }

  if (accessLevel === 'read') {
    return cy.getByTestSubj('policyDetailsSaveButton').should('not.exist');
  }

  return cy.getByTestSubj('policyDetailsSaveButton').should('exist');
};
