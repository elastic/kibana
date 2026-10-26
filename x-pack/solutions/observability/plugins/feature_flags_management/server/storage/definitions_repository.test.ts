/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { GetResponse } from '@elastic/elasticsearch/lib/api/types';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { EnvironmentAttributes } from '../../common/schemas/environments';
import type { DefinitionDocument } from './definitions_repository';
import { DefinitionsRepository, definitionId } from './definitions_repository';
import { DEFINITIONS_INDEX } from './indices';
import { encodeVersion } from './version';

const CREATED_AT = '2026-01-01T00:00:00.000Z';
const NOW = '2026-02-02T00:00:00.000Z';
const ID = definitionId('environment', 'production');

const esResponseError = (statusCode: number) =>
  new errors.ResponseError({
    statusCode,
    body: {},
    headers: {},
    warnings: [],
    meta: {} as never,
  });

const storedDocument = (): DefinitionDocument<'environment'> => ({
  type: 'environment',
  created_at: CREATED_AT,
  updated_at: CREATED_AT,
  revision: 3,
  environment: { key: 'production', name: 'Production' },
});

const getResponse = (): GetResponse<DefinitionDocument<'environment'>> => ({
  _index: DEFINITIONS_INDEX,
  _id: ID,
  found: true,
  _seq_no: 7,
  _primary_term: 1,
  _source: storedDocument(),
});

describe('DefinitionsRepository', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let repository: DefinitionsRepository;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    repository = new DefinitionsRepository({
      esClient,
      ensureReady: async () => {},
      now: () => new Date(NOW),
    });
  });

  describe('create', () => {
    it('sets the timestamps and revision, ignoring any in the attributes', async () => {
      esClient.index.mockResolvedValue({
        _index: DEFINITIONS_INDEX,
        _id: ID,
        _seq_no: 0,
        _primary_term: 1,
        result: 'created',
        _version: 1,
        _shards: { total: 1, successful: 1, failed: 0 },
      });
      const attributes = {
        key: 'production',
        name: 'Production',
        created_at: '1999-01-01T00:00:00.000Z',
        revision: 99,
      } as EnvironmentAttributes;

      const entity = await repository.create('environment', ID, attributes);

      expect(esClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          index: DEFINITIONS_INDEX,
          id: ID,
          op_type: 'create',
          refresh: 'wait_for',
          document: expect.objectContaining({
            type: 'environment',
            created_at: NOW,
            updated_at: NOW,
            revision: 1,
          }),
        })
      );
      expect(entity).toEqual(
        expect.objectContaining({
          created_at: NOW,
          updated_at: NOW,
          revision: 1,
          version: encodeVersion({ seqNo: 0, primaryTerm: 1 }),
        })
      );
    });

    it('maps an ES 409 to a conflict', async () => {
      esClient.index.mockRejectedValue(esResponseError(409));
      await expect(
        repository.create('environment', ID, { key: 'production', name: 'Production' })
      ).rejects.toMatchObject({ statusCode: 409 });
    });
  });

  describe('update', () => {
    beforeEach(() => {
      esClient.get.mockResolvedValue(getResponse());
      esClient.index.mockResolvedValue({
        _index: DEFINITIONS_INDEX,
        _id: ID,
        _seq_no: 8,
        _primary_term: 1,
        result: 'updated',
        _version: 2,
        _shards: { total: 1, successful: 1, failed: 0 },
      });
    });

    it('keeps created_at, bumps the revision and writes with OCC', async () => {
      const entity = await repository.update('environment', ID, {
        key: 'production',
        name: 'Prod',
      });

      expect(esClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          if_seq_no: 7,
          if_primary_term: 1,
          refresh: 'wait_for',
          document: expect.objectContaining({
            created_at: CREATED_AT,
            updated_at: NOW,
            revision: 4,
            environment: { key: 'production', name: 'Prod' },
          }),
        })
      );
      expect(entity.version).toEqual(encodeVersion({ seqNo: 8, primaryTerm: 1 }));
    });

    it('rejects a stale version without writing', async () => {
      await expect(
        repository.update(
          'environment',
          ID,
          { key: 'production', name: 'Prod' },
          { version: encodeVersion({ seqNo: 6, primaryTerm: 1 }) }
        )
      ).rejects.toMatchObject({ statusCode: 409 });
      expect(esClient.index).not.toHaveBeenCalled();
    });

    it('maps an ES version conflict to a conflict', async () => {
      esClient.index.mockRejectedValue(esResponseError(409));
      await expect(
        repository.update(
          'environment',
          ID,
          { key: 'production', name: 'Prod' },
          { version: encodeVersion({ seqNo: 7, primaryTerm: 1 }) }
        )
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('returns 404 when the document does not exist', async () => {
      esClient.get.mockResolvedValue({ _index: DEFINITIONS_INDEX, _id: ID, found: false });
      await expect(
        repository.update('environment', ID, { key: 'production', name: 'Prod' })
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('does not read documents of another type', async () => {
      await expect(repository.get('app', ID)).resolves.toBeUndefined();
    });
  });

  describe('delete', () => {
    it('hard-deletes with OCC and returns the last state', async () => {
      esClient.get.mockResolvedValue(getResponse());
      const deleted = await repository.delete('environment', ID);

      expect(esClient.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          id: ID,
          if_seq_no: 7,
          if_primary_term: 1,
          refresh: 'wait_for',
        })
      );
      expect(deleted.attributes).toEqual({ key: 'production', name: 'Production' });
    });
  });

  describe('findAll', () => {
    it('pages with a point in time instead of sorting on _id', async () => {
      esClient.openPointInTime.mockResolvedValue({
        id: 'pit-1',
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      });
      esClient.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        pit_id: 'pit-2',
        hits: {
          hits: [
            {
              _index: DEFINITIONS_INDEX,
              _id: definitionId('credential', 'kibana', 'production'),
              _seq_no: 1,
              _primary_term: 1,
              _source: {
                type: 'credential',
                created_at: CREATED_AT,
                updated_at: CREATED_AT,
                revision: 1,
                credential: {
                  app: 'kibana',
                  environment: 'production',
                  sdk_key_hash: 'abc',
                  sdk_key_hint: 'hint',
                  client_id: 'ffcli-1',
                },
              },
              sort: ['production', 0],
            },
          ],
        },
      });

      const items = await repository.findAll('credential', { term: { 'credential.app': 'kibana' } });

      expect(items).toHaveLength(1);
      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          pit: { id: 'pit-1', keep_alive: '1m' },
          sort: [{ 'credential.environment': 'asc' }, '_shard_doc'],
        })
      );
      expect(esClient.search).not.toHaveBeenCalledWith(
        expect.objectContaining({ index: DEFINITIONS_INDEX })
      );
      expect(esClient.closePointInTime).toHaveBeenCalledWith({ id: 'pit-2' });
    });
  });
});
