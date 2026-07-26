/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { Rule } from '../../../detection_engine/rule_management/logic';
import {
  DETECTION_ENGINE_QUERY_SIGNALS_URL,
  DETECTION_ENGINE_RULES_BULK_ACTION,
  DETECTION_ENGINE_RULES_URL,
} from '../../../../common/constants';
import { ELASTIC_SECURITY_RULE_ID } from '../../../../common';
import { request } from './common';
import { ENDPOINT_ALERTS_INDEX } from '../../../../scripts/endpoint/common/constants';
import { logger } from './logger';

const ES_URL = Cypress.env('ELASTICSEARCH_URL');

/**
 * Continuously check for any alert to have been received by the given endpoint.
 *
 * NOTE:  This is not the same as the alerts that populate the Alerts list. To check for
 *        those types of alerts, use `waitForDetectionAlerts()`
 */
export const waitForEndpointAlerts = (
  endpointAgentId: string,
  /** Additional filters that will be included in the ES `filter` array */
  additionalFilters: object[] = [],
  timeout = 120000
): Cypress.Chainable => {
  const esQuery: QueryDslQueryContainer = {
    bool: {
      filter: [
        {
          term: { 'agent.id': endpointAgentId },
        },
        ...additionalFilters,
      ],
    },
  };

  logger.debug(
    `Looking for endpoint [${endpointAgentId}] alerts streamed to [${ENDPOINT_ALERTS_INDEX}] using query:\n${JSON.stringify(
      esQuery,
      null,
      2
    )}`
  );

  return cy
    .waitUntil(
      () => {
        return request<estypes.SearchResponse>({
          method: 'GET',
          url: `${ES_URL}/${ENDPOINT_ALERTS_INDEX}/_search?ignore_unavailable=true`,
          failOnStatusCode: false,
          body: {
            query: esQuery,
            size: 1,
            _source: false,
          },
        }).then(({ body: streamedAlerts }) => {
          return (streamedAlerts.hits.total as estypes.SearchTotalHits).value > 0;
        });
      },
      { timeout, interval: 2000 }
    )
    .then(() => {
      // Stop/start Endpoint rule so that it can pickup and create Detection alerts
      cy.log(
        `Received endpoint alerts for agent [${endpointAgentId}] in index [${ENDPOINT_ALERTS_INDEX}]`
      );

      return stopStartEndpointDetectionsRule();
    })
    .then(() => {
      // wait until the Detection alert shows up in the API
      return waitForDetectionAlerts(getEndpointDetectionAlertsQueryForAgentId(endpointAgentId));
    });
};

export const fetchEndpointSecurityDetectionRule = (): Cypress.Chainable<Rule> => {
  return request<Rule>({
    method: 'GET',
    url: DETECTION_ENGINE_RULES_URL,
    qs: {
      rule_id: ELASTIC_SECURITY_RULE_ID,
    },
    headers: {
      'elastic-api-version': '2023-10-31',
    },
  }).then(({ body }) => {
    return body;
  });
};

export const stopStartEndpointDetectionsRule = (): Cypress.Chainable<Rule> => {
  return fetchEndpointSecurityDetectionRule()
    .then((endpointRule) => {
      // Disabled it
      return request({
        method: 'POST',
        url: DETECTION_ENGINE_RULES_BULK_ACTION,
        body: {
          action: 'disable',
          ids: [endpointRule.id],
        },
        headers: {
          'elastic-api-version': '2023-10-31',
        },
      }).then(() => {
        return endpointRule;
      });
    })
    .then((endpointRule) => {
      cy.log(`Endpoint rule id [${endpointRule.id}] has been disabled`);

      // Re-enable it
      return request({
        method: 'POST',
        url: DETECTION_ENGINE_RULES_BULK_ACTION,
        body: {
          action: 'enable',
          ids: [endpointRule.id],
        },
        headers: {
          'elastic-api-version': '2023-10-31',
        },
      }).then(() => endpointRule);
    })
    .then((endpointRule) => {
      cy.log(`Endpoint rule id [${endpointRule.id}] has been re-enabled`);
      return cy.wrap(endpointRule);
    });
};

/**
 * Waits for alerts to have been loaded by continuously calling the detections engine alerts
 * api until data shows up
 * @param query
 * @param timeout
 */
export const waitForDetectionAlerts = (
  /** The ES query. Defaults to `{ match_all: {} }` */
  query: object = { match_all: {} },
  timeout?: number
): Cypress.Chainable => {
  return cy.waitUntil(
    () => {
      return request<estypes.SearchResponse>({
        method: 'POST',
        url: DETECTION_ENGINE_QUERY_SIGNALS_URL,
        body: {
          query,
          size: 1,
        },
      }).then(({ body: alertsResponse }) => {
        return Boolean((alertsResponse.hits.total as estypes.SearchTotalHits)?.value ?? 0);
      });
    },
    { timeout, interval: 2000 }
  );
};

