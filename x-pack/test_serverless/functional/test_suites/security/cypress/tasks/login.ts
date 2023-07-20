/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { request } from '@kbn/security-solution-plugin/public/management/cypress/tasks/common';
import { ServerlessRoleName } from '../../../../../shared/lib';

export const login = (user?: ServerlessRoleName) => {
  const url = Cypress.config().baseUrl;
  let username = Cypress.env('ELASTICSEARCH_USERNAME');
  let password = Cypress.env('ELASTICSEARCH_PASSWORD');

  if (user) {
    cy.task('loadUserAndRole', { name: user }).then((loadedUser) => {
      username = loadedUser.username;
      password = loadedUser.password;
    });
  }

  cy.log(`Authenticating ${username}`);

  // programmatically authenticate without interacting with the Kibana login page
  request({
    headers: { 'kbn-xsrf': 'cypress-creds-via-env' },
    method: 'POST',
    url: `${url}/internal/security/login`,
    body: {
      providerType: 'basic',
      providerName: url && !url.includes('localhost') ? 'cloud-basic' : 'basic',
      currentURL: '/',
      params: {
        username,
        password,
      },
    },
  });
};
