/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { rootRequest } from '../common';

export const deleteIndex = (index: string) => {
  rootRequest({
    method: 'DELETE',
    url: `${Cypress.env('ELASTICSEARCH_URL')}/${index}`,
    headers: { 'kbn-xsrf': 'cypress-creds', 'x-elastic-internal-origin': 'security-solution' },
    failOnStatusCode: false,
  });
};

export const createIndex = (indexName: string, properties: Record<string, unknown>) =>
  rootRequest({
    method: 'PUT',
    url: `${Cypress.env('ELASTICSEARCH_URL')}/${indexName}`,
    body: {
      mappings: {
        properties,
      },
    },
  });

export const createDocument = (indexName: string, document: Record<string, unknown>) =>
  rootRequest({
    method: 'POST',
    url: `${Cypress.env('ELASTICSEARCH_URL')}/${indexName}/_doc`,
    body: document,
  });

export const waitForNewDocumentToBeIndexed = (index: string, initialNumberOfDocuments: number) => {
  cy.waitUntil(
    () =>
      rootRequest<{ hits: { hits: unknown[] } }>({
        method: 'GET',
        url: `${Cypress.env('ELASTICSEARCH_URL')}/${index}/_search`,
        headers: { 'kbn-xsrf': 'cypress-creds', 'x-elastic-internal-origin': 'security-solution' },
        failOnStatusCode: false,
      }).then((response) => {
        if (response.status !== 200) {
          return false;
        } else {
          return response.body.hits.hits.length > initialNumberOfDocuments;
        }
      }),
    { interval: 500, timeout: 12000 }
  );
};

export const refreshIndex = (index: string) => {
  cy.waitUntil(
    () =>
      rootRequest({
        method: 'POST',
        url: `${Cypress.env('ELASTICSEARCH_URL')}/${index}/_refresh`,
        headers: { 'kbn-xsrf': 'cypress-creds', 'x-elastic-internal-origin': 'security-solution' },
        failOnStatusCode: false,
      }).then((response) => {
        if (response.status !== 200) {
          return false;
        }
        return true;
      }),
    { interval: 500, timeout: 12000 }
  );
};
