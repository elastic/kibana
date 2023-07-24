/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const ELASTICSEARCH_USERNAME = Cypress.env('ELASTICSEARCH_USERNAME');
const ELASTICSEARCH_PASSWORD = Cypress.env('ELASTICSEARCH_PASSWORD');

export const navigatesToLandingPage = () => {
  cy.visit('/app/security/get_started', {
    auth: {
      username: ELASTICSEARCH_USERNAME,
      password: ELASTICSEARCH_PASSWORD,
    },
  });
};
