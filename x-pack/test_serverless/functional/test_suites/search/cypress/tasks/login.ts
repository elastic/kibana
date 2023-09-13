/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LoginState } from '@kbn/security-plugin/common/login_state';

import { request } from './request';

/**
 * Send login via API
 * @param username
 * @param password
 *
 * @private
 */
const sendApiLoginRequest = (
  username: string,
  password: string
): Cypress.Chainable<{ username: string; password: string }> => {
  const baseUrl = Cypress.config().baseUrl;

  cy.log(`Authenticating [${username}] via ${baseUrl}`);

  return request<LoginState>({ url: `${baseUrl}/internal/security/login_state` })
    .then((loginState) => {
      const basicProvider = loginState.body.selector.providers.find(
        (provider) => provider.type === 'basic'
      );
      if (basicProvider === undefined) {
        throw new Error('basic login provider not found');
      }
      return request({
        url: `${baseUrl}/internal/security/login`,
        method: 'POST',
        body: {
          providerType: basicProvider.type,
          providerName: basicProvider.name,
          currentURL: '/',
          params: { username, password },
        },
      });
    })
    .then(() => ({ username, password }));
};

interface CyLoginTask {
  (): ReturnType<typeof sendApiLoginRequest>;

  /**
   * Login using any username/password
   * @param username
   * @param password
   */
  with(username: string, password: string): ReturnType<typeof sendApiLoginRequest>;
}

/**
 * Login to Kibana using API (not login page). User will be logged in using
 * the username and password defined via `KIBANA_USERNAME` and `KIBANA_PASSWORD` cypress env
 * variables.
 */
export const login: CyLoginTask = (): ReturnType<typeof sendApiLoginRequest> => {
  const username = Cypress.env('KIBANA_USERNAME');
  const password = Cypress.env('KIBANA_PASSWORD');

  return sendApiLoginRequest(username, password);
};

login.with = (username: string, password: string): ReturnType<typeof sendApiLoginRequest> => {
  return sendApiLoginRequest(username, password);
};
