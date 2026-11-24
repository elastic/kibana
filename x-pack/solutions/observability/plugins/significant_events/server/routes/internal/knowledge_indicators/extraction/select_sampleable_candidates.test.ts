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
import { selectSampleableCandidates } from './select_sampleable_candidates';

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
  return selectSampleableCandidates({
    candidates: sourceIds.map(makeCandidate),
    availableSlots,
    viewNames: new Map(sourceIds.map((id) => [id, `view-${id}`])),
    esClient,
    logger: loggingSystemMock.createLogger(),
  });
};

describe('selectSampleableCandidates', () => {
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

    const { toSchedule, skipped, unsampleable } = await select(['invalid', 'a', 'b', 'c'], 2);

    expect(ids(toSchedule)).toEqual(['a', 'b']);
    expect(ids(skipped)).toEqual(['c']);
    expect(unsampleable).toEqual([
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

    const { toSchedule, unsampleable } = await select(['missing'], 5);

    expect(toSchedule).toEqual([]);
    expect(unsampleable).toEqual([
      expect.objectContaining({ reason: expect.stringContaining('does not exist yet') }),
    ]);
  });

  it('keeps a source with no data yet and one whose probe cannot answer', async () => {
    mockColumnsByView({ 'view-empty': [], 'view-slow': new Error('Request timed out') });

    const { toSchedule, unsampleable } = await select(['empty', 'slow'], 5);

    expect(ids(toSchedule)).toEqual(['empty', 'slow']);
    expect(unsampleable).toEqual([]);
  });
});
