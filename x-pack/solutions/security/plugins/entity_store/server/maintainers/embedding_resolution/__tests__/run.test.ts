/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import { runEmbeddingResolution, type RunDeps } from '../run';
import type { EmbeddingResolutionState } from '../types';
import {
  CURRENT_EMBED_SOURCE_VERSION,
  DEFAULT_EMBEDDED_AT_FIELD,
  DEFAULT_EMBEDDING_FIELD,
  DEFAULT_EMBEDDING_SOURCE_FIELD,
} from '../embed';

const ZERO_LINK_METRICS = {
  linked: 0,
  skippedAmbiguous: 0,
  skippedBelowThreshold: 0,
  skippedRoleAccount: 0,
};

const NAMESPACE = 'default';
const INFERENCE_ID = '.jina-embeddings-v5-text-small';
const EXPECTED_DIMS = 1024;

const make404 = () => {
  const err = new Error('endpoint not found') as Error & { statusCode: number };
  err.statusCode = 404;
  return err;
};

const createInitialState = (
  overrides: Partial<EmbeddingResolutionState> = {}
): EmbeddingResolutionState => ({
  lastProcessedTimestamp: null,
  embedSourceVersion: CURRENT_EMBED_SOURCE_VERSION,
  lastRun: null,
  ...overrides,
});

interface FakeEntityDoc {
  entityId: string;
  firstSeen: string;
  name?: string;
  fullName?: string;
  email?: string;
  embeddingSource?: string;
}

const fakeHashFor = (entityId: string) => `hash-${entityId}`;

const createSearchResponse = (docs: FakeEntityDoc[], opts: { hasNext?: boolean } = {}) => ({
  hits: {
    total: { value: docs.length, relation: 'eq' },
    hits: docs.map((d) => ({
      _id: fakeHashFor(d.entityId),
      _source: {
        entity: {
          id: d.entityId,
          lifecycle: { first_seen: d.firstSeen },
          ...(d.embeddingSource ? { resolution: { embedding_source: d.embeddingSource } } : {}),
        },
        user: {
          ...(d.name !== undefined ? { name: d.name } : {}),
          ...(d.fullName !== undefined ? { full_name: d.fullName } : {}),
          ...(d.email !== undefined ? { email: d.email } : {}),
        },
      },
      sort: opts.hasNext ? [d.firstSeen, d.entityId] : undefined,
    })),
  },
});

const createInferenceResponse = (count: number, dims = 4) => ({
  text_embedding: Array.from({ length: count }, (_outer, i) =>
    Array.from({ length: dims }, (_inner, j) => i * 0.1 + j * 0.01)
  ).map((embedding) => ({ embedding })),
});

const createBulkOkResponse = (count: number) => ({
  took: 1,
  errors: false,
  items: Array.from({ length: count }, () => ({
    update: { _index: 'entities-latest-default', _id: 'x', status: 200, result: 'updated' },
  })),
});

const createBulkErrorResponse = (count: number) => ({
  took: 1,
  errors: true,
  items: Array.from({ length: count }, (_, i) => ({
    update: {
      _index: 'entities-latest-default',
      _id: `x-${i}`,
      status: 400,
      error: { type: 'mapper_parsing_exception', reason: 'bad mapping' },
    },
  })),
});

const createDeps = (
  state: EmbeddingResolutionState,
  esClient: ElasticsearchClient,
  overrides: Partial<RunDeps> = {}
): RunDeps => ({
  state,
  namespace: NAMESPACE,
  esClient,
  logger: loggerMock.create(),
  inferenceId: INFERENCE_ID,
  expectedDims: EXPECTED_DIMS,
  abortController: new AbortController(),
  ...overrides,
});

const createEsClient = (): jest.Mocked<ElasticsearchClient> => {
  return {
    search: jest.fn(),
    bulk: jest.fn(),
    inference: {
      get: jest.fn().mockResolvedValue({
        endpoints: [
          {
            inference_id: INFERENCE_ID,
            service: 'elastic',
            service_settings: { dimensions: EXPECTED_DIMS },
          },
        ],
      }),
      inference: jest.fn(),
    },
  } as unknown as jest.Mocked<ElasticsearchClient>;
};

