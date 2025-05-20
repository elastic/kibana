/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { Ecs, EcsHost } from '@elastic/ecs';
import type {
  IndexRequest,
  SearchHit,
  SearchTotalHits,
} from '@elastic/elasticsearch/lib/api/types';
import { FtrProviderContext } from '@kbn/ftr-common-functional-services';
import type { GetEntityStoreStatusResponse } from '@kbn/security-solution-plugin/common/api/entity_analytics/entity_store/status.gen';
import { dataViewRouteHelpersFactory } from '../../utils/data_view';
import { EntityStoreUtils } from '../../utils';

const DATASTREAM_NAME: string = 'logs-elastic_agent.cloudbeat-test';
const HOST_TRANSFORM_ID: string = 'entities-v1-latest-security_host_default';
const INDEX_NAME: string = '.entities.v1.latest.security_host_default';
const TIMEOUT_MS: number = 300000; // 5 minutes

export default function (providerContext: FtrProviderContext) {
  const supertest = providerContext.getService('supertest');
  const retry = providerContext.getService('retry');
  const es = providerContext.getService('es');
  const dataView = dataViewRouteHelpersFactory(supertest);
  const utils = EntityStoreUtils(providerContext.getService);

  describe('@ess Host transform logic', () => {
    describe('Entity Store is not installed by default', () => {
      it("Should return 200 and status 'not_installed'", async () => {
        const { body } = await supertest.get('/api/entity_store/status').expect(200);

        const response: GetEntityStoreStatusResponse = body as GetEntityStoreStatusResponse;
        expect(response.status).to.eql('not_installed');
      });
    });

    describe('Install Entity Store and test Host transform', () => {
      before(async () => {
        await utils.cleanEngines();
        // Initialize security solution by creating a prerequisite index pattern.
        // Helps avoid "Error initializing entity store: Data view not found 'security-solution-default'"
        await dataView.create('security-solution');
        // Create a test index matching transform's pattern to store test documents
        await es.indices.createDataStream({ name: DATASTREAM_NAME });
      });

      after(async () => {
        await es.indices.deleteDataStream({ name: DATASTREAM_NAME });
        await dataView.delete('security-solution');
      });

      beforeEach(async () => {
        // Now we can enable the Entity Store...
        const response = await supertest
          .post('/api/entity_store/enable')
          .set('kbn-xsrf', 'xxxx')
          .send({});
        expect(response.statusCode).to.eql(200);
        expect(response.body.succeeded).to.eql(true);

        // and wait for it to start up
        await retry.waitForWithTimeout('Entity Store to initialize', TIMEOUT_MS, async () => {
          const { body } = await supertest
            .get('/api/entity_store/status')
            .query({ include_components: true })
            .expect(200);
          expect(body.status).to.eql('running');
          return true;
        });
      });

      afterEach(async () => {
        await utils.cleanEngines();
      });

      it("Should return 200 and status 'running' for all engines", async () => {
        const { body } = await supertest
          .get('/api/entity_store/status')
          .query({ include_components: true })
          .expect(200);

        const response: GetEntityStoreStatusResponse = body as GetEntityStoreStatusResponse;
        expect(response.status).to.eql('running');
        for (const engine of response.engines) {
          expect(engine.status).to.eql('started');
          if (!engine.components) {
            continue;
          }
          for (const component of engine.components) {
            expect(component.installed).to.be(true);
          }
        }
      });

      it('Should successfully trigger a host transform', async () => {
        const HOST_NAME: string = 'host-transform-test-ip';
        const testDocs: HostTransformTestDocuments = {
          name: HOST_NAME,
          ip: ['1.1.1.1', '2.2.2.2'],
          domain: undefined,
          hostname: undefined,
          id: undefined,
          osName: undefined,
          osType: undefined,
          mac: undefined,
          arch: undefined,
        };

        await createDocumentsAndTriggerTransform(providerContext, testDocs, 2);

        await retry.waitForWithTimeout(
          'Document to be processed and transformed',
          TIMEOUT_MS,
          async () => {
            const result = await es.search({
              index: INDEX_NAME,
              query: {
                term: {
                  'host.name': HOST_NAME,
                },
              },
            });
            const total = result.hits.total as SearchTotalHits;
            expect(total.value).to.eql(1);
            const hit = result.hits.hits[0] as SearchHit<Ecs>;
            expect(hit._source).ok();
            expect(hit._source?.host?.name).to.eql(testDocs.name);
            expect(hit._source?.host?.ip).to.eql(testDocs.ip);

            return true;
          }
        );
      });

      it('Should successfully collect all expected fields', async () => {
        const HOST_NAME: string = 'host-transform-test-all-fields';
        const testDocs: HostTransformTestDocuments = {
          name: HOST_NAME,
          domain: ['example.com', 'sub.example.com'],
          hostname: ['example.com', 'example.com'],
          id: ['alpha', 'beta'],
          osName: ['ubuntu', 'macos'],
          osType: ['linux', 'darwin'],
          mac: ['abc', 'def'],
          arch: ['x86-64', 'arm64'],
          ip: ['1.1.1.1', '2.2.2.2'],
        };

        await createDocumentsAndTriggerTransform(providerContext, testDocs, 2);

        await retry.waitForWithTimeout(
          'Document to be processed and transformed',
          TIMEOUT_MS,
          async () => {
            const result = await es.search({
              index: INDEX_NAME,
              query: {
                term: {
                  'host.name': HOST_NAME,
                },
              },
            });
            const total = result.hits.total as SearchTotalHits;
            expect(total.value).to.eql(1);
            expect(result.hits.hits[0]._source).ok();
            const source = result.hits.hits[0]._source as HostTransformResult;
            expect(source.host).ok();
            const hit = source.host as HostTransformResultHost;

            expect(hit.name).to.eql(HOST_NAME);
            expectFieldToEqualValues(hit.domain, testDocs.domain);
            expectFieldToEqualValues(hit.hostname, ['example.com']);
            expectFieldToEqualValues(hit.id, testDocs.id);
            expectFieldToEqualValues(hit.os?.name, testDocs.osName);
            expectFieldToEqualValues(hit.os?.type, testDocs.osType);
            expectFieldToEqualValues(hit.ip, testDocs.ip);
            expectFieldToEqualValues(hit.mac, testDocs.mac);
            expectFieldToEqualValues(hit.architecture, testDocs.arch);

            return true;
          }
        );
      });
    });
  });
}

