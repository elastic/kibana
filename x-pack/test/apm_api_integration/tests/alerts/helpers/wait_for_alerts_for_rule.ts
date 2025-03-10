/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { AggregationsAggregate, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { Effect } from 'effect';
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
  // :: Effect.Effect<ApmAlertFields[], TimeoutException, never>
  const main = Effect.gen(function* () {
    return yield* Effect.promise(() =>
      getAlertByRuleId({ es, ruleId }).then((alerts) => {
        const actualAlertCount = alerts.length;
        if (actualAlertCount < minimumAlertCount)
          throw new Error(`Expected ${minimumAlertCount} but got ${actualAlertCount} alerts`);
        return alerts;
      })
    );
  }).pipe(Effect.timeout('30 seconds'));

  return await Effect.runPromise(Effect.retry(main, { times: 100 }));
}
