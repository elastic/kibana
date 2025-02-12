/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { getJourneyScreenshotBlocks } from '../../queries/get_journey_screenshot_blocks';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { SyntheticsRestApiRouteFactory } from '../types';

export const createJourneyScreenshotBlocksRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'POST',
  path: SYNTHETICS_API_URLS.JOURNEY_SCREENSHOT_BLOCKS,
  validate: {
    body: schema.object({
      hashes: schema.arrayOf(schema.string()),
    }),
  },
  writeAccess: false,
  handler: async ({ request, response, syntheticsEsClient }) => {
    const { hashes: blockIds } = request.body as { hashes: string[] };

    const result = await getJourneyScreenshotBlocks({
      blockIds,
      syntheticsEsClient,
    });

    if (result.length === 0) {
      return response.noContent({
        body: result,
      });
    }
    const resultSet = new Set(result.map((block) => block.id));
    if (blockIds.some((id: string) => !resultSet.has(id))) {
      return response.multiStatus({
        body: blockIds.map((id) =>
          resultSet.has(id)
            ? { ...result.find((block) => block.id === id), status: 200 }
            : { id, status: 404 }
        ),
      });
    }
    return response.ok({
      body: result,
    });
  },
});
