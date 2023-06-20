/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { AggregationType, ApmRuleType } from '@kbn/apm-plugin/common/rules/apm_rule_types';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { createApmRule } from '../alerts/alerting_api_helper';
import {
  waitForRuleStatus,
  runRuleSoon,
  waitForAlertInIndex,
} from '../alerts/wait_for_rule_status';

export default function ServiceAlerts({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const supertest = getService('supertest');
  const synthtraceEsClient = getService('synthtraceEsClient');
  const esClient = getService('es');
  const dayInMs = 24 * 60 * 60 * 1000;
  const start = Date.now() - dayInMs;
  const end = Date.now() + dayInMs;
  const goService = 'synth-go';

  const APM_ALERTS_INDEX = '.alerts-observability.apm.alerts-default';

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

  registry.when('Service alerts', { config: 'basic', archives: [] }, () => {
    before(async () => {
      const synthServices = [
        apm
          .service({ name: goService, environment: 'testing', agentName: 'go' })
          .instance('instance-1'),
      ];

      await synthtraceEsClient.index(
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
      await synthtraceEsClient.clean();
    });

    describe('with alerts', () => {
      let ruleId: string;
      before(async () => {
        const createdRule = await createRule();
        ruleId = createdRule.id;
        expect(createdRule.id).to.not.eql(undefined);
      });

      after(async () => {
        await supertest.delete(`/api/alerting/rule/${ruleId}`).set('kbn-xsrf', 'true');
        await esClient.deleteByQuery({ index: '.alerts*', query: { match_all: {} } });
      });

      it('checks if rule is active', async () => {
        const executionStatus = await waitForRuleStatus({
          id: ruleId,
          expectedStatus: 'active',
          supertest,
        });
        expect(executionStatus.status).to.be('active');
      });

      it('should successfully run the rule', async () => {
        const response = await runRuleSoon({
          ruleId,
          supertest,
        });
        expect(response.status).to.be(204);
      });

      it('indexes alert document', async () => {
        const resp = await waitForAlertInIndex({
          es: esClient,
          indexName: APM_ALERTS_INDEX,
          ruleId,
        });

        expect(resp.hits.hits.length).to.be(1);
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
