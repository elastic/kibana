/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema } from '@kbn/zod/v4';
import type {
  MobileAppStartsResponse,
  MobileKpisResponse,
  MobileReleasesResponse,
} from '../../../common/types/mobile';
import {
  APPLICATION_TAB_ROUTE_OPTIONS,
  APPLICATION_TAB_ROUTE_SECURITY,
  toApplicationSearch,
} from '../application_tab_route';
import { createDigitalExperienceServerRoute } from '../create_digital_experience_server_route';
import { getMobileAppStarts } from './get_mobile_app_starts';
import { getMobileKpis } from './get_mobile_kpis';
import { getMobileReleases } from './get_mobile_releases';
import { mobileFiltersParams, mobileSeriesParams } from './mobile_params';
import { isMobilePartialRead } from './partial_read';

export const MOBILE_KPIS_ENDPOINT =
  'GET /internal/digital_experience/mobile_applications/{serviceName}/kpis';

export const MOBILE_RELEASES_ENDPOINT =
  'GET /internal/digital_experience/mobile_applications/{serviceName}/releases';

export const MOBILE_APP_STARTS_ENDPOINT =
  'GET /internal/digital_experience/mobile_applications/{serviceName}/app_starts';

const releasesRoute = createDigitalExperienceServerRoute({
  endpoint: MOBILE_RELEASES_ENDPOINT,
  options: APPLICATION_TAB_ROUTE_OPTIONS,
  security: APPLICATION_TAB_ROUTE_SECURITY,
  params: lazySchema(mobileSeriesParams),
  handler: async ({ params, context, request, logger }): Promise<MobileReleasesResponse> => {
    const { osName, release, timeZone } = params.query;
    const { esClient, serviceName, start, end, environment } = await toApplicationSearch({
      params,
      context,
      request,
      logger,
    });
    return getMobileReleases({
      esClient,
      filters: { serviceName, osName, release },
      start,
      end,
      environment,
      timeZone,
    });
  },
});

/** The cold and warm starts over time, for the Performance section. */
const appStartsRoute = createDigitalExperienceServerRoute({
  endpoint: MOBILE_APP_STARTS_ENDPOINT,
  options: APPLICATION_TAB_ROUTE_OPTIONS,
  security: APPLICATION_TAB_ROUTE_SECURITY,
  params: lazySchema(mobileSeriesParams),
  handler: async ({ params, context, request, logger }): Promise<MobileAppStartsResponse> => {
    const { osName, release, timeZone } = params.query;
    const { esClient, serviceName, start, end, environment } = await toApplicationSearch({
      params,
      context,
      request,
      logger,
    });
    return getMobileAppStarts({
      esClient,
      filters: { serviceName, osName, release },
      start,
      end,
      environment,
      timeZone,
    });
  },
});

/** The KPI row of the mobile application page. */
const kpisRoute = createDigitalExperienceServerRoute({
  endpoint: MOBILE_KPIS_ENDPOINT,
  options: APPLICATION_TAB_ROUTE_OPTIONS,
  security: APPLICATION_TAB_ROUTE_SECURITY,
  params: lazySchema(mobileFiltersParams),
  handler: async ({ params, context, request, logger }): Promise<MobileKpisResponse> => {
    const { osName, release } = params.query;
    const { esClient, serviceName, start, end, environment } = await toApplicationSearch({
      params,
      context,
      request,
      logger,
    });
    const [kpis, isPartial] = await Promise.all([
      getMobileKpis({
        esClient,
        filters: { serviceName, osName, release },
        start,
        end,
        environment,
      }),
      isMobilePartialRead({ context, request, logger }),
    ]);
    return { ...kpis, isPartial };
  },
});

export const mobileRouteRepository = { ...kpisRoute, ...releasesRoute, ...appStartsRoute };
