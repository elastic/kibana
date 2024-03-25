/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DATA_VIEW_PATH, INITIAL_REST_VERSION } from '@kbn/data-views-plugin/server/constants';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { AllConnectorsResponse } from '@kbn/actions-plugin/common/routes/connector/response';
import { ELASTICSEARCH_PASSWORD, ELASTICSEARCH_USERNAME } from '../../env_var_names_constants';
import { deleteAllDocuments } from './elasticsearch';
import { DEFAULT_ALERTS_INDEX_PATTERN } from './alerts';

export const API_AUTH = Object.freeze({
  user: Cypress.env(ELASTICSEARCH_USERNAME),
  pass: Cypress.env(ELASTICSEARCH_PASSWORD),
});

export const API_HEADERS = Object.freeze({
  'kbn-xsrf': 'cypress-creds',
  'x-elastic-internal-origin': 'security-solution',
  [ELASTIC_HTTP_VERSION_HEADER]: [INITIAL_REST_VERSION],
});

export const INTERNAL_CLOUD_CONNECTORS = ['Elastic-Cloud-SMTP'];

export const rootRequest = <T = unknown>({
  headers: optionHeaders,
  ...restOptions
}: Partial<Cypress.RequestOptions>): Cypress.Chainable<Cypress.Response<T>> =>
  cy.request<T>({
    auth: API_AUTH,
    headers: {
      ...API_HEADERS,
      ...(optionHeaders || {}),
    },
    ...restOptions,
  });

export const deleteAlertsAndRules = () => {
  cy.log('Delete all alerts and rules');

  rootRequest({
    method: 'POST',
    url: '/api/detection_engine/rules/_bulk_action',
    body: {
      query: '',
      action: 'delete',
    },
    failOnStatusCode: false,
    timeout: 300000,
  });

  deleteAllDocuments(`.lists-*,.items-*,${DEFAULT_ALERTS_INDEX_PATTERN}`);
};

export const deleteExceptionLists = () => {
  const kibanaIndexUrl = `${Cypress.env('ELASTICSEARCH_URL')}/.kibana_\*`;
  rootRequest({
    method: 'POST',
    url: `${kibanaIndexUrl}/_delete_by_query?conflicts=proceed&refresh`,
    body: {
      query: {
        bool: {
          filter: [
            {
              match: {
                type: 'exception-list',
              },
            },
          ],
        },
      },
    },
  });
};

export const deleteEndpointExceptionList = () => {
  const kibanaIndexUrl = `${Cypress.env('ELASTICSEARCH_URL')}/.kibana_\*`;
  rootRequest({
    method: 'POST',
    url: `${kibanaIndexUrl}/_delete_by_query?conflicts=proceed&refresh`,
    body: {
      query: {
        bool: {
          filter: [
            {
              match: {
                type: 'exception-list-agnostic',
              },
            },
          ],
        },
      },
    },
  });
};

export const getConnectors = () =>
  rootRequest<AllConnectorsResponse[]>({
    method: 'GET',
    url: 'api/actions/connectors',
  });

export const deleteConnectors = () => {
  getConnectors().then(($response) => {
    if ($response.body.length > 0) {
      const ids = $response.body.map((connector) => {
        return connector.id;
      });
      ids.forEach((id) => {
        if (!INTERNAL_CLOUD_CONNECTORS.includes(id)) {
          rootRequest({
            method: 'DELETE',
            url: `api/actions/connector/${id}`,
          });
        }
      });
    }
  });
};

export const deletePrebuiltRulesAssets = () => {
  const kibanaIndexUrl = `${Cypress.env('ELASTICSEARCH_URL')}/.kibana_\*`;
  rootRequest({
    method: 'POST',
    url: `${kibanaIndexUrl}/_delete_by_query?conflicts=proceed&refresh`,
    body: {
      query: {
        bool: {
          filter: [
            {
              match: {
                type: 'security-rule',
              },
            },
          ],
        },
      },
    },
  });
};

export const postDataView = (indexPattern: string, name?: string, id?: string) => {
  rootRequest({
    method: 'POST',
    url: DATA_VIEW_PATH,
    body: {
      data_view: {
        id: id || indexPattern,
        name: name || indexPattern,
        fieldAttrs: '{}',
        title: indexPattern,
        timeFieldName: '@timestamp',
      },
    },
    failOnStatusCode: false,
  });
};

export const deleteDataView = (dataViewId: string) => {
  rootRequest({
    method: 'POST',
    url: 'api/content_management/rpc/delete',
    body: {
      contentTypeId: 'index-pattern',
      id: dataViewId,
      options: { force: true },
      version: 1,
    },
    failOnStatusCode: false,
  });
};
