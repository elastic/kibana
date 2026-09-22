/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { SECURITY_ALERTS_PARTIAL_IDENTIFIER } from '../../../common/constants';
import { getEvents } from './v1';
import { fetchEvents } from './fetch';
import { parseEventRecords } from './parse';

jest.mock('./fetch');
jest.mock('./parse');

const mockedFetchEvents = jest.mocked(fetchEvents);
const mockedParseEventRecords = jest.mocked(parseEventRecords);

describe('getEvents', () => {
  const esClient = elasticsearchServiceMock.createScopedClusterClient();
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    mockedFetchEvents.mockResolvedValue({ records: [{ docId: 'doc-2' }] } as any);
    mockedParseEventRecords.mockReturnValue({ events: [{ id: 'doc-2' }] } as any);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('uses default index patterns, paginates IDs, and preserves totalRecords', async () => {
    const result = await getEvents({
      services: { esClient, logger },
      query: {
        eventIds: ['doc-1', 'doc-2', 'doc-3'],
        start: 'now-1d',
        end: 'now',
      },
      page: { index: 1, size: 1 },
      spaceId: 'custom-space',
    });

    expect(mockedFetchEvents).toHaveBeenCalledWith({
      esClient,
      logger,
      eventIds: ['doc-2'],
      start: 'now-1d',
      end: 'now',
      indexPatterns: [`${SECURITY_ALERTS_PARTIAL_IDENTIFIER}custom-space`, 'logs-*'],
      spaceId: 'custom-space',
    });
    expect(mockedParseEventRecords).toHaveBeenCalledWith(logger, [{ docId: 'doc-2' }], ['doc-2']);
    expect(result).toEqual({
      events: [{ id: 'doc-2' }],
      totalRecords: 3,
    });
  });

  it('returns an empty page when the requested page is out of range', async () => {
    mockedFetchEvents.mockResolvedValue({ records: [] } as any);
    mockedParseEventRecords.mockReturnValue({ events: [] } as any);

    const result = await getEvents({
      services: { esClient, logger },
      query: {
        eventIds: ['doc-1'],
        start: 'now-1d',
        end: 'now',
      },
      page: { index: 2, size: 10 },
    });

    expect(mockedFetchEvents).toHaveBeenCalledWith(expect.objectContaining({ eventIds: [] }));
    expect(mockedParseEventRecords).toHaveBeenCalledWith(logger, [], []);
    expect(result).toEqual({ events: [], totalRecords: 1 });
  });

  it('returns zero totalRecords when requested events are not found', async () => {
    mockedFetchEvents.mockResolvedValue({ records: [] } as any);
    mockedParseEventRecords.mockReturnValue({ events: [] } as any);

    const result = await getEvents({
      services: { esClient, logger },
      query: {
        eventIds: ['missing-event-id'],
        start: 'now-1d',
        end: 'now',
      },
      page: { index: 0, size: 10 },
    });

    expect(mockedFetchEvents).toHaveBeenCalledWith(
      expect.objectContaining({ eventIds: ['missing-event-id'] })
    );
    expect(mockedParseEventRecords).toHaveBeenCalledWith(logger, [], ['missing-event-id']);
    expect(result).toEqual({ events: [], totalRecords: 0 });
  });
});
