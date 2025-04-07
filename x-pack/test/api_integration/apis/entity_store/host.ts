/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import {
  ELASTIC_HTTP_VERSION_HEADER,
} from '@kbn/core-http-common';
import { FtrProviderContext } from '@kbn/ftr-common-functional-services';
import type { GetEntityStoreStatusResponse } from '../../../../solutions/security/plugins/security_solution/common/api/entity_analytics/entity_store/status.gen'

const DATASTREAM_NAME: string = 'logs-elastic_agent.cloudbeat-test';
const HOST_TRANSFORM_ID: string = 'entities-v1-latest-security_host_default';
const INDEX_NAME: string = '.entities.v1.latest.security_host_default';
const TIMEOUT_MS: number = 300000; // 5 minutes

export default function (providerContext: FtrProviderContext) {
  const supertest = providerContext.getService('supertest');
  const retry = providerContext.getService('retry');
  const es = providerContext.getService('es');

  describe('GET /api/entity_store/status', () => {

    describe('not_installed', () => {
      it("Should return 200 and status 'not_installed'", async () => {
        const { body } = await supertest
          .get('/api/entity_store/status')
          .expect(200);

        const response: GetEntityStoreStatusResponse = body as GetEntityStoreStatusResponse
        expect(response.status).to.eql('not_installed');
      });
    });

    describe('running', () => {
      before(async () => {
        // Initialize security solution by creating a prerequisite index pattern.
        // Helps avoid "Error initializing entity store: Data view not found 'security-solution-default'"
        let response = await supertest
          .post('/api/content_management/rpc/create')
          .set('kbn-xsrf', 'xxxx')
          .send({
            contentTypeId: 'index-pattern',
            data: {
              fieldAttrs: '{}',
              title: '.alerts-security.alerts-default,apm-*-transaction*,auditbeat-*,endgame-*,filebeat-*,logs-*,packetbeat-*,traces-apm*,winlogbeat-*,-*elastic-cloud-logs-*',
              timeFieldName: '@timestamp',
              sourceFilters: '[]',
              fields: '[]',
              fieldFormatMap: '{}',
              allowNoIndex: true,
              runtimeFieldMap: '{}',
              name: '.alerts-security.alerts-default,apm-*-transaction*,auditbeat-*,endgame-*,filebeat-*,logs-*,packetbeat-*,traces-apm*,winlogbeat-*,-*elastic-cloud-logs-*',
              allowHidden: false
            },
            options: {
              id: 'security-solution-default',
              overwrite: true
            },
            version: 1
          });
        expect(response.statusCode).to.eql(200);

        // Create a test index matching transform's pattern to store test documents
        await es.indices.createDataStream({name: DATASTREAM_NAME});

        // Now we can enable the Entity Store...
        response = await supertest
          .post('/api/entity_store/enable')
          .set('kbn-xsrf', 'xxxx')
          .send({});
        expect(response.statusCode).to.eql(200);
        expect(response.body.succeeded).to.eql(true);

        // and wait for it to start up
        await retry.waitForWithTimeout('Entity Store to initialize', TIMEOUT_MS, async () => {
            const { body } = await supertest
              .get('/api/entity_store/status')
              .query({include_components: true})
              .expect(200)
            expect(body.status).to.eql('running');
            return true;
        });
      });

      after(async () => {
        await es.indices.deleteDataStream({name: DATASTREAM_NAME});
      })

      it("Should return 200 and status 'running' for all engines", async () => {
        const { body } = await supertest
          .get('/api/entity_store/status')
          .query({include_components: true})
          .expect(200)

        const response: GetEntityStoreStatusResponse = body as GetEntityStoreStatusResponse
        expect(response.status).to.eql('running');
        for (const engine of response.engines) {
          expect(engine.status).to.eql('started');
          for (const component of engine.components) {
            expect(component.installed).to.be(true);
          }
        }
      });

      it('Should successfully trigger a host transform', async () => {
        const HOST_NAME: string = 'host-transform-test-ip'
        const IPs: string[] = ['1.1.1.1', '2.2.2.2']
        let response = await es.transform.getTransformStats({
          transform_id: HOST_TRANSFORM_ID,
        });
        expect(response.count).to.eql(1);
        let transform = response.transforms[0];
        expect(transform.id).to.eql(HOST_TRANSFORM_ID);
        const triggerCount: number = transform.stats.trigger_count;
        const docsProcessed: number = transform.stats.documents_processed;

        // Create two documents with the same host.name, different IPs
        for (let ip of IPs) {
          const { result } = await es.index(
            buildHostTransformDocument(HOST_NAME, {ip: ip})
          );
          expect(result).to.eql('created');
        }

        // Trigger the transform manually
        const { acknowledged } = await es.transform.scheduleNowTransform({
          transform_id: HOST_TRANSFORM_ID,
        });
        expect(acknowledged).to.be(true);

        await retry.waitForWithTimeout('Transform to run again', TIMEOUT_MS, async () => {
          let response = await es.transform.getTransformStats({
            transform_id: HOST_TRANSFORM_ID,
          });
          let transform = response.transforms[0];
          expect(transform.stats.trigger_count).to.greaterThan(triggerCount);
          expect(transform.stats.documents_processed).to.greaterThan(docsProcessed);
          return true;
        });

        await retry.waitForWithTimeout('Document to be processed and transformed', TIMEOUT_MS, async () => {
          const result = await es.search({
            index: INDEX_NAME,
            query: {
              term: {
                "host.name": HOST_NAME,
              },
            },
          })
          expect(result.hits.total.value).to.eql(1);
          expect(result.hits.hits[0]._source.host.name).to.eql(HOST_NAME);
          expect(result.hits.hits[0]._source.host.ip).to.eql(IPs);

          return true;
        })

      });
    });
  });
}

type hostObject = {
  domain: string
  hostname: string
  id: string
  os: {
    name: string
    type: string
  },
  ip: string
  mac: string
  type: string
  architecture: string
}

function buildHostTransformDocument(name: string, host: hostObject): Object {
  // Get timestamp without the millisecond part
  const isoTimestamp: string = (new Date).toISOString().split('.')[0];
  let document: Object = {
    index: DATASTREAM_NAME,
    document: {
      '@timestamp': isoTimestamp,
      host: host,
    },
  }
  document.document.host.name = name;
  return document
}
