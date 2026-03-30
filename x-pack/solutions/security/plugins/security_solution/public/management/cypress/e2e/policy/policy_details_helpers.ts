/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loadPage } from '../../tasks/common';

export const getAutomaticUpdatesToggle = () =>
  cy.getByTestSubj('protection-updates-manifest-switch');
export const clickAutomaticUpdatesToggle = () => getAutomaticUpdatesToggle().click();

export const getProtectionUpdatesSaveButton = () => cy.getByTestSubj('protectionUpdatesSaveButton');
export const clickProtectionUpdatesSaveButton = () => getProtectionUpdatesSaveButton().click();

export const [expectSavedButtonToBeDisabled, expectSavedButtonToBeEnabled] = [
  () => getProtectionUpdatesSaveButton().should('be.disabled'),
  () => getProtectionUpdatesSaveButton().should('be.enabled'),
];

export const loadProtectionUpdatesUrl = (policyId: string) =>
  loadPage(`/app/security/administration/policy/${policyId}/protectionUpdates`);
