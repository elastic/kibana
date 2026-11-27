/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { SyntheticsEsClient } from '../lib';
import { getCheckGroupTimeRangeFilter } from '../../common/constants/client_defaults';
import { getSyntheticsScopedIndex } from '../../common/get_synthetics_indices';

export const JOURNEY_VIDEO_CHUNK_TYPE = 'journey/video_chunk';
export const MAX_VIDEO_CHUNKS = 500;

interface VideoChunkHit {
  _source: {
    synthetics: {
      blob: string;
      blob_mime: string;
    };
  };
}

export interface JourneyVideo {
  data: Buffer;
  mime: string;
}

/**
 * Reassembles a journey video from `journey/video_chunk` docs, each holding a
 * base64 slice of the recording ordered by `synthetics.video.chunk_index`.
 */
export const getJourneyVideo = async ({
  checkGroup,
  syntheticsEsClient,
  remoteName,
  timestamp,
}: {
  checkGroup: string;
  syntheticsEsClient: SyntheticsEsClient;
  remoteName?: string;
  timestamp?: string;
}): Promise<JourneyVideo | null> => {
  const result = await syntheticsEsClient.search({
    index: getSyntheticsScopedIndex(remoteName, syntheticsEsClient.heartbeatIndices),
    size: MAX_VIDEO_CHUNKS,
    _source: ['synthetics.blob', 'synthetics.blob_mime'],
    sort: [{ 'synthetics.video.chunk_index': { order: 'asc', unmapped_type: 'long' } }],
    query: {
      bool: {
        filter: [
          { term: { 'monitor.check_group': checkGroup } },
          { term: { 'synthetics.type': JOURNEY_VIDEO_CHUNK_TYPE } },
          ...(timestamp ? [getCheckGroupTimeRangeFilter(timestamp)] : []),
        ] as QueryDslQueryContainer[],
      },
    },
  });

  const hits = result.body.hits.hits as VideoChunkHit[];
  if (hits.length === 0) {
    return null;
  }

  return {
    data: Buffer.concat(hits.map(({ _source }) => Buffer.from(_source.synthetics.blob, 'base64'))),
    mime: hits[0]._source.synthetics.blob_mime || 'video/webm',
  };
};
