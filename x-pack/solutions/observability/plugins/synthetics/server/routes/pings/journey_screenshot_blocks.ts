/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { IKibanaResponse } from '@kbn/core-http-server';
import { isRight } from 'fp-ts/Either';
import * as t from 'io-ts';
import { getJourneyScreenshotBlocks } from '../../queries/get_journey_screenshot_blocks';
import { ScreenshotBlockDoc } from '../../../common/runtime_types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { RouteContext, SyntheticsRestApiRouteFactory } from '../types';

export const createJourneyScreenshotBlocksRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'POST',
  path: SYNTHETICS_API_URLS.JOURNEY_SCREENSHOT_BLOCKS,
  validate: {
    body: schema.object({
      hashes: schema.arrayOf(schema.string()),
    }),
  },
  writeAccess: false,
  handler: (routeProps) => {
    return journeyScreenshotBlocksHandler(routeProps);
  },
});

export const journeyScreenshotBlocksHandler = async ({
  response,
  request,
  syntheticsEsClient,
}: RouteContext): Promise<IKibanaResponse<ScreenshotBlockDoc[]>> => {
  const { hashes: blockIds } = request.body;

  if (!isStringArray(blockIds)) return response.badRequest();

  const result = await getJourneyScreenshotBlocks({
    blockIds,
    syntheticsEsClient,
  });

  if (result.length === 0) {
    return response.notFound();
  }

  return response.ok({
    body: result,
  });
};

function isStringArray(data: unknown): data is string[] {
  return isRight(t.array(t.string).decode(data));
}
