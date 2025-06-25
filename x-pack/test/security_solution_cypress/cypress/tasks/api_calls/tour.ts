/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const alertsGuideActiveState = {
  isActive: true,
  status: 'in_progress',
  steps: [
    { id: 'add_data', status: 'complete' },
    { id: 'rules', status: 'complete' },
    { id: 'alertsCases', status: 'active' },
  ],
  guideId: 'siemGuideId', // hardcoded because i deleted the guided onboarding plugin
};

export const startAlertsCasesTour = () =>
  cy.request({
    method: 'PUT',
    url: `${API_BASE_PATH}/state`,
    headers: { 'kbn-xsrf': 'cypress-creds', 'x-elastic-internal-origin': 'security-solution' },
    body: {
      status: 'in_progress',
      guide: alertsGuideActiveState,
    },
  });

export const quitGlobalTour = () =>
  cy.request({
    method: 'PUT',
    url: `${API_BASE_PATH}/state`,
    headers: { 'kbn-xsrf': 'cypress-creds', 'x-elastic-internal-origin': 'security-solution' },
    body: {
      status: 'quit',
      guide: {
        ...alertsGuideActiveState,
        isActive: false,
      },
    },
  });
