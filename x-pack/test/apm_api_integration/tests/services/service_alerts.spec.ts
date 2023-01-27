/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { ApmRuleType } from '@kbn/apm-plugin/common/rules/apm_rule_types';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { waitForActiveAlert } from '../../common/utils/wait_for_active_alert';

export default function ServiceAlerts({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const supertest = getService('supertest');
  const synthtraceEsClient = getService('synthtraceEsClient');
  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const esClient = getService('es');
  const log = getService('log');
  const start = Date.now() - 24 * 60 * 60 * 1000;
  const end = Date.now();
  const goService = 'synth-go';

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
          end: new Date(end + 5 * 60 * 1000).toISOString(),
          environment,
        },
      },
    });
  }

  async function createRule() {
    return supertest
      .post(`/api/alerting/rule`)
      .set('kbn-xsrf', 'true')
      .send({
        params: {
          serviceName: goService,
          transactionType: '',
          windowSize: 99,
          windowUnit: 'y',
          threshold: 100,
          aggregationType: 'avg',
          environment: 'testing',
        },
        consumer: 'apm',
        schedule: { interval: '1m' },
        tags: ['apm'],
        name: `Latency threshold | ${goService}`,
        rule_type_id: ApmRuleType.TransactionDuration,
        notify_when: 'onActiveAlert',
        actions: [],
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
        const { body: createdRule } = await createRule();
        ruleId = createdRule.id;
        await waitForActiveAlert({ ruleId, esClient, log });
      });

      after(async () => {
        await supertest.delete(`/api/alerting/rule/${ruleId}`).set('kbn-xsrf', 'true');
        await esDeleteAllIndices('.alerts*');
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
