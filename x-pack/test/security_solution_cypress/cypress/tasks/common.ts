/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DATA_VIEW_PATH, INITIAL_REST_VERSION } from '@kbn/data-views-plugin/server/constants';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { KIBANA_LOADING_ICON } from '../screens/security_header';
import { EUI_BASIC_TABLE_LOADING } from '../screens/common/controls';
import { deleteAllDocuments } from './api_calls/elasticsearch';
import { DEFAULT_ALERTS_INDEX_PATTERN } from './api_calls/alerts';
import { ELASTICSEARCH_PASSWORD, ELASTICSEARCH_USERNAME } from '../env_var_names_constants';

const primaryButton = 0;

/**
 * To overcome the React Beautiful DND sloppy click detection threshold:
 * https://github.com/atlassian/react-beautiful-dnd/blob/67b96c8d04f64af6b63ae1315f74fc02b5db032b/docs/sensors/mouse.md#sloppy-clicks-and-click-prevention-
 */
const dndSloppyClickDetectionThreshold = 5;

export const API_AUTH = Object.freeze({
  user: Cypress.env(ELASTICSEARCH_USERNAME),
  pass: Cypress.env(ELASTICSEARCH_PASSWORD),
});

export const API_HEADERS = Object.freeze({
  'kbn-xsrf': 'cypress-creds',
  'x-elastic-internal-origin': 'security-solution',
  [ELASTIC_HTTP_VERSION_HEADER]: [INITIAL_REST_VERSION],
});

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

/** Starts dragging the subject */
export const drag = (subject: JQuery<HTMLElement>) => {
  const subjectLocation = subject[0].getBoundingClientRect();

  // Use cypress-real-events
  // eslint-disable-next-line cypress/no-unnecessary-waiting,cypress/unsafe-to-chain-command
  cy.wrap(subject)
    .trigger('mousedown', {
      button: primaryButton,
      clientX: subjectLocation.left,
      clientY: subjectLocation.top,
      force: true,
    })
    .wait(300)
    .trigger('mousemove', {
      button: primaryButton,
      clientX: subjectLocation.left + dndSloppyClickDetectionThreshold,
      clientY: subjectLocation.top,
      force: true,
    })
    .wait(300);
};

/** "Drops" the subject being dragged on the specified drop target  */
export const drop = (dropTarget: JQuery<HTMLElement>) => {
  const targetLocation = dropTarget[0].getBoundingClientRect();
  // eslint-disable-next-line cypress/no-unnecessary-waiting,cypress/unsafe-to-chain-command
  cy.wrap(dropTarget)
    .trigger('mousemove', {
      button: primaryButton,
      clientX: targetLocation.left,
      clientY: targetLocation.top,
      force: true,
    })
    .wait(300)
    .trigger('mouseup', { force: true })
    .wait(300);
};

export const reload = () => {
  cy.reload();
  cy.contains('a', 'Security');
};

const clearSessionStorage = () => {
  cy.window().then((win) => {
    win.sessionStorage.clear();
  });
};

export const resetRulesTableState = () => {
  clearSessionStorage();
};

export const deleteAlertsAndRules = () => {
  cy.log('Delete all alerts and rules');
  const kibanaIndexUrl = `${Cypress.env('ELASTICSEARCH_URL')}/.kibana_\*`;

  rootRequest({
    method: 'POST',
    url: '/api/detection_engine/rules/_bulk_action',
    body: {
      query: '',
      action: 'delete',
    },
    failOnStatusCode: false,
    headers: {
      'kbn-xsrf': 'cypress-creds',
      'x-elastic-internal-origin': 'security-solution',
    },
    timeout: 300000,
  });

  rootRequest({
    method: 'POST',
    url: `${kibanaIndexUrl}/_delete_by_query?conflicts=proceed&refresh`,
    body: {
      query: {
        bool: {
          filter: [
            {
              match: {
                type: 'alert',
              },
            },
          ],
        },
      },
    },
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

export const deleteTimelines = () => {
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
                type: 'siem-ui-timeline',
              },
            },
          ],
        },
      },
    },
  });
};

export const deleteAlertsIndex = () => {
  rootRequest({
    method: 'POST',
    url: '/api/index_management/indices/delete',
    body: { indices: ['.internal.alerts-security.alerts-default-000001'] },
    failOnStatusCode: false,
  });
};

export const deleteAllCasesItems = () => {
  const kibanaIndexUrl = `${Cypress.env('ELASTICSEARCH_URL')}/.kibana_alerting_cases_\*`;
  rootRequest({
    method: 'POST',
    url: `${kibanaIndexUrl}/_delete_by_query?conflicts=proceed&refresh`,
    body: {
      query: {
        bool: {
          filter: [
            {
              bool: {
                should: [
                  {
                    term: {
                      type: 'cases',
                    },
                  },
                  {
                    term: {
                      type: 'cases-configure',
                    },
                  },
                  {
                    term: {
                      type: 'cases-comments',
                    },
                  },
                  {
                    term: {
                      type: 'cases-user-action',
                    },
                  },
                  {
                    term: {
                      type: 'cases-connector-mappings',
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    },
  });
};

export const deleteConnectors = () => {
  const kibanaIndexUrl = `${Cypress.env('ELASTICSEARCH_URL')}/.kibana_alerting_cases_\*`;
  rootRequest({
    method: 'POST',
    url: `${kibanaIndexUrl}/_delete_by_query?conflicts=proceed&refresh`,
    body: {
      query: {
        bool: {
          filter: [
            {
              match: {
                type: 'action',
              },
            },
          ],
        },
      },
    },
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
    headers: {
      'kbn-xsrf': 'cypress-creds',
      'x-elastic-internal-origin': 'security-solution',
    },
    failOnStatusCode: false,
  });
};

export const deleteDataView = (dataViewId: string) => {
  rootRequest({
    method: 'POST',
    url: 'api/content_management/rpc/delete',
    headers: { 'kbn-xsrf': 'cypress-creds', 'x-elastic-internal-origin': 'security-solution' },
    body: {
      contentTypeId: 'index-pattern',
      id: dataViewId,
      options: { force: true },
      version: 1,
    },
    failOnStatusCode: false,
  });
};

export const scrollToBottom = () => cy.scrollTo('bottom');

export const waitForWelcomePanelToBeLoaded = () => {
  cy.get(KIBANA_LOADING_ICON).should('exist');
  cy.get(KIBANA_LOADING_ICON).should('not.exist');
};

export const waitForTableToLoad = () => {
  cy.get(EUI_BASIC_TABLE_LOADING).should('exist');
  cy.get(EUI_BASIC_TABLE_LOADING).should('not.exist');
};
