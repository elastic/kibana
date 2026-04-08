/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import type { Ecs, EcsHost } from '@elastic/ecs';
import type {
  IndexRequest,
  SearchHit,
  SearchTotalHits,
} from '@elastic/elasticsearch/lib/api/types';
import type { FtrProviderContext } from '@kbn/ftr-common-functional-services';
import type { GetEntityStoreStatusResponse } from '@kbn/security-solution-plugin/common/api/entity_analytics/entity_store/status.gen';
import { rewindToYesterday } from '@kbn/security-solution-plugin/server/lib/entity_analytics/entity_store/tasks';
import { getEntitiesSnapshotIndexName } from '@kbn/security-solution-plugin/server/lib/entity_analytics/entity_store/utils';
import { dataViewRouteHelpersFactory } from '../../utils/data_view';
import { EntityStoreUtils } from '../../utils';

const DATASTREAM_NAME: string = 'logs-elastic_agent.cloudbeat-test';
const HOST_TRANSFORM_ID: string = 'entities-v1-latest-security_host_default';
const INDEX_NAME: string = '.entities.v1.latest.security_host_default';
const SNAPSHOT_INDEX_NAME: string = getEntitiesSnapshotIndexName(
  'host',
  rewindToYesterday(new Date()),
  'default'
);
const RESET_INDEX_NAME: string = '.entities.v1.reset.security_host_default';
const TIMEOUT_MS: number = 600000; // 10 minutes

export default function (providerContext: FtrProviderContext) {
  const supertest = providerContext.getService('supertest');
  const retry = providerContext.getService('retry');
  const es = providerContext.getService('es');
  const dataView = dataViewRouteHelpersFactory(supertest);

  describe('@ess Entity Store History - Snapshots', () => {
    describe('Entity Store is not installed by default', () => {
      it("Should return 200 and status 'not_installed'", async () => {
        const { body } = await supertest.get('/api/entity_store/status').expect(200);

        const response: GetEntityStoreStatusResponse = body as GetEntityStoreStatusResponse;
        expect(response.status).to.eql('not_installed');
      });
    });

    describe('Successfuly create a snapshot', () => {
      before(async () => {
        await cleanUpEntityStore(providerContext);
        // Initialize security solution by creating a prerequisite index pattern.
        // Helps avoid "Error initializing entity store: Data view not found 'security-solution-default'"
        await dataView.create('security-solution');
        // Create a test index matching transform's pattern to store test documents
        await es.indices.createDataStream({ name: DATASTREAM_NAME });
        await enableEntityStore(providerContext);
      });

      after(async () => {
        await cleanUpEntityStore(providerContext);
        await es.indices.deleteDataStream({ name: DATASTREAM_NAME });
        await dataView.delete('security-solution');
      });

      it('Should perform snapshot task', async () => {
        const hostName: string = 'create-a-daily-snapshot';
        const testDocs = [
          { name: hostName, ip: '1.1.1.1' },
          { name: hostName, ip: '2.2.2.2' },
        ];

        await createDocumentsAndTriggerTransform(providerContext, testDocs, DATASTREAM_NAME);

        let timestampBeforeSnapshot: string = '';
        let entityId: string = '';

        await retry.waitForWithTimeout(
          'Document to be processed and transformed',
          TIMEOUT_MS,
          async () => {
            const result = await es.search({
              index: INDEX_NAME,
              query: {
                term: {
                  'host.name': hostName,
                },
              },
            });
            const total = result.hits.total as SearchTotalHits;
            expect(total.value).to.eql(1);
            const hit = result.hits.hits[0] as SearchHit<Ecs & EcsEntity>;
            expect(hit._source).ok();
            expect(hit._source?.host?.name).to.eql(hostName);
            expect(hit._source?.host?.ip).to.eql(['1.1.1.1', '2.2.2.2']);
            expect(hit._source?.['@timestamp']).ok();
            timestampBeforeSnapshot = hit._source?.['@timestamp'] as string;
            expect(new Date(timestampBeforeSnapshot) < new Date()).ok();
            entityId = hit._source?.entity?.id as string;
            return true;
          }
        );

        // Schedule a snapshot task by updating .task.runAt to @now
        const updateResp = await es.update(
          {
            index: '.kibana_task_manager',
            id: 'task:entity_store:snapshot:host:default:1.0.0',
            script: {
              lang: 'painless',
              source: 'ctx._source.task.runAt = params.runAt',
              params: {
                runAt: new Date().toISOString(),
              },
            },
          },
          {}
        );
        expect(updateResp.result).to.eql('updated');

        let timestampInSnapshot: string = '';
        await retry.waitForWithTimeout(
          'Snapshot index to be created with unchanged documents',
          TIMEOUT_MS,
          async () => {
            const result = await es.search({
              index: SNAPSHOT_INDEX_NAME,
              query: {
                term: {
                  'entity.id': entityId,
                },
              },
            });
            const total = result.hits.total as SearchTotalHits;
            expect(total.value).to.eql(1);
            const hit = result.hits.hits[0] as SearchHit<Ecs>;
            expect(hit._source).ok();
            expect(hit._source?.['@timestamp']).ok();
            timestampInSnapshot = hit._source?.['@timestamp'] as string;
            expect(timestampInSnapshot).to.eql(timestampBeforeSnapshot);
            return true;
          }
        );

        let timestampInResetIndex: string = '';
        await retry.waitForWithTimeout(
          'Reset index to be populated with a copy of the document with a refreshed timestamp',
          TIMEOUT_MS,
          async () => {
            const result = await es.search({
              index: RESET_INDEX_NAME,
              query: {
                term: {
                  'entity.id': entityId,
                },
              },
            });
            const total = result.hits.total as SearchTotalHits;
            expect(total.value).to.eql(1);
            const hit = result.hits.hits[0] as SearchHit<Ecs & EcsEntity>;
            expect(hit._source).ok();
            expect(hit._source?.entity?.last_seen_timestamp).ok();
            timestampInResetIndex = hit._source?.entity?.last_seen_timestamp as string;
            expect(new Date(timestampInResetIndex) > new Date(timestampBeforeSnapshot)).ok();
            expect(new Date(timestampInResetIndex) > new Date(timestampInSnapshot)).ok();
            // Check that the reset document contains identity field (host.name)
            expect(hit._source?.host?.name).ok();
            return true;
          }
        );

        // Schedule transform and await a new timestamp, greater than timestampBeforeSnapshot
        const { acknowledged } = await es.transform.scheduleNowTransform({
          transform_id: HOST_TRANSFORM_ID,
        });
        expect(acknowledged).to.be(true);

        await retry.waitForWithTimeout(
          'Document in latest index to be updated with new timestamp from reset index',
          TIMEOUT_MS,
          async () => {
            const result = await es.search({
              index: INDEX_NAME,
              query: {
                term: {
                  'entity.id': entityId,
                },
              },
            });
            const total = result.hits.total as SearchTotalHits;
            expect(total.value).to.eql(1);
            const hit = result.hits.hits[0] as SearchHit<Ecs & EcsEntity>;
            expect(hit._source).ok();
            expect(hit._source?.['@timestamp']).ok();
            const refreshedTimestamp = hit._source?.['@timestamp'] as string;
            expect(refreshedTimestamp).to.eql(timestampInResetIndex);
            expect(new Date(refreshedTimestamp) > new Date(timestampBeforeSnapshot)).ok();
            return true;
          }
        );
      });
    });
  });
}

