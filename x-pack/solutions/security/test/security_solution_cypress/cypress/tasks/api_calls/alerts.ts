/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RuleObjectId,
  RuleSignatureId,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import { rootRequest } from './common';

export const DEFAULT_ALERTS_INDEX_PATTERN = '.alerts-security.alerts-*';

interface FetchRuleAlertsParams {
  ruleId: RuleObjectId | RuleSignatureId;
  fields: string[];
  size?: number;
}

interface AlertFields {
  fields: Record<string, unknown>;
}

interface AlertsResponse {
  hits: {
    total: {
      value: number;
    };
    hits: AlertFields[];
  };
}

/**
 * Returns rule's generated alerts
 *
 * @param ruleId a rule id representing either RuleObjectId (Saved Object id) or RuleSignatureId (rule_id)
 * @param fields fields to fetch (fetch only fields you need to do assertions on)
 * @param size a number of alerts to fetch
 *
 * @returns rule's generated alerts
 */
export function fetchRuleAlerts({
  ruleId,
  fields,
  size,
}: FetchRuleAlertsParams): Cypress.Chainable<Cypress.Response<AlertsResponse>> {
  return rootRequest<AlertsResponse>({
    method: 'GET',
    url: `${Cypress.env('ELASTICSEARCH_URL')}/${DEFAULT_ALERTS_INDEX_PATTERN}/_search`,
    body: {
      query: {
        bool: {
          should: [
            {
              term: {
                'kibana.alert.rule.rule_id': ruleId,
              },
            },
            {
              term: {
                'kibana.alert.rule.uuid': ruleId,
              },
            },
          ],
        },
      },
      fields,
      sort: {
        '@timestamp': 'desc',
      },
      size,
      _source: false,
    },
  });
}
