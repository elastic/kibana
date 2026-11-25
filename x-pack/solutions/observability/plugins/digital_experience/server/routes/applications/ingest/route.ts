/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import { getRequestAbortedSignal } from '@kbn/data-plugin/server';
import type { ApplicationsIngestResponse } from '../../../../common/types/applications_ingest';
import { APM_API_PRIVILEGE, DIGITAL_EXPERIENCE_API_PRIVILEGES } from '../../../../common/feature';
import { createDigitalExperienceTracedEsClient } from '../../../lib/create_digital_experience_traced_es_client';
import { getHistogramInterval } from '../../../lib/helpers/time_series';
import { createDigitalExperienceServerRoute } from '../../create_digital_experience_server_route';
import {
  START_AFTER_END_ISSUE,
  isStartBeforeEnd,
  timeRangeShape,
  timeZoneShape,
} from '../../params';
import { getApplicationsIngest } from './get_applications_ingest';
import { getIndexSizes } from './get_index_sizes';
import { classicSource, mobileSource, otelWebSource } from './ingest_sources';

export const APPLICATIONS_INGEST_ENDPOINT = 'GET /internal/digital_experience/applications/ingest';

/**
 * The estimated ingest of the Applications list's applications. Apart from the list, which shows
 * its rows without waiting for it, as it counts every document of the time range.
 */
export const applicationsIngestRouteRepository = createDigitalExperienceServerRoute({
  endpoint: APPLICATIONS_INGEST_ENDPOINT,
  options: { access: 'internal' },
  security: {
    authz: { requiredPrivileges: [DIGITAL_EXPERIENCE_API_PRIVILEGES.read, APM_API_PRIVILEGE] },
  },
  params: lazySchema(() =>
    z.object({
      query: z
        .object({ ...timeRangeShape(), ...timeZoneShape() })
        .refine(isStartBeforeEnd, START_AFTER_END_ISSUE),
    })
  ),
  handler: async ({
    params,
    context,
    request,
    plugins,
    isServerless,
    isUxEnabled,
    logger,
  }): Promise<ApplicationsIngestResponse> => {
    const { environment, timeZone } = params.query;
    const start = Date.parse(params.query.start);
    const end = Date.parse(params.query.end);
    const interval = getHistogramInterval(start, end);

    const { elasticsearch, savedObjects } = await context.core;
    const signal = getRequestAbortedSignal(request.events.aborted$);
    const searchParams = {
      tracedEsClient: createDigitalExperienceTracedEsClient({
        client: elasticsearch.client.asCurrentUser,
        logger,
        abortSignal: signal,
      }),
      start,
      end,
      environment,
      histogram: { interval, timeZone },
    };

    // Classic RUM as the list shows it: stateful only, with the ux and APM data access plugins.
    const { apmDataAccess } = plugins;
    const apmIndices =
      isServerless || !isUxEnabled || !apmDataAccess
        ? undefined
        : await apmDataAccess.getApmIndices(savedObjects.client);

    return getApplicationsIngest({
      sources: [
        otelWebSource(searchParams),
        ...(apmIndices ? [classicSource(apmIndices, searchParams)] : []),
        mobileSource(searchParams),
      ],
      getIndexSizes: (indices) =>
        getIndexSizes({
          esClient: elasticsearch.client.asCurrentUser,
          meteringClient: elasticsearch.client.asSecondaryAuthUser,
          isServerless,
          indices,
          signal,
        }),
      histogram: { interval, start, end },
      logger,
    });
  },
});
