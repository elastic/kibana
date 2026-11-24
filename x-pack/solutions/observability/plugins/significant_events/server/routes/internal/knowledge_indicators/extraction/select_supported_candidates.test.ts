/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { getEsqlColumnSchema } from '@kbn/ai-tools';
import type { SourceCandidate } from './classify_sources';
import { selectSupportedCandidates } from './select_supported_candidates';

jest.mock('@kbn/ai-tools', () => ({
  getEsqlColumnSchema: jest.fn(),
}));

const getEsqlColumnSchemaMock = jest.mocked(getEsqlColumnSchema);

const TIMESTAMP_COLUMN = { name: '@timestamp', type: 'date' };
const MISSING_TIMESTAMP_REASON =
  'The query must return a [@timestamp] column. Nightshift reads every source over time windows on it.';

const makeCandidate = (sourceId: string): SourceCandidate => ({
  sourceId,
  sourceSlug: `${sourceId}-slug`,
  sourceType: 'logs',
  lastCompletedAt: null,
});

const ids = (candidates: SourceCandidate[]) => candidates.map(({ sourceId }) => sourceId);

const mockColumnsByView = (
  columnsByView: Record<string, Array<{ name: string; type: string }> | Error>
) => {
  getEsqlColumnSchemaMock.mockImplementation(async ({ index, fields }) => {
    const columns = columnsByView[index];
    if (columns instanceof Error) {
      throw columns;
    }
    return fields ? columns.filter(({ name }) => fields.includes(name)) : columns;
  });
};

const select = (sourceIds: string[], availableSlots: number) => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  esClient.esql.query.mockResolvedValue({ columns: [], values: [[0]] } as never);
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

  it('rejects a source whose index does not exist', async () => {
    mockColumnsByView({
      'view-missing': new Error(
        'verification_exception\n\tRoot causes:\n\t\tverification_exception: Unknown index [missing]'
      ),
    });

    const { toSchedule, unsupported } = await select(['missing'], 5);

    expect(toSchedule).toEqual([]);
    expect(unsupported).toEqual([
      expect.objectContaining({ reason: expect.stringContaining('does not exist yet') }),
    ]);
  });

  it('keeps a source with no data yet and one whose probe cannot answer', async () => {
    mockColumnsByView({ 'view-empty': [], 'view-slow': new Error('Request timed out') });

    const { toSchedule, unsupported } = await select(['empty', 'slow'], 5);

    expect(ids(toSchedule)).toEqual(['empty', 'slow']);
    expect(unsupported).toEqual([]);
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
