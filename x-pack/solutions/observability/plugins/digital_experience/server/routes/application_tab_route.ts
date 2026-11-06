/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { lazySchema, z } from '@kbn/zod/v4';
import { getRequestAbortedSignal } from '@kbn/data-plugin/server';
import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import { APM_API_PRIVILEGE, DIGITAL_EXPERIENCE_API_PRIVILEGES } from '../../common/feature';
import { MAX_SERVICE_NAME_LENGTH } from '../lib/constants';
import { createDigitalExperienceTracedEsClient } from '../lib/create_digital_experience_traced_es_client';
import type { DigitalExperienceRouteHandlerResources } from './create_digital_experience_server_route';
import { timeRangeQuery } from './params';

// The routes of one application's tabs (e.g. its errors) share the Overview route's params and
// privileges.

/** One application's data over a time range, optionally of one environment. */
export interface ApplicationSearchParams {
  serviceName: string;
  start: number;
  end: number;
  /** Only this environment's data when set. */
  environment?: string;
}

/** A tab's search params and the client that runs its searches. */
export type ApplicationSearch = ApplicationSearchParams & { esClient: TracedElasticsearchClient };

export const APPLICATION_TAB_ROUTE_OPTIONS = { access: 'internal' } as const;

/** The app's read privilege, and APM's for the data it reads. */
export const APPLICATION_TAB_ROUTE_SECURITY = {
  authz: { requiredPrivileges: [DIGITAL_EXPERIENCE_API_PRIVILEGES.read, APM_API_PRIVILEGE] },
};

export const applicationTabRouteParams = lazySchema(() => {
  return z.object({
    path: z.object({
      serviceName: z.string().min(1).max(MAX_SERVICE_NAME_LENGTH),
    }),
    query: timeRangeQuery(),
  });
});

/**
 * The search params of a tab's route, the ISO range as epoch milliseconds, and the current user's
 * client, whose searches stop when the request is aborted.
 */
export const toApplicationSearch = async ({
  params: {
    path: { serviceName },
    query: { start, end, environment },
  },
  context,
  logger,
  request,
}: Pick<DigitalExperienceRouteHandlerResources, 'context' | 'logger'> & {
  params: z.infer<typeof applicationTabRouteParams>;
  request: Pick<KibanaRequest, 'events'>;
}): Promise<ApplicationSearch> => {
  const { elasticsearch } = await context.core;
  return {
    serviceName,
    start: Date.parse(start),
    end: Date.parse(end),
    environment,
    esClient: createDigitalExperienceTracedEsClient({
      client: elasticsearch.client.asCurrentUser,
      logger,
      abortSignal: getRequestAbortedSignal(request.events.aborted$),
    }),
  };
};
