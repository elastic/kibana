/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { BasicPrettyPrinter } from '@elastic/esql';
import type { ElasticsearchClient } from '@kbn/core/server';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { Logger } from '@kbn/logging';
import type { FeatureWithFilter } from '@kbn/significant-events-schema';
import { getEsqlColumnSchema, getSampleDocumentsEsql } from '@kbn/ai-tools';
import { getDiverseSampleDocuments } from '@kbn/nightshift-ai';
import { fetchSampleDocuments } from './fetch_sample_documents';

jest.mock('@kbn/ai-tools', () => ({
  getEsqlColumnSchema: jest.fn(),
  getSampleDocumentsEsql: jest.fn(),
}));
jest.mock('@kbn/nightshift-ai', () => ({
  getDiverseSampleDocuments: jest.fn(),
}));

const getDiverseSampleDocumentsMock = jest.mocked(getDiverseSampleDocuments);
const getSampleDocumentsEsqlMock = jest.mocked(getSampleDocumentsEsql);
const getEsqlColumnSchemaMock = jest.mocked(getEsqlColumnSchema);

const getEntityFilteredCall = () =>
  getSampleDocumentsEsqlMock.mock.calls.find(([params]) => params.whereCondition)?.[0];
const getRandomCall = () =>
  getSampleDocumentsEsqlMock.mock.calls.find(([params]) => !params.whereCondition)?.[0];

const createHit = (id: string): SearchHit<Record<string, unknown>> => ({
  _index: '',
  _id: id,
  _source: {},
});

const createFeature = ({
  id,
  updatedAt,
  field,
  value,
}: {
  id: string;
  updatedAt: string;
  field: string;
  value: string;
}): FeatureWithFilter =>
  ({
    id,
    source_id: 'logs.test-default',
    type: 'system',
    description: id,
    properties: {},
    confidence: 80,
    updated_at: updatedAt,
    filter: { field, eq: value },
  } as FeatureWithFilter);

const logger = {
  debug: jest.fn(),
  warn: jest.fn(),
} as unknown as Logger;

