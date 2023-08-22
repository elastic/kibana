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

const primaryButton = 0;

/**
 * To overcome the React Beautiful DND sloppy click detection threshold:
 * https://github.com/atlassian/react-beautiful-dnd/blob/67b96c8d04f64af6b63ae1315f74fc02b5db032b/docs/sensors/mouse.md#sloppy-clicks-and-click-prevention-
 */
const dndSloppyClickDetectionThreshold = 5;

export const API_AUTH = Object.freeze({
  user: Cypress.env('ELASTICSEARCH_USERNAME'),
  pass: Cypress.env('ELASTICSEARCH_PASSWORD'),
});

export const API_HEADERS = Object.freeze({ 'kbn-xsrf': 'cypress' });

export const rootRequest = <T = unknown>(
  options: Partial<Cypress.RequestOptions>
): Cypress.Chainable<Cypress.Response<T>> =>
  cy.request<T>({
    auth: API_AUTH,
    headers: API_HEADERS,
    ...options,
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

/** Clears the rules and monitoring tables state. Automatically called in `cleanKibana()`. */
export const resetRulesTableState = () => {
  clearSessionStorage();
};

export const cleanKibana = () => {
  resetRulesTableState();
  deleteAlertsAndRules();
  deleteCases();
  deleteTimelines();
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
    headers: { 'kbn-xsrf': 'cypress-creds', 'x-elastic-internal-origin': 'security-solution' },
    timeout: 300000,
  });

  rootRequest({
    method: 'POST',
    url: `${kibanaIndexUrl}/_delete_by_query?conflicts=proceed`,
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

  rootRequest({
    method: 'POST',
    url: `${Cypress.env(
      'ELASTICSEARCH_URL'
    )}/.lists-*,.items-*,.alerts-security.alerts-*/_delete_by_query?conflicts=proceed&scroll_size=10000`,
    body: {
      query: {
        match_all: {},
      },
    },
  });
};

export const deleteTimelines = () => {
  const kibanaIndexUrl = `${Cypress.env('ELASTICSEARCH_URL')}/.kibana_\*`;
  rootRequest({
    method: 'POST',
    url: `${kibanaIndexUrl}/_delete_by_query?conflicts=proceed`,
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

export const deleteCases = () => {
  const kibanaIndexUrl = `${Cypress.env('ELASTICSEARCH_URL')}/.kibana_\*`;
  rootRequest({
    method: 'POST',
    url: `${kibanaIndexUrl}/_delete_by_query?conflicts=proceed`,
    body: {
      query: {
        bool: {
          filter: [
            {
              match: {
                type: 'cases',
              },
            },
          ],
        },
      },
    },
  });
};

export const deleteConnectors = () => {
  const kibanaIndexUrl = `${Cypress.env('ELASTICSEARCH_URL')}/.kibana_\*`;
  rootRequest({
    method: 'POST',
    url: `${kibanaIndexUrl}/_delete_by_query?conflicts=proceed`,
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
    url: `${kibanaIndexUrl}/_delete_by_query?conflicts=proceed`,
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

export const postDataView = (dataSource: string) => {
  rootRequest({
    method: 'POST',
    url: DATA_VIEW_PATH,
    body: {
      data_view: {
        id: dataSource,
        name: dataSource,
        fieldAttrs: '{}',
        title: dataSource,
        timeFieldName: '@timestamp',
      },
    },
    headers: {
      'kbn-xsrf': 'cypress-creds',
      'x-elastic-internal-origin': 'security-solution',
      [ELASTIC_HTTP_VERSION_HEADER]: [INITIAL_REST_VERSION],
    },
    failOnStatusCode: false,
  });
};

export const deleteDataView = (dataSource: string) => {
  rootRequest({
    method: 'DELETE',
    url: `api/data_views/data_view/${dataSource}`,
    headers: { 'kbn-xsrf': 'cypress-creds', 'x-elastic-internal-origin': 'security-solution' },
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
