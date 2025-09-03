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
const TIMEOUT_MS: number = 600000; // 10 minutes

export default function (providerContext: FtrProviderContext) {
  const supertest = providerContext.getService('supertest');
  const retry = providerContext.getService('retry');
  const es = providerContext.getService('es');
  const dataView = dataViewRouteHelpersFactory(supertest);

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
        await cleanUpEntityStore(providerContext);
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
        await enableEntityStore(providerContext);
      });

      afterEach(async () => {
        await cleanUpEntityStore(providerContext);
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
        const testDocs: EcsHost[] = [{ ip: '1.1.1.1' }, { ip: '2.2.2.2' }];

        await createDocumentsAndTriggerTransform(providerContext, HOST_NAME, testDocs);

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
            expect(hit._source?.host?.name).to.eql(HOST_NAME);
            expect(hit._source?.host?.ip).to.eql(['1.1.1.1', '2.2.2.2']);

            return true;
          }
        );
      });

      it('Should successfully collect all expected fields', async () => {
        const HOST_NAME: string = 'host-transform-test-all-fields';
        const testDocs: EcsHost[] = [
          {
            domain: 'example.com',
            hostname: 'example.com',
            id: 'alpha',
            os: {
              name: 'ubuntu',
              type: 'linux',
            },
            mac: 'abc',
            architecture: 'x86-64',
            type: 'machineA',
            ip: '1.1.1.1',
          },
          {
            domain: 'example.com',
            hostname: 'sub.example.com',
            id: 'beta',
            os: {
              name: 'macos',
              type: 'darwin',
            },
            mac: 'def',
            architecture: 'arm64',
            type: 'machineB',
            ip: '2.2.2.2',
          },
        ];

        await createDocumentsAndTriggerTransform(providerContext, HOST_NAME, testDocs);

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
            expectFieldToEqualValues(hit.domain, ['example.com']);
            expectFieldToEqualValues(hit.hostname, ['example.com', 'sub.example.com']);
            expectFieldToEqualValues(hit.id, ['alpha', 'beta']);
            expectFieldToEqualValues(hit.os?.name, ['ubuntu', 'macos']);
            expectFieldToEqualValues(hit.os?.type, ['linux', 'darwin']);
            expectFieldToEqualValues(hit.ip, ['1.1.1.1', '2.2.2.2']);
            expectFieldToEqualValues(hit.mac, ['abc', 'def']);
            expectFieldToEqualValues(hit.type, ['machineA', 'machineB']);
            expectFieldToEqualValues(hit.architecture, ['x86-64', 'arm64']);

            return true;
          }
        );
      });
    });
  });
}

function expectFieldToEqualValues(field: string[] | undefined, values: string[] | undefined) {
  if (values === undefined) {
    expect(field).to.not.be(undefined);
  }
  expect(field).to.ok();
  const definedValues = values as string[];
  expect((field as string[]).length).to.eql(definedValues.length);
  const sortedField: string[] = (field as string[]).sort((a, b) => (a > b ? 1 : -1));
  const sortedValues: string[] = definedValues.sort((a, b) => (a > b ? 1 : -1));
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
  documentName: string,
  docs: EcsHost[]
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

  for (let i = 0; i < docs.length; i++) {
    const { result } = await es.index(buildHostTransformDocument(documentName, docs[i]));
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

async function enableEntityStore(providerContext: FtrProviderContext): Promise<void> {
  const log = providerContext.getService('log');
  const supertest = providerContext.getService('supertest');
  const retry = providerContext.getService('retry');

  const RETRIES = 5;
  let success: boolean = false;
  for (let attempt = 0; attempt < RETRIES; attempt++) {
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
      if (body.status === 'error') {
        log.error(`Expected body.status to be 'running', got 'error': ${JSON.stringify(body)}`);
        success = false;
        return true;
      }
      expect(body.status).to.eql('running');
      success = true;
      return true;
    });

    if (success) {
      break;
    } else {
      log.info(`Retrying Entity Store setup...`);
      await cleanUpEntityStore(providerContext);
    }
  }
  expect(success).ok();
}

async function cleanUpEntityStore(providerContext: FtrProviderContext): Promise<void> {
  const log = providerContext.getService('log');
  const es = providerContext.getService('es');
  const utils = EntityStoreUtils(providerContext.getService);
  const attempts = 5;
  const delayMs = 60000;

  await utils.cleanEngines();
  for (const kind of ['host', 'user', 'service', 'generic']) {
    const name: string = `entity_store_field_retention_${kind}_default_v1.0.0`;
    for (let currentAttempt = 0; currentAttempt < attempts; currentAttempt++) {
      try {
        await es.enrich.deletePolicy({ name }, { ignore: [404] });
        break;
      } catch (e) {
        log.error(`Error deleting policy ${name}: ${e.message} after ${currentAttempt} tries`);
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

interface HostTransformResult {
  host: HostTransformResultHost;
}

interface HostTransformResultHost {
  name: string;
  domain: string[] | undefined;
  hostname: string[] | undefined;
  id: string[] | undefined;
  os: {
    name: string[] | undefined;
    type: string[] | undefined;
  };
  mac: string[] | undefined;
  architecture: string[] | undefined;
  type: string[] | undefined;
  ip: string[] | undefined;
}
