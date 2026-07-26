/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { getEntities } from './v1';
import { fetchEntities } from './fetch';
import { parseEntityRecords } from './parse';

jest.mock('./fetch');
jest.mock('./parse');

const mockedFetchEntities = jest.mocked(fetchEntities);
const mockedParseEntityRecords = jest.mocked(parseEntityRecords);

describe('getEntities', () => {
  const esClient = elasticsearchServiceMock.createScopedClusterClient();
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    mockedFetchEntities.mockResolvedValue({ records: [{ entityId: 'entity-2' }] } as any);
    mockedParseEntityRecords.mockReturnValue({ entities: [{ id: 'entity-2' }] } as any);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('paginates entity ids before fetching and preserves totalRecords', async () => {
    const result = await getEntities({
      services: { esClient, logger },
      query: {
        entityIds: ['entity-1', 'entity-2', 'entity-3'],
        start: 'now-1d',
        end: 'now',
        indexPatterns: ['logs-*'],
      },
      page: { index: 1, size: 1 },
    });

    expect(mockedFetchEntities).toHaveBeenCalledWith({
      esClient,
      logger,
      entityIds: ['entity-2'],
      start: 'now-1d',
      end: 'now',
      indexPatterns: ['logs-*'],
      spaceId: 'default',
    });
    expect(mockedParseEntityRecords).toHaveBeenCalledWith(
      logger,
      [{ entityId: 'entity-2' }],
      ['entity-2']
    );
    expect(result).toEqual({
      entities: [{ id: 'entity-2' }],
      totalRecords: 3,
    });
  });

  it('returns an empty page when the requested page is out of range', async () => {
    mockedFetchEntities.mockResolvedValue({ records: [] } as any);
    mockedParseEntityRecords.mockReturnValue({ entities: [] } as any);

    const result = await getEntities({
      services: { esClient, logger },
      query: {
        entityIds: ['entity-1'],
        start: 'now-1d',
        end: 'now',
      },
      page: { index: 3, size: 10 },
    });

    expect(mockedFetchEntities).toHaveBeenCalledWith(expect.objectContaining({ entityIds: [] }));
    expect(mockedParseEntityRecords).toHaveBeenCalledWith(logger, [], []);
    expect(result).toEqual({ entities: [], totalRecords: 1 });
  });
});
