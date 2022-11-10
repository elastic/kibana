/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@kbn/apm-synthtrace';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const supertest = getService('supertest');
  const synthtraceEsClient = getService('synthtraceEsClient');
  const start = Date.now() - 24 * 60 * 60 * 1000;
  const end = Date.now();
  const serviceName = 'opbeans-go';

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
      .set('kbn-xsrf', 'foo')
      .send(bulkDeleteBody);
  }

  registry.when.skip('Service group counts', { config: 'basic', archives: [] }, () => {
    before(async () => {
      await saveServiceGroup({
        groupName: 'opbeans',
        kuery: 'service.name: opbeans*',
      });
      const serviceGo = apm
        .service({ name: serviceName, environment: 'production', agentName: 'go' })
        .instance('instance');
      const serviceJava = apm
        .service({ name: 'opbeans-java', environment: 'production', agentName: 'java' })
        .instance('instance');

      await synthtraceEsClient.index([
        timerange(start, end)
          .interval('5m')
          .rate(1)
          .generator((timestamp) =>
            serviceJava
              .transaction({ transactionName: 'GET /api/product/list' })
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
              .transaction({ transactionName: 'GET /api/product/list' })
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

    // TODO look at anomaly alert API tests for how to create a rule an wait for alert to trigger before assertion
    it('returns the correct number of alerts', async () => {
      const response = await callApi();
      expect(response.status).to.be(200);
      expect(Object.keys(response.body).length).to.be(1);
      const [serviceGroupId] = Object.keys(response.body);
      expect(response.body[serviceGroupId]).to.have.property('alerts', 1);
    });
  });
}
