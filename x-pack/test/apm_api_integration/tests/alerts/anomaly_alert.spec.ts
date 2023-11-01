/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { ApmRuleType } from '@kbn/rule-data-utils';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';
import { range } from 'lodash';
import { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { createAndRunApmMlJobs } from '../../common/utils/create_and_run_apm_ml_jobs';
import { createApmRule } from './helpers/alerting_api_helper';
import { waitForActiveRule } from './helpers/wait_for_active_rule';
import { cleanupRuleAndAlertState } from './helpers/cleanup_rule_and_alert_state';

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
      const start = moment().subtract(2, 'days').valueOf();
      const end = moment().valueOf();

      const spikeStart = moment().subtract(2, 'hours').valueOf();
      const spikeEnd = moment().subtract(1, 'hours').valueOf();

      before(async () => {
        const serviceA = apm
          .service({ name: 'a', environment: 'production', agentName: 'java' })
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

        await synthtraceEsClient.index(events);

        await createAndRunApmMlJobs({ es, ml, environments: ['production'], logger });
      });

      after(async () => {
        await cleanup();
      });

      async function cleanup() {
        await synthtraceEsClient.clean();
        await cleanupRuleAndAlertState({ es, supertest, logger });
        await ml.cleanMlIndices();
      }

      describe('with ml jobs', () => {
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

          const ruleStatus = await waitForActiveRule({
            ruleId: createdRule.id,
            supertest,
            logger,
          });
          expect(ruleStatus).to.be('active');
        });
      });
    }
  );
}
