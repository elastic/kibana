/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { AggregationType } from '@kbn/apm-plugin/common/rules/apm_rule_types';
import { ApmRuleType } from '@kbn/rule-data-utils';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { createApmRule, runRuleSoon, ApmAlertFields } from '../alerts/helpers/alerting_api_helper';
import { waitForActiveRule } from '../alerts/helpers/wait_for_active_rule';
import { waitForAlertsForRule } from '../alerts/helpers/wait_for_alerts_for_rule';
import { cleanupRuleAndAlertState } from '../alerts/helpers/cleanup_rule_and_alert_state';

export default function ServiceAlerts({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const supertest = getService('supertest');
  const apmSynthtraceEsClient = getService('apmSynthtraceEsClient');
  const es = getService('es');
  const dayInMs = 24 * 60 * 60 * 1000;
  const start = Date.now() - dayInMs;
  const end = Date.now() + dayInMs;
  const goService = 'synth-go';
  const logger = getService('log');

  async function getServiceAlerts({
    serviceName,
    environment,
  }: {
    serviceName: string;
    environment: string;
  }) {
    return apmApiClient.readUser({
      endpoint: 'GET /internal/apm/services/{serviceName}/alerts_count',
      params: {
        path: { serviceName },
        query: {
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          environment,
        },
      },
    });
  }

  function createRule() {
    return createApmRule({
      supertest,
      name: `Latency threshold | ${goService}`,
      params: {
        serviceName: goService,
        transactionType: undefined,
        windowSize: 5,
        windowUnit: 'h',
        threshold: 100,
        aggregationType: AggregationType.Avg,
        environment: 'testing',
        groupBy: ['service.name', 'service.environment', 'transaction.type', 'transaction.name'],
      },
      ruleTypeId: ApmRuleType.TransactionDuration,
    });
  }

  // FLAKY: https://github.com/elastic/kibana/issues/177512
  registry.when('Service alerts', { config: 'basic', archives: [] }, () => {
    before(async () => {
      const synthServices = [
        apm
          .service({ name: goService, environment: 'testing', agentName: 'go' })
          .instance('instance-1'),
      ];

      await apmSynthtraceEsClient.index(
        synthServices.map((service) =>
          timerange(start, end)
            .interval('5m')
            .rate(1)
            .generator((timestamp) =>
              service
                .transaction({
                  transactionName: 'GET /api/product/list',
                  transactionType: 'request',
                })
                .duration(2000)
                .timestamp(timestamp)
                .children(
                  service
                    .span({
                      spanName: '/_search',
                      spanType: 'db',
                      spanSubtype: 'elasticsearch',
                    })
                    .destination('elasticsearch')
                    .duration(100)
                    .success()
                    .timestamp(timestamp),
                  service
                    .span({
                      spanName: '/_search',
                      spanType: 'db',
                      spanSubtype: 'elasticsearch',
                    })
                    .destination('elasticsearch')
                    .duration(300)
                    .success()
                    .timestamp(timestamp)
                )
            )
        )
      );
    });

    after(async () => {
      await apmSynthtraceEsClient.clean();
    });

    describe('with alerts', () => {
      let ruleId: string;
      let alerts: ApmAlertFields[];

      before(async () => {
        const createdRule = await createRule();
        ruleId = createdRule.id;
        alerts = await waitForAlertsForRule({ es, ruleId });
      });

      after(async () => {
        await cleanupRuleAndAlertState({ es, supertest, logger });
      });

      it('checks if rule is active', async () => {
        const ruleStatus = await waitForActiveRule({ ruleId, supertest });
        expect(ruleStatus).to.be('active');
      });

      it('should successfully run the rule', async () => {
        const response = await runRuleSoon({ ruleId, supertest });
        expect(response.status).to.be(204);
      });

      it('produces 1 alert', async () => {
        expect(alerts.length).to.be(1);
      });

      it('returns the correct number of alerts', async () => {
        const response = await getServiceAlerts({ serviceName: goService, environment: 'testing' });
        expect(response.status).to.be(200);
        expect(response.body.serviceName).to.be(goService);
        expect(response.body.alertsCount).to.be(1);
      });
    });

    describe('without alerts', () => {
      it('returns the correct number of alerts', async () => {
        const response = await getServiceAlerts({ serviceName: goService, environment: 'foo' });
        expect(response.status).to.be(200);
        expect(response.body.serviceName).to.be(goService);
        expect(response.body.alertsCount).to.be(0);
      });
    });
  });
}
