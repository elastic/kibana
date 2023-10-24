/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { ApmRuleType } from '@kbn/apm-plugin/common/rules/apm_rule_types';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';
import { range } from 'lodash';
import { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { createAndRunApmMlJobs } from '../../common/utils/create_and_run_apm_ml_jobs';
import { createApmRule, deleteRuleById } from './helpers/alerting_api_helper';
import { waitForRuleStatus } from './helpers/wait_for_rule_status';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const supertest = getService('supertest');
  const ml = getService('ml');
  const es = getService('es');
  const logger = getService('log');

  const synthtraceEsClient = getService('synthtraceEsClient');
  registry.when(
    'fetching service anomalies with a trial license',
    { config: 'trial', archives: [] },
    () => {
      const start = moment().subtract(1, 'days').valueOf();
      const end = moment().valueOf();

      const spikeStart = moment().subtract(15, 'minutes').valueOf();
      const spikeEnd = moment().valueOf();

      let ruleId: string;

      before(async () => {
        await cleanup();

        const serviceA = apm
          .service({ name: 'a', environment: 'production', agentName: 'java' })
          .instance('a');

        const events = timerange(start, end)
          .interval('1m')
          .rate(1)
          .generator((timestamp) => {
            const isInSpike = timestamp >= spikeStart && timestamp < spikeEnd;
            const count = isInSpike ? 4 : 1;
            const duration = isInSpike ? 1000 : 100;
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

        await createAndRunApmMlJobs({ es, ml, environments: ['production'] });
      });

      after(async () => {
        await cleanup();
      });

      async function cleanup() {
        try {
          await synthtraceEsClient.clean();
          await deleteRuleById({ supertest, ruleId });
          await ml.cleanMlIndices();
        } catch (e) {
          logger.info('Could not delete rule by id', e);
        }
      }

      // FLAKY: https://github.com/elastic/kibana/issues/169495
      describe.skip('with ml jobs', () => {
        it('checks if alert is active', async () => {
          const createdRule = await createApmRule({
            supertest,
            name: 'Latency anomaly | service-a',
            params: {
              environment: 'production',
              windowSize: 5,
              windowUnit: 'h',
              anomalySeverityType: ML_ANOMALY_SEVERITY.WARNING,
            },
            ruleTypeId: ApmRuleType.Anomaly,
          });
          ruleId = createdRule.id;
          if (!ruleId) {
            expect(ruleId).to.not.eql(undefined);
          } else {
            const ruleStatus = await waitForRuleStatus({
              ruleId,
              expectedStatus: 'active',
              supertest,
            });
            expect(ruleStatus).to.be('active');
          }
        });
      });
    }
  );
}
