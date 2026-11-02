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
import { getApplications } from './get_applications';
import { createApmEventClient } from './classic/create_apm_event_client';
import { getClassicApplications } from './classic/get_classic_applications';
import { getOtelApplications } from './otel/get_otel_applications';
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
    // APMEventClient cancels its own searches; the OTel ones get this signal.
    const signal = getRequestAbortedSignal(request.events.aborted$);

    const { apmDataAccess } = plugins;
    // Classic RUM is APM data shown with the ux plugin: stateful only, with both plugins enabled, as
    // the browser only offers the source with ux.
    const getClassic =
      isServerless || !isUxEnabled || !apmDataAccess
        ? undefined
        : async () =>
            getClassicApplications({
              apmEventClient: await createApmEventClient({
                apmDataAccess,
                esClient,
                savedObjectsClient: savedObjects.client,
                uiSettingsClient: uiSettings.client,
                request,
              }),
              start,
              end,
              environment,
            });

    return getApplications({
      getOtelApplications: () => getOtelApplications({ esClient, start, end, environment, signal }),
      getClassicApplications: getClassic,
      logger,
    });
  },
});
