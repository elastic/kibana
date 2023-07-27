/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { request } from '@kbn/security-solution-plugin/public/management/cypress/tasks/common';
import { isLocalhost } from '@kbn/security-solution-plugin/scripts/endpoint/common/is_localhost';
import { ServerlessRoleName } from '../../../../../shared/lib';

/**
 * Send login via API
 * @param username
 * @param password
 *
 * @private
 */
const sendApiLoginRequest = (username: string, password: string) => {
  const url = new URL(Cypress.config().baseUrl ?? '');
  url.pathname = '/internal/security/login';

  cy.log(`Authenticating [${username}] via ${url.toString()}`);

  return request({
    headers: { 'kbn-xsrf': 'cypress-creds-via-env' },
    method: 'POST',
    url: url.toString(),
    body: {
      providerType: 'basic',
      providerName: isLocalhost(url.hostname) ? 'basic' : 'cloud-basic',
      currentURL: '/',
      params: {
        username,
        password,
      },
    },
  });
};

interface CyLoginTask {
  (user?: ServerlessRoleName): Cypress.Chainable<Cypress.Response<unknown>>;

  /**
   * Login using any username/password
   * @param username
   * @param password
   */
  with(username: string, password: string): Cypress.Chainable<Cypress.Response<unknown>>;
}

/**
 * Login to Kibana using API (not login page). By default, user will be logged in using
 * the username and password defined via `KIBANA_USERNAME` and `KIBANA_PASSWORD` cypress env
 * variables.
 * @param user
 */
export const login: CyLoginTask = (
  user?: ServerlessRoleName
): Cypress.Chainable<Cypress.Response<unknown>> => {
  let username = Cypress.env('KIBANA_USERNAME');
  let password = Cypress.env('KIBANA_PASSWORD');

  if (user) {
    return cy.task('loadUserAndRole', { name: user }).then((loadedUser) => {
      username = loadedUser.username;
      password = loadedUser.password;

      return sendApiLoginRequest(username, password);
    });
  } else {
    return sendApiLoginRequest(username, password);
  }
};

login.with = (username: string, password: string): Cypress.Chainable<Cypress.Response<unknown>> => {
  return sendApiLoginRequest(username, password);
};
