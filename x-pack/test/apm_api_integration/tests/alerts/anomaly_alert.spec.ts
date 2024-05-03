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
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { createAndRunApmMlJobs } from '../../common/utils/create_and_run_apm_ml_jobs';
import { createApmRule } from './helpers/alerting_api_helper';
import { waitForActiveRule } from './helpers/wait_for_active_rule';
import { waitForAlertsForRule } from './helpers/wait_for_alerts_for_rule';
import { cleanupRuleAndAlertState } from './helpers/cleanup_rule_and_alert_state';

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
