/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ResolutionClient } from '../../../domain/resolution/resolution_client';
import { processPage, type PageDeps } from '../page';
import {
  CURRENT_EMBED_SOURCE_VERSION,
  DEFAULT_EMBEDDED_AT_FIELD,
  DEFAULT_EMBEDDING_FIELD,
  DEFAULT_EMBEDDING_SOURCE_FIELD,
} from '../embed';

const RESOLVED_TO_FIELD = 'entity.relationships.resolution.resolved_to';

interface FakeEntityDoc {
  entityId: string;
  firstSeen: string;
  name?: string;
}

const createSearchResponse = (docs: FakeEntityDoc[]) => ({
  hits: {
    total: { value: docs.length, relation: 'eq' },
    hits: docs.map((d) => ({
      _id: `hash-${d.entityId}`,
      _source: {
        entity: {
          id: d.entityId,
          lifecycle: { first_seen: d.firstSeen },
        },
        user: { ...(d.name !== undefined ? { name: d.name } : {}) },
      },
      sort: [d.firstSeen, d.entityId],
    })),
  },
});

const createInferenceResponse = (count: number) => ({
  text_embedding: Array.from({ length: count }, () => ({ embedding: [0.1, 0.2, 0.3, 0.4] })),
});

const createBulkOkResponse = (count: number) => ({
  took: 1,
  errors: false,
  items: Array.from({ length: count }, () => ({
    update: { _index: 'entities-latest-default', _id: 'x', status: 200, result: 'updated' },
  })),
});

const createEsClient = (): jest.Mocked<ElasticsearchClient> => {
  return {
    search: jest.fn(),
    bulk: jest.fn(),
    inference: {
      inference: jest.fn(),
    },
  } as unknown as jest.Mocked<ElasticsearchClient>;
};

const createDeps = (
  esClient: ElasticsearchClient,
  overrides: Partial<PageDeps> = {}
): PageDeps => ({
  esClient,
  logger: loggerMock.create(),
  abortController: new AbortController(),
  index: 'entities-latest-default',
  watermark: null,
  searchAfter: undefined,
  inferenceId: '.jina-embeddings-v5-text-small',
  embeddingField: DEFAULT_EMBEDDING_FIELD,
  embeddingSourceField: DEFAULT_EMBEDDING_SOURCE_FIELD,
  embeddedAtField: DEFAULT_EMBEDDED_AT_FIELD,
  resolvedToField: RESOLVED_TO_FIELD,
  linkingEnabled: false,
  threshold: 0.85,
  k: 10,
  numCandidates: 100,
  resolutionClient: {} as ResolutionClient,
  parallelResolutionEnabled: false,
  ...overrides,
});

const ZERO_LINK_METRICS = {
  linked: 0,
  skippedAmbiguous: 0,
  skippedBelowThreshold: 0,
  skippedRoleAccount: 0,
};

