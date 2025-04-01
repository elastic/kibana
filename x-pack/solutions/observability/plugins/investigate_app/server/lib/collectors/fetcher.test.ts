/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClientMock, savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { CollectorFetchContext } from '@kbn/usage-collection-plugin/server';
import { fetcher } from './fetcher';

let savedObjectClient: ReturnType<typeof savedObjectsRepositoryMock.create>;

let closeMock: jest.Mock;
let esClient: ElasticsearchClientMock;

describe('Investigation usage collector fetcher', () => {
  beforeEach(() => {
    savedObjectClient = savedObjectsRepositoryMock.create();
    closeMock = jest.fn();
  });

  it('without any existing investigation', async () => {
    savedObjectClient.createPointInTimeFinder.mockReturnValue({
      find: async function* find() {
        return {
          [Symbol.asyncIterator]: async () => {},
          next: () => {},
        };
      },
      close: closeMock,
    });

    const results = await fetcher({
      soClient: savedObjectClient,
      esClient,
    } as CollectorFetchContext);

    expect(closeMock).toHaveBeenCalled();
    expect(results.investigation).toMatchInlineSnapshot(`
      Object {
        "by_origin": Object {
          "alert": 0,
          "blank": 0,
        },
        "by_status": Object {
          "active": 0,
          "cancelled": 0,
          "mitigated": 0,
          "resolved": 0,
          "triage": 0,
        },
        "items": Object {
          "avg": 0,
          "max": 0,
          "min": 0,
          "p90": 0,
          "p95": 0,
        },
        "notes": Object {
          "avg": 0,
          "max": 0,
          "min": 0,
          "p90": 0,
          "p95": 0,
        },
        "total": 0,
      }
    `);
  });
});
