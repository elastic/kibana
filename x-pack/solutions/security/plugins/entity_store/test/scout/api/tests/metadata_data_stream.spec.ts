/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { PUBLIC_HEADERS, ENTITY_STORE_ROUTES, ENTITY_STORE_TAGS } from '../fixtures/constants';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../../common';
import { clearEntityStoreIndices } from '../fixtures/helpers';
// EMH Phase 1: these imports must resolve once the Implementer creates the
// asset_manager metadata files and the metadata install path is wired in.
import { getMetadataEntitiesDataStreamName } from '../../../../server/domain/asset_manager/metadata_data_stream';
import { getMetadataIndexIngestPipelineId } from '../../../../server/domain/asset_manager/metadata_index_ingest_pipeline';

const METADATA_DATA_STREAM = getMetadataEntitiesDataStreamName('default');
const METADATA_INGEST_PIPELINE = getMetadataIndexIngestPipelineId('default');

apiTest.describe(
  'EMH Phase 1 — metadata datastream is installed by entity store init',
  { tag: ENTITY_STORE_TAGS },
  () => {
    let defaultHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth, kbnClient }) => {
      const credentials = await samlAuth.asInteractiveUser('admin');
      defaultHeaders = {
        ...credentials.cookieHeader,
        ...PUBLIC_HEADERS,
      };

      await kbnClient.uiSettings.update({
        [FF_ENABLE_ENTITY_STORE_V2]: true,
      });
    });

    apiTest.afterEach(async ({ apiClient, esClient }) => {
      await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
      await esClient.indices.deleteDataStream({ name: METADATA_DATA_STREAM }, { ignore: [404] });
      await clearEntityStoreIndices(esClient);
    });

    apiTest(
      'creates the .entities.v2.metadata.security_default datastream on install',
      async ({ apiClient, esClient }) => {
        const install = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
          headers: defaultHeaders,
          responseType: 'json',
          body: {},
        });
        expect(install.statusCode).toBe(201);

        const dataStreams = await esClient.indices.getDataStream({
          name: METADATA_DATA_STREAM,
        });
        expect(dataStreams.data_streams).toHaveLength(1);
        expect(dataStreams.data_streams[0].name).toBe(METADATA_DATA_STREAM);

        // Lifecycle must be DSL-based with a configured data_retention.
        const lifecycle = dataStreams.data_streams[0].lifecycle as
          | { data_retention?: string; enabled?: boolean }
          | undefined;
        expect(lifecycle).toBeDefined();
        expect(lifecycle?.data_retention).toBeDefined();
        expect(lifecycle?.data_retention).toMatch(/d$/);
      }
    );

    apiTest(
      'installs an ingest pipeline that auto-populates event.ingested on indexed docs',
      async ({ apiClient, esClient }) => {
        const install = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
          headers: defaultHeaders,
          responseType: 'json',
          body: {},
        });
        expect(install.statusCode).toBe(201);

        // Pipeline exists.
        const pipelineResponse = await esClient.ingest.getPipeline({
          id: METADATA_INGEST_PIPELINE,
        });
        expect(pipelineResponse[METADATA_INGEST_PIPELINE]).toBeDefined();

        // Indexing a doc through the pipeline sets event.ingested even when
        // the source omits it.
        await esClient.index({
          index: METADATA_DATA_STREAM,
          pipeline: METADATA_INGEST_PIPELINE,
          op_type: 'create',
          refresh: 'wait_for',
          body: {
            '@timestamp': '2026-05-15T10:30:00.000Z',
            event: { kind: 'event', action: 'relationship_observed' },
            entity: { id: 'user:alice@local', source: 'elastic_defend' },
          },
        });

        const search = await esClient.search({
          index: METADATA_DATA_STREAM,
          size: 1,
        });
        expect(search.hits.hits).toHaveLength(1);
        const source = search.hits.hits[0]._source as {
          event?: { ingested?: string };
          'event.ingested'?: string;
        };
        const ingested = source.event?.ingested ?? source['event.ingested'];
        expect(typeof ingested).toBe('string');
        expect(ingested).toMatch(/\d{4}-\d{2}-\d{2}T/);
      }
    );
  }
);
