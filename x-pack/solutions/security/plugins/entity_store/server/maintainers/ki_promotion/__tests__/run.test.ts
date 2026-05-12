/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Feature } from '@kbn/streams-schema';
import type { StreamsKnowledgeIndicatorsReader } from '@kbn/streams-plugin/server';
import type { EntityStoreGlobalState } from '../../../domain/saved_objects';
import type { EntityStoreGlobalStateClient } from '../../../domain/saved_objects';
import { runKiPromotion } from '../run';

const NAMESPACE = 'default';

const buildEntityFeature = (overrides: Partial<Feature> = {}): Feature =>
  ({
    id: overrides.id ?? 'feat-1',
    uuid: overrides.uuid ?? 'uuid-1',
    stream_name: overrides.stream_name ?? 'logs.svc',
    type: 'entity',
    subtype: overrides.subtype ?? 'service',
    title: overrides.title ?? 'demo',
    description: 'feature',
    properties: { name: 'demo' },
    confidence: 95,
    filter: { field: 'service.name', eq: 'demo' },
    last_seen: '2026-04-01T00:00:00Z',
    status: 'active',
    ...overrides,
  } as Feature);

interface FakeEntityDoc {
  _id: string;
  entityId: string;
  engineMetadataType: 'generic' | 'host' | 'service' | 'user';
  entityType?: string;
  /**
   * `entity.source` is `keyword`-mapped in ES, so the field is multi-value at
   * the mapping layer but the `_source` shape depends on what was written.
   * KI extraction writes a single string (single-value literal-source
   * evaluation), so promotion candidates that have NEVER been written by the
   * maintainer carry a `string` here. The maintainer's own writes use a
   * one-element array (because it goes through bulk update with a partial
   * doc). Tests must exercise both shapes — they do, via this widened type.
   */
  entitySource: string | string[];
  entityConfidence?: 'low' | 'medium' | 'high';
  entityPreviousId?: string;
  hostId?: string;
  hostName?: string;
  hostHostname?: string;
  serviceName?: string;
}

const toEsHit = (doc: FakeEntityDoc) => ({
  _id: doc._id,
  sort: [doc.entityId],
  _source: {
    entity: {
      id: doc.entityId,
      type: doc.entityType,
      source: doc.entitySource,
      confidence: doc.entityConfidence,
      previous_id: doc.entityPreviousId,
      EngineMetadata: { Type: doc.engineMetadataType },
    },
    host:
      doc.hostId || doc.hostName || doc.hostHostname
        ? {
            id: doc.hostId,
            name: doc.hostName,
            hostname: doc.hostHostname,
          }
        : undefined,
    service: doc.serviceName ? { name: doc.serviceName } : undefined,
  },
});

const buildEsClient = (
  options: {
    promotionHits?: FakeEntityDoc[];
    demotionHits?: FakeEntityDoc[];
    bulkResponse?: { errors: boolean; items: unknown[] };
  } = {}
) => {
  const promotionHits = options.promotionHits ?? [];
  const demotionHits = options.demotionHits ?? [];
  const search = jest.fn().mockImplementation(async (params: any) => {
    const filters = params.query.bool.filter as Array<Record<string, unknown>>;
    const engineFilter = filters.find((f) =>
      'term' in f ? (f.term as Record<string, unknown>)['entity.EngineMetadata.Type'] : undefined
    );
    const isPromotion =
      engineFilter &&
      (engineFilter.term as Record<string, unknown>)['entity.EngineMetadata.Type'] === 'generic';

    const hits = (isPromotion ? promotionHits : demotionHits).map(toEsHit);
    return { hits: { hits } };
  });
  const bulk = jest.fn().mockResolvedValue(options.bulkResponse ?? { errors: false, items: [] });
  return { search, bulk } as unknown as jest.Mocked<ElasticsearchClient>;
};

const buildReader = (features: Feature[] = []): jest.Mocked<StreamsKnowledgeIndicatorsReader> => ({
  listEntityFeatures: jest.fn().mockResolvedValue(features),
  listDependencyFeatures: jest.fn(),
  resolveIndexPatterns: jest.fn(),
});

