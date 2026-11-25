/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { TransportResult } from '@elastic/elasticsearch';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { getEsqlColumnSchema } from '@kbn/ai-tools';
import type { SourceCandidate } from './classify_sources';
import { selectSupportedCandidates } from './select_supported_candidates';

jest.mock('@kbn/ai-tools', () => ({
  ...jest.requireActual('@kbn/ai-tools'),
  getEsqlColumnSchema: jest.fn(),
}));

const getEsqlColumnSchemaMock = jest.mocked(getEsqlColumnSchema);

const TIMESTAMP_COLUMN = { name: '@timestamp', type: 'date' };
const MISSING_TIMESTAMP_REASON =
  'Cannot sample [view-invalid]: The query must return a [@timestamp] column. Nightshift reads every source over time windows on it.';

const makeCandidate = (sourceId: string): SourceCandidate => ({
  sourceId,
  sourceSlug: `${sourceId}-slug`,
  sourceType: 'logs',
  lastCompletedAt: null,
});

const makeResponseError = (statusCode: number, type: string, reason: string) =>
  new errors.ResponseError({
    statusCode,
    headers: {},
    warnings: [],
    meta: {} as unknown as TransportResult['meta'],
    body: { error: { type, reason } },
  } as TransportResult);

const ids = (candidates: SourceCandidate[]) => candidates.map(({ sourceId }) => sourceId);

const mockColumnsByView = (
  columnsByView: Record<string, Array<{ name: string; type: string }> | Error>
) => {
  getEsqlColumnSchemaMock.mockImplementation(async ({ index, fields }) => {
    const columns = columnsByView[index as string];
    if (columns instanceof Error) {
      throw columns;
    }
    return fields ? columns.filter(({ name }) => fields.includes(name)) : columns;
  });
};

const select = (sourceIds: string[], availableSlots: number, { hasDocuments = true } = {}) => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  esClient.esql.query.mockResolvedValue({ values: [[hasDocuments ? 1 : 0]] } as never);

  return selectSupportedCandidates({
    candidates: sourceIds.map(makeCandidate),
    availableSlots,
    viewNames: new Map(sourceIds.map((id) => [id, `view-${id}`])),
    esClient,
    logger: loggingSystemMock.createLogger(),
  });
};

describe('selectSupportedCandidates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('gives the slot of a source without @timestamp to the next candidate', async () => {
    mockColumnsByView({
      'view-invalid': [{ name: 'message', type: 'text' }],
      'view-a': [TIMESTAMP_COLUMN],
      'view-b': [TIMESTAMP_COLUMN],
      'view-c': [TIMESTAMP_COLUMN],
    });

    const { toSchedule, skipped, unsupported } = await select(['invalid', 'a', 'b', 'c'], 2);

    expect(ids(toSchedule)).toEqual(['a', 'b']);
    expect(ids(skipped)).toEqual(['c']);
    expect(unsupported).toEqual([
      { sourceId: 'invalid', sourceSlug: 'invalid-slug', reason: MISSING_TIMESTAMP_REASON },
    ]);
    expect(getEsqlColumnSchemaMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ index: 'view-c' })
    );
  });

  it('rejects a source whose query Elasticsearch refuses to plan', async () => {
    mockColumnsByView({
      'view-broken': makeResponseError(
        400,
        'verification_exception',
        'Unknown column [gone_field]'
      ),
    });

    const { toSchedule, unsupported } = await select(['broken'], 5);

    expect(toSchedule).toEqual([]);
    expect(unsupported).toEqual([
      expect.objectContaining({
        reason: 'Elasticsearch rejects the query behind [view-broken]: Unknown column [gone_field]',
      }),
    ]);
  });

  it('keeps a source with no index yet', async () => {
    mockColumnsByView({ 'view-pending': [] });

    const { toSchedule, unsupported } = await select(['pending'], 1, { hasDocuments: false });

    expect(ids(toSchedule)).toEqual(['pending']);
    expect(unsupported).toEqual([]);
  });

  it('keeps a source whose probe cannot answer', async () => {
    mockColumnsByView({
      'view-slow': new Error('Request timed out'),
      'view-down': makeResponseError(503, 'unavailable_shards_exception', 'no shard available'),
    });

    const { toSchedule } = await select(['slow', 'down'], 5);

    expect(ids(toSchedule)).toEqual(['slow', 'down']);
  });

  it('rejects a fractional slot count instead of looping without progress', async () => {
    await expect(select(['a'], 0.5)).rejects.toThrow(
      'availableSlots must be a non-negative integer'
    );
    expect(getEsqlColumnSchemaMock).not.toHaveBeenCalled();
  });

  it('bounds concurrent probes independently of the available slot count', async () => {
    let activeProbes = 0;
    let maxActiveProbes = 0;
    getEsqlColumnSchemaMock.mockImplementation(async () => {
      activeProbes++;
      maxActiveProbes = Math.max(maxActiveProbes, activeProbes);
      await Promise.resolve();
      activeProbes--;
      return [TIMESTAMP_COLUMN];
    });

    const sourceIds = Array.from({ length: 12 }, (_, index) => `source-${index}`);
    const { toSchedule } = await select(sourceIds, sourceIds.length);

    expect(ids(toSchedule)).toEqual(sourceIds);
    expect(maxActiveProbes).toBe(5);
  });

  it('fails when a candidate has no corresponding view name', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();

    await expect(
      selectSupportedCandidates({
        candidates: [makeCandidate('orphan')],
        availableSlots: 1,
        viewNames: new Map(),
        esClient,
        logger: loggingSystemMock.createLogger(),
      })
    ).rejects.toThrow('Missing view name for source [orphan]');
    expect(getEsqlColumnSchemaMock).not.toHaveBeenCalled();
  });
});
