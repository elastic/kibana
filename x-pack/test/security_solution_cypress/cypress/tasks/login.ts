/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as yaml from 'js-yaml';
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

/**
 * Credentials in the `kibana.dev.yml` config file will be used to authenticate
 * with Kibana when credentials are not provided via environment variables
 */
const KIBANA_DEV_YML_PATH = '../../../config/kibana.dev.yml';

/**
 * The configuration path in `kibana.dev.yml` to the username to be used when
 * authenticating with Kibana.
 */
const ELASTICSEARCH_USERNAME_CONFIG_PATH = 'config.elasticsearch.username';

/**
 * The configuration path in `kibana.dev.yml` to the password to be used when
 * authenticating with Kibana.
 */
const ELASTICSEARCH_PASSWORD_CONFIG_PATH = 'config.elasticsearch.password';

/**
 * Authenticates with Kibana using, if specified, credentials specified by
 * environment variables. The credentials in `kibana.dev.yml` will be used
 * for authentication when the environment variables are unset.
 *
 * To speed the execution of tests, prefer this non-interactive authentication,
 * which is faster than authentication via Kibana's interactive login page.
 */
export const login = (role?: SecurityRoleName): void => {
  if (role != null) {
    loginWithRole(role);
  } else if (credentialsProvidedByEnvironment()) {
    loginViaEnvironmentCredentials();
  } else {
    loginViaConfig();
  }
};

export interface User {
  username: string;
  password: string;
}

export const loginWithUser = (user: User): void => {
  loginWithUsernameAndPassword(user.username, user.password);
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

/**
 * Authenticates with a predefined role
 *
 * @param role role name
 */
const loginWithRole = (role: SecurityRoleName): void => {
  if (
    (Cypress.env(IS_SERVERLESS) || Cypress.env(CLOUD_SERVERLESS)) &&
    !(role in KNOWN_SERVERLESS_ROLE_DEFINITIONS)
  ) {
    throw new Error(`An attempt to log in with unsupported by Serverless role "${role}".`);
  }

  const password = 'changeme';

  cy.log(`origin: ${Cypress.config().baseUrl}`);
  loginWithUsernameAndPassword(role, password);
};

/**
 * Returns `true` if the credentials used to login to Kibana are provided
 * via environment variables
 */
const credentialsProvidedByEnvironment = (): boolean =>
  Cypress.env(ELASTICSEARCH_USERNAME) != null && Cypress.env(ELASTICSEARCH_PASSWORD) != null;

/**
 * Authenticates with Kibana by reading credentials from the
 * `CYPRESS_ELASTICSEARCH_USERNAME` and `CYPRESS_ELASTICSEARCH_PASSWORD`
 * environment variables, and POSTing the username and password directly to
 * Kibana's `/internal/security/login` endpoint, bypassing the login page (for speed).
 */
const loginViaEnvironmentCredentials = (): void => {
  cy.log(
    `Authenticating via environment credentials from the \`CYPRESS_${ELASTICSEARCH_USERNAME}\` and \`CYPRESS_${ELASTICSEARCH_PASSWORD}\` environment variables`
  );

  const username = Cypress.env(ELASTICSEARCH_USERNAME);
  const password = Cypress.env(ELASTICSEARCH_PASSWORD);
  loginWithUsernameAndPassword(username, password);
};

/**
 * Authenticates with Kibana by reading credentials from the
 * `kibana.dev.yml` file and POSTing the username and password directly to
 * Kibana's `/internal/security/login` endpoint, bypassing the login page (for speed).
 */
const loginViaConfig = (): void => {
  cy.log(
    `Authenticating via config credentials \`${ELASTICSEARCH_USERNAME_CONFIG_PATH}\` and \`${ELASTICSEARCH_PASSWORD_CONFIG_PATH}\` from \`${KIBANA_DEV_YML_PATH}\``
  );

  // read the login details from `kibana.dev.yaml`
  cy.readFile(KIBANA_DEV_YML_PATH).then((kibanaDevYml) => {
    const { username, password } = yaml.safeLoad(kibanaDevYml);
    loginWithUsernameAndPassword(username, password);
  });
};

/**
 * Get the configured auth details that were used to spawn cypress
 *
 * @returns the default Elasticsearch username and password for this environment
 */
export const getEnvAuth = (): User => {
  if (credentialsProvidedByEnvironment()) {
    return {
      username: Cypress.env(ELASTICSEARCH_USERNAME),
      password: Cypress.env(ELASTICSEARCH_PASSWORD),
    };
  } else {
    let user: User = { username: '', password: '' };
    cy.readFile(KIBANA_DEV_YML_PATH).then((devYml) => {
      const config = yaml.safeLoad(devYml);
      user = { username: config.elasticsearch.username, password: config.elasticsearch.password };
    });

    return user;
  }
};

export const logout = (): void => {
  cy.visit(LOGOUT_URL);
};

const loginWithUsernameAndPassword = (username: string, password: string): void => {
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
        params: { username, password },
      },
      headers: API_HEADERS,
    });
  });
};
