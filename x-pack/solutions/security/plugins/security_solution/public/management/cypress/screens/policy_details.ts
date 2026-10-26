/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserAuthzAccessLevel } from './types';
import { APP_POLICIES_PATH } from '../../../../common/constants';
import { loadPage } from '../tasks/common';
import { expectAndCloseSuccessToast } from '../tasks/toasts';
import { getNoPrivilegesPage } from './common';

/**
 * Loads the Policy details page for a policy defined by `policyId`.
 * @param policyId
 */
export const visitPolicyDetailsPage = (policyId: string) => {
  loadPage(`${APP_POLICIES_PATH}/${policyId}`);

  cy.getByTestSubj('policyDetailsPage').should('exist');
  cy.get('#settings').should('exist'); // waiting for Policy Settings tab
};

export const savePolicyForm = () => {
  cy.getByTestSubj('policyDetailsSaveButton').click();
  cy.getByTestSubj('confirmModalConfirmButton').click();
  expectAndCloseSuccessToast();
};

export const ensurePolicyDetailsPageAuthzAccess = (
  policyId: string,
  accessLevel: UserAuthzAccessLevel,
  visitPage: boolean = false
): Cypress.Chainable => {
  if (visitPage) {
    visitPolicyDetailsPage(policyId);
  }

  if (accessLevel === 'none') {
    return getNoPrivilegesPage().should('exist');
  }

  if (accessLevel === 'read') {
    return cy.getByTestSubj('policyDetailsSaveButton').should('not.exist');
  }

  return cy.getByTestSubj('policyDetailsSaveButton').should('exist');
};
