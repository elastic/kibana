/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { routeId } from '../zod_query';
import { getJourneyVideo } from '../../queries/get_journey_video';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import type { SyntheticsRestApiRouteFactory } from '../types';

export const createJourneyVideoRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.JOURNEY_VIDEO,
  validate: {
    params: z.strictObject({
      checkGroup: routeId,
    }),
    query: z.strictObject({
      remoteName: z.string().max(256).optional(),
      timestamp: z.string().max(30).optional(),
    }),
  },
  handler: async ({ request, response, syntheticsEsClient }) => {
    const { checkGroup } = request.params;
    const { remoteName, timestamp } = request.query as { remoteName?: string; timestamp?: string };

    const video = await getJourneyVideo({ syntheticsEsClient, checkGroup, remoteName, timestamp });

    if (!video) {
      return response.notFound();
    }

    return response.ok({
      body: video.data,
      headers: {
        'content-type': video.mime,
        'content-length': String(video.data.length),
        'cache-control': 'max-age=600',
      },
    });
  },
});
