/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { FeatureWithFilter } from '@kbn/significant-events-schema';
import type { KnowledgeIndicatorClient } from '../../knowledge_indicators';
import { fetchSampleDocuments } from './fetch_sample_documents';
import {
  MAX_INFERENCE_DOCUMENTS_BYTES,
  prepareInferredSampling,
} from './prepare_inferred_sampling';

jest.mock('./fetch_sample_documents', () => ({
  fetchSampleDocuments: jest.fn(),
}));

const fetchSampleDocumentsMock = jest.mocked(fetchSampleDocuments);

const createFeature = (runId: string): FeatureWithFilter =>
  ({
    id: 'feature-1',
    uuid: 'feature-uuid-1',
    stream_name: 'logs.test-default',
    type: 'system',
    description: 'A test feature',
    properties: {},
    confidence: 80,
    updated_at: '2026-01-01T00:00:00.000Z',
    run_id: runId,
    filter: { field: 'service.name', eq: 'checkout' },
  } as FeatureWithFilter);

const createHit = (id: string): SearchHit<Record<string, unknown>> => ({
  _index: 'logs.test-default',
  _id: id,
  _source: { message: `message-${id}` },
});

const createParams = (kiClient: KnowledgeIndicatorClient) => ({
  esClient: {} as ElasticsearchClient,
  kiClient,
  streamName: 'logs.test-default',
  samplingSource: 'logs.test-default',
  start: 100,
  end: 200,
  runId: 'run-1',
  logger: {} as Logger,
  sampleSize: 10,
  entityFilteredRatio: 0.4,
  diverseRatio: 0.2,
  maxEntityFilters: 5,
  iteration: 2,
  samplingTimeoutMs: 30_000,
});

describe('prepareInferredSampling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns sampled documents and sampling metadata', async () => {
    const feature = createFeature('run-1');
    const kiClient = {
      getFeatures: jest.fn().mockResolvedValue({ hits: [feature, createFeature('another-run')] }),
    } as unknown as KnowledgeIndicatorClient;
    const sampledDocuments = [createHit('doc-1'), createHit('doc-2')];
    fetchSampleDocumentsMock.mockResolvedValue({
      documents: sampledDocuments,
      totalFilters: 3,
      filtersCapped: true,
      hasFilteredDocuments: true,
    });

    const result = await prepareInferredSampling(createParams(kiClient));

    expect(fetchSampleDocumentsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        features: [feature],
        size: 10,
        entityFilteredRatio: 0.4,
        diverseRatio: 0.2,
        maxEntityFilters: 5,
        iteration: 2,
        samplingTimeoutMs: 30_000,
      })
    );
    expect(result).toEqual({
      hasDocuments: true,
      documents: [
        { _id: 'doc-1', fields: { message: 'message-doc-1' } },
        { _id: 'doc-2', fields: { message: 'message-doc-2' } },
      ],
      docsCount: 2,
      docIds: ['doc-1', 'doc-2'],
      samplingTelemetry: {
        totalFilters: 3,
        filtersCapped: true,
        hasFilteredDocuments: true,
      },
    });
  });

  it('returns hasDocuments false for an empty sample', async () => {
    const kiClient = {
      getFeatures: jest.fn().mockResolvedValue({ hits: [] }),
    } as unknown as KnowledgeIndicatorClient;
    fetchSampleDocumentsMock.mockResolvedValue({
      documents: [],
      totalFilters: 0,
      filtersCapped: false,
      hasFilteredDocuments: false,
    });

    await expect(prepareInferredSampling(createParams(kiClient))).resolves.toEqual({
      hasDocuments: false,
      documents: [],
      docsCount: 0,
      docIds: [],
      samplingTelemetry: {
        totalFilters: 0,
        filtersCapped: false,
        hasFilteredDocuments: false,
      },
    });
  });

  it('drops documents that would exceed the aggregate serialized payload cap', async () => {
    const kiClient = {
      getFeatures: jest.fn().mockResolvedValue({ hits: [] }),
    } as unknown as KnowledgeIndicatorClient;
    fetchSampleDocumentsMock.mockResolvedValue({
      documents: Array.from({ length: 100 }, (_, index) => ({
        _index: 'logs.test-default',
        _id: `doc-${index}`,
        _source: { message: 'x'.repeat(40_000) },
      })),
      totalFilters: 0,
      filtersCapped: false,
      hasFilteredDocuments: false,
    });

    const result = await prepareInferredSampling(createParams(kiClient));

    expect(result.documents.length).toBeLessThan(100);
    expect(Buffer.byteLength(JSON.stringify(result.documents), 'utf8')).toBeLessThanOrEqual(
      MAX_INFERENCE_DOCUMENTS_BYTES
    );
  });
});