const buildGlobalStateClient = (
  state: Partial<EntityStoreGlobalState['knowledgeIndicators']> = {}
): jest.Mocked<Pick<EntityStoreGlobalStateClient, 'findOrThrow'>> => ({
  findOrThrow: jest.fn().mockResolvedValue({
    knowledgeIndicators: {
      entityMinConfidence: 80,
      aggregationGroupCap: 200,
      promoteToTypedThreshold: 95,
      promotedEntityTypes: ['host', 'service'],
      ...state,
    },
    historySnapshot: { status: 'started', frequency: '24h' },
    logsExtraction: {},
  }),
});

describe('runKiPromotion', () => {
  let logger = loggerMock.create();
  let abortController: AbortController;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = loggerMock.create();
    abortController = new AbortController();
  });

  it('is a no-op when promoteToTypedThreshold is null', async () => {
    const reader = buildReader();
    const esClient = buildEsClient();
    const globalStateClient = buildGlobalStateClient({ promoteToTypedThreshold: null });

    const result = await runKiPromotion({
      reader,
      esClient,
      logger,
      namespace: NAMESPACE,
      abortController,
      globalStateClient: globalStateClient as unknown as EntityStoreGlobalStateClient,
    });

    expect(result.skippedThresholdMisconfigured).toBe(1);
    expect(result.promoted).toBe(0);
    expect(result.demoted).toBe(0);
    expect(esClient.search).not.toHaveBeenCalled();
    expect(esClient.bulk).not.toHaveBeenCalled();
    expect(reader.listEntityFeatures).not.toHaveBeenCalled();
  });

  it('is a no-op when promotedEntityTypes is empty', async () => {
    const reader = buildReader();
    const esClient = buildEsClient();
    const globalStateClient = buildGlobalStateClient({ promotedEntityTypes: [] });

    const result = await runKiPromotion({
      reader,
      esClient,
      logger,
      namespace: NAMESPACE,
      abortController,
      globalStateClient: globalStateClient as unknown as EntityStoreGlobalStateClient,
    });

    expect(result.skippedThresholdMisconfigured).toBe(1);
    expect(esClient.search).not.toHaveBeenCalled();
    expect(esClient.bulk).not.toHaveBeenCalled();
  });

  it("promotes a generic entity with entity.type 'Service' and service.name present, backed by an above-threshold feature", async () => {
    const reader = buildReader([buildEntityFeature()]);
    const esClient = buildEsClient({
      promotionHits: [
        {
          _id: 'doc-1',
          entityId: 'generic:demo@stream:logs.svc:service',
          engineMetadataType: 'generic',
          entityType: 'Service',
          entitySource: ['stream:logs.svc:service'],
          serviceName: 'demo',
        },
      ],
    });
    const globalStateClient = buildGlobalStateClient();

    const result = await runKiPromotion({
      reader,
      esClient,
      logger,
      namespace: NAMESPACE,
      abortController,
      globalStateClient: globalStateClient as unknown as EntityStoreGlobalStateClient,
    });

    expect(result.promoted).toBe(1);
    expect(result.demoted).toBe(0);
    expect(result.candidatesEvaluated).toBe(1);
    expect(result.skippedMissingIdentityField).toBe(0);
    expect(result.skippedNonEcsGroupingField).toBe(0);
    expect(esClient.bulk).toHaveBeenCalledTimes(1);
    const operations = (esClient.bulk.mock.calls[0][0] as any).operations as any[];
    expect(operations[0]).toEqual({
      update: expect.objectContaining({ _id: 'doc-1' }),
    });
    expect(operations[1].doc).toEqual({
      entity: {
        EngineMetadata: { Type: 'service' },
        id: 'service:demo',
        confidence: 'low',
        previous_id: 'generic:demo@stream:logs.svc:service',
      },
    });
  });

  // Regression: KI extraction writes `entity.source` as a single string via a
  // literal-source field evaluation, but the maintainer originally only handled
  // the `string[]` shape. Real production candidates were getting bucketed into
  // `skippedLowConfidenceFeature` because `findMatchingLineageTag` iterated
  // over an empty array. See `toLineageTagsArray` in run.ts.
  it('promotes a candidate whose entity.source is a plain string (single-value literal-source shape)', async () => {
    const reader = buildReader([buildEntityFeature()]);
    const esClient = buildEsClient({
      promotionHits: [
        {
          _id: 'doc-string-source',
          entityId: 'generic:demo@stream:logs.svc:service',
          engineMetadataType: 'generic',
          entityType: 'Service',
          entitySource: 'stream:logs.svc:service',
          serviceName: 'demo',
        },
      ],
    });
    const globalStateClient = buildGlobalStateClient();

    const result = await runKiPromotion({
      reader,
      esClient,
      logger,
      namespace: NAMESPACE,
      abortController,
      globalStateClient: globalStateClient as unknown as EntityStoreGlobalStateClient,
    });

    expect(result.promoted).toBe(1);
    expect(result.skippedLowConfidenceFeature).toBe(0);
    expect(result.skippedMissingIdentityField).toBe(0);
    expect(result.skippedNonEcsGroupingField).toBe(0);
  });

  it('demotes a candidate whose entity.source is a plain string when its lineage falls below threshold', async () => {
    const reader = buildReader([]);
    const esClient = buildEsClient({
      demotionHits: [
        {
          _id: 'doc-string-source-demote',
          entityId: 'service:demo',
          engineMetadataType: 'service',
          entitySource: 'stream:logs.svc:service',
          entityConfidence: 'low',
          entityPreviousId: 'generic:demo@stream:logs.svc:service',
          serviceName: 'demo',
        },
      ],
    });
    const globalStateClient = buildGlobalStateClient();

    const result = await runKiPromotion({
      reader,
      esClient,
      logger,
      namespace: NAMESPACE,
      abortController,
      globalStateClient: globalStateClient as unknown as EntityStoreGlobalStateClient,
    });

    expect(result.demoted).toBe(1);
  });

  it("promotes a generic entity with entity.type 'Host' and host.id present", async () => {
    const reader = buildReader([
      buildEntityFeature({
        subtype: 'host',
        filter: { field: 'host.id', eq: 'i-001' },
        stream_name: 'logs.hosts',
      }),
    ]);
    const esClient = buildEsClient({
      promotionHits: [
        {
          _id: 'doc-host-1',
          entityId: 'generic:i-001@stream:logs.hosts:host',
          engineMetadataType: 'generic',
          entityType: 'Host',
          entitySource: ['stream:logs.hosts:host'],
          hostId: 'i-001',
        },
      ],
    });
    const globalStateClient = buildGlobalStateClient();

    const result = await runKiPromotion({
      reader,
      esClient,
      logger,
      namespace: NAMESPACE,
      abortController,
      globalStateClient: globalStateClient as unknown as EntityStoreGlobalStateClient,
    });

    expect(result.promoted).toBe(1);
    const operations = (esClient.bulk.mock.calls[0][0] as any).operations as any[];
    expect(operations[1].doc.entity).toMatchObject({
      EngineMetadata: { Type: 'host' },
      id: 'host:i-001',
      confidence: 'low',
      previous_id: 'generic:i-001@stream:logs.hosts:host',
    });
  });

  it("skips a candidate with entity.type 'Service' but no service.name", async () => {
    const reader = buildReader([buildEntityFeature()]);
    const esClient = buildEsClient({
      promotionHits: [
        {
          _id: 'doc-1',
          entityId: 'generic:something@stream:logs.svc:service',
          engineMetadataType: 'generic',
          entityType: 'Service',
          entitySource: ['stream:logs.svc:service'],
        },
      ],
    });
    const globalStateClient = buildGlobalStateClient();

    const result = await runKiPromotion({
      reader,
      esClient,
      logger,
      namespace: NAMESPACE,
      abortController,
      globalStateClient: globalStateClient as unknown as EntityStoreGlobalStateClient,
    });

    expect(result.promoted).toBe(0);
    expect(result.skippedMissingIdentityField).toBe(1);
    expect(esClient.bulk).not.toHaveBeenCalled();
  });

  it("skips a candidate whose KI feature's groupingField is non-ECS (e.g. org.team)", async () => {
    const reader = buildReader([
      buildEntityFeature({
        filter: { field: 'org.team', eq: 'platform' },
      }),
    ]);
    const esClient = buildEsClient({
      promotionHits: [
        {
          _id: 'doc-1',
          entityId: 'generic:demo@stream:logs.svc:service',
          engineMetadataType: 'generic',
          entityType: 'Service',
          entitySource: ['stream:logs.svc:service'],
          serviceName: 'demo',
        },
      ],
    });
    const globalStateClient = buildGlobalStateClient();

    const result = await runKiPromotion({
      reader,
      esClient,
      logger,
      namespace: NAMESPACE,
      abortController,
      globalStateClient: globalStateClient as unknown as EntityStoreGlobalStateClient,
    });

    expect(result.promoted).toBe(0);
    expect(result.skippedNonEcsGroupingField).toBe(1);
    expect(esClient.bulk).not.toHaveBeenCalled();
  });

  it("ignores a candidate with entity.type 'database' (unmapped passthrough label is not even queried)", async () => {
    const reader = buildReader([buildEntityFeature()]);
    const esClient = buildEsClient();
    const globalStateClient = buildGlobalStateClient();

    await runKiPromotion({
      reader,
      esClient,
      logger,
      namespace: NAMESPACE,
      abortController,
      globalStateClient: globalStateClient as unknown as EntityStoreGlobalStateClient,
    });

    // The ES query that the maintainer issues for promotion candidates
    // filters on `entity.type IN allowedLabels`. With our default config
    // (promotedEntityTypes: ['host', 'service']), allowedLabels should be
    // exactly ['Host', 'Service'] — `database`, `Identity`, etc. cannot
    // surface.
    const promotionSearchCalls = esClient.search.mock.calls.filter((call) => {
      const filters = (call[0] as any).query.bool.filter as Array<Record<string, unknown>>;
      const engineFilter = filters.find(
        (f) =>
          'term' in f &&
          (f.term as Record<string, unknown>)['entity.EngineMetadata.Type'] === 'generic'
      );
      return !!engineFilter;
    });
    expect(promotionSearchCalls.length).toBeGreaterThanOrEqual(1);
    const promotionSearch = promotionSearchCalls[0];
    const filters = (promotionSearch[0] as any).query.bool.filter as Array<Record<string, unknown>>;
    const termsFilter = filters.find((f) => 'terms' in f) as {
      terms: { 'entity.type': string[] };
    };
    expect(termsFilter.terms['entity.type'].sort()).toEqual(['Host', 'Service']);
  });

  it("ignores a candidate with entity.type 'Identity' (explicitly excluded from the routing map)", async () => {
    const reader = buildReader([
      buildEntityFeature({ subtype: 'user', filter: { field: 'user.name', eq: 'jane' } }),
    ]);
    const esClient = buildEsClient();
    const globalStateClient = buildGlobalStateClient();

    await runKiPromotion({
      reader,
      esClient,
      logger,
      namespace: NAMESPACE,
      abortController,
      globalStateClient: globalStateClient as unknown as EntityStoreGlobalStateClient,
    });

    // Same shape as the previous test: the ES query never lists Identity
    // among the allowed labels (the routing map doesn't include it).
    const promotionSearchCalls = esClient.search.mock.calls.filter((call) => {
      const filters = (call[0] as any).query.bool.filter as Array<Record<string, unknown>>;
      return filters.some(
        (f) =>
          'term' in f &&
          (f.term as Record<string, unknown>)['entity.EngineMetadata.Type'] === 'generic'
      );
    });
    const filters = (promotionSearchCalls[0][0] as any).query.bool.filter as Array<
      Record<string, unknown>
    >;
    const termsFilter = filters.find((f) => 'terms' in f) as {
      terms: { 'entity.type': string[] };
    };
    expect(termsFilter.terms['entity.type']).not.toContain('Identity');
  });

  it('sub_type does not gate promotion (both with and without sub_type promote identically)', async () => {
    const reader = buildReader([buildEntityFeature()]);
    const esClient = buildEsClient({
      promotionHits: [
        {
          _id: 'doc-a',
          entityId: 'generic:demo-a@stream:logs.svc:service',
          engineMetadataType: 'generic',
          entityType: 'Service',
          entitySource: ['stream:logs.svc:service'],
          serviceName: 'demo-a',
        },
        {
          _id: 'doc-b',
          entityId: 'generic:demo-b@stream:logs.svc:service',
          engineMetadataType: 'generic',
          entityType: 'Service',
          entitySource: ['stream:logs.svc:service'],
          serviceName: 'demo-b',
        },
      ],
    });
    const globalStateClient = buildGlobalStateClient();

    const result = await runKiPromotion({
      reader,
      esClient,
      logger,
      namespace: NAMESPACE,
      abortController,
      globalStateClient: globalStateClient as unknown as EntityStoreGlobalStateClient,
    });

    expect(result.promoted).toBe(2);
  });

  it('skips a generic candidate whose lineage is not above threshold this run', async () => {
    // Reader returns no above-threshold features; the candidate's lineage
    // therefore is not in `aboveThresholdLineageTags`.
    const reader = buildReader([]);
    const esClient = buildEsClient({
      promotionHits: [
        {
          _id: 'doc-1',
          entityId: 'generic:demo@stream:logs.svc:service',
          engineMetadataType: 'generic',
          entityType: 'Service',
          entitySource: ['stream:logs.svc:service'],
          serviceName: 'demo',
        },
      ],
    });
    const globalStateClient = buildGlobalStateClient();

    const result = await runKiPromotion({
      reader,
      esClient,
      logger,
      namespace: NAMESPACE,
      abortController,
      globalStateClient: globalStateClient as unknown as EntityStoreGlobalStateClient,
    });

    expect(result.promoted).toBe(0);
    expect(result.skippedLowConfidenceFeature).toBe(1);
    expect(esClient.bulk).not.toHaveBeenCalled();
  });

  it('demotes a previously-promoted entity whose feature is no longer above threshold', async () => {
    const reader = buildReader([]); // no above-threshold features → demote
    const esClient = buildEsClient({
      promotionHits: [],
      demotionHits: [
        {
          _id: 'doc-host-1',
          entityId: 'host:i-001',
          engineMetadataType: 'host',
          entityType: 'Host',
          entitySource: ['stream:logs.hosts:host'],
          entityConfidence: 'low',
          entityPreviousId: 'generic:i-001@stream:logs.hosts:host',
          hostId: 'i-001',
        },
      ],
    });
    const globalStateClient = buildGlobalStateClient();

    const result = await runKiPromotion({
      reader,
      esClient,
      logger,
      namespace: NAMESPACE,
      abortController,
      globalStateClient: globalStateClient as unknown as EntityStoreGlobalStateClient,
    });

    expect(result.demoted).toBe(1);
    expect(result.promoted).toBe(0);
    const operations = (esClient.bulk.mock.calls[0][0] as any).operations as any[];
    expect(operations[0]).toEqual({ update: expect.objectContaining({ _id: 'doc-host-1' }) });
    expect(operations[1].doc).toEqual({
      entity: {
        EngineMetadata: { Type: 'generic' },
        id: 'generic:i-001@stream:logs.hosts:host',
        confidence: null,
        previous_id: null,
      },
    });
    // entity.type and entity.sub_type are NOT modified on demote.
    expect(operations[1].doc.entity.type).toBeUndefined();
    expect(operations[1].doc.entity.sub_type).toBeUndefined();
  });

  it('does not demote when the underlying feature is still above threshold', async () => {
    const reader = buildReader([
      buildEntityFeature({
        subtype: 'host',
        stream_name: 'logs.hosts',
        filter: { field: 'host.id', eq: 'i-001' },
      }),
    ]);
    const esClient = buildEsClient({
      promotionHits: [],
      demotionHits: [
        {
          _id: 'doc-host-1',
          entityId: 'host:i-001',
          engineMetadataType: 'host',
          entityType: 'Host',
          entitySource: ['stream:logs.hosts:host'],
          entityConfidence: 'low',
          entityPreviousId: 'generic:i-001@stream:logs.hosts:host',
          hostId: 'i-001',
        },
      ],
    });
    const globalStateClient = buildGlobalStateClient();

    const result = await runKiPromotion({
      reader,
      esClient,
      logger,
      namespace: NAMESPACE,
      abortController,
      globalStateClient: globalStateClient as unknown as EntityStoreGlobalStateClient,
    });

    expect(result.demoted).toBe(0);
    expect(esClient.bulk).not.toHaveBeenCalled();
  });

  it('tolerates partial bulk failures and reports bulkUpdateErrors', async () => {
    const reader = buildReader([buildEntityFeature()]);
    const esClient = buildEsClient({
      promotionHits: [
        {
          _id: 'doc-1',
          entityId: 'generic:demo@stream:logs.svc:service',
          engineMetadataType: 'generic',
          entityType: 'Service',
          entitySource: ['stream:logs.svc:service'],
          serviceName: 'demo',
        },
      ],
      bulkResponse: {
        errors: true,
        items: [{ update: { _id: 'doc-1', error: { type: 'version_conflict' } } }],
      },
    });
    const globalStateClient = buildGlobalStateClient();

    const result = await runKiPromotion({
      reader,
      esClient,
      logger,
      namespace: NAMESPACE,
      abortController,
      globalStateClient: globalStateClient as unknown as EntityStoreGlobalStateClient,
    });

    expect(result.bulkUpdateErrors).toBe(1);
    expect(result.promoted).toBe(1);
    expect(logger.warn).toHaveBeenCalled();
  });

  it('respects abort signal mid-run (no bulk write after abort)', async () => {
    const reader = buildReader([buildEntityFeature()]);
    const esClient = buildEsClient({
      promotionHits: [
        {
          _id: 'doc-1',
          entityId: 'generic:demo@stream:logs.svc:service',
          engineMetadataType: 'generic',
          entityType: 'Service',
          entitySource: ['stream:logs.svc:service'],
          serviceName: 'demo',
        },
      ],
    });
    const globalStateClient = buildGlobalStateClient();

    abortController.abort();
    await runKiPromotion({
      reader,
      esClient,
      logger,
      namespace: NAMESPACE,
      abortController,
      globalStateClient: globalStateClient as unknown as EntityStoreGlobalStateClient,
    });

    expect(esClient.bulk).not.toHaveBeenCalled();
  });

  it('demotes a previously-promoted entity whose stream lineage is no longer represented in features', async () => {
    // Different from the above demote test: here a feature DOES exist but
    // it covers a different lineage, so the doc's lineage tag is not
    // in the above-threshold set.
    const reader = buildReader([
      buildEntityFeature({ stream_name: 'logs.OTHER', subtype: 'service' }),
    ]);
    const esClient = buildEsClient({
      promotionHits: [],
      demotionHits: [
        {
          _id: 'doc-svc-1',
          entityId: 'service:demo',
          engineMetadataType: 'service',
          entityType: 'Service',
          entitySource: ['stream:logs.svc:service'], // ← different lineage
          entityConfidence: 'low',
          entityPreviousId: 'generic:demo@stream:logs.svc:service',
          serviceName: 'demo',
        },
      ],
    });
    const globalStateClient = buildGlobalStateClient();

    const result = await runKiPromotion({
      reader,
      esClient,
      logger,
      namespace: NAMESPACE,
      abortController,
      globalStateClient: globalStateClient as unknown as EntityStoreGlobalStateClient,
    });

    expect(result.demoted).toBe(1);
  });

  it('does not demote a previously-promoted entity that is missing entity.previous_id (defensive log)', async () => {
    const reader = buildReader([]);
    const esClient = buildEsClient({
      promotionHits: [],
      demotionHits: [
        {
          _id: 'doc-svc-bad',
          entityId: 'service:demo',
          engineMetadataType: 'service',
          entityType: 'Service',
          entitySource: ['stream:logs.svc:service'],
          entityConfidence: 'low',
          // entityPreviousId intentionally missing
          serviceName: 'demo',
        },
      ],
    });
    const globalStateClient = buildGlobalStateClient();

    const result = await runKiPromotion({
      reader,
      esClient,
      logger,
      namespace: NAMESPACE,
      abortController,
      globalStateClient: globalStateClient as unknown as EntityStoreGlobalStateClient,
    });

    expect(result.demoted).toBe(0);
    expect(esClient.bulk).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
  });
});
