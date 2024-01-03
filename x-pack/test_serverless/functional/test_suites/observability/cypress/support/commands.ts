/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import 'cypress-axe';
import 'cypress-real-events/support';
import URL from 'url';
import { request } from '@kbn/security-solution-plugin/public/management/cypress/tasks/common';
import { LoginState } from '@kbn/security-plugin/common/login_state';

Cypress.Commands.add('loginAsElasticUser', () => {
  const username = Cypress.env('username');
  const password = Cypress.env('password');
  const kibanaUrlWithoutAuth = Cypress.env('kibanaUrlWithoutAuth');
  const headers = { 'kbn-xsrf': 'e2e_test', 'x-elastic-internal-origin': 'kibana' };
  cy.log(`Logging in as ${username} on ${kibanaUrlWithoutAuth}`);
  cy.visit('/login');

  cy.request<LoginState>({
    headers,
    url: `${kibanaUrlWithoutAuth}/internal/security/login_state`,
  }).then((loginState) => {
    const basicProvider = loginState.body.selector.providers.find(
      (provider) => provider.type === 'basic'
    );
    return request({
      headers,
      log: true,
      method: 'POST',
      url: `${kibanaUrlWithoutAuth}/internal/security/login`,
      body: {
        providerType: basicProvider?.type,
        providerName: basicProvider?.name,
        currentURL: `${kibanaUrlWithoutAuth}/login`,
        params: { username, password },
      },
    });
  });
  cy.visit('/');
});

Cypress.Commands.add('getByTestSubj', (selector: string) => {
  return cy.get(`[data-test-subj*="${selector}"]`);
});

Cypress.Commands.add('visitKibana', (url: string, rangeFrom?: string, rangeTo?: string) => {
  const urlPath = URL.format({
    pathname: url,
    query: { rangeFrom, rangeTo },
  });

  cy.visit(urlPath);
  cy.getByTestSubj('kbnLoadingMessage').should('exist');
  cy.getByTestSubj('kbnLoadingMessage').should('not.exist', {
    timeout: 50000,
  });
});
