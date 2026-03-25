/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType, type ErrorResult } from '@kbn/agent-builder-common';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import {
  createToolHandlerContext,
  createToolTestMocks,
  setupMockCoreStartServices,
} from '../__mocks__/test_helpers';
import { timelineCreateTool } from './timeline_create_tool';
import { coreMock } from '@kbn/core/server/mocks';

describe('timelineCreateTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  const tool = timelineCreateTool(mockCore, mockLogger);

  const mockSavedObjectsClient = {
    create: jest.fn(),
    get: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    bulkCreate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up core start services with a savedObjects client
    const mockCoreStart = coreMock.createStart();
    Object.assign(mockCoreStart.elasticsearch.client, {
      asInternalUser: mockEsClient.asInternalUser,
      asCurrentUser: mockEsClient.asCurrentUser,
    });
    mockCoreStart.savedObjects.getScopedClient = jest.fn().mockReturnValue(mockSavedObjectsClient);
    mockCore.getStartServices.mockResolvedValue([mockCoreStart, {}, {}]);
  });

  describe('schema', () => {
    it('validates correct input with title and event_ids', () => {
      const validInput = {
        title: 'Investigation Timeline',
        event_ids: ['event-1', 'event-2'],
      };

      const result = tool.schema.safeParse(validInput);

      expect(result.success).toBe(true);
    });

    it('accepts optional description', () => {
      const validInput = {
        title: 'Investigation Timeline',
        description: 'Timeline for investigating suspicious activity',
        event_ids: ['event-1'],
      };

      const result = tool.schema.safeParse(validInput);

      expect(result.success).toBe(true);
    });

    it('accepts optional index_pattern', () => {
      const validInput = {
        title: 'Investigation Timeline',
        event_ids: ['event-1'],
        index_pattern: 'logs-*',
      };

      const result = tool.schema.safeParse(validInput);

      expect(result.success).toBe(true);
    });

    it('rejects missing title', () => {
      const invalidInput = {
        event_ids: ['event-1'],
      };

      const result = tool.schema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });

    it('rejects missing event_ids', () => {
      const invalidInput = {
        title: 'Investigation Timeline',
      };

      const result = tool.schema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });

    it('accepts empty event_ids array', () => {
      const validInput = {
        title: 'Investigation Timeline',
        event_ids: [],
      };

      const result = tool.schema.safeParse(validInput);

      expect(result.success).toBe(true);
    });
  });

  describe('handler', () => {
    it('verifies events exist via search and creates timeline', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        hits: {
          hits: [
            { _id: 'event-1', _index: '.alerts-security.alerts-default' },
            { _id: 'event-2', _index: '.alerts-security.alerts-default' },
          ],
          total: { value: 2, relation: 'eq' },
        },
      } as never);

      mockSavedObjectsClient.create.mockResolvedValue({ id: 'timeline-123' });

      const result = (await tool.handler(
        { title: 'Test Timeline', event_ids: ['event-1', 'event-2'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe(ToolResultType.other);
      expect(result.results[0].data).toEqual(
        expect.objectContaining({
          timeline_id: 'timeline-123',
          title: 'Test Timeline',
          pinned_events: 2,
        })
      );
    });

    it('creates timeline saved object with correct type', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        hits: {
          hits: [{ _id: 'event-1', _index: '.alerts-security.alerts-default' }],
          total: { value: 1, relation: 'eq' },
        },
      } as never);

      mockSavedObjectsClient.create.mockResolvedValue({ id: 'timeline-456' });

      await tool.handler(
        { title: 'Test Timeline', event_ids: ['event-1'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      // Verify the first call creates the timeline SO
      expect(mockSavedObjectsClient.create).toHaveBeenCalledWith(
        'siem-ui-timeline',
        expect.objectContaining({
          title: 'Test Timeline',
          status: 'draft',
          timelineType: 'default',
        }),
        expect.objectContaining({ overwrite: false })
      );
    });

    it('pins events to the timeline', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        hits: {
          hits: [
            { _id: 'event-1', _index: '.alerts-security.alerts-default' },
            { _id: 'event-2', _index: '.alerts-security.alerts-default' },
          ],
          total: { value: 2, relation: 'eq' },
        },
      } as never);

      mockSavedObjectsClient.create.mockResolvedValue({ id: 'timeline-789' });

      await tool.handler(
        { title: 'Test Timeline', event_ids: ['event-1', 'event-2'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      // First call is for the timeline, subsequent calls are for pinned events
      const pinnedEventCalls = mockSavedObjectsClient.create.mock.calls.filter(
        (call: unknown[]) => call[0] === 'siem-ui-timeline-pinned-event'
      );
      expect(pinnedEventCalls).toHaveLength(2);
      expect(pinnedEventCalls[0][1]).toEqual(
        expect.objectContaining({
          eventId: 'event-1',
          timelineId: 'timeline-789',
        })
      );
      expect(pinnedEventCalls[1][1]).toEqual(
        expect.objectContaining({
          eventId: 'event-2',
          timelineId: 'timeline-789',
        })
      );
    });

    it('returns timeline URL', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        hits: {
          hits: [{ _id: 'event-1', _index: '.alerts-security.alerts-default' }],
          total: { value: 1, relation: 'eq' },
        },
      } as never);

      mockSavedObjectsClient.create.mockResolvedValue({ id: 'timeline-url-test' });

      const result = (await tool.handler(
        { title: 'Test Timeline', event_ids: ['event-1'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results[0].data.url).toContain('/app/security/timelines');
      expect(result.results[0].data.url).toContain('timeline-url-test');
    });

    it('handles missing events gracefully (some found, some not)', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        hits: {
          hits: [{ _id: 'event-1', _index: '.alerts-security.alerts-default' }],
          total: { value: 1, relation: 'eq' },
        },
      } as never);

      mockSavedObjectsClient.create.mockResolvedValue({ id: 'timeline-partial' });

      const result = (await tool.handler(
        { title: 'Partial Timeline', event_ids: ['event-1', 'event-missing'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results[0].type).toBe(ToolResultType.other);
      expect(result.results[0].data).toEqual(
        expect.objectContaining({
          pinned_events: 1,
          missing_events: ['event-missing'],
        })
      );
      expect(result.results[0].data.message).toContain('1 event(s) were not found');
    });

    it('errors when no events found', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        hits: {
          hits: [],
          total: { value: 0, relation: 'eq' },
        },
      } as never);

      const result = (await tool.handler(
        { title: 'Empty Timeline', event_ids: ['nonexistent-1', 'nonexistent-2'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      const errorResult = result.results[0] as ErrorResult;
      expect(errorResult.type).toBe(ToolResultType.error);
      expect(errorResult.data.message).toContain('None of the specified event IDs were found');
    });

    it('uses custom index_pattern when provided', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        hits: {
          hits: [{ _id: 'event-1', _index: 'custom-index' }],
          total: { value: 1, relation: 'eq' },
        },
      } as never);

      mockSavedObjectsClient.create.mockResolvedValue({ id: 'timeline-custom' });

      await tool.handler(
        {
          title: 'Custom Index Timeline',
          event_ids: ['event-1'],
          index_pattern: 'custom-index-*',
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const searchCall = mockEsClient.asCurrentUser.search.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(searchCall.index).toBe('custom-index-*');
    });

    it('handles ES search errors', async () => {
      mockEsClient.asCurrentUser.search.mockRejectedValue(
        new Error('Search service unavailable')
      );

      const result = (await tool.handler(
        { title: 'Failing Timeline', event_ids: ['event-1'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      const errorResult = result.results[0] as ErrorResult;
      expect(errorResult.type).toBe(ToolResultType.error);
      expect(errorResult.data.message).toContain('Search service unavailable');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('handles saved objects create errors', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        hits: {
          hits: [{ _id: 'event-1', _index: '.alerts-security.alerts-default' }],
          total: { value: 1, relation: 'eq' },
        },
      } as never);

      mockSavedObjectsClient.create.mockRejectedValue(
        new Error('Saved objects write error')
      );

      const result = (await tool.handler(
        { title: 'Failing Timeline', event_ids: ['event-1'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      const errorResult = result.results[0] as ErrorResult;
      expect(errorResult.type).toBe(ToolResultType.error);
      expect(errorResult.data.message).toContain('Saved objects write error');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
