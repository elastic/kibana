/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  savedObjectsRepositoryMock,
  ElasticsearchClientMock,
  elasticsearchServiceMock,
} from '@kbn/core/server/mocks';
import { CollectorFetchContext } from '@kbn/usage-collection-plugin/server';
import { fetcher } from './fetcher';

let savedObjectClient: ReturnType<typeof savedObjectsRepositoryMock.create>;
let closeMock: jest.Mock;
let esClientMock: ElasticsearchClientMock;

describe('SLO usage collector fetcher', () => {
  beforeEach(() => {
    esClientMock = elasticsearchServiceMock.createElasticsearchClient();
    savedObjectClient = savedObjectsRepositoryMock.create();
    closeMock = jest.fn();
  });

  it('without any existing slo', async () => {
    savedObjectClient.createPointInTimeFinder.mockReturnValue({
      find: async function* find() {
        return {
          [Symbol.asyncIterator]: async () => {},
          next: () => {},
        };
      },
      close: closeMock,
    });

    esClientMock.count.mockResolvedValue({
      count: 13,
      _shards: {
        total: 2,
        successful: 2,
        skipped: 0,
        failed: 0,
      },
    });

    const results = await fetcher({
      soClient: savedObjectClient,
      esClient: esClientMock,
    } as CollectorFetchContext);

    expect(closeMock).toHaveBeenCalled();
    expect(results.slo).toMatchInlineSnapshot(`
      Object {
        "by_budgeting_method": Object {
          "occurrences": 0,
          "timeslices": 0,
        },
        "by_calendar_aligned_duration": Object {},
        "by_rolling_duration": Object {},
        "by_sli_type": Object {},
        "by_status": Object {
          "disabled": 0,
          "enabled": 0,
        },
        "definitions": Object {
          "total": 0,
          "total_with_ccs": 0,
          "total_with_groups": 0,
        },
        "instances": Object {
          "total": 13,
        },
        "total": 0,
      }
    `);
  });
});
