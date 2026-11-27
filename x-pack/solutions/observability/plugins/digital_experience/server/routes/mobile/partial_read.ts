/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRequestAbortedSignal } from '@kbn/data-plugin/server';
import { OTEL_LOGS_INDEX, OTEL_TRACES_INDEX } from '../../../common/otel_data';
import { hasPartialReadAccess } from '../applications/get_partial_access';
import type { DigitalExperienceRouteHandlerResources } from '../create_digital_experience_server_route';

/**
 * Whether the user can't read every OTel logs and traces index, which the mobile routes read:
 * Elasticsearch skips the indices the user can't read, so the counts would look complete.
 */
export const isMobilePartialRead = async ({
  context,
  request,
  logger,
}: Pick<
  DigitalExperienceRouteHandlerResources,
  'context' | 'request' | 'logger'
>): Promise<boolean> => {
  const { elasticsearch } = await context.core;
  return hasPartialReadAccess({
    esClient: elasticsearch.client.asCurrentUser,
    internalEsClient: elasticsearch.client.asInternalUser,
    getIndices: async () => [OTEL_LOGS_INDEX, OTEL_TRACES_INDEX],
    signal: getRequestAbortedSignal(request.events.aborted$),
    logger,
  });
};
