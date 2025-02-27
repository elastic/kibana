/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
const ELASTICSEARCH_USERNAME = 'elastic';
const ELASTICSEARCH_PASSWORD = 'changeme';
const LOGIN_API_ENDPOINT = '/internal/security/login';

export const constructUrlWithUser = (route: string) => {
  const url = Cypress.config().baseUrl;
  const kibana = new URL(String(url));
  const hostname = kibana.hostname;
  const username = ELASTICSEARCH_USERNAME;
  const password = ELASTICSEARCH_PASSWORD;
  const protocol = kibana.protocol.replace(':', '');
  const port = kibana.port;

  const path = `${route.startsWith('/') ? '' : '/'}${route}`;
  const strUrl = `${protocol}://${username}:${password}@${hostname}:${port}${path}`;
  const builtUrl = new URL(strUrl);

  cy.log(`origin: ${builtUrl.href}`);
  return builtUrl.href;
};

export const login = () => {
  cy.session('user', () => {
    cy.request({
      body: {
        currentURL: '/',
        params: {
          password: ELASTICSEARCH_PASSWORD,
          username: ELASTICSEARCH_USERNAME,
        },
        providerName: 'basic',
        providerType: 'basic',
      },
      headers: { 'kbn-xsrf': 'cypress-creds-via-config' },
      method: 'POST',
      url: constructUrlWithUser(LOGIN_API_ENDPOINT),
    });
  });
};
