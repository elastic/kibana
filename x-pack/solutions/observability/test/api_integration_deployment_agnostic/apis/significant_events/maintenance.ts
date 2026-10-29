/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { randomUUID } from 'node:crypto';
import type { Streams } from '@kbn/streams-schema';
import { emptyAssets } from '@kbn/streams-schema';
import {
  deleteStream,
  disableStreams,
  enableStreams,
  putStream,
} from '@kbn/test-suites-xpack-platform/api_integration_deployment_agnostic/apis/streams/helpers/requests';
import { createTestSource, deleteTestSource } from './helpers/test_source';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { RoleCredentials } from '../../services';
import type { SignificantEventsSupertestRepositoryClient } from './helpers/repository_client';
import { createStreamsRepositoryAdminClient } from './helpers/repository_client';
import {
  dataStreamExists,
  getMaintenanceStatus,
  getQueries,
  listFeatures,
  pauseMaintenance,
  resetMaintenance,
  resumeMaintenance,
  upsertFeature,
  upsertQuery,
} from './helpers/requests';

const RESET_STREAM_NAME = 'logs.otel.maintenance-reset-test';
const ORPHAN_RULE_STREAM_NAME = 'logs.otel.maintenance-reset-orphan-rule';
const REGISTERED_DATA_STREAMS = [
  '.significant_events-detections',
  '.significant_events-knowledge_indicators',
] as const;
const DISCOVERIES_DATA_STREAM = '.significant_events-discoveries';
const DISCOVERIES_TEST_TEMPLATE = 'significant-events-maintenance-discoveries-test';
const resetStream: Streams.WiredStream.UpsertRequest['stream'] = {
  type: 'wired',
  description: '',
  ingest: {
    lifecycle: { inherit: {} },
    processing: { steps: [] },
    settings: {},
    wired: { routing: [], fields: {} },
    failure_store: { inherit: {} },
  },
};

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const alertingApi = getService('alertingApiCommon');
  const esClient = getService('es');
  const retry = getService('retry');
  const samlAuth = getService('samlAuth');
  let roleAuthc: RoleCredentials;

  let apiClient: SignificantEventsSupertestRepositoryClient;

  // A guarded, rule-touching route used only as a probe: the pause guard rejects
  // it with 409 before it reaches any stream/rule work, so an unknown stream is
  // enough. After resume it runs (reporting the stream as failed), proving the
  // guard, not the missing stream, is what produced the 409.
  const reconcileProbe = (expectStatusCode: number) =>
    apiClient
      .fetch('POST /internal/streams/queries/_reconcile', {
        params: { body: { sourceIds: ['logs.maintenance-probe-missing'] } },
      })
      .expect(expectStatusCode);

  describe('Maintenance API', function () {
    before(async () => {
      roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await retry.tryForTime(30_000, () => enableStreams(apiClient));
    });

    after(async () => {
      await disableStreams(apiClient);
      await samlAuth.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    // The maintenance state is one document per space, so always leave this space
    // enabled; a leaked `paused` state would block the other suites' rule work.
    afterEach(async () => {
      await resumeMaintenance(apiClient);
    });

    it('reports the enabled state by default', async () => {
      const status = await getMaintenanceStatus(apiClient);
      expect(status.state).to.eql('enabled');
    });

    it('round-trips the state through pause and resume', async () => {
      const paused = await pauseMaintenance(apiClient);
      expect(paused.state).to.eql('paused');
      expect(await getMaintenanceStatus(apiClient).then((s) => s.state)).to.eql('paused');

      const resumed = await resumeMaintenance(apiClient);
      expect(resumed.state).to.eql('enabled');
      expect(await getMaintenanceStatus(apiClient).then((s) => s.state)).to.eql('enabled');
    });

    it('rejects rule-touching routes with 409 while paused and allows them once resumed', async () => {
      await reconcileProbe(200);

      await pauseMaintenance(apiClient);
      await reconcileProbe(409);

      await resumeMaintenance(apiClient);
      await reconcileProbe(200);
    });

    it('is idempotent: pausing twice keeps the paused state', async () => {
      const first = await pauseMaintenance(apiClient);
      const second = await pauseMaintenance(apiClient);

      expect(first.state).to.eql('paused');
      expect(second.state).to.eql('paused');
      expect(await getMaintenanceStatus(apiClient).then((s) => s.state)).to.eql('paused');
    });

    it('is idempotent: resuming while enabled is a no-op', async () => {
      const resumed = await resumeMaintenance(apiClient);
      expect(resumed.state).to.eql('enabled');
      expect(await getMaintenanceStatus(apiClient).then((s) => s.state)).to.eql('enabled');
    });

    it('clears only current-space data, preserves shared streams and sources, and is repeatable', async () => {
      const otherSpaceId = `maintenance-reset-${randomUUID()}`;
      const sentinelIds = ['maintenance-other-space', 'maintenance-untagged'];
      const supertest = await roleScopedSupertest.getSupertestWithRoleScope('admin', {
        useCookieHeader: true,
        withInternalHeaders: true,
      });
      await supertest
        .post('/api/spaces/space')
        .set('kbn-xsrf', 'foo')
        .send({ id: otherSpaceId, name: otherSpaceId })
        .expect(200);
      await apiClient
        .fetch('GET /internal/significant_events/events', { params: { query: {} } })
        .expect(200);
      await apiClient
        .fetch('GET /internal/significant_events/detections', { params: { query: {} } })
        .expect(200);
      await putStream(apiClient, RESET_STREAM_NAME, { stream: resetStream, ...emptyAssets });
      await putStream(apiClient, ORPHAN_RULE_STREAM_NAME, {
        stream: resetStream,
        ...emptyAssets,
      });
      const createdSourceIds: string[] = [];
      try {
        const resetSource = await createTestSource(
          roleScopedSupertest,
          'Maintenance reset',
          `FROM ${RESET_STREAM_NAME},${RESET_STREAM_NAME}.*`
        );
        createdSourceIds.push(resetSource.id);
        const orphanSource = await createTestSource(
          roleScopedSupertest,
          'Maintenance reset orphan',
          `FROM ${ORPHAN_RULE_STREAM_NAME},${ORPHAN_RULE_STREAM_NAME}.*`
        );
        createdSourceIds.push(orphanSource.id);
        await upsertFeature(apiClient, resetSource.id, {
          id: 'reset-feature',
          type: 'entity',
          subtype: 'service',
          title: 'Reset feature',
          description: 'Feature seeded for the maintenance reset test',
          properties: { name: 'reset-service' },
          confidence: 90,
          evidence: ['service.name=reset-service'],
          tags: ['reset'],
        });
        await upsertQuery(apiClient, resetSource.id, 'reset-linked-query', {
          title: 'Maintenance reset linked rule',
          esql: {
            query: `FROM ${resetSource.viewName} | WHERE KQL("message:'linked'")`,
          },
        });
        await upsertQuery(apiClient, orphanSource.id, 'reset-orphan-query', {
          title: 'Maintenance reset orphan rule',
          esql: {
            query: `FROM ${orphanSource.viewName} | WHERE KQL("message:'orphan'")`,
          },
        });

        /* Remove the query revision so Reset must discover its orphan rule from the source tag. */
        await esClient.deleteByQuery({
          index: '.significant_events-knowledge_indicators',
          refresh: true,
          query: {
            bool: {
              filter: [
                { term: { id: 'reset-orphan-query' } },
                { term: { type: 'query' } },
                { term: { 'source.id': orphanSource.id } },
              ],
            },
          },
        });

        /* Pause now: the KI sync sweep deletes exactly this orphan, and its guard is the only thing that stops it. */
        await pauseMaintenance(apiClient);

        const seededRules = await alertingApi.searchRulesV2(roleAuthc, {
          search: 'Maintenance reset',
        });
        expect(seededRules.body.items).to.have.length(2);

        const timestamp = new Date().toISOString();
        await esClient.create({
          index: '.significant_events-detections',
          id: 'maintenance-reset-detection',
          refresh: 'wait_for',
          document: {
            '@timestamp': timestamp,
            detection_id: 'maintenance-reset-detection',
            rule_uuid: 'maintenance-reset-rule',
            rule_name: 'Maintenance reset rule',
            source_id: resetSource.id,
            change_point_type: 'spike',
            p_value: 0.01,
            'kibana.space_ids': ['default'],
          },
        });

        await esClient.indices.deleteDataStream(
          { name: DISCOVERIES_DATA_STREAM },
          { ignore: [404] }
        );
        await esClient.indices.putIndexTemplate({
          name: DISCOVERIES_TEST_TEMPLATE,
          index_patterns: [DISCOVERIES_DATA_STREAM],
          priority: 1000,
          data_stream: { hidden: true },
        });
        await esClient.indices.createDataStream({ name: DISCOVERIES_DATA_STREAM });
        await esClient.create({
          index: DISCOVERIES_DATA_STREAM,
          id: 'maintenance-reset-discovery',
          refresh: 'wait_for',
          document: { '@timestamp': timestamp, kind: 'discovery', 'kibana.space_ids': ['default'] },
        });

        for (const index of [...REGISTERED_DATA_STREAMS, DISCOVERIES_DATA_STREAM]) {
          for (const [offset, id] of sentinelIds.entries()) {
            await esClient.create({
              index,
              id,
              refresh: 'wait_for',
              document: {
                '@timestamp': timestamp,
                id,
                type: 'feature',
                'source.id': resetSource.id,
                ...(offset === 0 ? { 'kibana.space_ids': [otherSpaceId] } : {}),
                feature: { type: 'entity', slug: id, confidence: 90, properties: {} },
              },
            });
          }
        }
        const backingIndicesBefore = await esClient.indices.getDataStream({
          name: REGISTERED_DATA_STREAMS.join(','),
        });

        const reset = await resetMaintenance(apiClient);
        expect(reset.state).to.eql('enabled');
        if (!reset.deleted) {
          throw new Error('Reset response omitted deletion counts');
        }
        const { knowledgeIndicators, ...deleted } = reset.deleted;
        // Creating a source onboards it, which can add computed features before the reset.
        expect(knowledgeIndicators).to.be.above(0);
        expect(deleted).to.eql({
          storedQueries: 1,
          rules: 2,
          dataStreams: 3,
        });
        expect(
          await getMaintenanceStatus(apiClient).then((status) => status.featureSettings)
        ).to.eql({
          continuousOnboardingEnabled: false,
          scheduledDiscoveryEnabled: false,
        });

        for (const dataStream of REGISTERED_DATA_STREAMS) {
          expect(await dataStreamExists(esClient, dataStream)).to.be(true);
          expect(
            (
              await esClient.count({
                index: dataStream,
                query: { term: { 'kibana.space_ids': 'default' } },
              })
            ).count
          ).to.be(0);
          expect(
            (await esClient.count({ index: dataStream, query: { ids: { values: sentinelIds } } }))
              .count
          ).to.be(2);
        }
        expect(
          await esClient.indices.getDataStream({ name: REGISTERED_DATA_STREAMS.join(',') })
        ).to.eql(backingIndicesBefore);
        expect((await esClient.count({ index: DISCOVERIES_DATA_STREAM })).count).to.be(2);
        await supertest.get(`/internal/nightshift/sources/${resetSource.id}`).expect(200);
        expect(
          (await esClient.esql.query({ query: `FROM ${resetSource.viewName} | LIMIT 1` })).columns
        ).to.be.an('array');

        expect((await listFeatures(apiClient, resetSource.id)).features).to.eql([]);
        expect((await getQueries(apiClient, resetSource.id)).queries).to.eql([]);
        const events = await apiClient
          .fetch('GET /internal/significant_events/events', { params: { query: {} } })
          .expect(200);
        // Historical events are deliberately retained; reset must only keep the reader healthy.
        expect(events.body).to.have.property('hits');
        const detections = await apiClient
          .fetch('GET /internal/significant_events/detections', { params: { query: {} } })
          .expect(200);
        expect(detections.body.total).to.be(0);
        const remainingRules = await alertingApi.searchRulesV2(roleAuthc, {
          search: 'Maintenance reset',
        });
        expect(remainingRules.body.items).to.have.length(0);

        const second = await resetMaintenance(apiClient);
        expect(second.deleted).to.eql({
          knowledgeIndicators: 0,
          storedQueries: 0,
          rules: 0,
          dataStreams: 0,
        });
        for (const dataStream of REGISTERED_DATA_STREAMS) {
          expect(await dataStreamExists(esClient, dataStream)).to.be(true);
        }
      } finally {
        for (const index of REGISTERED_DATA_STREAMS) {
          await esClient.deleteByQuery({
            index,
            query: { ids: { values: sentinelIds } },
            refresh: true,
            ignore_unavailable: true,
          });
        }
        await supertest
          .delete(`/api/spaces/space/${otherSpaceId}`)
          .set('kbn-xsrf', 'foo')
          .expect(204);
        await esClient.indices.deleteDataStream(
          { name: DISCOVERIES_DATA_STREAM },
          { ignore: [404] }
        );
        await esClient.indices.deleteIndexTemplate(
          { name: DISCOVERIES_TEST_TEMPLATE },
          { ignore: [404] }
        );
        await Promise.all(createdSourceIds.map((id) => deleteTestSource(roleScopedSupertest, id)));
        await deleteStream(apiClient, RESET_STREAM_NAME);
        await deleteStream(apiClient, ORPHAN_RULE_STREAM_NAME);
      }
    });
  });
}
