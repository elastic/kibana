/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SyntheticsEsClient } from '../lib';
import type { ScreenshotBlockDoc } from '../../common/runtime_types';
import { SYNTHETICS_INDEX_PATTERN } from '../../common/constants';

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
  const body = {
    // Ref-based screenshots are stored as separate block docs on the same
    // synthetics indices. Reach across CCS for remote monitors.
    ...(remoteName ? { index: `${remoteName}:${SYNTHETICS_INDEX_PATTERN}` } : {}),
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
