/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getJourneyScreenshotBlocks } from './get_journey_screenshot_blocks';
import { getUptimeESMockClient, mockSearchResult } from './test_helpers';

describe('getJourneyScreenshotBlocks', () => {
  describe('remoteName CCS index override', () => {
    const emptyResponse = {
      took: 18,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: {
        hits: [],
        max_score: 0.0,
        total: { value: 0, relation: 'eq' as const },
      },
    };

    it('does not override the index when remoteName is absent', async () => {
      const { esClient: mockEsClient, syntheticsEsClient } = getUptimeESMockClient();
      mockEsClient.search.mockResponseOnce(emptyResponse);

      await getJourneyScreenshotBlocks({
        syntheticsEsClient,
        blockIds: ['hash1'],
      });

      const call: any = mockEsClient.search.mock.calls[0][0];
      expect(call.index).toBe(syntheticsEsClient.heartbeatIndices);
    });

    it('prefixes the index with remoteName when present', async () => {
      const { esClient: mockEsClient, syntheticsEsClient } = getUptimeESMockClient();
      mockEsClient.search.mockResponseOnce(emptyResponse);

      await getJourneyScreenshotBlocks({
        syntheticsEsClient,
        blockIds: ['hash1'],
        remoteName: 'cluster1',
      });

      const call: any = mockEsClient.search.mock.calls[0][0];
      expect(call.index).toBe(`cluster1:${syntheticsEsClient.heartbeatIndices}`);
    });
  });

  it('returns formatted blocks', async () => {
    expect(
      await getJourneyScreenshotBlocks({
        syntheticsEsClient: mockSearchResult([
          {
            _id: 'hash1',
            _source: {
              synthetics: {
                blob: 'image data',
                blob_mime: 'image/jpeg',
              },
            },
          },
          {
            _id: 'hash2',
            _source: {
              synthetics: {
                blob: 'image data',
                blob_mime: 'image/jpeg',
              },
            },
          },
        ]),
        blockIds: ['hash1', 'hash2'],
      })
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "hash1",
          "synthetics": Object {
            "blob": "image data",
            "blob_mime": "image/jpeg",
          },
        },
        Object {
          "id": "hash2",
          "synthetics": Object {
            "blob": "image data",
            "blob_mime": "image/jpeg",
          },
        },
      ]
    `);
  });
});
