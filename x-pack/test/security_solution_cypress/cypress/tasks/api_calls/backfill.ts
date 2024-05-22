/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { INTERNAL_BASE_ALERTING_API_PATH } from '@kbn/alerting-plugin/common';

const BACKFILL_RULE_URL = `${INTERNAL_BASE_ALERTING_API_PATH}/rules/backfill`;
const BACKFILL_RULE_URL_SCHEDULE = `${BACKFILL_RULE_URL}/_schedule`;

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