describe('runEmbeddingResolution', () => {
  describe('inference endpoint not ready', () => {
    it('no-ops, logs warn, leaves state unchanged when the endpoint is missing (404)', async () => {
      const esClient = createEsClient();
      (esClient.inference.get as jest.Mock).mockReset().mockRejectedValueOnce(make404());
      const state = createInitialState({ lastProcessedTimestamp: '2026-01-01T00:00:00Z' });
      const deps = createDeps(state, esClient);

      const result = await runEmbeddingResolution(deps);

      expect(result.lastProcessedTimestamp).toBe('2026-01-01T00:00:00Z');
      expect(result.lastRun).toEqual({ embedded: 0, failed: 0, ...ZERO_LINK_METRICS });
      expect(esClient.search).not.toHaveBeenCalled();
      expect(esClient.bulk).not.toHaveBeenCalled();
      expect(esClient.inference.inference).not.toHaveBeenCalled();
      expect(deps.logger.warn).toHaveBeenCalled();
    });
  });

  describe('collect / embed / write loop', () => {
    it('returns early when no entities need embedding', async () => {
      const esClient = createEsClient();
      (esClient.search as jest.Mock).mockResolvedValueOnce(createSearchResponse([]));
      const state = createInitialState();
      const deps = createDeps(state, esClient);

      const result = await runEmbeddingResolution(deps);

      expect(result.lastRun).toEqual({ embedded: 0, failed: 0, ...ZERO_LINK_METRICS });
      expect(result.lastProcessedTimestamp).toBeNull();
      expect(esClient.inference.inference).not.toHaveBeenCalled();
      expect(esClient.bulk).not.toHaveBeenCalled();
    });

    it('uses a watermark-less query when state.lastProcessedTimestamp is null', async () => {
      const esClient = createEsClient();
      (esClient.search as jest.Mock).mockResolvedValueOnce(createSearchResponse([]));
      const deps = createDeps(createInitialState(), esClient);

      await runEmbeddingResolution(deps);

      const searchBody = (esClient.search as jest.Mock).mock.calls[0][0] as any;
      const filters = searchBody.query.bool.filter as any[];
      const hasTimestampRange = filters.some(
        (f) => f.range && f.range['entity.lifecycle.first_seen']
      );
      expect(hasTimestampRange).toBe(false);
      // sanity: type filter present
      const hasTypeFilter = filters.some(
        (f) => f.term && f.term['entity.EngineMetadata.Type'] === 'user'
      );
      expect(hasTypeFilter).toBe(true);
    });

    it('gates only the missing-embedding branch by first_seen > watermark when lastProcessedTimestamp is set', async () => {
      const esClient = createEsClient();
      (esClient.search as jest.Mock).mockResolvedValueOnce(createSearchResponse([]));
      const state = createInitialState({ lastProcessedTimestamp: '2026-03-10T00:00:00Z' });
      const deps = createDeps(state, esClient);

      await runEmbeddingResolution(deps);

      const filters = ((esClient.search as jest.Mock).mock.calls[0][0] as any).query.bool
        .filter as any[];
      // No top-level range filter — watermark is nested inside the "missing
      // embedding" branch only, so stale-source entities ignore it.
      const topLevelRange = filters.find((f) => f.range && f.range['entity.lifecycle.first_seen']);
      expect(topLevelRange).toBeUndefined();

      const orClause = filters.find((f) => f.bool && Array.isArray(f.bool.should));
      expect(orClause).toBeDefined();
      const should = orClause.bool.should as any[];

      const missingEmbeddingBranch = should.find((b) =>
        JSON.stringify(b).includes(`"must_not":{"exists":{"field":"entity.resolution.embedding"}}`)
      );
      expect(missingEmbeddingBranch).toBeDefined();
      // The watermark range MUST be inside the missing-embedding branch.
      expect(JSON.stringify(missingEmbeddingBranch)).toContain(
        '"range":{"entity.lifecycle.first_seen":{"gt":"2026-03-10T00:00:00Z"}}'
      );

      // The stale-source-version branch MUST NOT carry a watermark range.
      const staleSourceBranch = should.find(
        (b) =>
          JSON.stringify(b).includes(CURRENT_EMBED_SOURCE_VERSION) &&
          JSON.stringify(b).includes('embedding_source')
      );
      expect(staleSourceBranch).toBeDefined();
      expect(JSON.stringify(staleSourceBranch)).not.toContain('first_seen');
    });

    it('asks the search for entities missing an embedding OR with a stale embedding_source', async () => {
      const esClient = createEsClient();
      (esClient.search as jest.Mock).mockResolvedValueOnce(createSearchResponse([]));
      const deps = createDeps(createInitialState(), esClient);

      await runEmbeddingResolution(deps);

      const filters = ((esClient.search as jest.Mock).mock.calls[0][0] as any).query.bool
        .filter as any[];
      const orClause = filters.find((f) => f.bool && Array.isArray(f.bool.should));
      expect(orClause).toBeDefined();
      const shouldExpressions = JSON.stringify(orClause.bool.should);
      expect(shouldExpressions).toContain('entity.resolution.embedding');
      expect(shouldExpressions).toContain('entity.resolution.embedding_source');
      expect(shouldExpressions).toContain(CURRENT_EMBED_SOURCE_VERSION);
    });

    it('keeps a single flat staleness clause (no nested watermark) when lastProcessedTimestamp is null', async () => {
      const esClient = createEsClient();
      (esClient.search as jest.Mock).mockResolvedValueOnce(createSearchResponse([]));
      const deps = createDeps(createInitialState(), esClient);

      await runEmbeddingResolution(deps);

      const filters = ((esClient.search as jest.Mock).mock.calls[0][0] as any).query.bool
        .filter as any[];
      const orClause = filters.find((f) => f.bool && Array.isArray(f.bool.should));
      expect(orClause).toBeDefined();
      // No range filter anywhere when watermark is null.
      expect(JSON.stringify(orClause)).not.toContain('"range"');
    });

    it('also filters out already-resolved entities (no resolved_to)', async () => {
      const esClient = createEsClient();
      (esClient.search as jest.Mock).mockResolvedValueOnce(createSearchResponse([]));
      const deps = createDeps(createInitialState(), esClient);

      await runEmbeddingResolution(deps);

      const filters = ((esClient.search as jest.Mock).mock.calls[0][0] as any).query.bool
        .filter as any[];
      const hasResolvedToExclusion = filters.some(
        (f) =>
          f.bool &&
          f.bool.must_not &&
          JSON.stringify(f.bool.must_not).includes('entity.relationships.resolution.resolved_to')
      );
      expect(hasResolvedToExclusion).toBe(true);
    });

    it('embeds each collected entity, writes the vector + embedded_at + embedding_source, advances watermark', async () => {
      const esClient = createEsClient();
      (esClient.search as jest.Mock).mockResolvedValueOnce(
        createSearchResponse([
          {
            entityId: 'er-1',
            firstSeen: '2026-03-10T00:00:00Z',
            name: 'alice',
            email: 'alice@corp.com',
          },
          {
            entityId: 'er-2',
            firstSeen: '2026-03-10T00:01:00Z',
            name: 'bob',
            fullName: 'Bob Smith',
          },
        ])
      );
      (esClient.inference.inference as jest.Mock).mockResolvedValueOnce(createInferenceResponse(2));
      (esClient.bulk as jest.Mock).mockResolvedValueOnce(createBulkOkResponse(2));

      const deps = createDeps(createInitialState(), esClient);
      const result = await runEmbeddingResolution(deps);

      expect(esClient.inference.inference).toHaveBeenCalledTimes(1);
      const inferCall = (esClient.inference.inference as jest.Mock).mock.calls[0][0];
      expect(inferCall).toEqual({
        inference_id: INFERENCE_ID,
        task_type: 'text_embedding',
        input: ['name: alice; email: alice@corp.com', 'name: bob; full_name: bob smith'],
      });

      expect(esClient.bulk).toHaveBeenCalledTimes(1);
      const bulkCall = (esClient.bulk as jest.Mock).mock.calls[0][0];
      // 'wait_for' so the just-written vectors are searchable by the Phase 3
      // kNN link step that runs immediately after this bulk write.
      expect(bulkCall.refresh).toBe('wait_for');
      // ops alternate {update}, {doc} — 2 entities = 4 ops
      expect(bulkCall.operations).toHaveLength(4);
      expect(bulkCall.operations[0].update._id).toBe('hash-er-1');
      const doc1 = bulkCall.operations[1].doc;
      expect(doc1.entity.resolution.embedding).toHaveLength(4);
      expect(doc1.entity.resolution.embedding_source).toBe(CURRENT_EMBED_SOURCE_VERSION);
      expect(typeof doc1.entity.resolution.embedded_at).toBe('string');

      expect(result.lastRun).toEqual({ embedded: 2, failed: 0, ...ZERO_LINK_METRICS });
      expect(result.lastProcessedTimestamp).toBe('2026-03-10T00:01:00Z');
      expect(result.embedSourceVersion).toBe(CURRENT_EMBED_SOURCE_VERSION);
    });

    it('skips entities whose identity string is empty (no usable fields)', async () => {
      const esClient = createEsClient();
      (esClient.search as jest.Mock).mockResolvedValueOnce(
        createSearchResponse([
          { entityId: 'er-empty', firstSeen: '2026-03-10T00:00:00Z' },
          {
            entityId: 'er-ok',
            firstSeen: '2026-03-10T00:01:00Z',
            name: 'alice',
          },
        ])
      );
      (esClient.inference.inference as jest.Mock).mockResolvedValueOnce(createInferenceResponse(1));
      (esClient.bulk as jest.Mock).mockResolvedValueOnce(createBulkOkResponse(1));

      const deps = createDeps(createInitialState(), esClient);
      const result = await runEmbeddingResolution(deps);

      const inferCall = (esClient.inference.inference as jest.Mock).mock.calls[0][0];
      expect(inferCall.input).toEqual(['name: alice']);
      expect(result.lastRun).toEqual({ embedded: 1, failed: 0, ...ZERO_LINK_METRICS });
    });

    it('paginates the search using search_after when more entities are available', async () => {
      const esClient = createEsClient();
      (esClient.search as jest.Mock)
        .mockResolvedValueOnce(
          createSearchResponse(
            [
              {
                entityId: 'er-1',
                firstSeen: '2026-03-10T00:00:00Z',
                name: 'a',
              },
            ],
            { hasNext: true }
          )
        )
        .mockResolvedValueOnce(createSearchResponse([]));
      (esClient.inference.inference as jest.Mock).mockResolvedValueOnce(createInferenceResponse(1));
      (esClient.bulk as jest.Mock).mockResolvedValueOnce(createBulkOkResponse(1));

      const deps = createDeps(createInitialState(), esClient);
      await runEmbeddingResolution(deps);

      expect(esClient.search).toHaveBeenCalledTimes(2);
      const secondCall = (esClient.search as jest.Mock).mock.calls[1][0] as any;
      expect(secondCall.search_after).toEqual(['2026-03-10T00:00:00Z', 'er-1']);
    });
  });

  describe('error paths — watermark stays put', () => {
    it('does not advance the watermark and counts failures when inference throws', async () => {
      const esClient = createEsClient();
      (esClient.search as jest.Mock).mockResolvedValueOnce(
        createSearchResponse([
          {
            entityId: 'er-1',
            firstSeen: '2026-03-10T00:00:00Z',
            name: 'alice',
          },
        ])
      );
      (esClient.inference.inference as jest.Mock).mockRejectedValueOnce(new Error('inference 429'));

      const state = createInitialState({ lastProcessedTimestamp: '2026-01-01T00:00:00Z' });
      const deps = createDeps(state, esClient);
      const result = await runEmbeddingResolution(deps);

      expect(result.lastProcessedTimestamp).toBe('2026-01-01T00:00:00Z');
      expect(result.lastRun?.failed).toBeGreaterThan(0);
      expect(esClient.bulk).not.toHaveBeenCalled();
      expect(deps.logger.error).toHaveBeenCalled();
    });

    it('does not advance the watermark when bulk update reports errors', async () => {
      const esClient = createEsClient();
      (esClient.search as jest.Mock).mockResolvedValueOnce(
        createSearchResponse([
          {
            entityId: 'er-1',
            firstSeen: '2026-03-10T00:00:00Z',
            name: 'alice',
          },
        ])
      );
      (esClient.inference.inference as jest.Mock).mockResolvedValueOnce(createInferenceResponse(1));
      (esClient.bulk as jest.Mock).mockResolvedValueOnce(createBulkErrorResponse(1));

      const state = createInitialState({ lastProcessedTimestamp: '2026-01-01T00:00:00Z' });
      const deps = createDeps(state, esClient);
      const result = await runEmbeddingResolution(deps);

      expect(result.lastProcessedTimestamp).toBe('2026-01-01T00:00:00Z');
      expect(result.lastRun?.failed).toBeGreaterThan(0);
      expect(deps.logger.error).toHaveBeenCalled();
    });
  });

  describe('abort handling', () => {
    it('returns state unchanged when aborted before any work happens', async () => {
      const esClient = createEsClient();
      const abortController = new AbortController();
      abortController.abort();
      const state = createInitialState({ lastProcessedTimestamp: '2026-01-01T00:00:00Z' });
      const deps = createDeps(state, esClient, { abortController });

      const result = await runEmbeddingResolution(deps);

      expect(result).toEqual(state);
      expect(esClient.search).not.toHaveBeenCalled();
    });

    it('stops after the search phase when aborted between search and embed', async () => {
      const esClient = createEsClient();
      const abortController = new AbortController();

      (esClient.search as jest.Mock).mockImplementationOnce(async () => {
        // Simulate abort happening during search response handling.
        abortController.abort();
        return createSearchResponse([
          { entityId: 'er-1', firstSeen: '2026-03-10T00:00:00Z', name: 'alice' },
        ]);
      });

      const state = createInitialState({ lastProcessedTimestamp: '2026-01-01T00:00:00Z' });
      const deps = createDeps(state, esClient, { abortController });

      const result = await runEmbeddingResolution(deps);

      expect(esClient.inference.inference).not.toHaveBeenCalled();
      expect(esClient.bulk).not.toHaveBeenCalled();
      expect(result.lastProcessedTimestamp).toBe('2026-01-01T00:00:00Z');
    });
  });

  describe('embed-source version bump', () => {
    it('resets the watermark when state.embedSourceVersion is older than CURRENT_EMBED_SOURCE_VERSION so all entities are re-considered', async () => {
      const esClient = createEsClient();
      (esClient.search as jest.Mock).mockResolvedValueOnce(createSearchResponse([]));
      const state = createInitialState({
        lastProcessedTimestamp: '2026-01-01T00:00:00Z',
        embedSourceVersion: 'v0:legacy',
      });
      const deps = createDeps(state, esClient);

      await runEmbeddingResolution(deps);

      const filters = ((esClient.search as jest.Mock).mock.calls[0][0] as any).query.bool
        .filter as any[];
      const hasTimestampRange = filters.some(
        (f) => f.range && f.range['entity.lifecycle.first_seen']
      );
      expect(hasTimestampRange).toBe(false);
    });
  });

  describe('Phase 3 — link step (linkingEnabled)', () => {
    /**
     * `responses` is keyed by call order. After embed:
     *   call 0  → collectEntitiesToEmbed (the page query)
     *   call 1+ → kNN searches, one per just-embedded entity, in order.
     */
    const stageEsClient = (
      esClient: jest.Mocked<ElasticsearchClient>,
      pageDocs: FakeEntityDoc[],
      knnResponses: Array<{ hits: Array<Record<string, unknown>> }>
    ) => {
      (esClient.search as jest.Mock).mockResolvedValueOnce(createSearchResponse(pageDocs));
      (esClient.inference.inference as jest.Mock).mockResolvedValueOnce(
        createInferenceResponse(pageDocs.length)
      );
      (esClient.bulk as jest.Mock).mockResolvedValueOnce(createBulkOkResponse(pageDocs.length));
      for (const knn of knnResponses) {
        (esClient.search as jest.Mock).mockResolvedValueOnce({ hits: { hits: knn.hits } });
      }
    };

    const knnHit = (
      entityId: string,
      score: number,
      opts: {
        resolvedTo?: string;
        name?: string;
        fullName?: string;
        email?: string;
      } = {}
    ) => ({
      _id: `doc-${entityId}`,
      _score: score,
      _source: {
        entity: {
          id: entityId,
          ...(opts.resolvedTo
            ? { relationships: { resolution: { resolved_to: opts.resolvedTo } } }
            : {}),
        },
        user: {
          ...(opts.name !== undefined ? { name: opts.name } : {}),
          ...(opts.fullName !== undefined ? { full_name: opts.fullName } : {}),
          ...(opts.email !== undefined ? { email: opts.email } : {}),
        },
      },
    });

    const createMockResolutionClient = () => {
      const linkEntities = jest
        .fn()
        .mockResolvedValue({ linked: ['x'], skipped: [], target_id: 'y' });
      return {
        client: {
          linkEntities,
        } as unknown as import('../../../domain/resolution/resolution_client').ResolutionClient,
        linkEntities,
      };
    };

    it('does NOT call kNN or linkEntities when linkingEnabled is false', async () => {
      const esClient = createEsClient();
      stageEsClient(
        esClient,
        [{ entityId: 'er-1', firstSeen: '2026-03-10T00:00:00Z', name: 'a' }],
        []
      );
      const { client, linkEntities } = createMockResolutionClient();
      const deps = createDeps(createInitialState(), esClient, {
        linkingEnabled: false,
        resolutionClient: client,
      });

      const result = await runEmbeddingResolution(deps);

      // Only the initial page query — no follow-up kNN search.
      expect(esClient.search).toHaveBeenCalledTimes(1);
      expect(linkEntities).not.toHaveBeenCalled();
      expect(result.lastRun?.linked).toBe(0);
    });

    it('links each just-embedded entity to its top kNN candidate with embedding provenance', async () => {
      const esClient = createEsClient();
      stageEsClient(
        esClient,
        [{ entityId: 'er-18-a', firstSeen: '2026-03-10T00:00:00Z', fullName: 'Nora Patterson' }],
        [{ hits: [knnHit('er-18-b', 0.97, { fullName: 'Nora Patterson' })] }]
      );
      const { client, linkEntities } = createMockResolutionClient();
      const deps = createDeps(createInitialState(), esClient, {
        linkingEnabled: true,
        threshold: 0.85,
        resolutionClient: client,
      });

      const result = await runEmbeddingResolution(deps);

      expect(linkEntities).toHaveBeenCalledTimes(1);
      expect(linkEntities).toHaveBeenCalledWith('er-18-b', ['er-18-a'], {
        refresh: false,
        provenance: {
          resolved_by: 'embedding',
          score: 0.97,
          model_id: INFERENCE_ID,
        },
      });
      expect(result.lastRun?.linked).toBe(1);
      expect(result.lastRun?.skippedAmbiguous).toBe(0);
      expect(result.lastRun?.skippedBelowThreshold).toBe(0);
    });

    it('extends an existing group when the top kNN candidate is itself an alias', async () => {
      const esClient = createEsClient();
      stageEsClient(
        esClient,
        [{ entityId: 'er-new', firstSeen: '2026-03-10T00:00:00Z', name: 'noah' }],
        [
          {
            hits: [
              knnHit('er-existing-alias', 0.92, {
                resolvedTo: 'er-existing-target',
                name: 'noah',
              }),
            ],
          },
        ]
      );
      const { client, linkEntities } = createMockResolutionClient();
      const deps = createDeps(createInitialState(), esClient, {
        linkingEnabled: true,
        threshold: 0.85,
        resolutionClient: client,
      });

      await runEmbeddingResolution(deps);

      // Target is the candidate's existing target, NOT the candidate itself.
      expect(linkEntities).toHaveBeenCalledWith(
        'er-existing-target',
        ['er-new'],
        expect.objectContaining({
          provenance: expect.objectContaining({ resolved_by: 'embedding' }),
        })
      );
    });

    it('skips ambiguous candidates (top-2 tied at the highest score)', async () => {
      const esClient = createEsClient();
      stageEsClient(
        esClient,
        [{ entityId: 'er-source', firstSeen: '2026-03-10T00:00:00Z', name: 'amb' }],
        [
          {
            hits: [
              knnHit('er-tie-1', 0.91, { name: 'amb' }),
              knnHit('er-tie-2', 0.91, { name: 'amb' }),
              knnHit('er-far', 0.7, { name: 'far' }),
            ],
          },
        ]
      );
      const { client, linkEntities } = createMockResolutionClient();
      const deps = createDeps(createInitialState(), esClient, {
        linkingEnabled: true,
        threshold: 0.85,
        resolutionClient: client,
      });

      const result = await runEmbeddingResolution(deps);

      expect(linkEntities).not.toHaveBeenCalled();
      expect(result.lastRun?.skippedAmbiguous).toBe(1);
      expect(result.lastRun?.linked).toBe(0);
    });

    it('skips below-threshold matches', async () => {
      const esClient = createEsClient();
      stageEsClient(
        esClient,
        [{ entityId: 'er-source', firstSeen: '2026-03-10T00:00:00Z', name: 'lonely' }],
        [{ hits: [knnHit('er-far', 0.6, { name: 'far' })] }]
      );
      const { client, linkEntities } = createMockResolutionClient();
      const deps = createDeps(createInitialState(), esClient, {
        linkingEnabled: true,
        threshold: 0.85,
        resolutionClient: client,
      });

      const result = await runEmbeddingResolution(deps);

      expect(linkEntities).not.toHaveBeenCalled();
      expect(result.lastRun?.skippedBelowThreshold).toBe(1);
    });

    it('skips when kNN returns no candidates at all', async () => {
      const esClient = createEsClient();
      stageEsClient(
        esClient,
        [{ entityId: 'er-source', firstSeen: '2026-03-10T00:00:00Z', name: 'orphan' }],
        [{ hits: [] }]
      );
      const { client, linkEntities } = createMockResolutionClient();
      const deps = createDeps(createInitialState(), esClient, {
        linkingEnabled: true,
        threshold: 0.85,
        resolutionClient: client,
      });

      const result = await runEmbeddingResolution(deps);

      expect(linkEntities).not.toHaveBeenCalled();
      expect(result.lastRun?.skippedBelowThreshold).toBe(1);
    });

    it('skips role-account SOURCE entities at embed time (no inference call)', async () => {
      const esClient = createEsClient();
      // The source has email noreply@…; embed step must drop it BEFORE inference.
      (esClient.search as jest.Mock).mockResolvedValueOnce(
        createSearchResponse([
          {
            entityId: 'er-15-svc-1',
            firstSeen: '2026-03-10T00:00:00Z',
            name: 'er-15-svc-1',
            email: 'noreply@corp.com',
          },
        ])
      );
      const { client, linkEntities } = createMockResolutionClient();
      const deps = createDeps(createInitialState(), esClient, {
        linkingEnabled: true,
        resolutionClient: client,
      });

      const result = await runEmbeddingResolution(deps);

      expect(esClient.inference.inference).not.toHaveBeenCalled();
      expect(linkEntities).not.toHaveBeenCalled();
      expect(result.lastRun?.skippedRoleAccount).toBeGreaterThan(0);
    });

    it('skips role-account CANDIDATES even when the source itself is benign (defence in depth)', async () => {
      const esClient = createEsClient();
      stageEsClient(
        esClient,
        [
          {
            entityId: 'er-source',
            firstSeen: '2026-03-10T00:00:00Z',
            name: 'alice',
            email: 'alice@corp.com',
          },
        ],
        [{ hits: [knnHit('er-15-svc-1', 0.99, { email: 'noreply@corp.com' })] }]
      );
      const { client, linkEntities } = createMockResolutionClient();
      const deps = createDeps(createInitialState(), esClient, {
        linkingEnabled: true,
        threshold: 0.85,
        resolutionClient: client,
      });

      const result = await runEmbeddingResolution(deps);

      expect(linkEntities).not.toHaveBeenCalled();
      expect(result.lastRun?.skippedRoleAccount).toBeGreaterThan(0);
      expect(result.lastRun?.linked).toBe(0);
    });

    it('advances the watermark only past successfully embedded candidates, not skipped role accounts', async () => {
      // Page returns two hits sorted by first_seen asc: a legit user at
      // 00:00 and a role-account at 00:01. With linkingEnabled the role
      // account is dropped before embedding. The watermark must NOT advance
      // past 00:00 — otherwise a future run that no longer classifies the
      // role-account as such (rare but possible) would never re-pick it up.
      const esClient = createEsClient();
      (esClient.search as jest.Mock).mockResolvedValueOnce(
        createSearchResponse([
          { entityId: 'er-legit', firstSeen: '2026-03-10T00:00:00Z', name: 'alice' },
          {
            entityId: 'er-role',
            firstSeen: '2026-03-10T00:01:00Z',
            name: 'er-role',
            email: 'noreply@corp.com',
          },
        ])
      );
      // Inference + bulk run for the single non-role candidate only.
      (esClient.inference.inference as jest.Mock).mockResolvedValueOnce(createInferenceResponse(1));
      (esClient.bulk as jest.Mock).mockResolvedValueOnce(createBulkOkResponse(1));
      // kNN call for er-legit yields no candidates so we don't link.
      (esClient.search as jest.Mock).mockResolvedValueOnce({ hits: { hits: [] } });

      const { client } = createMockResolutionClient();
      const deps = createDeps(createInitialState(), esClient, {
        linkingEnabled: true,
        threshold: 0.85,
        resolutionClient: client,
      });

      const result = await runEmbeddingResolution(deps);

      expect(result.lastRun?.embedded).toBe(1);
      expect(result.lastRun?.skippedRoleAccount).toBeGreaterThan(0);
      expect(result.lastProcessedTimestamp).toBe('2026-03-10T00:00:00Z');
    });

    it('advances the watermark only past bulk-success candidates, not partial bulk failures', async () => {
      // Two legit candidates; bulk reports the second one failing. Even
      // though the page hit list has its first_seen, the watermark must
      // stop at the first successful candidate.
      const esClient = createEsClient();
      (esClient.search as jest.Mock).mockResolvedValueOnce(
        createSearchResponse([
          { entityId: 'er-ok', firstSeen: '2026-03-10T00:00:00Z', name: 'alice' },
          { entityId: 'er-bad', firstSeen: '2026-03-10T00:05:00Z', name: 'bob' },
        ])
      );
      (esClient.inference.inference as jest.Mock).mockResolvedValueOnce(createInferenceResponse(2));
      // Bulk: first item ok, second item errors.
      (esClient.bulk as jest.Mock).mockResolvedValueOnce({
        took: 1,
        errors: true,
        items: [
          {
            update: { _index: 'entities-latest-default', _id: 'x', status: 200, result: 'updated' },
          },
          {
            update: {
              _index: 'entities-latest-default',
              _id: 'x',
              status: 400,
              error: { type: 'mapper_parsing_exception', reason: 'bad mapping' },
            },
          },
        ],
      });

      const deps = createDeps(createInitialState(), esClient);
      const result = await runEmbeddingResolution(deps);

      // Pre-existing global guard keeps watermark unchanged when failed > 0.
      // Combined with the per-candidate filter we want, the result is that
      // the watermark stays at its starting value (null in this test).
      expect(result.lastRun?.failed).toBe(1);
      expect(result.lastRun?.embedded).toBe(1);
      expect(result.lastProcessedTimestamp).toBeNull();
    });

    it('keeps watermark advancing on a successful embed even when a link fails (resilient)', async () => {
      const esClient = createEsClient();
      stageEsClient(
        esClient,
        [{ entityId: 'er-source', firstSeen: '2026-03-10T00:00:00Z', name: 'a' }],
        [{ hits: [knnHit('er-cand', 0.95, { name: 'a' })] }]
      );
      const linkEntities = jest.fn().mockRejectedValueOnce(new Error('transient ES failure'));
      const client = {
        linkEntities,
      } as unknown as import('../../../domain/resolution/resolution_client').ResolutionClient;
      const deps = createDeps(createInitialState(), esClient, {
        linkingEnabled: true,
        threshold: 0.85,
        resolutionClient: client,
      });

      const result = await runEmbeddingResolution(deps);

      // Embed still considered successful — watermark advances.
      expect(result.lastProcessedTimestamp).toBe('2026-03-10T00:00:00Z');
      expect(result.lastRun?.embedded).toBe(1);
      expect(result.lastRun?.failed).toBe(0);
      expect(result.lastRun?.linked).toBe(0);
    });
  });

  describe('Parallel resolution mode', () => {
    it('queries by_embedding.resolved_to instead of the legacy slot when parallelResolutionEnabled', async () => {
      const esClient = createEsClient();
      (esClient.search as jest.Mock).mockResolvedValueOnce(createSearchResponse([]));
      const deps = createDeps(createInitialState(), esClient, {
        parallelResolutionEnabled: true,
      });

      await runEmbeddingResolution(deps);

      const filters = ((esClient.search as jest.Mock).mock.calls[0][0] as any).query.bool
        .filter as any[];
      const filtersStr = JSON.stringify(filters);
      expect(filtersStr).toContain('entity.relationships.resolution.by_embedding.resolved_to');
      // The legacy single slot must NOT be used as the gate when parallel
      // mode is on — otherwise rule-resolved entities would still be skipped.
      expect(filtersStr).not.toContain('"entity.relationships.resolution.resolved_to"');
    });

    it('passes source: embedding to linkEntities so the merge layer stamps by_embedding', async () => {
      const esClient = createEsClient();
      (esClient.search as jest.Mock).mockResolvedValueOnce(
        createSearchResponse([
          { entityId: 'er-source', firstSeen: '2026-03-10T00:00:00Z', name: 'a' },
        ])
      );
      (esClient.inference.inference as jest.Mock).mockResolvedValueOnce(createInferenceResponse(1));
      (esClient.bulk as jest.Mock).mockResolvedValueOnce(createBulkOkResponse(1));
      // kNN response with one above-threshold candidate
      (esClient.search as jest.Mock).mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _id: 'doc-er-cand',
              _score: 0.95,
              _source: { entity: { id: 'er-cand' }, user: { name: 'a' } },
            },
          ],
        },
      });

      const linkEntities = jest
        .fn()
        .mockResolvedValue({ linked: ['er-source'], skipped: [], target_id: 'er-cand' });
      const client = {
        linkEntities,
      } as unknown as import('../../../domain/resolution/resolution_client').ResolutionClient;
      const deps = createDeps(createInitialState(), esClient, {
        linkingEnabled: true,
        threshold: 0.85,
        resolutionClient: client,
        parallelResolutionEnabled: true,
      });

      await runEmbeddingResolution(deps);

      expect(linkEntities).toHaveBeenCalledTimes(1);
      const callArgs = linkEntities.mock.calls[0];
      expect(callArgs[0]).toBe('er-cand');
      expect(callArgs[1]).toEqual(['er-source']);
      expect(callArgs[2]).toMatchObject({
        source: 'embedding',
        provenance: expect.objectContaining({ resolved_by: 'embedding' }),
      });
    });

    it('keeps the legacy filter and call shape when parallelResolutionEnabled is false (default)', async () => {
      const esClient = createEsClient();
      (esClient.search as jest.Mock).mockResolvedValueOnce(createSearchResponse([]));
      const deps = createDeps(createInitialState(), esClient);

      await runEmbeddingResolution(deps);

      const filters = ((esClient.search as jest.Mock).mock.calls[0][0] as any).query.bool
        .filter as any[];
      const filtersStr = JSON.stringify(filters);
      expect(filtersStr).toContain('"entity.relationships.resolution.resolved_to"');
      expect(filtersStr).not.toContain('by_embedding.resolved_to');
    });
  });

  describe('Multi-slot — embeddingField / embeddingSourceField / embeddedAtField params', () => {
    it('primary slot (no overrides): search query references the canonical field paths', async () => {
      const esClient = createEsClient();
      (esClient.search as jest.Mock).mockResolvedValueOnce(createSearchResponse([]));
      const deps = createDeps(createInitialState(), esClient);

      await runEmbeddingResolution(deps);

      const filters = ((esClient.search as jest.Mock).mock.calls[0][0] as any).query.bool
        .filter as any[];
      const orClause = filters.find((f: any) => f.bool && Array.isArray(f.bool.should));
      const shouldStr = JSON.stringify(orClause.bool.should);
      expect(shouldStr).toContain(DEFAULT_EMBEDDING_FIELD);
      expect(shouldStr).toContain(DEFAULT_EMBEDDING_SOURCE_FIELD);
    });

    it('custom embeddingField: search query uses the overridden field path', async () => {
      const esClient = createEsClient();
      (esClient.search as jest.Mock).mockResolvedValueOnce(createSearchResponse([]));
      const deps = createDeps(createInitialState(), esClient, {
        embeddingField: 'entity.resolution.embeddings.e5_384',
        embeddingSourceField: 'entity.resolution.embeddings.e5_384_source',
        embeddedAtField: 'entity.resolution.embeddings.e5_384_at',
      });

      await runEmbeddingResolution(deps);

      const filters = ((esClient.search as jest.Mock).mock.calls[0][0] as any).query.bool
        .filter as any[];
      const orClause = filters.find((f: any) => f.bool && Array.isArray(f.bool.should));
      const shouldStr = JSON.stringify(orClause.bool.should);
      // Custom field appears in the stale-embedding clause.
      expect(shouldStr).toContain('entity.resolution.embeddings.e5_384');
      expect(shouldStr).toContain('entity.resolution.embeddings.e5_384_source');
      // The primary-slot source field ('entity.resolution.embedding_source') must NOT
      // appear; the custom paths use 'e5_384_source' instead. We check the source
      // field here because the base field 'entity.resolution.embedding' is a prefix
      // substring of the custom slot path 'entity.resolution.embeddings.*' and
      // wouldn't make a useful negative assertion.
      expect(shouldStr).not.toContain(DEFAULT_EMBEDDING_SOURCE_FIELD);
    });

    it('custom embeddingField: bulk write doc uses the overridden field path (dotted key)', async () => {
      const esClient = createEsClient();
      const slotField = 'entity.resolution.embeddings.e5_384';
      const slotSourceField = 'entity.resolution.embeddings.e5_384_source';
      const slotAtField = 'entity.resolution.embeddings.e5_384_at';
      (esClient.search as jest.Mock).mockResolvedValueOnce(
        createSearchResponse([
          { entityId: 'er-slot-1', firstSeen: '2026-03-10T00:00:00Z', name: 'alice' },
        ])
      );
      (esClient.inference.inference as jest.Mock).mockResolvedValueOnce(createInferenceResponse(1));
      (esClient.bulk as jest.Mock).mockResolvedValueOnce(createBulkOkResponse(1));

      const deps = createDeps(createInitialState(), esClient, {
        embeddingField: slotField,
        embeddingSourceField: slotSourceField,
        embeddedAtField: slotAtField,
      });
      await runEmbeddingResolution(deps);

      const bulkCall = (esClient.bulk as jest.Mock).mock.calls[0][0];
      const doc1 = bulkCall.operations[1].doc;
      // unflattenObject turns 'entity.resolution.embeddings.e5_384' into
      // { entity: { resolution: { embeddings: { e5_384: [...] } } } }.
      expect(doc1.entity.resolution.embeddings.e5_384).toBeDefined();
      expect(doc1.entity.resolution.embeddings.e5_384_source).toBe(CURRENT_EMBED_SOURCE_VERSION);
      expect(typeof doc1.entity.resolution.embeddings.e5_384_at).toBe('string');
      // Primary slot fields must NOT be written.
      expect(doc1.entity?.resolution?.embedding).toBeUndefined();
    });

    it('primary slot defaults match the DEFAULT_EMBEDDING_* constants', () => {
      // Belt-and-suspenders: confirm the constants haven't drifted from the
      // module-level strings referenced in tests and production alike.
      expect(DEFAULT_EMBEDDING_FIELD).toBe('entity.resolution.embedding');
      expect(DEFAULT_EMBEDDING_SOURCE_FIELD).toBe('entity.resolution.embedding_source');
      expect(DEFAULT_EMBEDDED_AT_FIELD).toBe('entity.resolution.embedded_at');
    });
  });
});
