/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { executeEsql } from '@kbn/agent-builder-genai-utils';
import {
  isHighConfidenceSingleMatch,
  normalizeEntityId,
  resolveSingleEntity,
  type EntityMatchSource,
} from './entity_resolution';

jest.mock('@kbn/agent-builder-genai-utils', () => ({
  executeEsql: jest.fn(),
}));

const mockExecuteEsql = executeEsql as jest.Mock;
const esClient = {} as unknown as ElasticsearchClient;

const singleHostRow = {
  columns: [
    { name: 'entity.id', type: 'keyword' },
    { name: 'entity.name', type: 'keyword' },
    { name: 'entity.EngineMetadata.Type', type: 'keyword' },
  ],
  values: [['host:server1', 'server1', 'host']],
};

const empty = { columns: [], values: [] };

describe('entity_resolution', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('normalizeEntityId', () => {
    it('prefixes a bare id when a type is given', () => {
      expect(normalizeEntityId('server1', 'host')).toBe('host:server1');
    });
    it('leaves an already-prefixed id unchanged', () => {
      expect(normalizeEntityId('host:server1', 'host')).toBe('host:server1');
    });
    it('leaves the id unchanged when no type is given', () => {
      expect(normalizeEntityId('server1')).toBe('server1');
    });
  });

  describe('isHighConfidenceSingleMatch', () => {
    const args = (source: EntityMatchSource, values: unknown[][]) => ({
      source,
      columns: singleHostRow.columns,
      values,
      entityId: 'server1',
    });

    it('trusts an exact id match', () => {
      expect(
        isHighConfidenceSingleMatch(args('exact_id', [['host:server1', 'server1', 'host']]))
      ).toBe(true);
    });
    it('trusts an exact name match', () => {
      expect(
        isHighConfidenceSingleMatch(args('exact_name', [['host:server1', 'server1', 'host']]))
      ).toBe(true);
    });
    it('rejects more than one row', () => {
      expect(
        isHighConfidenceSingleMatch(
          args('exact_id', [
            ['host:server1', 'server1', 'host'],
            ['host:server2', 'server2', 'host'],
          ])
        )
      ).toBe(false);
    });
    it('trusts a rlike_id match whose stripped id equals the input', () => {
      expect(
        isHighConfidenceSingleMatch(args('rlike_id', [['host:server1', 'server1', 'host']]))
      ).toBe(true);
    });
    it('rejects a rlike_id match whose stripped id does not equal the input', () => {
      expect(
        isHighConfidenceSingleMatch(args('rlike_id', [['host:server123', 'server123', 'host']]))
      ).toBe(false);
    });
    it('never trusts a rlike_name match', () => {
      expect(
        isHighConfidenceSingleMatch(args('rlike_name', [['host:server1', 'server1', 'host']]))
      ).toBe(false);
    });
  });

  describe('resolveSingleEntity', () => {
    it('returns not_found when nothing matches', async () => {
      mockExecuteEsql
        .mockResolvedValueOnce(empty)
        .mockResolvedValueOnce(empty)
        .mockResolvedValueOnce(empty)
        .mockResolvedValueOnce(empty);

      const result = await resolveSingleEntity({ esClient, spaceId: 'default', entityId: 'nope' });
      expect(result.status).toBe('not_found');
    });

    it('returns resolved with a descriptor on an exact single hit', async () => {
      mockExecuteEsql.mockResolvedValueOnce(singleHostRow);

      const result = await resolveSingleEntity({
        esClient,
        spaceId: 'default',
        entityId: 'host:server1',
        entityType: 'host',
      });

      expect(result.status).toBe('resolved');
      if (result.status === 'resolved') {
        expect(result.identity).toEqual({
          identifierType: 'host',
          identifier: 'server1',
          entityStoreId: 'host:server1',
        });
      }
    });

    it('returns ambiguous with candidate ids when more than one row matches', async () => {
      mockExecuteEsql
        .mockResolvedValueOnce(empty)
        .mockResolvedValueOnce(empty)
        .mockResolvedValueOnce({
          columns: [{ name: 'entity.id', type: 'keyword' }],
          values: [['host:server1'], ['host:server10']],
        });

      const result = await resolveSingleEntity({
        esClient,
        spaceId: 'default',
        entityId: 'server',
      });

      expect(result.status).toBe('ambiguous');
      if (result.status === 'ambiguous') {
        expect(result.matchCount).toBe(2);
        expect(result.candidateEntityIds).toEqual(['host:server1', 'host:server10']);
      }
    });

    it('returns no_identity when a single match lacks a usable identifier/type', async () => {
      // Exact-id single hit but the row has no entity.EngineMetadata.Type column,
      // so describeEntityRow cannot classify it.
      mockExecuteEsql.mockResolvedValueOnce({
        columns: [{ name: 'entity.id', type: 'keyword' }],
        values: [['host:server1']],
      });

      const result = await resolveSingleEntity({
        esClient,
        spaceId: 'default',
        entityId: 'host:server1',
        entityType: 'host',
      });

      expect(result.status).toBe('no_identity');
    });
  });
});
