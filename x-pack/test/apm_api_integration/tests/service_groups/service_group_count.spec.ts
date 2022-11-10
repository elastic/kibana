/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@kbn/apm-synthtrace';
import expect from '@kbn/expect';
import { ApmRuleType } from '@kbn/apm-plugin/common/rules/apm_rule_types';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { waitForActiveAlert } from './wait_for_active_alert';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const supertest = getService('supertest');
  const synthtraceEsClient = getService('synthtraceEsClient');
  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const esClient = getService('es');
  const log = getService('log');
  const start = Date.now() - 24 * 60 * 60 * 1000;
  const end = Date.now();

  async function callApi() {
    return apmApiClient.readUser({
      endpoint: 'GET /internal/apm/service-group/counts',
    });
  }

  async function saveServiceGroup({
    serviceGroupId,
    groupName,
    kuery,
    description,
    color,
  }: {
    serviceGroupId?: string;
    groupName: string;
    kuery: string;
    description?: string;
    color?: string;
  }) {
    return apmApiClient.writeUser({
      endpoint: 'POST /internal/apm/service-group',
      params: {
        query: {
          serviceGroupId,
        },
        body: {
          groupName,
          kuery,
          description,
          color,
        },
      },
    });
  }

  type SavedObjectsFindResults = Array<{
    id: string;
    type: string;
  }>;

  async function deleteServiceGroups() {
    const response = await supertest
      .get('/api/saved_objects/_find?type=apm-service-group')
      .set('kbn-xsrf', 'true');
    const savedObjects: SavedObjectsFindResults = response.body.saved_objects;
    const bulkDeleteBody = savedObjects.map(({ id, type }) => ({ id, type }));
    return supertest
      .post(`/api/saved_objects/_bulk_delete?force=true`)
      .set('kbn-xsrf', 'true')
      .send(bulkDeleteBody);
  }

  registry.when('Service group counts', { config: 'basic', archives: [] }, () => {
    before(async () => {
      await saveServiceGroup({
        groupName: 'synthbeans',
        kuery: 'service.name: synthbeans*',
      });
      const serviceGo = apm
        .service({ name: 'synthbeans-go', environment: 'testing', agentName: 'go' })
        .instance('instance-1');
      const serviceJava = apm
        .service({ name: 'synthbeans-java', environment: 'testing', agentName: 'java' })
        .instance('instance-2');

      await synthtraceEsClient.index([
        timerange(start, end)
          .interval('5m')
          .rate(1)
          .generator((timestamp) =>
            serviceJava
              .transaction({ transactionName: 'GET /api/product/list', transactionType: 'request' })
              .duration(2000)
              .timestamp(timestamp)
              .children(
                serviceGo
                  .span({ spanName: '/_search', spanType: 'db', spanSubtype: 'elasticsearch' })
                  .destination('elasticsearch')
                  .duration(100)
                  .success()
                  .timestamp(timestamp),
                serviceGo
                  .span({ spanName: '/_search', spanType: 'db', spanSubtype: 'elasticsearch' })
                  .destination('elasticsearch')
                  .duration(300)
                  .success()
                  .timestamp(timestamp)
              )
              .errors(
                serviceGo.error({ message: 'error 1', type: 'foo' }).timestamp(timestamp),
                serviceGo.error({ message: 'error 2', type: 'foo' }).timestamp(timestamp),
                serviceGo.error({ message: 'error 3', type: 'bar' }).timestamp(timestamp)
              )
          ),
      ]);
      await synthtraceEsClient.index([
        timerange(start, end)
          .interval('5m')
          .rate(1)
          .generator((timestamp) =>
            serviceGo
              .transaction({ transactionName: 'GET /api/product/list', transactionType: 'request' })
              .duration(2000)
              .timestamp(timestamp)
              .children(
                serviceGo
                  .span({ spanName: '/_search', spanType: 'db', spanSubtype: 'elasticsearch' })
                  .destination('elasticsearch')
                  .duration(100)
                  .success()
                  .timestamp(timestamp),
                serviceGo
                  .span({ spanName: '/_search', spanType: 'db', spanSubtype: 'elasticsearch' })
                  .destination('elasticsearch')
                  .duration(300)
                  .success()
                  .timestamp(timestamp)
              )
              .errors(
                serviceGo.error({ message: 'error 1', type: 'foo' }).timestamp(timestamp),
                serviceGo.error({ message: 'error 2', type: 'foo' }).timestamp(timestamp),
                serviceGo.error({ message: 'error 3', type: 'bar' }).timestamp(timestamp)
              )
          ),
      ]);
    });

    after(async () => {
      await deleteServiceGroups();
      await synthtraceEsClient.clean();
    });

    it('returns the correct number of services', async () => {
      const response = await callApi();
      expect(response.status).to.be(200);
      expect(Object.keys(response.body).length).to.be(1);
      const [serviceGroupId] = Object.keys(response.body);
      expect(response.body[serviceGroupId]).to.have.property('services', 2);
    });

    describe('with alerts', () => {
      let ruleId: string;
      before(async () => {
        const { body: createdRule } = await supertest
          .post(`/api/alerting/rule`)
          .set('kbn-xsrf', 'true')
          .send({
            params: {
              serviceName: 'synthbeans-go',
              transactionType: '',
              windowSize: 99,
              windowUnit: 'y',
              threshold: 100,
              aggregationType: 'avg',
              environment: 'ENVIRONMENT_ALL',
            },
            consumer: 'apm',
            schedule: { interval: '1m' },
            tags: ['apm'],
            name: 'Latency threshold | synthbeans-go',
            rule_type_id: ApmRuleType.TransactionDuration,
            notify_when: 'onActiveAlert',
            actions: [],
          });

        ruleId = createdRule.id;

        await waitForActiveAlert({ ruleId, esClient, log });
      });
      after(async () => {
        await supertest.delete(`/api/alerting/rule/${ruleId}`).set('kbn-xsrf', 'true');
        await esDeleteAllIndices('.alerts*');
      });

      it('returns the correct number of alerts', async () => {
        const response = await callApi();
        console.log(JSON.stringify(response.body));
        expect(response.status).to.be(200);
        expect(Object.keys(response.body).length).to.be(1);
        const [serviceGroupId] = Object.keys(response.body);
        expect(response.body[serviceGroupId]).to.have.property('alerts', 1);
      });
    });
  });
}
