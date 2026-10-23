/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getJourneyVideo } from './get_journey_video';
import { getUptimeESMockClient } from './test_helpers';

const chunk = (data: string, mime = 'video/webm') => ({
  _id: data,
  _index: 'synthetics-browser-default',
  _source: { synthetics: { blob: Buffer.from(data).toString('base64'), blob_mime: mime } },
});

const searchResponse = (hits: unknown[]) => ({
  took: 1,
  timed_out: false,
  _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
  hits: { hits, max_score: 0, total: { value: hits.length, relation: 'eq' as const } },
});

describe('getJourneyVideo', () => {
  it('concatenates chunks in the order returned by ES', async () => {
    const { esClient, syntheticsEsClient } = getUptimeESMockClient();
    esClient.search.mockResponseOnce(searchResponse([chunk('abc'), chunk('def')]) as any);

    const video = await getJourneyVideo({ syntheticsEsClient, checkGroup: 'cg' });

    expect(video?.data.toString()).toBe('abcdef');
    expect(video?.mime).toBe('video/webm');
  });

  it('returns null when there are no chunks', async () => {
    const { esClient, syntheticsEsClient } = getUptimeESMockClient();
    esClient.search.mockResponseOnce(searchResponse([]) as any);

    expect(await getJourneyVideo({ syntheticsEsClient, checkGroup: 'cg' })).toBeNull();
  });

  it('filters by check group and chunk type, sorted by chunk index', async () => {
    const { esClient, syntheticsEsClient } = getUptimeESMockClient();
    esClient.search.mockResponseOnce(searchResponse([]) as any);

    await getJourneyVideo({ syntheticsEsClient, checkGroup: 'cg', remoteName: 'cluster1' });

    const call: any = esClient.search.mock.calls[0][0];
    expect(call.index).toBe(`cluster1:${syntheticsEsClient.heartbeatIndices}`);
    expect(call.query.bool.filter).toEqual([
      { term: { 'monitor.check_group': 'cg' } },
      { term: { 'synthetics.type': 'journey/video_chunk' } },
    ]);
    expect(call.sort).toEqual([
      { 'synthetics.video.chunk_index': { order: 'asc', unmapped_type: 'long' } },
    ]);
  });
});
