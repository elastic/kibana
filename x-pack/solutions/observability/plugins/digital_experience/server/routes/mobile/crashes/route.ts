/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema } from '@kbn/zod/v4';
import type {
  MobileCrashGroupDetailResponse,
  MobileCrashGroupsResponse,
} from '../../../../common/types/mobile';
import {
  APPLICATION_TAB_ROUTE_OPTIONS,
  APPLICATION_TAB_ROUTE_SECURITY,
  toApplicationSearch,
} from '../../application_tab_route';
import { createDigitalExperienceServerRoute } from '../../create_digital_experience_server_route';
import { mobileCrashGroupParams, mobileFiltersParams } from '../mobile_params';
import { isMobilePartialRead } from '../partial_read';
import { getCrashGroup } from './get_crash_group';
import { getCrashGroups, getCrashReleases } from './get_crash_groups';

export const MOBILE_CRASH_GROUPS_ENDPOINT =
  'GET /internal/digital_experience/mobile_applications/{serviceName}/crash_groups';
export const MOBILE_CRASH_GROUP_ENDPOINT =
  'GET /internal/digital_experience/mobile_applications/{serviceName}/crash_groups/{fingerprint}';

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
    const search = { esClient, filters: { serviceName, osName, release }, start, end, environment };
    const [crashGroups, releases, isPartial] = await Promise.all([
      getCrashGroups(search),
      getCrashReleases(search),
      isMobilePartialRead({ context, request, logger }),
    ]);
    return { crashGroups, releases, isPartial };
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
      isMobilePartialRead({ context, request, logger }),
    ]);
    return { ...detail, isPartial };
  },
});

/**
 * The Crashes tab of the mobile application page: its groups, and a group's detail. Both read the
 * logs and the traces: crashes are log records, while the newest release and the session before a
 * crash also come from spans.
 */
export const mobileCrashesRouteRepository = { ...listRoute, ...detailRoute };
