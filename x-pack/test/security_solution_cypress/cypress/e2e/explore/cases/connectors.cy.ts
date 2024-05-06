/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getJiraConnector } from '../../../objects/case';

import { CONNECTORS_DROPDOWN, MAPPING } from '../../../screens/configure_cases';

import { goToEditExternalConnection } from '../../../tasks/all_cases';
import { deleteCases } from '../../../tasks/api_calls/cases';
import { deleteConnectors } from '../../../tasks/api_calls/common';
import { addJiraConnector, openAddNewConnectorOption } from '../../../tasks/configure_cases';
import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';

import { CASES_URL } from '../../../urls/navigation';

describe('Cases connectors', { tags: ['@ess', '@serverless'] }, () => {
  const configureResult = {
    connector: {
      id: 'e271c3b8-f702-4fbc-98e0-db942b573bbd',
      name: 'Jira',
      type: '.jira',
      fields: null,
    },
    closure_type: 'close-by-user',
    created_at: '2020-12-01T16:28:09.219Z',
    created_by: { email: null, full_name: null, username: 'elastic' },
    error: null,
    updated_at: null,
    updated_by: null,
    customFields: [],
    templates: [],
    mappings: [
      { source: 'title', target: 'summary', action_type: 'overwrite' },
      { source: 'description', target: 'description', action_type: 'overwrite' },
      { source: 'comments', target: 'comments', action_type: 'append' },
    ],
    version: 'WzEwNCwxXQ==',
    id: '123',
    owner: 'securitySolution',
  };

  const jiraConnector = getJiraConnector();

  beforeEach(() => {
    login();
    deleteCases();
    deleteConnectors();

    cy.intercept('POST', '/api/actions/connector').as('createConnector');
    cy.intercept({ method: '+(POST|PATCH)', url: '/api/cases/configure' }, (req) => {
      const connector = req.body.connector;
      req.reply((res) => {
        res.send(200, { ...configureResult, connector });
      });
    }).as('saveConnector');

    cy.intercept('GET', '/api/cases/configure', (req) => {
      req.reply((res) => {
        const resBody =
          res.body.length > 0 && res.body[0].version != null
            ? [
                {
                  ...res.body[0],
                  error: null,
                  mappings: [
                    { source: 'title', target: 'summary', action_type: 'overwrite' },
                    { source: 'description', target: 'description', action_type: 'overwrite' },
                    { source: 'comments', target: 'comments', action_type: 'append' },
                  ],
                },
              ]
            : res.body;
        res.send(200, resBody);
      });
    });
  });

  it('Configures a new connector', () => {
    visit(CASES_URL);
    goToEditExternalConnection();
    openAddNewConnectorOption();
    addJiraConnector(jiraConnector);

    cy.wait('@createConnector').then(({ response }) => {
      cy.wrap(response?.statusCode).should('eql', 200);
      cy.wait('@saveConnector').its('response.statusCode').should('eql', 200);

      cy.get(CONNECTORS_DROPDOWN).should('have.text', jiraConnector.connectorName);

      cy.get(MAPPING).first().should('have.text', 'summary');
    });
  });
});