function expectFieldToEqualValues(field: string[] | undefined, values: string[]) {
  expect(field).to.ok();
  expect((field as string[]).length).to.eql(values.length);
  const sortedField: string[] = (field as string[]).sort((a, b) => (a > b ? 1 : -1));
  const sortedValues: string[] = values.sort((a, b) => (a > b ? 1 : -1));
  for (let i = 0; i < sortedField.length; i++) {
    expect(sortedField[i]).to.eql(sortedValues[i]);
  }
}

function buildHostTransformDocument(name: string, host: EcsHost): IndexRequest {
  host.name = name;
  // Get timestamp without the millisecond part
  const isoTimestamp: string = new Date().toISOString().split('.')[0];
  const document: IndexRequest = {
    index: DATASTREAM_NAME,
    document: {
      '@timestamp': isoTimestamp,
      host,
    },
  };
  return document;
}

async function createDocumentsAndTriggerTransform(
  providerContext: FtrProviderContext,
  docs: HostTransformTestDocuments,
  docCount: number
): Promise<void> {
  const retry = providerContext.getService('retry');
  const es = providerContext.getService('es');

  const { count, transforms } = await es.transform.getTransformStats({
    transform_id: HOST_TRANSFORM_ID,
  });
  expect(count).to.eql(1);
  let transform = transforms[0];
  expect(transform.id).to.eql(HOST_TRANSFORM_ID);
  const triggerCount: number = transform.stats.trigger_count;
  const docsProcessed: number = transform.stats.documents_processed;

  for (let i = 0; i < docCount; i++) {
    const host: EcsHost = {};
    if (docs.domain?.[i] !== undefined) {
      host.domain = docs.domain[i];
    }
    if (docs.hostname?.[i] !== undefined) {
      host.hostname = docs.hostname[i];
    }
    if (docs.id?.[i] !== undefined) {
      host.id = docs.id[i];
    }
    host.os = {};
    if (docs.osName?.[i] !== undefined) {
      host.os.name = docs.osName[i];
    }
    if (docs.osType?.[i] !== undefined) {
      host.os.type = docs.osType[i];
    }
    if (docs.mac?.[i] !== undefined) {
      host.mac = docs.mac[i];
    }
    if (docs.arch?.[i] !== undefined) {
      host.architecture = docs.arch[i];
    }
    if (docs.ip?.[i] !== undefined) {
      host.ip = docs.ip[i];
    }

    const { result } = await es.index(buildHostTransformDocument(docs.name, host));
    expect(result).to.eql('created');
  }

  // Trigger the transform manually
  const { acknowledged } = await es.transform.scheduleNowTransform({
    transform_id: HOST_TRANSFORM_ID,
  });
  expect(acknowledged).to.be(true);

  await retry.waitForWithTimeout('Transform to run again', TIMEOUT_MS, async () => {
    const response = await es.transform.getTransformStats({
      transform_id: HOST_TRANSFORM_ID,
    });
    transform = response.transforms[0];
    expect(transform.stats.trigger_count).to.greaterThan(triggerCount);
    expect(transform.stats.documents_processed).to.greaterThan(docsProcessed);
    return true;
  });
}

interface HostTransformTestDocuments {
  name: string; // required

  domain: string[] | undefined;
  hostname: string[] | undefined;
  id: string[] | undefined;
  osName: string[] | undefined;
  osType: string[] | undefined;
  mac: string[] | undefined;
  arch: string[] | undefined;
  ip: string[] | undefined;
}

interface HostTransformResult {
  host: HostTransformResultHost;
}

interface HostTransformResultHost {
  name: string;
  domain: string[] | undefined;
  hostname: string[] | undefined;
  id: string[] | undefined;
  ip: string[] | undefined;
  mac: string[] | undefined;
  architecture: string[] | undefined;
  os: {
    name: string[] | undefined;
    type: string[] | undefined;
  }
}
