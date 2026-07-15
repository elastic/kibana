/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import { Readable } from 'stream';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { HapiReadableStream } from '../../../types';
import type { EntityStoreCRUDClient } from '@kbn/entity-store/server';
import { csvUploadV2 } from './csv_upload_v2';
import { hashEuid } from '@kbn/entity-store/common/domain/euid';

const createMockStream = (data: string): HapiReadableStream => {
  const stream = new Readable() as HapiReadableStream;
  stream.push(data);
  stream.push(null);
  stream.hapi = { filename: 'test.csv', headers: {} };
  return stream;
};

const createMockEntityStoreClient = () =>
  ({
    listEntities: jest.fn(),
    bulkUpdateEntity: jest.fn().mockResolvedValue({
      stats: { successful: 0, failed: 0, total: 0 },
      errors: [],
    }),
    upsertEntity: jest.fn(),
    upsertEntitiesBulk: jest.fn(),
    deleteEntity: jest.fn(),
  } as unknown as EntityStoreCRUDClient);

describe('csvUploadV2', () => {
  let entityStoreClient: EntityStoreCRUDClient;
  let logger: Logger;

  beforeEach(() => {
    entityStoreClient = createMockEntityStoreClient();
    logger = loggingSystemMock.createLogger();

    (entityStoreClient.listEntities as jest.Mock).mockResolvedValue({
      entities: [],
      nextSearchAfter: undefined,
    });
  });

  describe('csvUploadV2()', () => {
    describe('header validation', () => {
      it('rejects when both required headers are missing', async () => {
        const csv = 'host.name\nmy-host\n';
        await expect(
          csvUploadV2({ entityStoreClient, fileStream: createMockStream(csv), logger })
        ).rejects.toThrow('CSV header is missing required fields: type, criticality_level');
      });

      it('rejects when criticality_level header is missing', async () => {
        const csv = 'type,host.name\nhost,my-host\n';
        await expect(
          csvUploadV2({ entityStoreClient, fileStream: createMockStream(csv), logger })
        ).rejects.toThrow('CSV header is missing required fields: criticality_level');
      });

      it('rejects when type header is missing', async () => {
        const csv = 'host.name,criticality_level\nmy-host,low_impact\n';
        await expect(
          csvUploadV2({ entityStoreClient, fileStream: createMockStream(csv), logger })
        ).rejects.toThrow('CSV header is missing required fields: type');
      });

      it('handles whitespace in header', async () => {
        const csv = 'type ,host.name, criticality_level\nhost,my-host,low_impact\n';
        await csvUploadV2({ entityStoreClient, fileStream: createMockStream(csv), logger });
      });

      it('handles unnecessary capitalization in header', async () => {
        const csv = 'Type,Host.name,Criticality_level\nhost,my-host,low_impact\n';
        await csvUploadV2({ entityStoreClient, fileStream: createMockStream(csv), logger });
      });

      it('validates successfully when all required headers are present', async () => {
        const csv = 'type,host.name,criticality_level\nhost,my-host,low_impact\n';
        await csvUploadV2({ entityStoreClient, fileStream: createMockStream(csv), logger });
      });
    });

    describe('required field validation', () => {
      it('records error for row with an invalid entity type', async () => {
        const csv = 'type,host.name,criticality_level\ninvalid_type,my-host,low_impact\n';
        const result = await csvUploadV2({
          entityStoreClient,
          fileStream: createMockStream(csv),
          logger,
        });

        expect(result.items.length).toBe(1);
        expect(result.successful).toBe(0);
        expect(result.failed).toBe(1);
        expect(result.unmatched).toBe(0);
        expect(result.total).toBe(1);
        expect(result.items[0]).toEqual({
          error:
            'Error processing row: Invalid entity type: "invalid_type". Must be one of: user, host, service, generic',
          matchedEntities: 0,
          status: 'failure',
        });
      });

      it('records error for row with an invalid criticality level', async () => {
        const csv = 'type,host.name,criticality_level\nhost,my-host,invalid_level\n';
        const result = await csvUploadV2({
          entityStoreClient,
          fileStream: createMockStream(csv),
          logger,
        });
        expect(result.items.length).toBe(1);
        expect(result.successful).toBe(0);
        expect(result.failed).toBe(1);
        expect(result.unmatched).toBe(0);
        expect(result.total).toBe(1);
        expect(result.items[0]).toEqual({
          error:
            'Error processing row: Invalid criticality level: "invalid_level". Must be one of: low_impact, medium_impact, high_impact, extreme_impact, unassign',
          matchedEntities: 0,
          status: 'failure',
        });
      });

      it('accepts "unassign" as a valid criticality level', async () => {
        const csv = 'type,host.name,criticality_level\nhost,my-host,unassign\n';
        const result = await csvUploadV2({
          entityStoreClient,
          fileStream: createMockStream(csv),
          logger,
        });
        expect(result.failed).toBe(0);
        expect(result.items[0].error).toBeUndefined();
      });

      it('sends null asset criticality when criticality_level is "unassign"', async () => {
        (entityStoreClient.listEntities as jest.Mock).mockResolvedValueOnce({
          entities: [{ entity: { id: 'host:my-host' } }],
          nextSearchAfter: undefined,
        });
        (entityStoreClient.bulkUpdateEntity as jest.Mock).mockResolvedValueOnce([]);

        const csv = 'type,host.name,criticality_level\nhost,my-host,unassign\n';
        await csvUploadV2({ entityStoreClient, fileStream: createMockStream(csv), logger });

        expect(entityStoreClient.bulkUpdateEntity).toHaveBeenCalledWith(
          expect.objectContaining({
            objects: [
              expect.objectContaining({
                doc: expect.objectContaining({
                  asset: { criticality: null },
                }),
              }),
            ],
          })
        );
      });
    });

    describe('rows with no identifying fields', () => {
      it('records an error for a row where all non-required fields are empty', async () => {
        const csv = 'type,criticality_level\nhost,high_impact\n';
        const result = await csvUploadV2({
          entityStoreClient,
          fileStream: createMockStream(csv),
          logger,
        });
        expect(result.items.length).toBe(1);
        expect(result.successful).toBe(0);
        expect(result.failed).toBe(1);
        expect(result.unmatched).toBe(0);
        expect(result.total).toBe(1);
        expect(result.items[0]).toEqual({
          error: 'Error processing row: Row has no identifying fields',
          matchedEntities: 0,
          status: 'failure',
        });
      });

      it('records an error for a row where all non-criticality fields are empty strings', async () => {
        const csv = 'type,host.name,criticality_level\nhost,,high_impact\n';
        const result = await csvUploadV2({
          entityStoreClient,
          fileStream: createMockStream(csv),
          logger,
        });
        expect(result.items.length).toBe(1);
        expect(result.successful).toBe(0);
        expect(result.failed).toBe(1);
        expect(result.unmatched).toBe(0);
        expect(result.total).toBe(1);
        expect(result.items[0]).toEqual({
          error: 'Error processing row: Row has no identifying fields',
          matchedEntities: 0,
          status: 'failure',
        });
      });

      it('records one error per row with no identifying fields, with correct row indices', async () => {
        const csv = 'type,criticality_level\nuser,high_impact\nhost,medium_impact\n';
        const result = await csvUploadV2({
          entityStoreClient,
          fileStream: createMockStream(csv),
          logger,
        });
        expect(result.items.length).toBe(2);
        expect(result.successful).toBe(0);
        expect(result.failed).toBe(2);
        expect(result.unmatched).toBe(0);
        expect(result.total).toBe(2);
        expect(result.items).toEqual([
          {
            error: 'Error processing row: Row has no identifying fields',
            matchedEntities: 0,
            status: 'failure',
          },
          {
            error: 'Error processing row: Row has no identifying fields',
            matchedEntities: 0,
            status: 'failure',
          },
        ]);
      });
    });

    describe('entity matching', () => {
      it('increments unmatched stat when listEntities returns no results for a row', async () => {
        const csv = 'type,host.name,criticality_level\nhost,my-host,high_impact\n';
        const result = await csvUploadV2({
          entityStoreClient,
          fileStream: createMockStream(csv),
          logger,
        });

        expect(result).toEqual({
          failed: 0,
          successful: 0,
          total: 1,
          unmatched: 1,
          items: [{ matchedEntities: 0, status: 'unmatched' }],
        });
      });

      it('calls listEntities with a filter built from row fields', async () => {
        const csv =
          'type,user.name,user.email,host.name,criticality_level\nuser,user1,user1@abc.com,host-X,high_impact\nuser,user2,user2@xyz.com,,medium_impact\nhost,,,host-Y,low_impact\n';
        await csvUploadV2({ entityStoreClient, fileStream: createMockStream(csv), logger });

        expect(entityStoreClient.listEntities).toHaveBeenCalledTimes(3);

        expect(entityStoreClient.listEntities).toHaveBeenNthCalledWith(1, {
          filter: [
            { term: { 'user.name': 'user1' } },
            { term: { 'user.email': 'user1@abc.com' } },
            { term: { 'host.name': 'host-X' } },
            { term: { 'entity.EngineMetadata.Type': 'user' } },
          ],
          size: 100,
          source: ['entity.id'],
          searchAfter: undefined,
        });
        expect(entityStoreClient.listEntities).toHaveBeenNthCalledWith(2, {
          filter: [
            { term: { 'user.name': 'user2' } },
            { term: { 'user.email': 'user2@xyz.com' } },
            { term: { 'entity.EngineMetadata.Type': 'user' } },
          ],
          size: 100,
          source: ['entity.id'],
          searchAfter: undefined,
        });
        expect(entityStoreClient.listEntities).toHaveBeenNthCalledWith(3, {
          filter: [
            { term: { 'host.name': 'host-Y' } },
            { term: { 'entity.EngineMetadata.Type': 'host' } },
          ],
          size: 100,
          source: ['entity.id'],
          searchAfter: undefined,
        });
      });

      it('paginates through entity pages using searchAfter until exhausted', async () => {
        const firstPage = Array.from({ length: 100 }, (_, i) => ({ id: `e${i}` }));
        const secondPage = [{ id: 'e100' }];

        (entityStoreClient.listEntities as jest.Mock)
          .mockResolvedValueOnce({ entities: firstPage, nextSearchAfter: ['e99'] })
          .mockResolvedValueOnce({ entities: secondPage, nextSearchAfter: undefined });

        const csv = 'type,host.name,criticality_level\nhost,my-host,high_impact\n';
        await csvUploadV2({ entityStoreClient, fileStream: createMockStream(csv), logger });

        expect(entityStoreClient.listEntities).toHaveBeenCalledTimes(2);
        expect(entityStoreClient.listEntities).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({ searchAfter: undefined })
        );
        expect(entityStoreClient.listEntities).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({ searchAfter: ['e99'] })
        );
      });

      it('preserves numeric-looking string values (e.g., "007") as strings, not numbers', async () => {
        const csv = 'type,user.id,criticality_level\nuser,007,high_impact\n';
        await csvUploadV2({ entityStoreClient, fileStream: createMockStream(csv), logger });

        expect(entityStoreClient.listEntities).toHaveBeenCalledWith(
          expect.objectContaining({
            filter: expect.arrayContaining([{ term: { 'user.id': '007' } }]),
          })
        );
      });

      it('marks a row as failed when bulk update returns an error for one of its matched entities', async () => {
        (entityStoreClient.listEntities as jest.Mock).mockResolvedValueOnce({
          entities: [{ entity: { id: 'host:my-host-1' } }, { entity: { id: 'host:my-host-2' } }],
          nextSearchAfter: undefined,
        });

        (entityStoreClient.bulkUpdateEntity as jest.Mock).mockResolvedValueOnce([
          {
            _id: hashEuid('host:my-host-1'),
            status: 404,
            type: 'document_missing_exception',
            reason: '[2]: document missing',
          },
        ]);

        const csv = 'type,host.name,criticality_level\nhost,my-host,high_impact\n';
        const result = await csvUploadV2({
          entityStoreClient,
          fileStream: createMockStream(csv),
          logger,
        });

        expect(result.total).toBe(1);
        expect(result.successful).toBe(0);
        expect(result.failed).toBe(1);
        expect(result.unmatched).toBe(0);
        expect(result.items[0].status).toBe('failure');
        expect(result.items[0].matchedEntities).toBe(2);
        expect(result.items[0].error).toBe('[2]: document missing');
      });

      it('computes correct counts across mixed outcomes for a 5-row upload', async () => {
        // Row 0: 2 entities matched, both updates succeed
        // Row 1: 1 entity matched, update succeeds
        // Row 2: 0 entities matched (unmatched)
        // Row 3: 3 entities matched, 1 update fails
        // Row 4: 1 entity matched, update fails
        (entityStoreClient.listEntities as jest.Mock)
          .mockResolvedValueOnce({
            entities: [{ entity: { id: 'host:r0-e1' } }, { entity: { id: 'host:r0-e2' } }],
            nextSearchAfter: undefined,
          })
          .mockResolvedValueOnce({
            entities: [{ entity: { id: 'host:r1-e1' } }],
            nextSearchAfter: undefined,
          })
          .mockResolvedValueOnce({ entities: [], nextSearchAfter: undefined })
          .mockResolvedValueOnce({
            entities: [
              { entity: { id: 'host:r3-e1' } },
              { entity: { id: 'host:r3-e2' } },
              { entity: { id: 'host:r3-e3' } },
            ],
            nextSearchAfter: undefined,
          })
          .mockResolvedValueOnce({
            entities: [{ entity: { id: 'host:r4-e1' } }],
            nextSearchAfter: undefined,
          });

        (entityStoreClient.bulkUpdateEntity as jest.Mock).mockResolvedValueOnce([
          {
            _id: hashEuid('host:r3-e2'),
            status: 429,
            type: 'es_rejected_execution_exception',
            reason: 'rejected execution',
          },
          {
            _id: hashEuid('host:r4-e1'),
            status: 503,
            type: 'unavailable',
            reason: 'service unavailable',
          },
        ]);

        const csv = [
          'type,host.name,criticality_level',
          'host,host-0,high_impact',
          'host,host-1,medium_impact',
          'host,host-2,low_impact',
          'host,host-3,extreme_impact',
          'host,host-4,high_impact',
        ].join('\n');

        const result = await csvUploadV2({
          entityStoreClient,
          fileStream: createMockStream(csv),
          logger,
        });

        expect(result.total).toBe(5);
        expect(result.successful).toBe(2);
        expect(result.failed).toBe(2);
        expect(result.unmatched).toBe(1);

        expect(result.items[0]).toEqual(
          expect.objectContaining({ status: 'success', matchedEntities: 2 })
        );
        expect(result.items[1]).toEqual(
          expect.objectContaining({ status: 'success', matchedEntities: 1 })
        );
        expect(result.items[2]).toEqual(
          expect.objectContaining({ status: 'unmatched', matchedEntities: 0 })
        );
        expect(result.items[3]).toEqual(
          expect.objectContaining({
            status: 'failure',
            matchedEntities: 3,
            error: 'rejected execution',
          })
        );
        expect(result.items[4]).toEqual(
          expect.objectContaining({
            status: 'failure',
            matchedEntities: 1,
            error: 'service unavailable',
          })
        );
      });
    });

    it('returns empty stats and no errors for a header-only CSV', async () => {
      const csv = 'type,criticality_level,host.name\n';
      const result = await csvUploadV2({
        entityStoreClient,
        fileStream: createMockStream(csv),
        logger,
      });
      expect(result).toEqual({
        successful: 0,
        failed: 0,
        total: 0,
        unmatched: 0,
        items: [],
      });
      expect(entityStoreClient.listEntities).not.toHaveBeenCalled();
      expect(entityStoreClient.bulkUpdateEntity).not.toHaveBeenCalled();
    });
  });
});
