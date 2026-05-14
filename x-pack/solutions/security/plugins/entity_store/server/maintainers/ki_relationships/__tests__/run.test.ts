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
import { protocolToRelationshipType, runKiRelationships } from '../run';

const NAMESPACE = 'default';

const buildDependencyFeature = (overrides: Partial<Feature> = {}): Feature =>
  ({
    id: overrides.id ?? 'dep-1',
    uuid: overrides.uuid ?? 'uuid-1',
    stream_name: overrides.stream_name ?? 'logs.svc',
    type: 'dependency',
    subtype: 'service_dependency',
    title: 'a -> b',
    description: 'service a calls service b',
    properties: { source: 'service-a', target: 'service-b', protocol: 'http' },
    confidence: 90,
    evidence: ['evidence'],
    evidence_doc_ids: ['doc-1'],
    tags: ['dependency'],
    last_seen: '2026-04-01T00:00:00Z',
    status: 'active',
    ...overrides,
  } as Feature);

interface ResolutionRecord {
  name: string;
  streamName: string;
  euid: string;
  docId: string;
}

const buildSearchResponse = (record: ResolutionRecord | null) => ({
  hits: {
    hits: record
      ? [
          {
            _id: record.docId,
            _source: { entity: { id: record.euid, name: record.name } },
          },
        ]
      : [],
  },
});

/**
 * Wires `esClient.search` so each call inspects the wildcard term and
 * matches it against the supplied resolution records. This mirrors the
 * lineage-scoping logic the code under test relies on without modeling
 * the entire ES query surface.
 */
const wireResolutions = (
  esClient: jest.Mocked<ElasticsearchClient>,
  records: ResolutionRecord[]
) => {
  esClient.search.mockImplementation(async (params: any) => {
    const filters = params.query.bool.filter as Array<Record<string, unknown>>;
    const nameClause = filters.find((f) => 'term' in f) as { term: { 'entity.name': string } };
    const wildcardClause = filters.find((f) => 'wildcard' in f) as {
      wildcard: { 'entity.source': string };
    };
    const name = nameClause.term['entity.name'];
    const wildcard = wildcardClause.wildcard['entity.source'];
    const streamName = wildcard.replace(/^stream:/, '').replace(/:\*$/, '');
    const match = records.find((r) => r.name === name && r.streamName === streamName);
    return buildSearchResponse(match ?? null) as any;
  });
};

const buildEsClient = () => {
  const search = jest.fn();
  const bulk = jest.fn().mockResolvedValue({ errors: false, items: [] });
  return {
    search,
    bulk,
  } as unknown as jest.Mocked<ElasticsearchClient>;
};

const buildReader = (deps: Feature[] = []): jest.Mocked<StreamsKnowledgeIndicatorsReader> => ({
  listEntityFeatures: jest.fn(),
  listDependencyFeatures: jest.fn().mockResolvedValue(deps),
  listSchemaFeatures: jest.fn().mockResolvedValue([]),
  resolveIndexPatterns: jest.fn(),
});

describe('protocolToRelationshipType', () => {
  it.each([
    ['http', 'communicates_with'],
    ['HTTP', 'communicates_with'],
    ['https', 'communicates_with'],
    ['http2', 'communicates_with'],
    ['http/2', 'communicates_with'],
    ['grpc', 'communicates_with'],
    ['tcp', 'communicates_with'],
    ['websocket', 'communicates_with'],
    ['ws', 'communicates_with'],
    ['wss', 'communicates_with'],
    ['rpc', 'communicates_with'],
    ['sql', 'depends_on'],
    ['postgresql', 'depends_on'],
    ['redis', 'depends_on'],
    ['kafka', 'depends_on'],
    ['unknown-protocol', 'depends_on'],
    ['', 'depends_on'],
  ])('maps %s to %s', (protocol, expected) => {
    expect(protocolToRelationshipType(protocol === '' ? undefined : protocol)).toBe(expected);
  });

  it('falls back to depends_on when protocol is undefined', () => {
    expect(protocolToRelationshipType(undefined)).toBe('depends_on');
  });
});

