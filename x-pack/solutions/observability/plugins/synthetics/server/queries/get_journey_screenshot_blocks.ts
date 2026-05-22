/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SyntheticsEsClient } from '../lib';
import type { ScreenshotBlockDoc } from '../../common/runtime_types';

interface ScreenshotBlockResultType {
  _id: string;
  _source: {
    synthetics: {
      blob: string;
      blob_mime: string;
    };
  };
}

export const getJourneyScreenshotBlocks = async ({
  blockIds,
  syntheticsEsClient,
  remoteName,
}: {
  blockIds: string[];
  remoteName?: string;
} & {
  syntheticsEsClient: SyntheticsEsClient;
}): Promise<ScreenshotBlockDoc[]> => {
  // For screenshot blocks belonging to a monitor that lives on a remote
  // cluster, target `${remoteName}:synthetics-*` via Cross-Cluster Search.
  // When `remoteName` is absent we let SyntheticsEsClient.search fall back
  // to its default (local) heartbeat indices.
  const remoteIndex = remoteName
    ? `${remoteName}:${syntheticsEsClient.heartbeatIndices}`
    : undefined;

  const body = {
    ...(remoteIndex ? { index: remoteIndex } : {}),
    query: {
      bool: {
        filter: [
          {
            ids: {
              values: blockIds,
            },
          },
        ],
      },
    },
    size: 1000,
  };

  const fetchScreenshotBlocksResult = await syntheticsEsClient.search(body);

  return (fetchScreenshotBlocksResult.body.hits.hits as ScreenshotBlockResultType[]).map(
    ({ _id, _source }) => ({
      id: _id,
      synthetics: {
        blob: _source.synthetics.blob,
        blob_mime: _source.synthetics.blob_mime,
      },
    })
  );
};
