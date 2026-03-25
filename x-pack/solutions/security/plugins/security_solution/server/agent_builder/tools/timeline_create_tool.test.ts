/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType, type ErrorResult } from '@kbn/agent-builder-common';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import { createToolHandlerContext, createToolTestMocks } from '../__mocks__/test_helpers';
import { timelineCreateTool } from './timeline_create_tool';

jest.mock('../../lib/timeline/saved_object/timelines', () => ({
  createTimeline: jest.fn(),
}));

jest.mock('../../lib/timeline/saved_object/pinned_events', () => ({
  savePinnedEvents: jest.fn(),
}));

import { createTimeline } from '../../lib/timeline/saved_object/timelines';
import { savePinnedEvents } from '../../lib/timeline/saved_object/pinned_events';

const mockCreateTimeline = createTimeline as jest.MockedFunction<typeof createTimeline>;
const mockSavePinnedEvents = savePinnedEvents as jest.MockedFunction<typeof savePinnedEvents>;

describe('timelineCreateTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  const tool = timelineCreateTool(mockCore, mockLogger);

  beforeEach(() => {
    jest.clearAllMocks();

    mockCreateTimeline.mockResolvedValue({
      timeline: {
        savedObjectId: 'timeline-123',
        version: '1',
      },
    } as ReturnType<typeof createTimeline> extends Promise<infer T> ? T : never);

    mockSavePinnedEvents.mockResolvedValue(undefined as unknown as ReturnType<typeof savePinnedEvents> extends Promise<infer T> ? T : never);
  });

  describe('schema', () => {
    it('validates correct input with title and event_ids', () => {
      const result = tool.schema.safeParse({
        title: 'Investigation Timeline',
        event_ids: ['event-1', 'event-2'],
      });
      expect(result.success).toBe(true);
    });

    it('accepts optional description', () => {
      const result = tool.schema.safeParse({
        title: 'Timeline',
        event_ids: ['event-1'],
        description: 'Test description',
      });
      expect(result.success).toBe(true);
    });

    it('accepts optional index_pattern', () => {
      const result = tool.schema.safeParse({
        title: 'Timeline',
        event_ids: ['event-1'],
        index_pattern: 'custom-index-*',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty title', () => {
      const result = tool.schema.safeParse({
        title: '',
        event_ids: ['event-1'],
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty event_ids array', () => {
      const result = tool.schema.safeParse({
        title: 'Timeline',
        event_ids: [],
      });
      expect(result.success).toBe(false);
    });

    it('enforces max title length', () => {
      const result = tool.schema.safeParse({
        title: 'a'.repeat(257),
        event_ids: ['event-1'],
      });
      expect(result.success).toBe(false);
    });

    it('enforces max event_ids count', () => {
      const result = tool.schema.safeParse({
        title: 'Timeline',
        event_ids: Array.from({ length: 101 }, (_, i) => `event-${i}`),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('handler', () => {
    const mockSavedObjectsClient = {
      create: jest.fn(),
      get: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      bulkCreate: jest.fn(),
    };

    const createContext = (overrides = {}) =>
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
        savedObjectsClient: mockSavedObjectsClient as any,
        ...overrides,
      });

    it('verifies events exist and creates timeline via Timeline API', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        hits: {
          hits: [{ _id: 'event-1' }, { _id: 'event-2' }],
        },
      } as any);

      const result = (await tool.handler(
        { title: 'Test Timeline', event_ids: ['event-1', 'event-2'] },
        createContext()
      )) as ToolHandlerStandardReturn;

      expect(result.results[0].type).toBe(ToolResultType.other);
      expect(result.results[0].data).toMatchObject({
        timeline_id: 'timeline-123',
        title: 'Test Timeline',
        pinned_events: 2,
      });
    });

    it('calls createTimeline with correct parameters', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        hits: { hits: [{ _id: 'event-1' }] },
      } as any);

      await tool.handler(
        { title: 'My Timeline', description: 'Test desc', event_ids: ['event-1'] },
        createContext()
      );

      expect(mockCreateTimeline).toHaveBeenCalledWith(
        expect.objectContaining({
          timelineId: null,
          timeline: expect.objectContaining({
            title: 'My Timeline',
            description: 'Test desc',
          }),
          savedObjectsClient: mockSavedObjectsClient,
          userInfo: null,
        })
      );
    });

    it('calls savePinnedEvents with found event IDs', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        hits: { hits: [{ _id: 'event-1' }, { _id: 'event-2' }] },
      } as any);

      await tool.handler(
        { title: 'Timeline', event_ids: ['event-1', 'event-2'] },
        createContext()
      );

      expect(mockSavePinnedEvents).toHaveBeenCalledWith(
        expect.anything(), // frameworkRequest
        'timeline-123',
        ['event-1', 'event-2']
      );
    });

    it('returns timeline URL', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        hits: { hits: [{ _id: 'event-1' }] },
      } as any);

      const result = (await tool.handler(
        { title: 'Timeline', event_ids: ['event-1'] },
        createContext()
      )) as ToolHandlerStandardReturn;

      expect(result.results[0].data).toMatchObject({
        url: expect.stringContaining("timeline=(id:'timeline-123'"),
      });
    });

    it('handles partial events — some found, some missing', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        hits: { hits: [{ _id: 'event-1' }] },
      } as any);

      const result = (await tool.handler(
        { title: 'Timeline', event_ids: ['event-1', 'event-missing'] },
        createContext()
      )) as ToolHandlerStandardReturn;

      expect(result.results[0].type).toBe(ToolResultType.other);
      expect(result.results[0].data).toMatchObject({
        pinned_events: 1,
        missing_events: ['event-missing'],
      });
    });

    it('returns error when no events found', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        hits: { hits: [] },
      } as any);

      const result = (await tool.handler(
        { title: 'Timeline', event_ids: ['event-missing'] },
        createContext()
      )) as ToolHandlerStandardReturn;

      const error = result.results[0] as ErrorResult;
      expect(error.type).toBe(ToolResultType.error);
      expect(error.data.message).toContain('None of the specified event IDs were found');
    });

    it('uses custom index_pattern when provided', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        hits: { hits: [{ _id: 'event-1' }] },
      } as any);

      await tool.handler(
        { title: 'Timeline', event_ids: ['event-1'], index_pattern: 'custom-index-*' },
        createContext()
      );

      expect(mockEsClient.asCurrentUser.search).toHaveBeenCalledWith(
        expect.objectContaining({ index: 'custom-index-*' })
      );
    });

    it('handles createTimeline errors', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        hits: { hits: [{ _id: 'event-1' }] },
      } as any);
      mockCreateTimeline.mockRejectedValue(new Error('Timeline creation failed'));

      const result = (await tool.handler(
        { title: 'Timeline', event_ids: ['event-1'] },
        createContext()
      )) as ToolHandlerStandardReturn;

      const error = result.results[0] as ErrorResult;
      expect(error.type).toBe(ToolResultType.error);
      expect(error.data.message).toContain('Timeline creation failed');
    });

    it('handles ES search errors', async () => {
      mockEsClient.asCurrentUser.search.mockRejectedValue(new Error('ES unavailable'));

      const result = (await tool.handler(
        { title: 'Timeline', event_ids: ['event-1'] },
        createContext()
      )) as ToolHandlerStandardReturn;

      const error = result.results[0] as ErrorResult;
      expect(error.type).toBe(ToolResultType.error);
      expect(error.data.message).toContain('ES unavailable');
    });
  });
});
