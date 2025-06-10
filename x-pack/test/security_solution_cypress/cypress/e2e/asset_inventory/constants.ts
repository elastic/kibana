/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataTestSubjectSelector } from '../../helpers/common';
const ADD_ELASTIC_AGENT_LATER_TEST_ID = getDataTestSubjectSelector('confirmModalCancelButton');
export const SAVE_BUTTON = getDataTestSubjectSelector('createPackagePolicySaveButton');
export const SAVE_EDIT_BUTTON = getDataTestSubjectSelector('saveIntegration');

export const changePolicyName = (policyName: string) => {
  const newPolicyName = `${policyName} ${Date.now()}`;
  cy.get('#name').clear();
  cy.get('#name').type(newPolicyName);

  return newPolicyName;
};

export const checkPolicyName = (policyName: string) => {
  cy.get('#name').should('have.value', policyName);
};

export const saveIntegration = (policyName: string) => {
  cy.get(SAVE_BUTTON).click();

  cy.get(ADD_ELASTIC_AGENT_LATER_TEST_ID).click();

  cy.contains(policyName);
};

export const clickSaveEditButton = () => {
  cy.get(SAVE_EDIT_BUTTON).click();
};

export const selectPolicyForEditing = (policyName: string) => {
  cy.get(`a[title="${policyName}"]`).click();
};

export const findPolicyLink = (policyName: string) =>
  cy.get(`a[title="${policyName}"]`).should('exist');