describe('runKiRelationships', () => {
  let logger = loggerMock.create();
  let abortController: AbortController;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = loggerMock.create();
    abortController = new AbortController();
  });

  it('returns empty result when no dependency features exist', async () => {
    const reader = buildReader([]);
    const esClient = buildEsClient();

    const result = await runKiRelationships({
      reader,
      esClient,
      logger,
      namespace: NAMESPACE,
      abortController,
    });

    expect(result).toEqual({
      dependenciesProcessed: 0,
      sourceUnresolved: 0,
      targetUnresolved: 0,
      sourcesUpdated: 0,
      edgesWritten: 0,
    });
    expect(esClient.search).not.toHaveBeenCalled();
    expect(esClient.bulk).not.toHaveBeenCalled();
  });

  it('writes a single relationship for a happy-path dependency', async () => {
    const reader = buildReader([buildDependencyFeature()]);
    const esClient = buildEsClient();
    wireResolutions(esClient, [
      { name: 'service-a', streamName: 'logs.svc', euid: 'euid-a', docId: 'doc-a' },
      { name: 'service-b', streamName: 'logs.svc', euid: 'euid-b', docId: 'doc-b' },
    ]);

    const result = await runKiRelationships({
      reader,
      esClient,
      logger,
      namespace: NAMESPACE,
      abortController,
    });

    expect(result).toEqual({
      dependenciesProcessed: 1,
      sourceUnresolved: 0,
      targetUnresolved: 0,
      sourcesUpdated: 1,
      edgesWritten: 1,
    });
    expect(esClient.bulk).toHaveBeenCalledTimes(1);
    const operations = (esClient.bulk.mock.calls[0][0] as any).operations as any[];
    expect(operations[0]).toEqual({
      update: expect.objectContaining({ _id: 'doc-a' }),
    });
    // http maps to communicates_with — should be unflattened to nested structure.
    expect(operations[1].doc.entity.relationships.communicates_with.ids).toEqual(['euid-b']);
  });

  it('disambiguates same-name services across different streams via entity.source wildcard', async () => {
    const reader = buildReader([
      buildDependencyFeature({ id: 'dep-prod', stream_name: 'logs.prod' }),
      buildDependencyFeature({ id: 'dep-staging', stream_name: 'logs.staging' }),
    ]);
    const esClient = buildEsClient();
    wireResolutions(esClient, [
      // Same logical names but on different streams → distinct EUIDs.
      { name: 'service-a', streamName: 'logs.prod', euid: 'euid-a-prod', docId: 'doc-a-prod' },
      { name: 'service-b', streamName: 'logs.prod', euid: 'euid-b-prod', docId: 'doc-b-prod' },
      {
        name: 'service-a',
        streamName: 'logs.staging',
        euid: 'euid-a-staging',
        docId: 'doc-a-staging',
      },
      {
        name: 'service-b',
        streamName: 'logs.staging',
        euid: 'euid-b-staging',
        docId: 'doc-b-staging',
      },
    ]);

    const result = await runKiRelationships({
      reader,
      esClient,
      logger,
      namespace: NAMESPACE,
      abortController,
    });

    expect(result.sourcesUpdated).toBe(2);
    expect(result.edgesWritten).toBe(2);
    const operations = (esClient.bulk.mock.calls[0][0] as any).operations as any[];
    const updates = operations.filter((op) => op.update);
    const docs = operations.filter((op) => op.doc);
    expect(updates.map((op) => op.update._id).sort()).toEqual(['doc-a-prod', 'doc-a-staging']);
    const allTargets = docs.flatMap((op) => op.doc.entity.relationships.communicates_with.ids);
    expect(allTargets.sort()).toEqual(['euid-b-prod', 'euid-b-staging']);
  });

  it('coalesces multiple dependencies on the same source into one bulk-update operation', async () => {
    const reader = buildReader([
      buildDependencyFeature({
        id: 'dep-1',
        properties: { source: 'service-a', target: 'service-b', protocol: 'http' },
      }),
      buildDependencyFeature({
        id: 'dep-2',
        properties: { source: 'service-a', target: 'service-c', protocol: 'http' },
      }),
      buildDependencyFeature({
        id: 'dep-3',
        properties: { source: 'service-a', target: 'service-d', protocol: 'redis' },
      }),
    ]);
    const esClient = buildEsClient();
    wireResolutions(esClient, [
      { name: 'service-a', streamName: 'logs.svc', euid: 'euid-a', docId: 'doc-a' },
      { name: 'service-b', streamName: 'logs.svc', euid: 'euid-b', docId: 'doc-b' },
      { name: 'service-c', streamName: 'logs.svc', euid: 'euid-c', docId: 'doc-c' },
      { name: 'service-d', streamName: 'logs.svc', euid: 'euid-d', docId: 'doc-d' },
    ]);

    const result = await runKiRelationships({
      reader,
      esClient,
      logger,
      namespace: NAMESPACE,
      abortController,
    });

    expect(result.sourcesUpdated).toBe(1);
    expect(result.edgesWritten).toBe(3);
    const operations = (esClient.bulk.mock.calls[0][0] as any).operations as any[];
    const docOp = operations.find((op) => op.doc);
    expect(docOp.doc.entity.relationships.communicates_with.ids).toEqual(['euid-b', 'euid-c']);
    expect(docOp.doc.entity.relationships.depends_on.ids).toEqual(['euid-d']);
  });

  it('deduplicates target EUIDs within the same relationship type', async () => {
    const reader = buildReader([
      buildDependencyFeature({
        id: 'dep-1',
        properties: { source: 'service-a', target: 'service-b', protocol: 'http' },
      }),
      buildDependencyFeature({
        id: 'dep-2',
        properties: { source: 'service-a', target: 'service-b', protocol: 'grpc' },
      }),
    ]);
    const esClient = buildEsClient();
    wireResolutions(esClient, [
      { name: 'service-a', streamName: 'logs.svc', euid: 'euid-a', docId: 'doc-a' },
      { name: 'service-b', streamName: 'logs.svc', euid: 'euid-b', docId: 'doc-b' },
    ]);

    const result = await runKiRelationships({
      reader,
      esClient,
      logger,
      namespace: NAMESPACE,
      abortController,
    });

    expect(result.edgesWritten).toBe(1);
    const operations = (esClient.bulk.mock.calls[0][0] as any).operations as any[];
    const docOp = operations.find((op) => op.doc);
    // Both http and grpc map to communicates_with; the target appears once.
    expect(docOp.doc.entity.relationships.communicates_with.ids).toEqual(['euid-b']);
  });

  it('counts and skips when the source entity is not yet in the store', async () => {
    const reader = buildReader([buildDependencyFeature()]);
    const esClient = buildEsClient();
    wireResolutions(esClient, [
      // Only target present.
      { name: 'service-b', streamName: 'logs.svc', euid: 'euid-b', docId: 'doc-b' },
    ]);

    const result = await runKiRelationships({
      reader,
      esClient,
      logger,
      namespace: NAMESPACE,
      abortController,
    });

    expect(result.sourceUnresolved).toBe(1);
    expect(result.targetUnresolved).toBe(0);
    expect(result.sourcesUpdated).toBe(0);
    expect(esClient.bulk).not.toHaveBeenCalled();
  });

  it('counts and skips when the target entity is not yet in the store', async () => {
    const reader = buildReader([buildDependencyFeature()]);
    const esClient = buildEsClient();
    wireResolutions(esClient, [
      { name: 'service-a', streamName: 'logs.svc', euid: 'euid-a', docId: 'doc-a' },
    ]);

    const result = await runKiRelationships({
      reader,
      esClient,
      logger,
      namespace: NAMESPACE,
      abortController,
    });

    expect(result.sourceUnresolved).toBe(0);
    expect(result.targetUnresolved).toBe(1);
    expect(result.sourcesUpdated).toBe(0);
    expect(esClient.bulk).not.toHaveBeenCalled();
  });

  it('skips features missing source or target in properties', async () => {
    const reader = buildReader([
      buildDependencyFeature({
        id: 'dep-no-source',
        properties: { target: 'service-b', protocol: 'http' },
      }),
      buildDependencyFeature({
        id: 'dep-no-target',
        properties: { source: 'service-a', protocol: 'http' },
      }),
    ]);
    const esClient = buildEsClient();

    const result = await runKiRelationships({
      reader,
      esClient,
      logger,
      namespace: NAMESPACE,
      abortController,
    });

    expect(result.dependenciesProcessed).toBe(2);
    expect(result.sourcesUpdated).toBe(0);
    expect(esClient.search).not.toHaveBeenCalled();
    expect(esClient.bulk).not.toHaveBeenCalled();
  });

  it('skips self-edges where source === target', async () => {
    const reader = buildReader([
      buildDependencyFeature({
        id: 'dep-self',
        properties: { source: 'service-a', target: 'service-a', protocol: 'http' },
      }),
    ]);
    const esClient = buildEsClient();

    const result = await runKiRelationships({
      reader,
      esClient,
      logger,
      namespace: NAMESPACE,
      abortController,
    });

    expect(result.dependenciesProcessed).toBe(1);
    expect(result.sourcesUpdated).toBe(0);
    expect(esClient.search).not.toHaveBeenCalled();
  });

  it('aborts further dependency resolution when abortController fires mid-loop', async () => {
    const reader = buildReader([
      buildDependencyFeature({ id: 'dep-1', stream_name: 'logs.svc' }),
      buildDependencyFeature({ id: 'dep-2', stream_name: 'logs.svc' }),
    ]);
    const esClient = buildEsClient();
    wireResolutions(esClient, [
      { name: 'service-a', streamName: 'logs.svc', euid: 'euid-a', docId: 'doc-a' },
      { name: 'service-b', streamName: 'logs.svc', euid: 'euid-b', docId: 'doc-b' },
    ]);

    abortController.abort();

    const result = await runKiRelationships({
      reader,
      esClient,
      logger,
      namespace: NAMESPACE,
      abortController,
    });

    // Aborted before processing any dep — counted at the dependency level.
    expect(result.sourcesUpdated).toBe(0);
    expect(esClient.search).not.toHaveBeenCalled();
    expect(esClient.bulk).not.toHaveBeenCalled();
  });

  it('logs a warn but does not throw when bulk update reports item failures', async () => {
    const reader = buildReader([buildDependencyFeature()]);
    const esClient = buildEsClient();
    wireResolutions(esClient, [
      { name: 'service-a', streamName: 'logs.svc', euid: 'euid-a', docId: 'doc-a' },
      { name: 'service-b', streamName: 'logs.svc', euid: 'euid-b', docId: 'doc-b' },
    ]);
    (esClient.bulk as jest.Mock).mockResolvedValue({
      errors: true,
      items: [
        { update: { _id: 'doc-a', error: { type: 'mapper_parsing_exception', reason: 'mock' } } },
      ],
    });

    const result = await runKiRelationships({
      reader,
      esClient,
      logger,
      namespace: NAMESPACE,
      abortController,
    });

    // Loop tolerates partial bulk failures; the run still completes
    // and reports the requested counts (we don't subtract failures).
    expect(result.sourcesUpdated).toBe(1);
    expect(result.edgesWritten).toBe(1);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('1 item failure'));
  });

  it('writes against the namespace-scoped latest entities index', async () => {
    const reader = buildReader([buildDependencyFeature()]);
    const esClient = buildEsClient();
    wireResolutions(esClient, [
      { name: 'service-a', streamName: 'logs.svc', euid: 'euid-a', docId: 'doc-a' },
      { name: 'service-b', streamName: 'logs.svc', euid: 'euid-b', docId: 'doc-b' },
    ]);

    await runKiRelationships({
      reader,
      esClient,
      logger,
      namespace: 'tenant-1',
      abortController,
    });

    const searchCall = esClient.search.mock.calls[0][0] as any;
    expect(searchCall.index).toContain('tenant-1');
    const bulkOperations = (esClient.bulk.mock.calls[0][0] as any).operations as any[];
    expect(bulkOperations[0].update._index).toContain('tenant-1');
  });
});
