/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  INTERNAL_ALERTING_BACKFILL_FIND_API_PATH,
  INTERNAL_ALERTING_BACKFILL_API_PATH,
} from '@kbn/alerting-plugin/common';

const BACKFILL_RULE_URL_SCHEDULE = `${INTERNAL_ALERTING_BACKFILL_API_PATH}/_schedule`;

export const manualRuleRun = ({
  ruleId,
  start,
  end,
}: {
  ruleId: string;
  start: string;
  end: string;
}): Cypress.Chainable<Cypress.Response<unknown>> => {
  return cy.request({
    method: 'POST',
    url: BACKFILL_RULE_URL_SCHEDULE,
    headers: { 'kbn-xsrf': 'cypress-creds', 'x-elastic-internal-origin': 'Kibana' },
    body: [
      {
        rule_id: ruleId,
        start,
        end,
      },
    ],
  });
};

export const interceptFindBackfillsNoData = () => {
  cy.intercept('POST', INTERNAL_ALERTING_BACKFILL_FIND_API_PATH, {
    statusCode: 200,
    body: {
      page: 1,
      per_page: 10,
      total: 0,
      data: [],
    },
  });
};

export const FIRST_BACKFILL_ID = 'c51259fb-7c55-4210-8137-b50f0c0dbff5';

export const interceptFindBackfills = () => {
  cy.intercept('POST', `${INTERNAL_ALERTING_BACKFILL_FIND_API_PATH}*`, {
    statusCode: 200,
    body: {
      page: 1,
      per_page: 10,
      total: 2,
      data: [
        {
          id: 'c51259fb-7c55-4210-8137-b50f0c0dbff5',
          duration: '5h',
          enabled: true,
          end: '2024-05-22T14:05:00.000Z',
          start: '2024-05-21T13:00:00.000Z',
          status: 'pending',
          created_at: '2024-05-27T15:19:43.543Z',
          space_id: 'default',
          schedule: [
            {
              run_at: '2024-05-21T18:00:00.000Z',
              status: 'complete',
              interval: '5h',
            },
            {
              run_at: '2024-05-21T23:00:00.000Z',
              status: 'complete',
              interval: '5h',
            },
            {
              run_at: '2024-05-22T04:00:00.000Z',
              status: 'pending',
              interval: '5h',
            },
            {
              run_at: '2024-05-22T09:00:00.000Z',
              status: 'error',
              interval: '5h',
            },
          ],
        },
        {
          id: 'c51259fb-7c55-4210-8137-b50f0c0dbff6',
          duration: '5h',
          enabled: true,
          end: '2024-05-22T14:05:00.000Z',
          start: '2024-05-21T13:00:00.000Z',
          status: 'running',
          created_at: '2024-05-27T15:19:43.543Z',
          space_id: 'default',
          schedule: [
            {
              run_at: '2024-05-21T18:00:00.000Z',
              status: 'running',
              interval: '5h',
            },
          ],
        },
      ],
    },
  });
};

export const interceptDeleteBackfill = (id: string, alias: string) => {
  cy.intercept('DELETE', `${INTERNAL_ALERTING_BACKFILL_API_PATH}/${id}`, {}).as(alias);
};
