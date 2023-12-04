/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { LoginState } from '@kbn/security-plugin/common/login_state';
import type { SecurityRoleName } from '@kbn/security-solution-plugin/common/test';
import { KNOWN_SERVERLESS_ROLE_DEFINITIONS } from '@kbn/security-solution-plugin/common/test';
import { LOGOUT_URL } from '../urls/navigation';
import {
  CLOUD_SERVERLESS,
  ELASTICSEARCH_PASSWORD,
  ELASTICSEARCH_USERNAME,
  IS_SERVERLESS,
} from '../env_var_names_constants';
import { API_HEADERS, rootRequest } from './api_calls/common';

export interface User {
  username: string;
  password: string;
}

export const getEnvAuth = (role?: SecurityRoleName): User => {
  const user: User = {
    username: Cypress.env(ELASTICSEARCH_USERNAME),
    password: Cypress.env(ELASTICSEARCH_PASSWORD),
  };

  if (role) {
    if (
      (Cypress.env(IS_SERVERLESS) || Cypress.env(CLOUD_SERVERLESS)) &&
      !(role in KNOWN_SERVERLESS_ROLE_DEFINITIONS)
    ) {
      throw new Error(`An attempt to log in with unsupported by Serverless role "${role}".`);
    }
    user.username = role;
    user.password = 'changeme';
  }
  return user;
};

export const login = (role?: SecurityRoleName, testUser?: User): void => {
  const user = testUser ? testUser : getEnvAuth(role);

  const baseUrl = Cypress.config().baseUrl;
  if (!baseUrl) {
    throw Error(`Cypress config baseUrl not set!`);
  }

  // Programmatically authenticate without interacting with the Kibana login page.
  rootRequest<LoginState>({
    url: `${baseUrl}/internal/security/login_state`,
  }).then((loginState) => {
    const basicProvider = loginState.body.selector.providers.find(
      (provider) => provider.type === 'basic'
    );

    cy.request({
      url: `${baseUrl}/internal/security/login`,
      method: 'POST',
      body: {
        providerType: basicProvider?.type,
        providerName: basicProvider?.name,
        currentURL: '/',
        params: { username: user.username, password: user.password },
      },
      headers: API_HEADERS,
    });
  });
};

/**
 * Builds a URL with basic auth using the passed in user.
 *
 * @param user the user information to build the basic auth with
 * @param route string route to visit
 */
export const constructUrlWithUser = (user: User, route: string): string => {
  const url = Cypress.config().baseUrl;
  const kibana = new URL(String(url));
  const hostname = kibana.hostname;
  const username = user.username;
  const password = user.password;
  const protocol = kibana.protocol.replace(':', '');
  const port = kibana.port;

  const path = `${route.startsWith('/') ? '' : '/'}${route}`;
  const strUrl = `${protocol}://${username}:${password}@${hostname}:${port}${path}`;
  const builtUrl = new URL(strUrl);

  cy.log(`origin: ${builtUrl.href}`);
  return builtUrl.href;
};

export const logout = (): void => {
  cy.visit(LOGOUT_URL);
};
