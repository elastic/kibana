/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApmRuleType } from '@kbn/apm-plugin/common/rules/apm_rule_types';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';
import { range } from 'lodash';
import { ANOMALY_SEVERITY } from '@kbn/apm-plugin/common/ml_constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { createAndRunApmMlJobs } from '../../common/utils/create_and_run_apm_ml_jobs';
import { createApmRule } from './alerting_api_helper';
import { waitForRuleStatus } from './wait_for_rule_status';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');

  const supertest = getService('supertest');
  const ml = getService('ml');
  const es = getService('es');

  const synthtraceEsClient = getService('synthtraceEsClient');

  // FAILING VERSION BUMP: https://github.com/elastic/kibana/issues/155930
  registry.when.skip(
    'fetching service anomalies with a trial license',
    { config: 'trial', archives: [] },
    () => {
      const start = '2021-01-01T00:00:00.000Z';
      const end = '2021-01-08T00:15:00.000Z';

      const spikeStart = new Date('2021-01-07T23:15:00.000Z').getTime();
      const spikeEnd = new Date('2021-01-08T00:15:00.000Z').getTime();

      const NORMAL_DURATION = 100;
      const NORMAL_RATE = 1;

      let ruleId: string | undefined;

      before(async () => {
        const serviceA = apm
          .service({ name: 'a', environment: 'production', agentName: 'java' })
          .instance('a');

        const events = timerange(new Date(start).getTime(), new Date(end).getTime())
          .interval('1m')
          .rate(1)
          .generator((timestamp) => {
            const isInSpike = timestamp >= spikeStart && timestamp < spikeEnd;
            const count = isInSpike ? 4 : NORMAL_RATE;
            const duration = isInSpike ? 1000 : NORMAL_DURATION;
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

        await synthtraceEsClient.index(events);
      });

      after(async () => {
        await synthtraceEsClient.clean();
        await supertest.delete(`/api/alerting/rule/${ruleId}`).set('kbn-xsrf', 'foo');
      });

      describe('with ml jobs', () => {
        before(async () => {
          await createAndRunApmMlJobs({ es, ml, environments: ['production'] });
        });

        after(async () => {
          await ml.cleanMlIndices();
        });

        it('checks if alert is active', async () => {
          const createdRule = await createApmRule({
            supertest,
            name: 'Latency anomaly | service-a',
            params: {
              environment: 'production',
              windowSize: 99,
              windowUnit: 'y',
              anomalySeverityType: ANOMALY_SEVERITY.WARNING,
            },
            ruleTypeId: ApmRuleType.Anomaly,
          });

          ruleId = createdRule.id;
          if (!ruleId) {
            expect(ruleId).to.not.eql(undefined);
          } else {
            const executionStatus = await waitForRuleStatus({
              id: ruleId,
              expectedStatus: 'active',
              supertest,
            });
            expect(executionStatus.status).to.be('active');
          }
        });
      });
    }
  );
}
