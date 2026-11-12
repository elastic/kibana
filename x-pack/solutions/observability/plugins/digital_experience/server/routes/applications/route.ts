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
import { getApplications } from './get_applications';
import { hasPartialReadAccess } from './get_partial_access';
import type { ApmIndices } from './classic/create_apm_event_client';
import { createApmEventClient } from './classic/create_apm_event_client';
import { getClassicApplications } from './classic/get_classic_applications';
import { getOtelApplicationsFromBestSource } from './otel/get_otel_applications_source';
import { createDigitalExperienceServerRoute } from '../create_digital_experience_server_route';
import { timeRangeQuery } from '../params';

export const APPLICATIONS_ENDPOINT = 'GET /internal/digital_experience/applications';

/** The Applications list route, keyed by its endpoint; `plugin.ts` registers it. */
export const applicationsRouteRepository = createDigitalExperienceServerRoute({
  endpoint: APPLICATIONS_ENDPOINT,
  options: { access: 'internal' },
  security: {
    authz: { requiredPrivileges: [DIGITAL_EXPERIENCE_API_PRIVILEGES.read, APM_API_PRIVILEGE] },
  },
  params: lazySchema(() => z.object({ query: timeRangeQuery() })),
  handler: async ({
    params,
    context,
    request,
    plugins,
    isServerless,
    isUxEnabled,
    logger,
  }): Promise<ApplicationsResponse> => {
    const { environment } = params.query;
    const start = Date.parse(params.query.start);
    const end = Date.parse(params.query.end);

    const { elasticsearch, savedObjects, uiSettings } = await context.core;
    const esClient = elasticsearch.client.asCurrentUser;
    const internalEsClient = elasticsearch.client.asInternalUser;
    // APMEventClient cancels its own searches; the OTel ones get this signal.
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
          })
      : undefined;

    const hasPartialClassicAccess = getApmIndices
      ? async () => {
          try {
            const { transaction, error, span } = await getApmIndices();
            return await hasPartialReadAccess({
              esClient,
              internalEsClient,
              indices: [transaction, error, span],
              logger,
            });
          } catch (e) {
            // The fetch reports the failure; the check never fails the request.
            return false;
          }
        }
      : undefined;

    return getApplications({
      getOtelApplications: () =>
        getOtelApplicationsFromBestSource({
          esClient,
          internalEsClient,
          start,
          end,
          environment,
          signal,
          logger,
        }),
      getClassicApplications: getClassic,
      hasPartialOtelAccess: () =>
        hasPartialReadAccess({
          esClient,
          internalEsClient,
          indices: [OTEL_LOGS_INDEX, OTEL_TRACES_INDEX],
          logger,
        }),
      hasPartialClassicAccess,
      logger,
    });
  },
});