function buildHostTransformDocument(
  host: EcsHost & { timestamp?: string },
  dataStream: string
): IndexRequest {
  // If not timestamp provided
  // Get timestamp without the millisecond part
  const isoTimestamp: string = !!host.timestamp
    ? host.timestamp
    : new Date().toISOString().split('.')[0];

  delete host.timestamp;

  const document: IndexRequest = {
    index: dataStream,
    document: {
      '@timestamp': isoTimestamp,
      host,
    },
  };
  return document;
}

async function createDocumentsAndTriggerTransform(
  providerContext: FtrProviderContext,
  docs: (EcsHost & { timestamp?: string })[],
  dataStream: string
): Promise<void> {
  const retry = providerContext.getService('retry');
  const es = providerContext.getService('es');
  const log = providerContext.getService('log');

  // Wait for the transform to exist before attempting to get stats
  let transform: any;
  let triggerCount: number = 0;
  let docsProcessed: number = 0;

  await retry.waitForWithTimeout(
    `Transform ${HOST_TRANSFORM_ID} to exist`,
    TIMEOUT_MS,
    async () => {
      try {
        const { count, transforms } = await es.transform.getTransformStats({
          transform_id: HOST_TRANSFORM_ID,
        });
        if (count !== 1) {
          log.debug(`Waiting for transform ${HOST_TRANSFORM_ID} to exist, count: ${count}`);
          return false;
        }
        transform = transforms[0];
        triggerCount = transform.stats.trigger_count;
        docsProcessed = transform.stats.documents_processed;
        log.debug(
          `Transform ${HOST_TRANSFORM_ID} found, trigger_count: ${triggerCount}, docs_processed: ${docsProcessed}`
        );
        return true;
      } catch (e: any) {
        if (e.message?.includes('resource_not_found_exception')) {
          log.debug(`Transform ${HOST_TRANSFORM_ID} not found yet, waiting...`);
          return false;
        }
        throw e;
      }
    }
  );

  for (let i = 0; i < docs.length; i++) {
    const { result } = await es.index(buildHostTransformDocument(docs[i], dataStream));
    expect(result).to.eql('created');
  }

  // Trigger the transform manually
  const { acknowledged } = await es.transform.scheduleNowTransform({
    transform_id: HOST_TRANSFORM_ID,
  });
  expect(acknowledged).to.be(true);

  await retry.waitForWithTimeout('Transform to run again', TIMEOUT_MS, async () => {
    try {
      const response = await es.transform.getTransformStats({
        transform_id: HOST_TRANSFORM_ID,
      });
      if (!response.transforms[0]) {
        log.debug(`Transform ${HOST_TRANSFORM_ID} not found in stats response, retrying...`);
        return false;
      }
      transform = response.transforms[0];
      if (transform.stats.trigger_count <= triggerCount) {
        log.debug(
          `Transform trigger_count ${transform.stats.trigger_count} not greater than ${triggerCount}, waiting...`
        );
        return false;
      }
      if (transform.stats.documents_processed <= docsProcessed) {
        log.debug(
          `Transform docs_processed ${transform.stats.documents_processed} not greater than ${docsProcessed}, waiting...`
        );
        return false;
      }
      log.debug(
        `Transform completed: trigger_count=${transform.stats.trigger_count}, docs_processed=${transform.stats.documents_processed}`
      );
      return true;
    } catch (e: any) {
      if (e.message?.includes('resource_not_found_exception')) {
        log.debug(`Transform ${HOST_TRANSFORM_ID} not found, retrying...`);
        return false;
      }
      throw e;
    }
  });
}

