/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { getEntitiesLatestIndexName } from '@kbn/cloud-security-posture-common/utils/helpers';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { fetchEvents } from './fetch';

describe('fetchEvents', () => {
  const esClient = elasticsearchServiceMock.createScopedClusterClient();
  let logger: Logger;

  beforeEach(() => {
    logger = {
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
    } as unknown as Logger;

    const toRecordsMock = jest.fn().mockResolvedValue([{ docId: 'doc-1' }]);
    esClient.asCurrentUser.helpers.esql.mockReturnValue({
      toRecords: toRecordsMock,
      toArrowTable: jest.fn(),
      toArrowReader: jest.fn(),
    });

    (esClient.asInternalUser.indices as jest.Mocked<any>).getSettings = jest
      .fn()
      .mockRejectedValue({ statusCode: 404 });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('groups the query by document identity and forwards doc-id params', async () => {
    await fetchEvents({
      esClient,
      logger,
      eventIds: ['doc-1', 'doc-2'],
      start: 'now-1d',
      end: 'now',
      indexPatterns: ['logs-*'],
      spaceId: 'default',
    });

    const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0][0];
    const filter = esqlCallArgs.filter as {
      bool?: {
        filter?: QueryDslQueryContainer[];
      };
    };

    expect(esqlCallArgs.query).toContain('BY docId, eventId, index');
    expect(esqlCallArgs.query).not.toContain('eventId = MIN(eventId)');
    expect(esqlCallArgs.params).toEqual([{ doc_id0: 'doc-1' }, { doc_id1: 'doc-2' }]);
    expect(Array.isArray(filter.bool?.filter) ? filter.bool.filter[1] : undefined).toEqual({
      terms: {
        _id: ['doc-1', 'doc-2'],
      },
    });
  });

  it('uses lookup join enrichment when the entities index is in lookup mode', async () => {
    const indexName = getEntitiesLatestIndexName('default');

    (esClient.asInternalUser.indices as jest.Mocked<any>).getSettings = jest
      .fn()
      .mockResolvedValueOnce({
        [indexName]: {
          settings: {
            index: {
              mode: 'lookup',
            },
          },
        },
      });

    await fetchEvents({
      esClient,
      logger,
      eventIds: ['doc-1'],
      start: 'now-1d',
      end: 'now',
      indexPatterns: ['logs-*'],
      spaceId: 'default',
    });

    const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0][0];
    expect(esqlCallArgs.query).toContain(`LOOKUP JOIN ${indexName} ON entity.id`);
    expect(esqlCallArgs.query).not.toContain('ENRICH');
  });

  it('falls back to null enrichment fields when lookup mode is unavailable', async () => {
    await fetchEvents({
      esClient,
      logger,
      eventIds: ['doc-1'],
      start: 'now-1d',
      end: 'now',
      indexPatterns: ['logs-*'],
      spaceId: 'default',
    });

    const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0][0];
    expect(esqlCallArgs.query).toContain('| EVAL actorEntityName = TO_STRING(null)');
    expect(esqlCallArgs.query).toContain('| EVAL targetEntityName = TO_STRING(null)');
    expect(esqlCallArgs.query).not.toContain('ENRICH');
    expect((esClient.asInternalUser.enrich as jest.Mocked<any>).getPolicy).not.toHaveBeenCalled();
  });
});
