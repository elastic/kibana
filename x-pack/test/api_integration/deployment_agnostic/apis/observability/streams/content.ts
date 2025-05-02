/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { generateArchive, parseArchive } from '@kbn/streams-plugin/server/lib/content';
import { Readable } from 'stream';
import {
  ContentPack,
  ContentPackSavedObject,
  INDEX_PLACEHOLDER,
  findIndexPatterns,
} from '@kbn/content-packs-schema';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import {
  StreamsSupertestRepositoryClient,
  createStreamsRepositoryAdminClient,
} from './helpers/repository_client';
import {
  disableStreams,
  enableStreams,
  linkDashboard,
  exportContent,
  importContent,
  putStream,
  getStream,
} from './helpers/requests';
import { loadDashboards, unloadDashboards } from './helpers/dashboards';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  let apiClient: StreamsSupertestRepositoryClient;
  const kibanaServer = getService('kibanaServer');

  const SPACE_ID = 'default';
  const ARCHIVES = [
    // this archive contains a dashboard with esql panel and a lens panel referencing a data view
    // both read from `logs`
    'src/platform/test/api_integration/fixtures/kbn_archiver/saved_objects/content_pack_two_panels.json',
  ];
  const TWO_PANELS_DASHBOARD_ID = 'c22ba8ed-fd4b-4864-a98c-3cba1d11cfb2';

  describe('Content packs', () => {
    let contentPack: ContentPack;

    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);
    });

    after(async () => {
      await disableStreams(apiClient);
    });

    describe('Export', () => {
      before(async () => {
        await loadDashboards(kibanaServer, ARCHIVES, SPACE_ID);
        await linkDashboard(apiClient, 'logs', TWO_PANELS_DASHBOARD_ID);
      });

      after(async () => {
        await unloadDashboards(kibanaServer, ARCHIVES, SPACE_ID);
      });

      it('creates a content pack', async () => {
        const response = await exportContent(apiClient, 'logs', {
          name: 'logs-content_pack',
          version: '1.0.0',
          description: 'my content pack',
          include: { all: {} },
          replaced_patterns: [],
        });

        contentPack = await parseArchive(Readable.from([response]));
        expect(contentPack.name).to.be('logs-content_pack');
        expect(contentPack.version).to.be('1.0.0');
        expect(contentPack.description).to.be('my content pack');
        expect(contentPack.entries.length).to.eql(2);
        expect(contentPack.entries.filter((entry) => entry.type === 'dashboard').length).to.be(1);
        expect(contentPack.entries.filter((entry) => entry.type === 'index-pattern').length).to.be(
          1
        );
      });

      it('puts placeholders for patterns matching the source stream', async () => {
        expect(contentPack.entries.length).to.eql(2);
        contentPack.entries.forEach((entry) => {
          const patterns = findIndexPatterns(entry);
          expect(patterns).to.eql([INDEX_PLACEHOLDER]);
        });
      });
    });

    describe('Import', () => {
      before(async () => {
        await putStream(apiClient, 'logs.importstream', {
          dashboards: [],
          queries: [],
          stream: {
            description: '',
            ingest: {
              processing: [],
              wired: { fields: {}, routing: [] },
              lifecycle: { inherit: {} },
            },
          },
        });
      });

      it('imports a content pack', async () => {
        const archive = await generateArchive(contentPack, contentPack.entries);
        const response = await importContent(apiClient, 'logs.importstream', {
          include: { all: {} },
          content: Readable.from(archive),
        });

        expect(response.errors.length).to.be(0);
        expect(response.created.length).to.be(1);

        const stream = await getStream(apiClient, 'logs.importstream');
        expect(stream.dashboards).to.eql([response.created[0]['asset.id']]);
      });

      it('replaces placeholders with target stream pattern', async () => {
        const stream = await getStream(apiClient, 'logs.importstream');
        const dashboard = await kibanaServer.savedObjects.get({
          type: 'dashboard',
          id: stream.dashboards[0],
        });
        expect(dashboard.references.length).to.eql(1);
        const indexPattern = await kibanaServer.savedObjects.get({
          type: 'index-pattern',
          id: dashboard.references[0].id,
        });

        [dashboard, indexPattern].forEach((object) => {
          const patterns = findIndexPatterns(object as ContentPackSavedObject);
          expect(patterns).to.eql(['logs.importstream']);
        });
      });
    });
  });
}
