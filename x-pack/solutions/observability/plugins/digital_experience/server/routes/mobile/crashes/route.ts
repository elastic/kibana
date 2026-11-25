/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema } from '@kbn/zod/v4';
import { getRequestAbortedSignal } from '@kbn/data-plugin/server';
import { OTEL_LOGS_INDEX } from '../../../../common/otel_data';
import type { MobileCrashGroupsResponse } from '../../../../common/types/mobile';
import {
  APPLICATION_TAB_ROUTE_OPTIONS,
  APPLICATION_TAB_ROUTE_SECURITY,
  toApplicationSearch,
} from '../../application_tab_route';
import { hasPartialReadAccess } from '../../applications/get_partial_access';
import { createDigitalExperienceServerRoute } from '../../create_digital_experience_server_route';
import { mobileFiltersParams } from '../mobile_params';
import { getCrashGroups } from './get_crash_groups';

export const MOBILE_CRASH_GROUPS_ENDPOINT =
  'GET /internal/digital_experience/mobile_applications/{serviceName}/crash_groups';

/** The Crashes tab of the mobile application page. */
export const mobileCrashesRouteRepository = createDigitalExperienceServerRoute({
  endpoint: MOBILE_CRASH_GROUPS_ENDPOINT,
  options: APPLICATION_TAB_ROUTE_OPTIONS,
  security: APPLICATION_TAB_ROUTE_SECURITY,
  params: lazySchema(mobileFiltersParams),
  handler: async ({ params, context, request, logger }): Promise<MobileCrashGroupsResponse> => {
    const { osName, release } = params.query;
    const { esClient, serviceName, start, end, environment } = await toApplicationSearch({
      params,
      context,
      request,
      logger,
    });
    const { elasticsearch } = await context.core;
    // Elasticsearch skips the indices the user can't read, so the counts would look complete.
    const [crashGroups, isPartial] = await Promise.all([
      getCrashGroups({
        esClient,
        filters: { serviceName, osName, release },
        start,
        end,
        environment,
      }),
      hasPartialReadAccess({
        esClient: elasticsearch.client.asCurrentUser,
        internalEsClient: elasticsearch.client.asInternalUser,
        getIndices: async () => [OTEL_LOGS_INDEX],
        signal: getRequestAbortedSignal(request.events.aborted$),
        logger,
      }),
    ]);
    return { crashGroups, isPartial };
  },
});
