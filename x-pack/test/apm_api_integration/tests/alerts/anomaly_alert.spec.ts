/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { AnomalyDetectorType } from '@kbn/apm-plugin/common/anomaly_detection/apm_ml_detectors';
import { ApmRuleType } from '@kbn/rule-data-utils';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';
import { range } from 'lodash';
import { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
import type { Client } from '@elastic/elasticsearch';
import type { AggregationsAggregate, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { Effect } from 'effect';
import {
  APM_ALERTS_INDEX,
  ApmAlertFields,
} from '../../../api_integration/deployment_agnostic/apis/observability/apm/alerts/helpers/alerting_helper';
import { waitForActiveRule } from './helpers/wait_for_active_rule';
import { createApmRule } from './helpers/alerting_api_helper';
import { cleanupRuleAndAlertState } from './helpers/cleanup_rule_and_alert_state';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { createAndRunApmMlJobs } from '../../common/utils/create_and_run_apm_ml_jobs';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const supertest = getService('supertest');
  const ml = getService('ml');
  const es = getService('es');
  const logger = getService('log');

  const apmSynthtraceEsClient = getService('apmSynthtraceEsClient');
  registry.when(
    'fetching service anomalies with a trial license',
    { config: 'trial', archives: [] },
    () => {
      const start = moment().subtract(2, 'days').valueOf();
      const end = moment().valueOf();

      const spikeStart = moment().subtract(2, 'hours').valueOf();
      const spikeEnd = moment().subtract(1, 'hours').valueOf();

      before(async () => {
        const serviceA = apm
          .service({ name: 'foo', environment: 'production', agentName: 'java' })
          .instance('a');

        const events = timerange(start, end)
          .interval('1m')
          .rate(1)
          .generator((timestamp) => {
            const isInSpike = timestamp >= spikeStart && timestamp < spikeEnd;
            const count = isInSpike ? 4 : 1;
            const duration = isInSpike ? 5000 : 100;
            const outcome = isInSpike ? 'failure' : 'success';

            return [
              ...range(0, count).flatMap((_) =>
                serviceA
                  .transaction({ transactionName: 'tx' })
                  .timestamp(timestamp)
                  .duration(duration)
                  .outcome(outcome)
              ),
            ];
          });

        await apmSynthtraceEsClient.index(events);

        await createAndRunApmMlJobs({ es, ml, environments: ['production'], logger });
      });

      after(async () => {
        await cleanup();
      });

      async function cleanup() {
        await apmSynthtraceEsClient.clean();
        await cleanupRuleAndAlertState({ es, supertest, logger });
        await ml.cleanMlIndices();
      }

      describe('with ml jobs', () => {
        let createdRule: Awaited<ReturnType<typeof createApmRule>>;

        before(async () => {
          createdRule = await createApmRule({
            supertest,
            name: 'Latency anomaly | service-a',
            params: {
              environment: 'production',
              windowSize: 5,
              windowUnit: 'h',
              anomalySeverityType: ML_ANOMALY_SEVERITY.WARNING,
              anomalyDetectorTypes: [AnomalyDetectorType.txLatency],
            },
            ruleTypeId: ApmRuleType.Anomaly,
          });
        });
        it('checks if alert is active', async () => {
          const ruleStatus = await waitForActiveRule({
            ruleId: createdRule.id,
            supertest,
            logger,
          });
          expect(ruleStatus).to.be('active');
        });

        it('produces an alert with the correct reason', async () => {
          const alerts = await waitForAlertsForRule({ es, ruleId: createdRule.id });

          const score = alerts[0]['kibana.alert.evaluation.value'];
          expect(alerts[0]['kibana.alert.reason']).to.be(
            `warning latency anomaly with a score of ${score}, was detected in the last 5 hrs for foo.`
          );
        });
      });
    }
  );
}

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
async function waitForAlertsForRule({
  es,
  ruleId,
  minimumAlertCount = 1,
}: {
  es: Client;
  ruleId: string;
  minimumAlertCount?: number;
}) {
  const main = Effect.gen(function* () {
    yield* Effect.log(`Searching for rules`);
    return yield* Effect.promise(() =>
      getAlertByRuleId({ es, ruleId }).then((alerts) => {
        const actualAlertCount = alerts.length;
        if (actualAlertCount < minimumAlertCount)
          throw new Error(`Expected ${minimumAlertCount} but got ${actualAlertCount} alerts`);
        return alerts;
      })
    );
  }).pipe(Effect.timeout('2 seconds'), Effect.withLogSpan('waitForAlertsForRule'));

  return await Effect.runPromise(Effect.retry(main, { times: 2 }));
}
