/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { generateArchive, parseArchive } from '@kbn/streams-plugin/server/lib/content';
import { Readable } from 'stream';
import { ContentPackStream, ROOT_STREAM_ID } from '@kbn/content-packs-schema';
import { Streams, FieldDefinition, RoutingDefinition } from '@kbn/streams-schema';
import { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import {
  StreamsSupertestRepositoryClient,
  createStreamsRepositoryAdminClient,
} from './helpers/repository_client';
import {
  disableStreams,
  enableStreams,
  exportContent,
  getStream,
  importContent,
  putStream,
} from './helpers/requests';

const upsertRequest = (fields: FieldDefinition, routing: RoutingDefinition[]) => ({
  dashboards: [],
  queries: [],
  stream: {
    description: 'Test stream',
    ingest: {
      processing: [],
      wired: {
        fields,
        routing,
      },
      lifecycle: { inherit: {} },
    },
  },
});

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  let apiClient: StreamsSupertestRepositoryClient;

  describe('Content packs', () => {
    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);

      await putStream(apiClient, 'logs.branch_a.child1.nested', upsertRequest({}, []));
      await putStream(
        apiClient,
        'logs.branch_a.child1',
        upsertRequest({}, [
          {
            destination: 'logs.branch_a.child1.nested',
            if: { field: 'resource.attributes.hello', operator: 'eq', value: 'yes' },
          },
        ])
      );
      await putStream(apiClient, 'logs.branch_a.child2', upsertRequest({}, []));
      await putStream(apiClient, 'logs.branch_b.child1', upsertRequest({}, []));
      await putStream(apiClient, 'logs.branch_b.child2', upsertRequest({}, []));
      await putStream(
        apiClient,
        'logs.branch_a',
        upsertRequest(
          {
            'resource.attributes.foo.bar': { type: 'keyword' },
          },
          [
            {
              destination: 'logs.branch_a.child1',
              if: { field: 'resource.attributes.foo', operator: 'eq', value: 'bar' },
            },
            {
              destination: 'logs.branch_a.child2',
              if: { field: 'resource.attributes.bar', operator: 'eq', value: 'foo' },
            },
          ]
        )
      );
      await putStream(
        apiClient,
        'logs.branch_b',
        upsertRequest({}, [
          {
            destination: 'logs.branch_b.child1',
            if: { field: 'resource.attributes.foo', operator: 'eq', value: 'bar' },
          },
          {
            destination: 'logs.branch_b.child2',
            if: { field: 'resource.attributes.bar', operator: 'eq', value: 'foo' },
          },
        ])
      );
    });

    after(async () => {
      await disableStreams(apiClient);
    });

    describe('Export', () => {
      it('exports all streams from logs', async () => {
        const exportBody = {
          name: 'logs_content_pack',
          description: 'Content pack with all logs streams',
          version: '1.0.0',
          include: { all: {} },
        };

        const archiveBuffer = await exportContent(apiClient, 'logs', exportBody);
        const contentPack = await parseArchive(Readable.from(archiveBuffer));

        expect(contentPack.name).to.eql('logs_content_pack');
        expect(contentPack.description).to.eql('Content pack with all logs streams');
        expect(contentPack.version).to.eql('1.0.0');
        expect(contentPack.entries.length).to.be.greaterThan(0);

        const streamEntries = contentPack.entries.filter(
          (entry): entry is ContentPackStream => entry.type === 'stream'
        );

        expect(streamEntries.every((entry) => Streams.all.UpsertRequest.is(entry.request))).to.eql(
          true
        );
        expect(streamEntries.map((entry) => entry.name).sort()).to.eql([
          ROOT_STREAM_ID,
          'branch_a',
          'branch_a.child1',
          'branch_a.child1.nested',
          'branch_a.child2',
          'branch_b',
          'branch_b.child1',
          'branch_b.child2',
        ]);
      });

      it('exports selected streams from logs', async () => {
        const exportBody = {
          name: 'selective_logs_content_pack',
          description: 'Content pack with selected logs streams',
          version: '1.0.0',
          include: {
            objects: {
              streams: ['branch_a.child1.nested'],
            },
          },
        };

        const archiveBuffer = await exportContent(apiClient, 'logs', exportBody);
        const contentPack = await parseArchive(Readable.from(archiveBuffer));

        expect(contentPack.name).to.eql('selective_logs_content_pack');

        const includedStreams = contentPack.entries
          .filter((entry): entry is ContentPackStream => entry.type === 'stream')
          .map((entry) => entry.name)
          .sort();

        expect(includedStreams).to.eql([
          ROOT_STREAM_ID,
          'branch_a',
          'branch_a.child1',
          'branch_a.child1.nested',
        ]);
        const rootEntry = contentPack.entries.find(
          (entry): entry is ContentPackStream =>
            entry.type === 'stream' && entry.name === ROOT_STREAM_ID
        )!;
        expect(rootEntry.request.stream.ingest.wired.routing.length).to.eql(1);
        expect(rootEntry.request.stream.ingest.wired.routing[0]).to.eql(
          {
            destination: 'branch_a',
            if: { never: {} },
          },
          'it only includes the routing of the exported children'
        );
      });

      it('fails when trying to export a stream thats not a descendant', async () => {
        const exportBody = {
          name: 'nonexistent_stream_pack',
          description: 'Content pack for non-existent stream',
          version: '1.0.0',
          include: { objects: { streams: ['branch_b.child1'] } },
        };

        await exportContent(apiClient, 'logs.branch_a', exportBody, 400);
      });
    });

    describe('Import', () => {
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
              type: 'stream',
              name: 'a.regular.stream',
              request: {
                stream: {
                  description: 'ok',
                  ingest: {
                    processing: [],
                    wired: {
                      fields: {},
                      routing: [],
                    },
                    lifecycle: { inherit: {} },
                  },
                },
                dashboards: [],
                queries: [],
              },
            },
            {
              type: 'stream',
              name: 'a.big.stream',
              request: {
                stream: {
                  description: 'a'.repeat(twoMB),
                  ingest: {
                    processing: [],
                    wired: {
                      fields: {},
                      routing: [],
                    },
                    lifecycle: { inherit: {} },
                  },
                },
                dashboards: [],
                queries: [],
              },
            },
          ]
        );

        const response = await importContent(
          apiClient,
          'logs',
          {
            include: { all: {} },
            content: Readable.from(archive),
            filename: 'content_pack-1.0.0.zip',
          },
          400
        );

        expect((response as unknown as { message: string }).message).to.match(
          /^Object \[content_pack-1.0.0\/stream\/a.big.stream.json\] exceeds the limit of \d+ bytes/
        );
      });

      it('imports into a stream', async () => {
        const exportBody = {
          name: 'branch_a_child1_content_pack',
          description: 'Content pack from branch_a with nested child',
          version: '1.0.0',
          include: {
            objects: {
              streams: ['nested'],
            },
          },
        };
        const archiveBuffer = await exportContent(apiClient, 'logs.branch_a.child1', exportBody);

        await putStream(apiClient, 'logs.branch_c', upsertRequest({}, []));

        const importResponse = await importContent(apiClient, 'logs.branch_c', {
          include: { all: {} },
          content: Readable.from(archiveBuffer),
          filename: 'branch_a_content_pack-1.0.0.zip',
        });
        expect(importResponse.result.created).to.eql(['logs.branch_c.nested']);

        const updatedStream = (await getStream(
          apiClient,
          'logs.branch_c',
          200
        )) as Streams.WiredStream.GetResponse;

        expect(updatedStream.stream.ingest.wired.routing).to.eql([
          {
            destination: 'logs.branch_c.nested',
            if: {
              field: 'resource.attributes.hello',
              operator: 'eq',
              value: 'yes',
            },
          },
        ]);
        // check if the mapping set on unexported logs.branch_a are correctly exported
        expect(updatedStream.stream.ingest.wired.fields['resource.attributes.foo.bar']).to.eql({
          type: 'keyword',
        });
      });
    });
  });
}
