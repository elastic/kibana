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

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const kibanaServer = getService('kibanaServer');

  describe('Content packs with significant-event queries', () => {
    it('omits significant-event queries from the exported pack', async () => {
      await kibanaServer.uiSettings.update({ [OBSERVABILITY_STREAMS_ENABLE_CONTENT_PACKS]: true });
      await kibanaServer.uiSettings.waitForEventualCacheRefresh();

      const apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);

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

        await bulkQueries(apiClient, 'logs.otel.branch_a', [
          {
            index: {
              id: 'export-omits-me',
              title: 'detector',
              description: '',
              esql: {
                query: `FROM logs.otel.branch_a,logs.otel.branch_a.* | WHERE KQL("message:'ERROR'")`,
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
        streamEntries.forEach((entry) => {
          expect(entry.request).to.not.have.property('queries');
        });

        const { queries } = await getQueries(apiClient, 'logs.otel.branch_a');
        expect(queries.map((query) => query.id)).to.contain('export-omits-me');

        await bulkQueries(apiClient, 'logs.otel.branch_a', [{ delete: { id: 'export-omits-me' } }]);
      } finally {
        await disableStreams(apiClient);
      }
    });
  });
}
