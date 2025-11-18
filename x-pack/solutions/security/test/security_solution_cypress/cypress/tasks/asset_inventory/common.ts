/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ADD_ELASTIC_AGENT_LATER_TEST_ID,
  AWS_PROVIDER_TEST_ID,
  AZURE_PROVIDER_TEST_ID,
  GCP_PROVIDER_TEST_ID,
  SAVE_BUTTON,
  SAVE_EDIT_BUTTON,
} from '../../screens/asset_inventory/common';

export const selectCloudProvider = (provider: 'aws' | 'gcp' | 'azure') => {
  const providerSelector =
    provider === 'aws'
      ? AWS_PROVIDER_TEST_ID
      : provider === 'gcp'
      ? GCP_PROVIDER_TEST_ID
      : AZURE_PROVIDER_TEST_ID;

  cy.get(providerSelector).click();
};

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
