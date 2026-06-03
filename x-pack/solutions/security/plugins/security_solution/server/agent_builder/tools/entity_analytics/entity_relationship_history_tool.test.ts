/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType, type ErrorResult, type OtherResult } from '@kbn/agent-builder-common';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import { coreMock } from '@kbn/core/server/mocks';
import {
  createToolAvailabilityContext,
  createToolHandlerContext,
  createToolTestMocks,
} from '../../__mocks__/test_helpers';
import { entityRelationshipHistoryTool } from './entity_relationship_history_tool';

const ENTITY_ID = 'user:alice@local';
const SPACE_ID = 'default';
const INDEX = `.entities.v2.metadata.security_${SPACE_ID}`;

const makeRecord = (overrides: Record<string, unknown> = {}) => ({
  '@timestamp': '2026-05-29T20:36:15.691Z',
  'event.action': 'relationship_observed',
  'entity.id': ENTITY_ID,
  'entity.source': 'elastic_defend',
  ...overrides,
});

const makeListResult = (records: ReturnType<typeof makeRecord>[] = [makeRecord()]) => ({
  records,
  total: records.length,
  page: 1,
  per_page: 10,
});

describe('entityRelationshipHistoryTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  const tool = entityRelationshipHistoryTool(mockCore, mockLogger);

  const mockListRelationshipMetadata = jest.fn();
  const mockCreateCRUDClient = jest.fn(() => ({
    listRelationshipMetadata: mockListRelationshipMetadata,
  }));

  beforeEach(() => {
    jest.clearAllMocks();

    const mockCoreStart = coreMock.createStart();
    Object.assign(mockCoreStart.elasticsearch.client, {
      asInternalUser: mockEsClient.asInternalUser,
      asCurrentUser: mockEsClient.asCurrentUser,
    });
    mockCore.getStartServices.mockResolvedValue([
      mockCoreStart,
      { entityStore: { createCRUDClient: mockCreateCRUDClient } },
      {},
    ]);

    mockListRelationshipMetadata.mockResolvedValue(makeListResult());
  });

  // ── Schema ───────────────────────────────────────────────────────────────────

  describe('schema', () => {
    it('validates with only entityId', () => {
      expect(tool.schema.safeParse({ entityId: ENTITY_ID }).success).toBe(true);
    });

    it('validates with all fields', () => {
      expect(
        tool.schema.safeParse({
          entityId: ENTITY_ID,
          kind: 'accesses_frequently',
          target: 'host:laptopA',
          from: '2026-05-01T00:00:00Z',
          to: '2026-05-29T23:59:59Z',
          sort_order: 'asc',
          per_page: 1,
        }).success
      ).toBe(true);
    });

    it('rejects empty entityId', () => {
      expect(tool.schema.safeParse({ entityId: '' }).success).toBe(false);
    });

    it('rejects invalid kind', () => {
      expect(tool.schema.safeParse({ entityId: ENTITY_ID, kind: 'invented_kind' }).success).toBe(
        false
      );
    });

    it('rejects per_page below minimum', () => {
      expect(tool.schema.safeParse({ entityId: ENTITY_ID, per_page: 0 }).success).toBe(false);
    });

    it('rejects per_page above maximum', () => {
      expect(tool.schema.safeParse({ entityId: ENTITY_ID, per_page: 101 }).success).toBe(false);
    });

    it('rejects invalid sort_order', () => {
      expect(tool.schema.safeParse({ entityId: ENTITY_ID, sort_order: 'random' }).success).toBe(
        false
      );
    });
  });

  // ── Availability ─────────────────────────────────────────────────────────────

  describe('availability', () => {
    it('returns available when datastream exists', async () => {
      mockEsClient.asInternalUser.indices.exists.mockResolvedValueOnce(true);

      const result = await tool.availability!.handler(
        createToolAvailabilityContext(mockRequest, SPACE_ID)
      );

      expect(result.status).toBe('available');
      expect(mockEsClient.asInternalUser.indices.exists).toHaveBeenCalledWith({ index: INDEX });
    });

    it('returns unavailable when datastream does not exist', async () => {
      mockEsClient.asInternalUser.indices.exists.mockResolvedValueOnce(false);

      const result = await tool.availability!.handler(
        createToolAvailabilityContext(mockRequest, SPACE_ID)
      );

      expect(result.status).toBe('unavailable');
      expect(result.reason).toBe('entity metadata datastream does not exist for this space');
    });

    it('returns unavailable when index check throws', async () => {
      mockEsClient.asInternalUser.indices.exists.mockRejectedValueOnce(new Error('ES error'));

      const result = await tool.availability!.handler(
        createToolAvailabilityContext(mockRequest, SPACE_ID)
      );

      expect(result.status).toBe('unavailable');
      expect(result.reason).toContain('Failed to check entity metadata datastream availability');
    });
  });

  // ── Handler — params forwarding ──────────────────────────────────────────────

  describe('handler — params forwarding', () => {
    const ctx = () =>
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger, { spaceId: SPACE_ID });

    it('forwards all params to listRelationshipMetadata', async () => {
      await tool.handler(
        {
          entityId: ENTITY_ID,
          kind: 'communicates_with',
          target: 'host:laptopA',
          from: '2026-05-01T00:00:00Z',
          to: '2026-05-29T23:59:59Z',
          sort_order: 'asc',
          per_page: 1,
        },
        ctx()
      );

      expect(mockListRelationshipMetadata).toHaveBeenCalledWith({
        entityId: ENTITY_ID,
        kind: 'communicates_with',
        target: 'host:laptopA',
        from: '2026-05-01T00:00:00Z',
        to: '2026-05-29T23:59:59Z',
        sort_order: 'asc',
        per_page: 1,
      });
    });

    it('uses spaceId as the CRUD client namespace', async () => {
      await tool.handler(
        { entityId: ENTITY_ID },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, { spaceId: 'my-space' })
      );

      expect(mockCreateCRUDClient).toHaveBeenCalledWith(expect.anything(), 'my-space');
    });

    it('passes esClient.asCurrentUser to the CRUD client', async () => {
      await tool.handler({ entityId: ENTITY_ID }, ctx());

      expect(mockCreateCRUDClient).toHaveBeenCalledWith(mockEsClient.asCurrentUser, SPACE_ID);
    });
  });

  // ── Handler — response shape ─────────────────────────────────────────────────

  describe('handler — response shape', () => {
    const ctx = () =>
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger, { spaceId: SPACE_ID });

    it('returns records and total on success', async () => {
      const record = makeRecord({
        'entity.relationships.communicates_with.target': 'host:laptopA',
      });
      mockListRelationshipMetadata.mockResolvedValueOnce(makeListResult([record]));

      const result = (await tool.handler(
        { entityId: ENTITY_ID },
        ctx()
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe(ToolResultType.other);
      const otherResult = result.results[0] as OtherResult;
      expect(otherResult.data).toHaveProperty('total', 1);
      expect((otherResult.data as { records: unknown[] }).records[0]).toEqual({
        kind: 'communicates_with',
        target: 'host:laptopA',
        timestamp: '2026-05-29T20:36:15.691Z',
        source: 'elastic_defend',
      });
    });

    it('returns error result when no records are found', async () => {
      mockListRelationshipMetadata.mockResolvedValueOnce(makeListResult([]));

      const result = (await tool.handler(
        { entityId: ENTITY_ID },
        ctx()
      )) as ToolHandlerStandardReturn;

      expect(result.results[0].type).toBe(ToolResultType.error);
      const errorResult = result.results[0] as ErrorResult;
      expect(errorResult.data.message).toContain(ENTITY_ID);
    });

    it('returns error result when CRUD client throws', async () => {
      mockListRelationshipMetadata.mockRejectedValueOnce(new Error('cluster_unavailable'));

      const result = (await tool.handler(
        { entityId: ENTITY_ID },
        ctx()
      )) as ToolHandlerStandardReturn;

      expect(result.results[0].type).toBe(ToolResultType.error);
      const errorResult = result.results[0] as ErrorResult;
      expect(errorResult.data.message).toContain('Error fetching relationship history');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
