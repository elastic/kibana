/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import type { Ecs, EcsHost } from '@elastic/ecs';
import type {
  MappingTypeMapping,
  SearchHit,
  SearchTotalHits,
} from '@elastic/elasticsearch/lib/api/types';
import type { GetEntityStoreStatusResponse } from '@kbn/security-solution-plugin/common/api/entity_analytics/entity_store/status.gen';
import type { FtrProviderContext } from '../../../../ftr_provider_context';
import { dataViewRouteHelpersFactory } from '../../utils/data_view';
import { moveIndexToSlowDataTier } from '../../utils/move_index_to_slow_data_tier';
import { cleanUpEntityStore } from './infra/teardown';
import { enableEntityStore } from './infra/setup';
import { COMMON_DATASTREAM_NAME, HOST_INDEX_NAME, TIMEOUT_MS } from './infra/constants';
import type { HostTransformResult, HostTransformResultHost } from './infra/host_transform';
import {
  buildHostTransformDocument,
  createDocumentsAndTriggerTransform,
} from './infra/host_transform';

const FROZEN_INDEX_NAME: string = 'test-frozen-index';
const COLD_INDEX_NAME: string = 'test-cold-index';

const SMALL_HOST_MAPPING: MappingTypeMapping = {
  properties: {
    '@timestamp': {
      type: 'date',
    },
    host: {
      type: 'object',
      properties: {
        name: {
          type: 'keyword',
        },
      },
    },
  },
};

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
        await es.indices.createDataStream({ name: COMMON_DATASTREAM_NAME });
        // Create a test index that will be moved to frozen matching transform's pattern to store test documents
        await es.indices.create({ index: FROZEN_INDEX_NAME, mappings: SMALL_HOST_MAPPING });
        // Create a test index that will be moved to cold matching transform's pattern to store test documents
        await es.indices.create({ index: COLD_INDEX_NAME, mappings: SMALL_HOST_MAPPING });
      });

      after(async () => {
        const log = providerContext.getService('log');
        await es.indices.deleteDataStream({ name: COMMON_DATASTREAM_NAME });

        try {
          await es.indices.deleteAlias({
            name: FROZEN_INDEX_NAME,
            index: `*${FROZEN_INDEX_NAME}*`,
          });
        } catch (e: any) {
          // we should not fail a test on the tear down
          log.error(`Failed to tear down ${FROZEN_INDEX_NAME}} (${e.toString()})`);
        }

        try {
          await es.indices.deleteAlias({ name: COLD_INDEX_NAME, index: `*${COLD_INDEX_NAME}*` });
        } catch (e: any) {
          // we should not fail a test on the tear down
          log.error(`Failed to tear down ${FROZEN_INDEX_NAME}} (${e.toString()})`);
        }

        await dataView.delete('security-solution');
      });

      beforeEach(async () => {
        // Now we can enable the Entity Store...
        // Only enable 'host' engine - this test only validates host transform logic.
        // Enabling all engines concurrently causes task conflicts (server-side issue).
        await enableEntityStore(providerContext, {
          extraIndexPatterns: [FROZEN_INDEX_NAME, COLD_INDEX_NAME],
          entityTypes: ['host'],
        });
      });

      afterEach(async () => {
        await cleanUpEntityStore(providerContext);
      });

      it("Should return 200 and status 'running' for host engine", async () => {
        // Wait for Entity Store and all components to be fully installed
        await retry.waitForWithTimeout(
          'Entity Store host engine to be fully running with all components installed',
          TIMEOUT_MS,
          async () => {
            const { body } = await supertest
              .get('/api/entity_store/status')
              .query({ include_components: true })
              .expect(200);

            const response: GetEntityStoreStatusResponse = body as GetEntityStoreStatusResponse;

            if (response.status !== 'running') {
              return false;
            }

            if (response.engines.length !== 1) {
              return false;
            }

            const hostEngine = response.engines[0];
            if (hostEngine.type !== 'host' || hostEngine.status !== 'started') {
              return false;
            }

            // Check all components are installed
            if (hostEngine.components) {
              const allInstalled = hostEngine.components.every((c) => c.installed === true);
              if (!allInstalled) {
                return false;
              }
            }

            return true;
          }
        );

        // Final verification
        const { body } = await supertest
          .get('/api/entity_store/status')
          .query({ include_components: true })
          .expect(200);

        const response: GetEntityStoreStatusResponse = body as GetEntityStoreStatusResponse;
        expect(response.status).to.eql('running');
        expect(response.engines.length).to.eql(1);
        const hostEngine = response.engines[0];
        expect(hostEngine.type).to.eql('host');
        expect(hostEngine.status).to.eql('started');
        if (hostEngine.components) {
          for (const component of hostEngine.components) {
            expect(component.installed).to.be(true);
          }
        }
      });

      it('Should successfully trigger a host transform', async () => {
        const hostName: string = 'host-transform-test-ip';
        const testDocs = [
          // should be ignored because the @timestamp is too old
          { timestamp: '1996-03-21T09:15:00.000Z', name: '', ip: '3.3.3.22' },
          // Should be ignored because the key is empty
          { name: '', ip: '3.3.3.3' },
          { name: hostName, ip: '1.1.1.1' },
          { name: hostName, ip: '2.2.2.2' },
        ];

        await createDocumentsAndTriggerTransform(providerContext, testDocs, COMMON_DATASTREAM_NAME);

        await retry.waitForWithTimeout(
          'Document to be processed and transformed',
          TIMEOUT_MS,
          async () => {
            const result = await es.search({
              index: HOST_INDEX_NAME,
              query: {
                term: {
                  'host.name': hostName,
                },
              },
            });
            const total = result.hits.total as SearchTotalHits;
            expect(total.value).to.eql(1);
            const hit = result.hits.hits[0] as SearchHit<Ecs>;
            expect(hit._source).ok();
            expect(hit._source?.host?.name).to.eql(hostName);
            expect(hit._source?.host?.ip).to.eql(['1.1.1.1', '2.2.2.2']);

            return true;
          }
        );
      });

      it('Should successfully collect all expected fields', async () => {
        const hostName: string = 'host-transform-test-all-fields';
        const testDocs: EcsHost[] = [
          {
            name: hostName,
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
            name: hostName,
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

        await createDocumentsAndTriggerTransform(providerContext, testDocs, COMMON_DATASTREAM_NAME);

        await retry.waitForWithTimeout(
          'Document to be processed and transformed',
          TIMEOUT_MS,
          async () => {
            const result = await es.search({
              index: HOST_INDEX_NAME,
              query: {
                term: {
                  'host.name': hostName,
                },
              },
            });
            const total = result.hits.total as SearchTotalHits;
            expect(total.value).to.eql(1);
            expect(result.hits.hits[0]._source).ok();
            const source = result.hits.hits[0]._source as HostTransformResult;
            expect(source.host).ok();
            const hit = source.host as HostTransformResultHost;

            expect(hit.name).to.eql(hostName);
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

      it('Should not collect fields present in frozen or cold tier', async () => {
        // We are prefixing data to avoid conflict with old data not yet cleaned up
        const TEST_DATA_PREFIX = 'test-cold-frozen-';
        const log = providerContext.getService('log');

        // Two docs per tier
        const docsPerIndex: Record<string, EcsHost[]> = {
          [FROZEN_INDEX_NAME]: [
            { name: `${TEST_DATA_PREFIX}frozen-host-0` },
            { name: `${TEST_DATA_PREFIX}frozen-host-1` },
          ],
          [COLD_INDEX_NAME]: [
            { name: `${TEST_DATA_PREFIX}cold-host-0` },
            { name: `${TEST_DATA_PREFIX}cold-host-1` },
          ],
          [COMMON_DATASTREAM_NAME]: [
            { name: `${TEST_DATA_PREFIX}hot-host-0` },
            { name: `${TEST_DATA_PREFIX}hot-host-1` },
          ],
        };

        // Ingest docs
        const esPromise: Array<Promise<void>> = [];
        for (const index in docsPerIndex) {
          if (!Object.prototype.hasOwnProperty.call(docsPerIndex, index)) {
            continue;
          }

          for (let i = 0; i < docsPerIndex[index].length; i++) {
            esPromise.push(
              (async () => {
                const { result } = await es.index(
                  buildHostTransformDocument(docsPerIndex[index][i], index)
                );
                expect(result).to.eql('created');
              })()
            );
          }
        }

        await Promise.all(esPromise); // await docs flush

        // Configure frozen
        await Promise.all([
          moveIndexToSlowDataTier({
            es,
            retry,
            log,
            index: FROZEN_INDEX_NAME,
            tier: 'frozen',
          }),
          moveIndexToSlowDataTier({ es, retry, log, index: COLD_INDEX_NAME, tier: 'cold' }),
        ]);

        // Start transform
        await createDocumentsAndTriggerTransform(providerContext, [], COMMON_DATASTREAM_NAME);

        await retry.waitForWithTimeout('Fetch only hot node documents', TIMEOUT_MS, async () => {
          const result = await es.search({
            index: HOST_INDEX_NAME,
            query: {
              wildcard: {
                'host.name': {
                  value: `${TEST_DATA_PREFIX}*`,
                },
              },
            },
          });

          log.debug(`Found documents ${JSON.stringify(result)}`);

          const total = result.hits.total as SearchTotalHits;
          expect(total.value).to.eql(2);
          expect(result.hits.hits[0]._source).ok();
          expect(result.hits.hits[1]._source).ok();

          for (let i = 0; i < total.value; i++) {
            const source = result.hits.hits[i]._source as HostTransformResult;
            expect(source.host).ok();
            const hit = source.host as HostTransformResultHost;
            expect(hit.name).to.contain(`hot-host`);
          }

          return true;
        });
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
