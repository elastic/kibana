/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Readable } from 'stream';
import { parseArchive } from '@kbn/streams-plugin/server/lib/content';
import type { ContentPackStream } from '@kbn/content-packs-schema';
import { emptyAssets } from '@kbn/streams-schema';
import { OBSERVABILITY_STREAMS_ENABLE_CONTENT_PACKS } from '@kbn/management-settings-ids';
import {
  disableStreams,
  enableStreams,
  exportContent,
  putStream,
} from '@kbn/test-suites-xpack-platform/api_integration_deployment_agnostic/apis/streams/helpers/requests';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import { createStreamsRepositoryAdminClient } from './helpers/repository_client';
import { bulkQueries, getQueries } from './helpers/requests';
import { createTestSource, deleteTestSource } from './helpers/test_source';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const kibanaServer = getService('kibanaServer');

  describe('Content packs with significant-event queries', () => {
    it('omits significant-event queries from the exported pack', async () => {
      await kibanaServer.uiSettings.update({ [OBSERVABILITY_STREAMS_ENABLE_CONTENT_PACKS]: true });
      await kibanaServer.uiSettings.waitForEventualCacheRefresh();

      const apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);

      let sourceId: string | undefined;

      try {
        await putStream(apiClient, 'logs.otel.branch_a', {
          ...emptyAssets,
          stream: {
            type: 'wired',
            description: 'Test stream',
            ingest: {
              processing: { steps: [] },
              settings: {},
              wired: { fields: {}, routing: [] },
              lifecycle: { inherit: {} },
              failure_store: { inherit: {} },
            },
          },
        });

        // Seed a real Nightshift source pointing at the stream, then attach a
        // query to it. The export must omit this query even though it exists.
        const source = await createTestSource(
          roleScopedSupertest,
          'branch_a_source',
          'FROM logs.otel.branch_a'
        );
        sourceId = source.id;

        await bulkQueries(apiClient, source.id, [
          {
            index: {
              id: 'export-omits-me',
              title: 'detector',
              description: '',
              esql: {
                query: `FROM ${source.viewName} | WHERE KQL("message:'ERROR'")`,
              },
            },
          },
        ]);

        const archiveBuffer = await exportContent(apiClient, 'logs.otel.branch_a', {
          name: 'branch_a_pack',
          description: 'export should not carry queries',
          version: '1.0.0',
          include: { objects: { all: {} } },
        });
        const contentPack = await parseArchive(Readable.from(archiveBuffer));

        const streamEntries = contentPack.entries.filter(
          (entry): entry is ContentPackStream => entry.type === 'stream'
        );
        expect(streamEntries.length).to.be.greaterThan(0);
        // Significant-event queries are intentionally excluded from content packs.
        // They are stored on Nightshift sources (not stream structure) and must
        // never appear in a content pack export.
        streamEntries.forEach((entry) => {
          expect(entry.request).to.not.have.property('queries');
        });

        // Verify the query survived the export (was not deleted as a side effect).
        const { queries } = await getQueries(apiClient, source.id);
        expect(queries.map((query) => query.id)).to.contain('export-omits-me');

        await bulkQueries(apiClient, source.id, [{ delete: { id: 'export-omits-me' } }]);
      } finally {
        if (sourceId) {
          await deleteTestSource(roleScopedSupertest, sourceId).catch(() => {});
        }
        await disableStreams(apiClient);
      }
    });
  });
}
