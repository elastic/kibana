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

export const defaultUser: User = {
  username: Cypress.env(ELASTICSEARCH_USERNAME),
  password: Cypress.env(ELASTICSEARCH_PASSWORD),
};

export const getEnvAuth = (role: SecurityRoleName): User => {
  if (
    (Cypress.env(IS_SERVERLESS) || Cypress.env(CLOUD_SERVERLESS)) &&
    !(role in KNOWN_SERVERLESS_ROLE_DEFINITIONS)
  ) {
    throw new Error(`An attempt to log in with unsupported by Serverless role "${role}".`);
  }
  const user: User = {
    username: role,
    password: 'changeme',
  };
  return user;
};

export const getDefaultUserName = (): string => {
  if (Cypress.env(IS_SERVERLESS)) {
    return Cypress.env(CLOUD_SERVERLESS) ? 'admin' : 'system_indices_superuser';
  }
  return defaultUser.username;
};

export const login = (role?: SecurityRoleName): void => {
  let testRole = '';

  if (Cypress.env(IS_SERVERLESS)) {
    if (!role) {
      testRole = Cypress.env(CLOUD_SERVERLESS) ? 'admin' : 'system_indices_superuser';
    } else {
      testRole = role;
    }
    cy.task('getSessionCookie', testRole).then((cookie) => {
      cy.setCookie('sid', cookie as string);
    });
    cy.visit('/');
  } else {
    const user = role ? getEnvAuth(role) : defaultUser;
    loginWithUser(user);
  }
};

export const loginWithUser = (user: User): void => {
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

export const logout = (): void => {
  cy.visit(LOGOUT_URL);
};
