/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type {
  AggregationsAggregate,
  SearchResponse,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import pRetry from 'p-retry';
import {
  APM_ALERTS_INDEX,
  ApmAlertFields,
} from '../../../../api_integration/deployment_agnostic/apis/observability/apm/alerts/helpers/alerting_helper';

async function getAlertByRuleId({ es, ruleId }: { es: Client; ruleId: string }) {
  const response = (await es.search({
    index: APM_ALERTS_INDEX,
    body: {
      query: {
        term: {
          'kibana.alert.rule.uuid': ruleId,
        },
      },
    },
  })) as SearchResponse<ApmAlertFields, Record<string, AggregationsAggregate>>;

  return response.hits.hits.map((hit) => hit._source) as ApmAlertFields[];
}

export async function waitForAlertsForRule({
  es,
  ruleId,
  minimumAlertCount = 1,
}: {
  es: Client;
  ruleId: string;
  minimumAlertCount?: number;
}) {
  return pRetry(
    async () => {
      const alerts = await getAlertByRuleId({ es, ruleId });
      const actualAlertCount = alerts.length;
      if (actualAlertCount < minimumAlertCount) {
        throw new Error(`Expected ${minimumAlertCount} but got ${actualAlertCount} alerts`);
      }

      return alerts;
    },
    { retries: 5 }
  );
}
