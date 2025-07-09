/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { uniqBy } from 'lodash';
import { generateArchive, parseArchive } from '@kbn/streams-plugin/server/lib/content';
import { Readable } from 'stream';
import {
  ContentPack,
  ContentPackSavedObject,
  INDEX_PLACEHOLDER,
  findConfiguration,
  isSupportedSavedObjectType,
} from '@kbn/content-packs-schema';
import { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
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
    // this archive contains a dashboard with 4 types of panel all reading from `logs`
    'src/platform/test/api_integration/fixtures/kbn_archiver/saved_objects/content_pack_four_panels.json',
  ];
  const ARCHIVE_DASHBOARD_ID = '9230e631-1f1a-476d-b613-4b074c6cfdd0';

  function expectIndexPatternsFromEntries(
    entries: ContentPackSavedObject[],
    expectedPatterns: string[]
  ) {
    entries.forEach((entry) => {
      const { patterns } = findConfiguration(entry);
      if (entry.attributes.title === 'lens-reference-with-index-pattern-ref') {
        expect(patterns).to.eql([]);
        return;
      }
      expect(patterns).to.eql(expectedPatterns);
    });
  }

  async function expectIndexPatternsFromDashboard(dashboardId: string, expectedPatterns: string[]) {
    const dashboard = await kibanaServer.savedObjects.get({
      type: 'dashboard',
      id: dashboardId,
    });
    expect(uniqBy(dashboard.references, (ref) => ref.id).length).to.eql(3);

    const resolvedReferences = await Promise.all(
      dashboard.references.map((ref) =>
        kibanaServer.savedObjects.get({ type: ref.type, id: ref.id })
      )
    );

    expectIndexPatternsFromEntries(
      [dashboard, ...resolvedReferences] as ContentPackSavedObject[],
      expectedPatterns
    );
  }

  describe('Content packs', () => {
    let contentPack: ContentPack;

    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);

      await loadDashboards(kibanaServer, ARCHIVES, SPACE_ID);
      await linkDashboard(apiClient, 'logs', ARCHIVE_DASHBOARD_ID);
    });

    after(async () => {
      await disableStreams(apiClient);

      await unloadDashboards(kibanaServer, ARCHIVES, SPACE_ID);
    });

    describe('Export', () => {
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
        expect(contentPack.entries.length).to.eql(4);
        expect(contentPack.entries.filter((entry) => entry.type === 'dashboard').length).to.be(1);
        expect(contentPack.entries.filter((entry) => entry.type === 'lens').length).to.be(2);
        expect(contentPack.entries.filter((entry) => entry.type === 'index-pattern').length).to.be(
          1
        );
      });

      it('puts placeholders for patterns matching the source stream', async () => {
        // all saved objects only read from `logs`. since we exported the dashboard from
        // the root stream, the replacement logic should only leave placeholders
        const savedObjects = contentPack.entries.filter(isSupportedSavedObjectType);
        expect(savedObjects.length).to.eql(4);
        expectIndexPatternsFromEntries(savedObjects, [INDEX_PLACEHOLDER]);
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
          filename: 'logs-content_pack-1.0.0.zip',
        });

        expect(response.errors.length).to.be(0);
        expect(response.created.length).to.be(1);

        const stream = await getStream(apiClient, 'logs.importstream');
        expect(stream.dashboards).to.eql([response.created[0]['asset.id']]);
      });

      it('does not duplicate objects when re-importing a content pack', async () => {
        const archive = await generateArchive(contentPack, contentPack.entries);
        const response = await importContent(apiClient, 'logs.importstream', {
          include: { all: {} },
          content: Readable.from(archive),
          filename: 'logs-content_pack-1.0.0.zip',
        });

        expect(response.errors.length).to.be(0);
        expect(response.created.length).to.be(1);

        const stream = await getStream(apiClient, 'logs.importstream');
        expect(stream.dashboards).to.eql([response.created[0]['asset.id']]);
      });

      it('replaces placeholders with target stream pattern', async () => {
        const stream = await getStream(apiClient, 'logs.importstream');
        await expectIndexPatternsFromDashboard(stream.dashboards[0], ['logs.importstream']);
      });

      it('does not mutate the source saved objects', async () => {
        const stream = await getStream(apiClient, 'logs');
        await expectIndexPatternsFromDashboard(stream.dashboards[0], ['logs']);
      });

      it('fails if an object is too large', async () => {
        const twoMB = 2 * 1024 * 1024;
        const archive = await generateArchive(
          {
            name: 'content_pack',
            description: 'with objects too big',
            version: '1.0.0',
          },
          [
            {
              type: 'index-pattern',
              id: 'regular_data_view',
              references: [],
              attributes: {
                title: 'logs*',
                name: 'logs*',
              },
            },
            {
              type: 'index-pattern',
              id: 'big_data_view',
              references: [],
              attributes: {
                title: 'a'.repeat(twoMB),
                name: 'big data view',
              },
            },
          ]
        );

        const response = await importContent(
          apiClient,
          'logs.importstream',
          {
            include: { all: {} },
            content: Readable.from(archive),
            filename: 'content_pack-1.0.0.zip',
          },
          400
        );

        expect((response as unknown as { message: string }).message).to.match(
          /^Object \[content_pack-1.0.0\/kibana\/index_pattern\/big_data_view.json\] exceeds the limit of \d+ bytes/
        );
      });
    });
  });
}
