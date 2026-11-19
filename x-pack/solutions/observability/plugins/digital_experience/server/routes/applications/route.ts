/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import { getRequestAbortedSignal } from '@kbn/data-plugin/server';
import type { ApplicationsResponse } from '../../../common/types/applications';
import { APM_API_PRIVILEGE, DIGITAL_EXPERIENCE_API_PRIVILEGES } from '../../../common/feature';
import { OTEL_LOGS_INDEX, OTEL_TRACES_INDEX } from '../../../common/otel_data';
import { SESSIONS_INDEX_PATTERN } from '../../../common/sessions';
import { getApplications } from './get_applications';
import { hasPartialReadAccess } from './get_partial_access';
import type { ApmIndices } from './classic/create_apm_event_client';
import { createApmEventClient } from './classic/create_apm_event_client';
import { getClassicApplications } from './classic/get_classic_applications';
import { getSessionsApplications } from './otel/get_sessions_applications';
import { createDigitalExperienceTracedEsClient } from '../../lib/create_digital_experience_traced_es_client';
import { getHistogramInterval } from '../../lib/helpers/time_series';
import { createDigitalExperienceServerRoute } from '../create_digital_experience_server_route';
import { START_AFTER_END_ISSUE, isStartBeforeEnd, timeRangeShape, timeZoneShape } from '../params';

export const APPLICATIONS_ENDPOINT = 'GET /internal/digital_experience/applications';

/** The Applications list route, keyed by its endpoint; `plugin.ts` registers it. */
export const applicationsRouteRepository = createDigitalExperienceServerRoute({
  endpoint: APPLICATIONS_ENDPOINT,
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
  }): Promise<ApplicationsResponse> => {
    const { environment, timeZone } = params.query;
    const start = Date.parse(params.query.start);
    const end = Date.parse(params.query.end);
    // The same buckets for every source and the response, which the chart reads them from.
    const histogram = { interval: getHistogramInterval(start, end), timeZone };

    const { elasticsearch, savedObjects, uiSettings } = await context.core;
    const esClient = elasticsearch.client.asCurrentUser;
    const internalEsClient = elasticsearch.client.asInternalUser;
    // APMEventClient cancels its own searches; the sessions one and the access checks get this signal.
    const signal = getRequestAbortedSignal(request.events.aborted$);

    const { apmDataAccess } = plugins;
    // Classic RUM is APM data shown with the ux plugin: stateful only, with both plugins enabled, as
    // the browser only offers the source with ux. Its fetch and access check share one read of the
    // space's APM indices.
    let apmIndicesPromise: Promise<ApmIndices> | undefined;
    const getApmIndices =
      isServerless || !isUxEnabled || !apmDataAccess
        ? undefined
        : () => {
            apmIndicesPromise ??= apmDataAccess.getApmIndices(savedObjects.client);
            return apmIndicesPromise;
          };

    const getClassic = getApmIndices
      ? async () =>
          getClassicApplications({
            apmEventClient: await createApmEventClient({
              indices: await getApmIndices(),
              esClient,
              uiSettingsClient: uiSettings.client,
              request,
            }),
            start,
            end,
            environment,
            histogram,
          })
      : undefined;

    const hasPartialClassicAccess = getApmIndices
      ? () =>
          hasPartialReadAccess({
            esClient,
            internalEsClient,
            getIndices: async () => {
              const { transaction, error, span } = await getApmIndices();
              return [transaction, error, span];
            },
            // The default APM indices include the EDOT ones, which hold no Classic RUM data.
            ignoredPatterns: [OTEL_LOGS_INDEX, OTEL_TRACES_INDEX],
            signal,
            logger,
          })
      : undefined;

    return getApplications({
      histogram: { interval: histogram.interval, start, end },
      getOtelApplications: () =>
        getSessionsApplications({
          tracedEsClient: createDigitalExperienceTracedEsClient({
            client: esClient,
            logger,
            abortSignal: signal,
          }),
          start,
          end,
          environment,
          histogram,
        }),
      getClassicApplications: getClassic,
      hasPartialOtelAccess: () =>
        hasPartialReadAccess({
          esClient,
          internalEsClient,
          getIndices: async () => [SESSIONS_INDEX_PATTERN],
          signal,
          logger,
        }),
      hasPartialClassicAccess,
      logger,
    });
  },
});