async function enableEntityStore(providerContext: FtrProviderContext): Promise<void> {
  const log = providerContext.getService('log');
  const supertest = providerContext.getService('supertest');
  const retry = providerContext.getService('retry');

  const RETRIES = 5;
  const RETRY_DELAY_MS = 5000;
  let success: boolean = false;

  for (let attempt = 0; attempt < RETRIES; attempt++) {
    log.info(
      `Enabling Entity Store with entityTypes=['host'] (attempt ${attempt + 1}/${RETRIES})...`
    );

    // Only enable 'host' engine - this test only validates host snapshots.
    // Enabling all engines concurrently causes task conflicts (server-side issue).
    const response = await supertest
      .post('/api/entity_store/enable')
      .set('kbn-xsrf', 'xxxx')
      .send({ entityTypes: ['host'] });

    if (response.statusCode !== 200) {
      log.error(`Enable request failed: ${response.statusCode} - ${JSON.stringify(response.body)}`);
      if (attempt < RETRIES - 1) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        await cleanUpEntityStore(providerContext);
      }
      continue;
    }

    if (!response.body.succeeded) {
      log.error(`Enable request returned succeeded=false: ${JSON.stringify(response.body)}`);
      if (attempt < RETRIES - 1) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        await cleanUpEntityStore(providerContext);
      }
      continue;
    }

    // Wait for Entity Store to reach 'running' status
    try {
      await retry.waitForWithTimeout('Entity Store to initialize', TIMEOUT_MS, async () => {
        const { body } = await supertest
          .get('/api/entity_store/status')
          .query({ include_components: true })
          .expect(200);

        if (body.status === 'running') {
          log.info('Entity Store is now running');
          success = true;
          return true;
        }

        if (body.status === 'error') {
          log.error(`Entity Store is in error state: ${JSON.stringify(body)}`);
          return true; // Exit wait loop to trigger retry
        }

        log.debug(`Entity Store status: ${body.status}, waiting for 'running'...`);
        return false;
      });
    } catch (e: any) {
      log.error(`Wait for Entity Store failed: ${e.message}`);
    }

    if (success) {
      break;
    }

    if (attempt < RETRIES - 1) {
      log.info(`Retrying Entity Store setup after ${RETRY_DELAY_MS}ms delay...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
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

interface EcsEntity {
  entity?: EcsEntityEntity;
}

interface EcsEntityEntity {
  id?: string;
  last_seen_timestamp?: string;
}
