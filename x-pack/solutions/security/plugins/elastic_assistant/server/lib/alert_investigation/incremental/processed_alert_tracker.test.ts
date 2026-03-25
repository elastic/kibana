/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ensureTrackerIndex,
  getProcessedAlertIds,
  updateProcessedAlertIds,
  computeDeltaAlertIds,
} from './processed_alert_tracker';
import type { ProcessedAlertTracker } from '../types';

const createMockEsClient = () => ({
  indices: {
    exists: jest.fn(),
    create: jest.fn(),
  },
  search: jest.fn(),
  index: jest.fn(),
});

const createMockLogger = () => ({
  info: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
  trace: jest.fn(),
  fatal: jest.fn(),
  get: jest.fn(),
  isLevelEnabled: jest.fn().mockReturnValue(true),
  log: jest.fn(),
});

describe('processed_alert_tracker', () => {
  let esClient: ReturnType<typeof createMockEsClient>;
  let logger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    esClient = createMockEsClient();
    logger = createMockLogger();
    jest.clearAllMocks();
  });

  describe('ensureTrackerIndex', () => {
    it('creates index when it does not exist', async () => {
      esClient.indices.exists.mockResolvedValue(false);
      esClient.indices.create.mockResolvedValue({});

      await ensureTrackerIndex({
        esClient: esClient as never,
        spaceId: 'default',
        logger: logger as never,
      });

      expect(esClient.indices.exists).toHaveBeenCalledWith({
        index: '.security-ad-processed-alerts-default',
      });
      expect(esClient.indices.create).toHaveBeenCalledWith(
        expect.objectContaining({
          index: '.security-ad-processed-alerts-default',
          settings: expect.objectContaining({ hidden: true }),
          mappings: expect.objectContaining({
            properties: expect.objectContaining({
              case_id: { type: 'keyword' },
              processed_alert_ids: { type: 'keyword' },
            }),
          }),
        })
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Created processed alert tracker index')
      );
    });

    it('skips creation when index already exists', async () => {
      esClient.indices.exists.mockResolvedValue(true);

      await ensureTrackerIndex({
        esClient: esClient as never,
        spaceId: 'default',
        logger: logger as never,
      });

      expect(esClient.indices.create).not.toHaveBeenCalled();
    });

    it('handles concurrent creation race condition gracefully', async () => {
      esClient.indices.exists.mockResolvedValue(false);
      esClient.indices.create.mockRejectedValue({
        meta: { statusCode: 400, body: { error: { type: 'resource_already_exists_exception' } } },
      });

      await ensureTrackerIndex({
        esClient: esClient as never,
        spaceId: 'default',
        logger: logger as never,
      });

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('already exists (concurrent creation)')
      );
    });

    it('re-throws non-race-condition errors', async () => {
      esClient.indices.exists.mockResolvedValue(false);
      const error = new Error('cluster unavailable');
      esClient.indices.create.mockRejectedValue(error);

      await expect(
        ensureTrackerIndex({
          esClient: esClient as never,
          spaceId: 'default',
          logger: logger as never,
        })
      ).rejects.toThrow('cluster unavailable');
    });

    it('rejects invalid spaceId characters', async () => {
      await expect(
        ensureTrackerIndex({
          esClient: esClient as never,
          spaceId: '../../../etc/passwd',
          logger: logger as never,
        })
      ).rejects.toThrow('Invalid spaceId for tracker index name');
    });

    it('uses space-specific index name', async () => {
      esClient.indices.exists.mockResolvedValue(true);

      await ensureTrackerIndex({
        esClient: esClient as never,
        spaceId: 'my-space',
        logger: logger as never,
      });

      expect(esClient.indices.exists).toHaveBeenCalledWith({
        index: '.security-ad-processed-alerts-my-space',
      });
    });
  });

  describe('getProcessedAlertIds', () => {
    it('returns tracker document when found', async () => {
      esClient.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _id: 'tracker-case-1',
              _source: {
                case_id: 'case-1',
                processed_alert_ids: ['alert-1', 'alert-2'],
                last_processed_at: '2025-01-01T00:00:00Z',
                generation_uuids: ['gen-1'],
              },
              _seq_no: 5,
              _primary_term: 1,
            },
          ],
        },
      });

      const result = await getProcessedAlertIds({
        esClient: esClient as never,
        spaceId: 'default',
        caseId: 'case-1',
        logger: logger as never,
      });

      expect(result).toEqual({
        caseId: 'case-1',
        processedAlertIds: ['alert-1', 'alert-2'],
        lastProcessedAt: '2025-01-01T00:00:00Z',
        generationUuids: ['gen-1'],
        seqNo: 5,
        primaryTerm: 1,
      });
    });

    it('returns null when no tracker document exists', async () => {
      esClient.search.mockResolvedValue({ hits: { hits: [] } });

      const result = await getProcessedAlertIds({
        esClient: esClient as never,
        spaceId: 'default',
        caseId: 'case-unknown',
        logger: logger as never,
      });

      expect(result).toBeNull();
    });

    it('returns null and warns on invalid document structure', async () => {
      esClient.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _id: 'tracker-case-1',
              _source: { case_id: 123, processed_alert_ids: [] },
              _seq_no: 1,
              _primary_term: 1,
            },
          ],
        },
      });

      const result = await getProcessedAlertIds({
        esClient: esClient as never,
        spaceId: 'default',
        caseId: 'case-1',
        logger: logger as never,
      });

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid tracker document structure')
      );
    });

    it('re-throws transient errors to prevent silent data loss', async () => {
      esClient.search.mockRejectedValue(new Error('cluster unavailable'));

      await expect(
        getProcessedAlertIds({
          esClient: esClient as never,
          spaceId: 'default',
          caseId: 'case-1',
          logger: logger as never,
        })
      ).rejects.toThrow('cluster unavailable');
    });

    it('returns null for 404 (index not found)', async () => {
      const notFoundError = new Error('index_not_found_exception');
      (notFoundError as any).meta = { statusCode: 404 };
      esClient.search.mockRejectedValue(notFoundError);

      const result = await getProcessedAlertIds({
        esClient: esClient as never,
        spaceId: 'default',
        caseId: 'case-1',
        logger: logger as never,
      });

      expect(result).toBeNull();
    });

    it('handles missing optional array fields gracefully', async () => {
      esClient.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _id: 'tracker-case-1',
              _source: {
                case_id: 'case-1',
                processed_alert_ids: null,
                last_processed_at: '2025-01-01T00:00:00Z',
                generation_uuids: null,
              },
              _seq_no: 2,
              _primary_term: 1,
            },
          ],
        },
      });

      const result = await getProcessedAlertIds({
        esClient: esClient as never,
        spaceId: 'default',
        caseId: 'case-1',
        logger: logger as never,
      });

      expect(result).toEqual(
        expect.objectContaining({
          processedAlertIds: [],
          generationUuids: [],
        })
      );
    });
  });

  describe('updateProcessedAlertIds', () => {
    it('creates a new tracker document when none exists', async () => {
      esClient.search.mockResolvedValue({ hits: { hits: [] } });
      esClient.index.mockResolvedValue({ result: 'created' });

      await updateProcessedAlertIds({
        esClient: esClient as never,
        spaceId: 'default',
        caseId: 'case-1',
        newAlertIds: ['alert-1', 'alert-2'],
        generationUuid: 'gen-1',
        logger: logger as never,
      });

      expect(esClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          index: '.security-ad-processed-alerts-default',
          id: 'tracker-case-1',
          document: expect.objectContaining({
            case_id: 'case-1',
            processed_alert_ids: ['alert-1', 'alert-2'],
            generation_uuids: ['gen-1'],
          }),
          refresh: 'wait_for',
        })
      );
      expect(esClient.index).toHaveBeenCalledWith(
        expect.not.objectContaining({ if_seq_no: expect.anything() })
      );
    });

    it('merges new alert IDs with existing ones using optimistic concurrency', async () => {
      esClient.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _id: 'tracker-case-1',
              _source: {
                case_id: 'case-1',
                processed_alert_ids: ['alert-1'],
                last_processed_at: '2025-01-01T00:00:00Z',
                generation_uuids: ['gen-1'],
              },
              _seq_no: 3,
              _primary_term: 1,
            },
          ],
        },
      });
      esClient.index.mockResolvedValue({ result: 'updated' });

      await updateProcessedAlertIds({
        esClient: esClient as never,
        spaceId: 'default',
        caseId: 'case-1',
        newAlertIds: ['alert-2', 'alert-3'],
        generationUuid: 'gen-2',
        logger: logger as never,
      });

      expect(esClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          if_seq_no: 3,
          if_primary_term: 1,
          document: expect.objectContaining({
            processed_alert_ids: ['alert-1', 'alert-2', 'alert-3'],
            generation_uuids: ['gen-1', 'gen-2'],
          }),
        })
      );
    });

    it('deduplicates alert IDs across existing and new', async () => {
      esClient.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _id: 'tracker-case-1',
              _source: {
                case_id: 'case-1',
                processed_alert_ids: ['alert-1', 'alert-2'],
                last_processed_at: '2025-01-01T00:00:00Z',
                generation_uuids: ['gen-1'],
              },
              _seq_no: 1,
              _primary_term: 1,
            },
          ],
        },
      });
      esClient.index.mockResolvedValue({ result: 'updated' });

      await updateProcessedAlertIds({
        esClient: esClient as never,
        spaceId: 'default',
        caseId: 'case-1',
        newAlertIds: ['alert-2', 'alert-3'],
        generationUuid: 'gen-1',
        logger: logger as never,
      });

      const indexCall = esClient.index.mock.calls[0][0] as Record<string, unknown>;
      const doc = indexCall.document as Record<string, unknown>;
      expect(doc.processed_alert_ids).toEqual(['alert-1', 'alert-2', 'alert-3']);
      expect(doc.generation_uuids).toEqual(['gen-1']);
    });

    it('retries on version conflict (409)', async () => {
      esClient.search
        .mockResolvedValueOnce({
          hits: {
            hits: [
              {
                _id: 'tracker-case-1',
                _source: {
                  case_id: 'case-1',
                  processed_alert_ids: ['alert-1'],
                  last_processed_at: '2025-01-01T00:00:00Z',
                  generation_uuids: ['gen-1'],
                },
                _seq_no: 1,
                _primary_term: 1,
              },
            ],
          },
        })
        .mockResolvedValueOnce({
          hits: {
            hits: [
              {
                _id: 'tracker-case-1',
                _source: {
                  case_id: 'case-1',
                  processed_alert_ids: ['alert-1', 'alert-x'],
                  last_processed_at: '2025-01-01T01:00:00Z',
                  generation_uuids: ['gen-1', 'gen-x'],
                },
                _seq_no: 2,
                _primary_term: 1,
              },
            ],
          },
        });

      esClient.index
        .mockRejectedValueOnce({ meta: { statusCode: 409 } })
        .mockResolvedValueOnce({ result: 'updated' });

      await updateProcessedAlertIds({
        esClient: esClient as never,
        spaceId: 'default',
        caseId: 'case-1',
        newAlertIds: ['alert-2'],
        generationUuid: 'gen-2',
        logger: logger as never,
      });

      expect(esClient.search).toHaveBeenCalledTimes(2);
      expect(esClient.index).toHaveBeenCalledTimes(2);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Version conflict'));

      const secondIndexCall = esClient.index.mock.calls[1][0] as Record<string, unknown>;
      expect(secondIndexCall.if_seq_no).toBe(2);
      const doc = secondIndexCall.document as Record<string, unknown>;
      expect(doc.processed_alert_ids).toEqual(
        expect.arrayContaining(['alert-1', 'alert-x', 'alert-2'])
      );
    });

    it('throws after exhausting retries on persistent conflict', async () => {
      esClient.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _id: 'tracker-case-1',
              _source: {
                case_id: 'case-1',
                processed_alert_ids: [],
                last_processed_at: '2025-01-01T00:00:00Z',
                generation_uuids: [],
              },
              _seq_no: 1,
              _primary_term: 1,
            },
          ],
        },
      });

      const conflictError = { meta: { statusCode: 409 } };
      esClient.index
        .mockRejectedValueOnce(conflictError)
        .mockRejectedValueOnce(conflictError)
        .mockRejectedValueOnce(conflictError);

      await expect(
        updateProcessedAlertIds({
          esClient: esClient as never,
          spaceId: 'default',
          caseId: 'case-1',
          newAlertIds: ['alert-1'],
          generationUuid: 'gen-1',
          logger: logger as never,
        })
      ).rejects.toEqual(conflictError);

      expect(esClient.index).toHaveBeenCalledTimes(3);
    });

    it('caps tracked alerts at 10,000', async () => {
      const existingIds = Array.from({ length: 9999 }, (_, i) => `existing-${i}`);
      esClient.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _id: 'tracker-case-1',
              _source: {
                case_id: 'case-1',
                processed_alert_ids: existingIds,
                last_processed_at: '2025-01-01T00:00:00Z',
                generation_uuids: [],
              },
              _seq_no: 1,
              _primary_term: 1,
            },
          ],
        },
      });
      esClient.index.mockResolvedValue({ result: 'updated' });

      await updateProcessedAlertIds({
        esClient: esClient as never,
        spaceId: 'default',
        caseId: 'case-1',
        newAlertIds: ['new-1', 'new-2'],
        generationUuid: 'gen-1',
        logger: logger as never,
      });

      const indexCall = esClient.index.mock.calls[0][0] as Record<string, unknown>;
      const doc = indexCall.document as Record<string, unknown>;
      const ids = doc.processed_alert_ids as string[];
      expect(ids.length).toBeLessThanOrEqual(10000);
      expect(ids).toContain('new-1');
      expect(ids).toContain('new-2');
    });
  });

  describe('computeDeltaAlertIds', () => {
    it('returns all IDs when no tracker exists', () => {
      const result = computeDeltaAlertIds({
        allCaseAlertIds: ['a-1', 'a-2', 'a-3'],
        tracker: null,
      });

      expect(result).toEqual(['a-1', 'a-2', 'a-3']);
    });

    it('filters out previously processed IDs', () => {
      const tracker: ProcessedAlertTracker = {
        caseId: 'case-1',
        processedAlertIds: ['a-1', 'a-2'],
        lastProcessedAt: '2025-01-01T00:00:00Z',
        generationUuids: ['gen-1'],
      };

      const result = computeDeltaAlertIds({
        allCaseAlertIds: ['a-1', 'a-2', 'a-3', 'a-4'],
        tracker,
      });

      expect(result).toEqual(['a-3', 'a-4']);
    });

    it('returns empty array when all alerts are already processed', () => {
      const tracker: ProcessedAlertTracker = {
        caseId: 'case-1',
        processedAlertIds: ['a-1', 'a-2'],
        lastProcessedAt: '2025-01-01T00:00:00Z',
        generationUuids: ['gen-1'],
      };

      const result = computeDeltaAlertIds({
        allCaseAlertIds: ['a-1', 'a-2'],
        tracker,
      });

      expect(result).toEqual([]);
    });

    it('returns empty array for empty input', () => {
      expect(computeDeltaAlertIds({ allCaseAlertIds: [], tracker: null })).toEqual([]);
    });

    it('handles tracker with empty processedAlertIds', () => {
      const tracker: ProcessedAlertTracker = {
        caseId: 'case-1',
        processedAlertIds: [],
        lastProcessedAt: '2025-01-01T00:00:00Z',
        generationUuids: [],
      };

      const result = computeDeltaAlertIds({
        allCaseAlertIds: ['a-1'],
        tracker,
      });

      expect(result).toEqual(['a-1']);
    });
  });
});