describe('fetchSampleDocuments', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('rejects invalid sampling ratios', async () => {
    const baseParams = {
      esClient: {} as ElasticsearchClient,
      index: 'logs.test-default',
      start: 100,
      end: 200,
      features: [],
      logger,
      size: 5,
      maxEntityFilters: 10,
      samplingTimeoutMs: 30_000,
      iteration: 1,
    };

    await expect(
      fetchSampleDocuments({
        ...baseParams,
        entityFilteredRatio: -0.1,
        diverseRatio: 0,
      })
    ).rejects.toThrow('must be >= 0');

    await expect(
      fetchSampleDocuments({
        ...baseParams,
        entityFilteredRatio: 0.8,
        diverseRatio: 0.3,
      })
    ).rejects.toThrow('must be <= 1');
  });

  it('rejects with a 400 that explains the missing index when nothing exists to sample', async () => {
    getSampleDocumentsEsqlMock.mockRejectedValueOnce(
      new Error(
        'verification_exception\n\tRoot causes:\n\t\tverification_exception: Unknown index [test]'
      )
    );

    await expect(
      fetchSampleDocuments({
        esClient: elasticsearchServiceMock.createElasticsearchClient(),
        index: 'logs.test-default',
        start: 100,
        end: 200,
        features: [],
        logger,
        size: 5,
        entityFilteredRatio: 0,
        diverseRatio: 0,
        maxEntityFilters: 10,
        samplingTimeoutMs: 30_000,
        iteration: 1,
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message:
        'There are no documents to sample: an index behind [logs.test-default] does not exist yet.',
    });
  });

  it('uses ES|QL random sampling when there are no entity filters', async () => {
    const esClient = {} as ElasticsearchClient;
    getSampleDocumentsEsqlMock.mockResolvedValueOnce({
      hits: [createHit('random-1')],
      total: 1,
    });

    const result = await fetchSampleDocuments({
      esClient,
      index: 'logs.test-default',
      start: 100,
      end: 200,
      features: [],
      logger,
      size: 5,
      entityFilteredRatio: 0.4,
      diverseRatio: 0,
      maxEntityFilters: 10,
      samplingTimeoutMs: 30_000,
      iteration: 1,
    });

    expect(getSampleDocumentsEsqlMock).toHaveBeenCalledWith({
      esClient,
      index: 'logs.test-default',
      start: 100,
      end: 200,
      sampleSize: 5,
      abortSignal: expect.any(AbortSignal),
    });
    expect(getDiverseSampleDocumentsMock).not.toHaveBeenCalled();
    expect(result.documents.map((document) => document._id)).toEqual(['random-1']);
    expect(result.hasFilteredDocuments).toBe(false);
  });

  it('filters on mapped fields without SET unmapped_fields and leaves the random arm unfiltered', async () => {
    const esClient = {} as ElasticsearchClient;
    const features = [
      createFeature({
        id: 'older',
        updatedAt: '2026-01-01T00:00:00.000Z',
        field: 'host.name',
        value: 'host-a',
      }),
      createFeature({
        id: 'newer',
        updatedAt: '2026-01-02T00:00:00.000Z',
        field: 'service.name',
        value: 'checkout',
      }),
    ];

    getEsqlColumnSchemaMock.mockResolvedValueOnce([
      { name: 'host.name', type: 'keyword' },
      { name: 'service.name', type: 'keyword' },
    ]);
    getSampleDocumentsEsqlMock.mockImplementation(async ({ whereCondition }) => ({
      hits: [createHit(whereCondition ? 'entity-1' : 'random-1')],
      total: 1,
    }));
    getDiverseSampleDocumentsMock.mockResolvedValueOnce({ hits: [createHit('diverse-1')] });

    const result = await fetchSampleDocuments({
      esClient,
      index: 'logs.test-default',
      start: 100,
      end: 200,
      features,
      logger,
      size: 10,
      entityFilteredRatio: 0.4,
      diverseRatio: 0.2,
      maxEntityFilters: 1,
      samplingTimeoutMs: 30_000,
      iteration: 1,
    });

    const entityFilteredCall = getEntityFilteredCall()!;
    expect(entityFilteredCall).toEqual(
      expect.objectContaining({
        index: 'logs.test-default',
        sampleSize: 4,
        abortSignal: expect.any(AbortSignal),
      })
    );
    expect(entityFilteredCall).not.toHaveProperty('unmappedFields');
    expect(BasicPrettyPrinter.print(entityFilteredCall.whereCondition!)).toBe(
      '(`service.name` != "checkout" OR `service.name` IS NULL)'
    );

    expect(getDiverseSampleDocumentsMock).toHaveBeenCalledWith({
      esClient: expect.objectContaining({ esql: expect.any(Function) }),
      index: 'logs.test-default',
      start: 100,
      end: 200,
      size: 6,
      iteration: 1,
      logger,
    });
    expect(getRandomCall()).toEqual({
      esClient,
      index: 'logs.test-default',
      start: 100,
      end: 200,
      sampleSize: 10,
      abortSignal: expect.any(AbortSignal),
    });
    expect(result.documents.map((document) => document._id)).toEqual([
      'entity-1',
      'diverse-1',
      'random-1',
    ]);
    expect(result.filtersCapped).toBe(true);
    expect(result.hasFilteredDocuments).toBe(true);
  });

  it('skips entity filters on fields the source does not map or cannot compare', async () => {
    const esClient = {} as ElasticsearchClient;
    const features = [
      createFeature({
        id: 'unmapped',
        updatedAt: '2026-01-03T00:00:00.000Z',
        field: 'labels.team',
        value: 'payments',
      }),
      createFeature({
        id: 'conflicting',
        updatedAt: '2026-01-02T00:00:00.000Z',
        field: 'http.status',
        value: '500',
      }),
      createFeature({
        id: 'mapped',
        updatedAt: '2026-01-01T00:00:00.000Z',
        field: 'service.name',
        value: 'checkout',
      }),
    ];

    getEsqlColumnSchemaMock.mockResolvedValueOnce([
      { name: 'http.status', type: 'unsupported' },
      { name: 'service.name', type: 'keyword' },
    ]);
    getSampleDocumentsEsqlMock.mockImplementation(async ({ whereCondition }) => ({
      hits: [createHit(whereCondition ? 'entity-1' : 'random-1')],
      total: 1,
    }));

    await fetchSampleDocuments({
      esClient,
      index: 'logs.test-default',
      start: 100,
      end: 200,
      features,
      logger,
      size: 5,
      entityFilteredRatio: 0.4,
      diverseRatio: 0,
      maxEntityFilters: 10,
      samplingTimeoutMs: 30_000,
      iteration: 2,
    });

    expect(BasicPrettyPrinter.print(getEntityFilteredCall()!.whereCondition!)).toBe(
      '(`service.name` != "checkout" OR `service.name` IS NULL)'
    );
  });

  it('falls back to random documents when entity-filtered ES|QL sampling fails', async () => {
    const esClient = {} as ElasticsearchClient;
    const features = [
      createFeature({
        id: 'feature-1',
        updatedAt: '2026-01-02T00:00:00.000Z',
        field: 'service.name',
        value: 'checkout',
      }),
    ];

    getEsqlColumnSchemaMock.mockResolvedValueOnce([{ name: 'service.name', type: 'keyword' }]);
    getSampleDocumentsEsqlMock.mockImplementation(async ({ whereCondition }) => {
      if (whereCondition) {
        throw new Error('verification_exception');
      }
      return { hits: [createHit('random-1')], total: 1 };
    });

    const result = await fetchSampleDocuments({
      esClient,
      index: 'logs.test-default',
      start: 100,
      end: 200,
      features,
      logger,
      size: 5,
      entityFilteredRatio: 0.4,
      diverseRatio: 0,
      maxEntityFilters: 10,
      samplingTimeoutMs: 30_000,
      iteration: 1,
    });

    expect(logger.warn).toHaveBeenCalledWith(
      'Entity-filtered sampling query failed: verification_exception'
    );
    expect(result.documents.map((document) => document._id)).toEqual(['random-1']);
    expect(result.hasFilteredDocuments).toBe(false);
  });
});
