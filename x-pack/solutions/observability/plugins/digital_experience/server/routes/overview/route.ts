/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import { getRequestAbortedSignal } from '@kbn/data-plugin/server';
import { OVERVIEW_PERCENTILES } from '../../../common/overview_filters';
import { readOverviewFilters } from '../../../common/overview_filters_param';
import type {
  ApplicationEntryPagesResponse,
  ApplicationOverviewKpisResponse,
  ApplicationOverviewResponse,
} from '../../../common/types/overview';
import { APM_API_PRIVILEGE, DIGITAL_EXPERIENCE_API_PRIVILEGES } from '../../../common/feature';
import { kueryToQuery } from '../../lib/helpers/kuery';
import { getHistogramInterval } from '../../lib/helpers/time_series';
import {
  APPLICATION_TAB_ROUTE_OPTIONS,
  APPLICATION_TAB_ROUTE_SECURITY,
  filteredApplicationTabRouteParams,
  toApplicationSearch,
} from '../application_tab_route';
import { createDigitalExperienceServerRoute } from '../create_digital_experience_server_route';
import {
  START_AFTER_END_ISSUE,
  filteredTimeRangeShape,
  isStartBeforeEnd,
  serviceNameParam,
  timeZoneShape,
} from '../params';
import { toReadError } from '../sessions/route';
import { getEntryPages } from './otel/get_entry_pages';
import { getOtelOverview } from './otel/get_otel_overview';
import { getOtelOverviewKpis } from './otel/get_otel_overview_kpis';

export const APPLICATION_OVERVIEW_ENDPOINT =
  'GET /internal/digital_experience/applications/{serviceName}/overview';

export const APPLICATION_ENTRY_PAGES_ENDPOINT =
  'GET /internal/digital_experience/applications/{serviceName}/overview/entry-pages';

export const APPLICATION_OVERVIEW_KPIS_ENDPOINT =
  'GET /internal/digital_experience/applications/{serviceName}/overview/kpis';

/** The percentile of the load time, as a string like the rest of the query; 75 when left out. */
const percentileParam = () =>
  z
    .enum(OVERVIEW_PERCENTILES.map(String))
    .transform((raw) => OVERVIEW_PERCENTILES.find((candidate) => String(candidate) === raw))
    .optional();

const overviewRoute = createDigitalExperienceServerRoute({
  endpoint: APPLICATION_OVERVIEW_ENDPOINT,
  options: { access: 'internal' },
  security: {
    authz: { requiredPrivileges: [DIGITAL_EXPERIENCE_API_PRIVILEGES.read, APM_API_PRIVILEGE] },
  },
  params: lazySchema(() =>
    z.object({
      path: z.object({
        serviceName: serviceNameParam(),
      }),
      query: z
        .object({
          ...filteredTimeRangeShape(),
          ...timeZoneShape(),
          percentile: percentileParam(),
        })
        .refine(isStartBeforeEnd, START_AFTER_END_ISSUE),
    })
  ),
  handler: async ({ params, context, request }): Promise<ApplicationOverviewResponse> => {
    const { serviceName } = params.path;
    const { environment, filters, percentile, kuery, timeZone } = params.query;
    const start = Date.parse(params.query.start);
    const end = Date.parse(params.query.end);

    const { elasticsearch } = await context.core;
    const esClient = elasticsearch.client.asCurrentUser;
    const signal = getRequestAbortedSignal(request.events.aborted$);

    return getOtelOverview({
      esClient,
      serviceName,
      start,
      end,
      environment,
      filters: readOverviewFilters(filters),
      percentile,
      kuery: kueryToQuery(kuery),
      histogram: { interval: getHistogramInterval(start, end), timeZone },
      signal,
    });
  },
});

/** The Overview's KPI row, against the period of equal length before the time range. */
const overviewKpisRoute = createDigitalExperienceServerRoute({
  endpoint: APPLICATION_OVERVIEW_KPIS_ENDPOINT,
  options: APPLICATION_TAB_ROUTE_OPTIONS,
  security: APPLICATION_TAB_ROUTE_SECURITY,
  params: lazySchema(() =>
    z.object({
      path: z.object({ serviceName: serviceNameParam() }),
      query: z
        .object({ ...filteredTimeRangeShape(), percentile: percentileParam() })
        .refine(isStartBeforeEnd, START_AFTER_END_ISSUE),
    })
  ),
  handler: async ({ params, context, request, logger }): Promise<ApplicationOverviewKpisResponse> =>
    getOtelOverviewKpis({
      ...(await toApplicationSearch({ params, context, request, logger })),
      percentile: params.query.percentile,
      kueryText: params.query.kuery,
    }),
});

/**
 * The pages sessions started on, from the session summaries: read with the sessions' privilege, as
 * the Sessions tab does, and not APM's, which the events behind the rest of the Overview need.
 */
const entryPagesRoute = createDigitalExperienceServerRoute({
  endpoint: APPLICATION_ENTRY_PAGES_ENDPOINT,
  options: APPLICATION_TAB_ROUTE_OPTIONS,
  security: { authz: { requiredPrivileges: [DIGITAL_EXPERIENCE_API_PRIVILEGES.read] } },
  params: filteredApplicationTabRouteParams,
  handler: async ({ params, context, logger }): Promise<ApplicationEntryPagesResponse> => {
    const { elasticsearch } = await context.core;
    const { start, end, environment, filters } = params.query;
    try {
      return await getEntryPages(elasticsearch.client.asCurrentUser, {
        serviceName: params.path.serviceName,
        start: Date.parse(start),
        end: Date.parse(end),
        environment,
        filters: readOverviewFilters(filters),
      });
    } catch (error) {
      throw toReadError(error, logger, 'the entry pages');
    }
  },
});

/** The Overview's routes, keyed by their endpoints; `plugin.ts` registers them. */
export const overviewRouteRepository = {
  ...overviewRoute,
  ...overviewKpisRoute,
  ...entryPagesRoute,
};
