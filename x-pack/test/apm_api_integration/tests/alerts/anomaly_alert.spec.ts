/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apm, timerange } from '@elastic/apm-synthtrace';
import expect from '@kbn/expect';
import { range } from 'lodash';
import { AlertType } from '../../../../plugins/apm/common/alert_types';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { createAndRunApmMlJob } from '../../common/utils/create_and_run_apm_ml_job';
import { waitForRuleStatus } from './wait_for_rule_status';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');

  const supertest = getService('supertest');
  const ml = getService('ml');
  const log = getService('log');

  const synthtraceEsClient = getService('synthtraceEsClient');

  registry.when(
    'fetching service anomalies with a trial license',
    { config: 'trial', archives: ['apm_mappings_only_8.0.0'] },
    () => {
      const start = '2021-01-01T00:00:00.000Z';
      const end = '2021-01-08T00:15:00.000Z';

      const spikeStart = new Date('2021-01-07T23:15:00.000Z').getTime();
      const spikeEnd = new Date('2021-01-08T00:15:00.000Z').getTime();

      const NORMAL_DURATION = 100;
      const NORMAL_RATE = 1;

      let ruleId: string | undefined;

      before(async () => {
        const serviceA = apm.service('a', 'production', 'java').instance('a');

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
                  .transaction('tx', 'request')
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
          await createAndRunApmMlJob({ environment: 'production', ml });
        });

        after(async () => {
          await ml.cleanMlIndices();
        });

        it('checks if alert is active', async () => {
          const { body: createdRule } = await supertest
            .post(`/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                environment: 'production',
                windowSize: 99,
                windowUnit: 'y',
                anomalySeverityType: 'warning',
              },
              consumer: 'apm',
              schedule: {
                interval: '1m',
              },
              tags: ['apm', 'service.name:service-a'],
              name: 'Latency anomaly | service-a',
              rule_type_id: AlertType.Anomaly,
              notify_when: 'onActiveAlert',
              actions: [],
            });

          ruleId = createdRule.id;

          const executionStatus = await waitForRuleStatus({
            id: ruleId,
            expectedStatus: 'active',
            supertest,
            log,
          });
          expect(executionStatus.status).to.be('active');
        });
      });
    }
  );
}