/**
 * Builds and returns the ES `query` object for use in querying for Endpoint Detection Engine
 * alerts. Can be used in ES searches or with the Detection Engine query signals (alerts) url.
 * @param endpointAgentId
 */
export const getEndpointDetectionAlertsQueryForAgentId = (endpointAgentId: string) => {
  return {
    bool: {
      filter: [
        {
          bool: {
            should: [{ match_phrase: { 'agent.type': 'endpoint' } }],
            minimum_should_match: 1,
          },
        },
        {
          bool: {
            should: [{ match_phrase: { 'agent.id': endpointAgentId } }],
            minimum_should_match: 1,
          },
        },
        {
          bool: {
            should: [{ exists: { field: 'kibana.alert.rule.uuid' } }],
            minimum_should_match: 1,
          },
        },
      ],
    },
  };
};

export const changeAlertsFilter = (text: string) => {
  cy.getByTestSubj('kbnQueryBar').within(() => {
    cy.getByTestSubj('queryInput').type(text);
    cy.getByTestSubj('querySubmitButton').click();
  });
};

/* copied from test/security_solution_cypress/cypress/tasks/create_new_rule */
export const DETECTION_PAGE_FILTER_GROUP_WRAPPER = '.filter-group__wrapper';
export const DETECTION_PAGE_FILTERS_LOADING = '.securityPageWrapper .controlFrame--controlLoading';
export const DETECTION_PAGE_FILTER_GROUP_LOADING = '[data-test-subj="filter-group__loading"]';
export const OPTION_LISTS_LOADING = '.optionsList--filterBtnWrapper .euiLoadingSpinner';
export const DATAGRID_CHANGES_IN_PROGRESS = '[data-test-subj="body-data-grid"] .euiProgress';
export const EVENT_CONTAINER_TABLE_LOADING = '[data-test-subj="internalAlertsPageLoading"]';
export const LOADING_INDICATOR = '[data-test-subj="globalLoadingIndicator"]';
export const ALERTS_URL = '/app/security/alerts';
export const REFRESH_BUTTON = `[data-test-subj="kbnQueryBar"] [data-test-subj="querySubmitButton"]`;
export const EMPTY_ALERT_TABLE = '[data-test-subj="alertsTableEmptyState"]';
export const ALERTS_TABLE_COUNT = `[data-test-subj="toolbar-alerts-count"]`;
export const ALERTS_TAB = '[data-test-subj="navigation-alerts"]';

export const goToAlertsTab = () => {
  cy.get(ALERTS_TAB).click();
};

export const waitForPageFilters = () => {
  cy.log('Waiting for Page Filters');
  cy.url().then((urlString) => {
    const url = new URL(urlString);
    if (url.pathname.endsWith(ALERTS_URL)) {
      // since these are only valid on the alert page
      cy.get(DETECTION_PAGE_FILTER_GROUP_WRAPPER).should('exist');
      cy.get(DETECTION_PAGE_FILTER_GROUP_LOADING).should('not.exist');
      cy.get(DETECTION_PAGE_FILTERS_LOADING).should('not.exist');
      cy.get(OPTION_LISTS_LOADING).should('have.lengthOf', 0);
    } else {
      cy.log('Skipping Page Filters Wait');
    }
  });
};

export const waitForAlerts = () => {
  /*
   * below line commented because alertpagefiltersenabled feature flag
   * is disabled by default
   * target: enable by default in v8.8
   *
   * waitforpagefilters();
   *
   * */
  waitForPageFilters();
  cy.get(REFRESH_BUTTON).should('not.have.attr', 'aria-label', 'Needs updating');
  cy.get(DATAGRID_CHANGES_IN_PROGRESS).should('not.be.true');
  cy.get(EVENT_CONTAINER_TABLE_LOADING).should('not.exist');
  cy.get(LOADING_INDICATOR).should('not.exist');
};

export const waitForAlertsToPopulate = (
  alertCountThreshold = 1,
  interval = 500,
  timeout = 12000
) => {
  cy.waitUntil(
    () => {
      cy.log('Waiting for alerts to appear');
      cy.get(REFRESH_BUTTON).click({ force: true });
      cy.get(REFRESH_BUTTON).should('not.have.attr', 'aria-label', 'Needs updating');
      return cy.root().then(($el) => {
        const emptyTableState = $el.find(EMPTY_ALERT_TABLE);
        if (emptyTableState.length > 0) {
          cy.log('Table is empty', emptyTableState.length);
          return false;
        }
        const countEl = $el.find(ALERTS_TABLE_COUNT);
        const alertCount = parseInt(countEl.text(), 10) || 0;
        return alertCount >= alertCountThreshold;
      });
    },
    { interval, timeout }
  );
  waitForAlerts();
};
