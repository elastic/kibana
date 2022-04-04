/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@elastic/apm-synthtrace';
import datemath from '@elastic/datemath';
import expect from '@kbn/expect';
import { range } from 'lodash';
import { AlertType } from '../../../../plugins/apm/common/alert_types';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { createAndRunApmMlJob } from '../../common/utils/create_and_run_apm_ml_job';
import { waitForRuleStatus } from './wait_for_rule_status';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const synthtraceEsClient = getService('synthtraceEsClient');
  const ml = getService('ml');
  const supertest = getService('supertest');
  const log = getService('log');

  // FLAKY: https://github.com/elastic/kibana/issues/129224
  registry.when.skip(
    'fetching service anomalies with a trial license',
    { config: 'trial', archives: ['apm_mappings_only_8.0.0'] },
    () => {
      const spikeStart = datemath.parse('now-2h')!.valueOf();
      const spikeEnd = datemath.parse('now')!.valueOf();

      const start = datemath.parse('now-2w')!.valueOf();
      const end = datemath.parse('now')!.valueOf();

      const NORMAL_DURATION = 100;
      const NORMAL_RATE = 1;

      let ruleId: string | undefined;

      before(async () => {
        const serviceA = apm.service('service-a', 'production', 'java').instance('a');

        const events = timerange(new Date(start).getTime(), new Date(end).getTime())
          .interval('1m')
          .rate(1)
          .spans((timestamp) => {
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
                  .serialize()
              ),
            ];
          });

        await synthtraceEsClient.index(events);
        await createAndRunApmMlJob({ environment: 'production', ml });
        const { body: createdRule } = await supertest
          .post(`/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send({
            params: {
              environment: 'production',
              serviceName: 'service-a',
              transactionType: 'request',
              windowSize: 30,
              windowUnit: 'm',
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
      });

      after(async () => {
        await synthtraceEsClient.clean();
        await ml.cleanMlIndices();
        await supertest.delete(`/api/alerting/rule/${ruleId}`).set('kbn-xsrf', 'foo');
      });

      it('checks if alert is active', async () => {
        const executionStatus = await waitForRuleStatus({
          id: ruleId,
          expectedStatus: 'active',
          supertest,
          log,
        });
        expect(executionStatus.status).to.be('active');
      });
    }
  );
}
