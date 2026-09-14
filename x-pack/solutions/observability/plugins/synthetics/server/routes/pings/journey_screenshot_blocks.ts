/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { routeId } from '../zod_query';
import { getJourneyScreenshotBlocks } from '../../queries/get_journey_screenshot_blocks';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import type { SyntheticsRestApiRouteFactory } from '../types';

export const createJourneyScreenshotBlocksRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'POST',
  path: SYNTHETICS_API_URLS.JOURNEY_SCREENSHOT_BLOCKS,
  validate: {
    body: z.object({
      hashes: z.array(routeId).max(1000),
      remoteName: z.string().max(256).optional(),
    }),
  },
  writeAccess: false,
  handler: async ({ request, syntheticsEsClient }) => {
    const { hashes: blockIds, remoteName } = request.body;

    const result = await getJourneyScreenshotBlocks({
      blockIds,
      syntheticsEsClient,
      remoteName,
    });

    return {
      result,
    };
  },
});
