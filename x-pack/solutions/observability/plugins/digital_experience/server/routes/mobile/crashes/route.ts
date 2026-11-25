/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema } from '@kbn/zod/v4';
import { getRequestAbortedSignal } from '@kbn/data-plugin/server';
import { OTEL_LOGS_INDEX, OTEL_TRACES_INDEX } from '../../../../common/otel_data';
import type {
  MobileCrashGroupDetailResponse,
  MobileCrashGroupsResponse,
} from '../../../../common/types/mobile';
import {
  APPLICATION_TAB_ROUTE_OPTIONS,
  APPLICATION_TAB_ROUTE_SECURITY,
  toApplicationSearch,
} from '../../application_tab_route';
import { hasPartialReadAccess } from '../../applications/get_partial_access';
import {
  createDigitalExperienceServerRoute,
  type DigitalExperienceRouteHandlerResources,
} from '../../create_digital_experience_server_route';
import { mobileCrashGroupParams, mobileFiltersParams } from '../mobile_params';
import { getCrashGroup } from './get_crash_group';
import { getCrashGroups } from './get_crash_groups';

export const MOBILE_CRASH_GROUPS_ENDPOINT =
  'GET /internal/digital_experience/mobile_applications/{serviceName}/crash_groups';
export const MOBILE_CRASH_GROUP_ENDPOINT =
  'GET /internal/digital_experience/mobile_applications/{serviceName}/crash_groups/{fingerprint}';

/**
 * Whether the user can't read every OTel logs and traces index. Both routes read both: crashes are
 * log records, while the newest release and the session before a crash also come from spans.
 */
const isPartialRead = async ({
  context,
  request,
  logger,
}: Pick<
  DigitalExperienceRouteHandlerResources,
  'context' | 'request' | 'logger'
>): Promise<boolean> => {
  const { elasticsearch } = await context.core;
  // Elasticsearch skips the indices the user can't read, so the counts would look complete.
  return hasPartialReadAccess({
    esClient: elasticsearch.client.asCurrentUser,
    internalEsClient: elasticsearch.client.asInternalUser,
    getIndices: async () => [OTEL_LOGS_INDEX, OTEL_TRACES_INDEX],
    signal: getRequestAbortedSignal(request.events.aborted$),
    logger,
  });
};

const listRoute = createDigitalExperienceServerRoute({
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
    const [crashGroups, isPartial] = await Promise.all([
      getCrashGroups({
        esClient,
        filters: { serviceName, osName, release },
        start,
        end,
        environment,
      }),
      isPartialRead({ context, request, logger }),
    ]);
    return { crashGroups, isPartial };
  },
});

const detailRoute = createDigitalExperienceServerRoute({
  endpoint: MOBILE_CRASH_GROUP_ENDPOINT,
  options: APPLICATION_TAB_ROUTE_OPTIONS,
  security: APPLICATION_TAB_ROUTE_SECURITY,
  params: lazySchema(mobileCrashGroupParams),
  handler: async ({
    params,
    context,
    request,
    logger,
  }): Promise<MobileCrashGroupDetailResponse> => {
    const { osName, release } = params.query;
    const { esClient, serviceName, start, end, environment } = await toApplicationSearch({
      params,
      context,
      request,
      logger,
    });
    const [detail, isPartial] = await Promise.all([
      getCrashGroup({
        esClient,
        filters: { serviceName, osName, release },
        fingerprint: params.path.fingerprint,
        start,
        end,
        environment,
      }),
      isPartialRead({ context, request, logger }),
    ]);
    return { ...detail, isPartial };
  },
});

/** The Crashes tab of the mobile application page: its groups, and a group's detail. */
export const mobileCrashesRouteRepository = { ...listRoute, ...detailRoute };
