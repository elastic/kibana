/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { request } from '@kbn/security-solution-plugin/public/management/cypress/tasks/common';
import { ServerlessRoleName } from '../../../../../shared/lib';

/**
 * Login to Kibana using API (not login page). By default, user will be logged in using
 * the username and password defined via `KIBANA_USERNAME` and `KIBANA_PASSWORD` cypress env
 * variables.
 * @param user
 */
export const login = (user: ServerlessRoleName) => {
  const url = new URL(Cypress.config().baseUrl ?? '');
  url.pathname = '/internal/security/login';

  let username = Cypress.env('KIBANA_USERNAME');
  let password = Cypress.env('KIBANA_PASSWORD');

  const sendApiLoginRequest = () => {
    cy.log(`Authenticating ${username}`);

    // programmatically authenticate without interacting with the Kibana login page
    return request({
      headers: { 'kbn-xsrf': 'cypress-creds-via-env' },
      method: 'POST',
      url: url.toString(),
      body: {
        providerType: 'basic',
        providerName: !url.toString().includes('localhost') ? 'cloud-basic' : 'basic',
        currentURL: '/',
        params: {
          username,
          password,
        },
      },
    });
  };

  if (user) {
    return cy.task('loadUserAndRole', { name: user }).then((loadedUser) => {
      username = loadedUser.username;
      password = loadedUser.password;

      return sendApiLoginRequest();
    });
  } else {
    return sendApiLoginRequest();
  }
};