describe('processPage', () => {
  describe('empty page', () => {
    it('returns { empty: true } and skips embed / bulk when the search has zero hits', async () => {
      const esClient = createEsClient();
      (esClient.search as jest.Mock).mockResolvedValueOnce(createSearchResponse([]));

      const outcome = await processPage(createDeps(esClient));

      expect(outcome).toEqual({
        empty: true,
        aborted: false,
        pageEmbedded: 0,
        pageFailed: 0,
        pageSkippedRoleAccount: 0,
        pageLinkMetrics: ZERO_LINK_METRICS,
        successfullyEmbedded: [],
        nextSearchAfter: undefined,
      });
      expect(esClient.inference.inference).not.toHaveBeenCalled();
      expect(esClient.bulk).not.toHaveBeenCalled();
    });
  });

  describe('successful embed', () => {
    it('returns the per-page counters, the successfully-embedded list, and the next search_after', async () => {
      const esClient = createEsClient();
      (esClient.search as jest.Mock).mockResolvedValueOnce(
        createSearchResponse([
          { entityId: 'er-1', firstSeen: '2026-03-10T00:00:00Z', name: 'alice' },
          { entityId: 'er-2', firstSeen: '2026-03-10T00:01:00Z', name: 'bob' },
        ])
      );
      (esClient.inference.inference as jest.Mock).mockResolvedValueOnce(createInferenceResponse(2));
      (esClient.bulk as jest.Mock).mockResolvedValueOnce(createBulkOkResponse(2));

      const outcome = await processPage(createDeps(esClient));

      expect(outcome.empty).toBe(false);
      expect(outcome.aborted).toBe(false);
      expect(outcome.pageEmbedded).toBe(2);
      expect(outcome.pageFailed).toBe(0);
      expect(outcome.pageSkippedRoleAccount).toBe(0);
      expect(outcome.pageLinkMetrics).toEqual(ZERO_LINK_METRICS);
      expect(outcome.successfullyEmbedded.map((c) => c.entityId)).toEqual(['er-1', 'er-2']);
      expect(outcome.nextSearchAfter).toEqual(['2026-03-10T00:01:00Z', 'er-2']);
    });

    it('writes the embedding under the configured field paths with the current source version', async () => {
      // Locks in the doc shape the bulk write produces so a refactor of the
      // doc-construction step cannot silently drop one of the three fields.
      const esClient = createEsClient();
      (esClient.search as jest.Mock).mockResolvedValueOnce(
        createSearchResponse([{ entityId: 'er-1', firstSeen: '2026-03-10T00:00:00Z', name: 'a' }])
      );
      (esClient.inference.inference as jest.Mock).mockResolvedValueOnce(createInferenceResponse(1));
      (esClient.bulk as jest.Mock).mockResolvedValueOnce(createBulkOkResponse(1));

      await processPage(createDeps(esClient));

      const bulkCall = (esClient.bulk as jest.Mock).mock.calls[0][0];
      expect(bulkCall.refresh).toBe('wait_for');
      const doc = bulkCall.operations[1].doc;
      expect(doc.entity.resolution.embedding).toHaveLength(4);
      expect(doc.entity.resolution.embedding_source).toBe(CURRENT_EMBED_SOURCE_VERSION);
      expect(typeof doc.entity.resolution.embedded_at).toBe('string');
    });
  });

  describe('embed failure', () => {
    it('returns pageFailed = candidates.length, no successfullyEmbedded, but is NOT marked aborted', async () => {
      // Matches the original try/catch behavior: a failed embed marks every
      // candidate on the page as failed, but the run loop should keep
      // paginating (orchestrator advances searchAfter; watermark stays).
      const esClient = createEsClient();
      (esClient.search as jest.Mock).mockResolvedValueOnce(
        createSearchResponse([
          { entityId: 'er-1', firstSeen: '2026-03-10T00:00:00Z', name: 'a' },
          { entityId: 'er-2', firstSeen: '2026-03-10T00:01:00Z', name: 'b' },
        ])
      );
      (esClient.inference.inference as jest.Mock).mockRejectedValueOnce(new Error('inference 500'));

      const deps = createDeps(esClient);
      const outcome = await processPage(deps);

      expect(outcome.empty).toBe(false);
      expect(outcome.aborted).toBe(false);
      expect(outcome.pageEmbedded).toBe(0);
      expect(outcome.pageFailed).toBe(2);
      expect(outcome.successfullyEmbedded).toEqual([]);
      expect(outcome.nextSearchAfter).toEqual(['2026-03-10T00:01:00Z', 'er-2']);
      expect(esClient.bulk).not.toHaveBeenCalled();
      expect(deps.logger.error).toHaveBeenCalledWith(
        expect.stringContaining('batch of 2 entities failed: inference 500')
      );
    });

    it('marks aborted=true (and zeroes counters) when abort fires between embed and bulk write', async () => {
      // Matches the original `break` exit: orchestrator must skip
      // accumulation entirely for this page so the abort-in-mid-page semantics
      // are preserved.
      const esClient = createEsClient();
      const abortController = new AbortController();
      (esClient.search as jest.Mock).mockResolvedValueOnce(
        createSearchResponse([{ entityId: 'er-1', firstSeen: '2026-03-10T00:00:00Z', name: 'a' }])
      );
      (esClient.inference.inference as jest.Mock).mockImplementationOnce(async () => {
        abortController.abort();
        return createInferenceResponse(1);
      });

      const outcome = await processPage(createDeps(esClient, { abortController }));

      expect(outcome.aborted).toBe(true);
      expect(outcome.pageEmbedded).toBe(0);
      expect(outcome.pageFailed).toBe(0);
      expect(outcome.successfullyEmbedded).toEqual([]);
      expect(outcome.nextSearchAfter).toBeUndefined();
      expect(esClient.bulk).not.toHaveBeenCalled();
    });
  });
});
