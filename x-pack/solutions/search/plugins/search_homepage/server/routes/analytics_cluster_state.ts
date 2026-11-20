/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';
import { AuthzDisabled } from '@kbn/core-security-server';
import { ANALYTICS_CLUSTER_STATE_PATH } from '../../common/analytics';
import type { AnalyticsClusterState } from '../../common/analytics';
import { fetchAnalyticsClusterState } from '../lib/analytics_cluster_state';

const FAILURE_MESSAGE = 'Failed to fetch the analytics cluster state';

export interface RequestError {
  message: string;
  statusCode?: number;
  output?: { statusCode?: number };
}

export const getStatusCode = ({ statusCode, output }: RequestError): number =>
  statusCode ?? output?.statusCode ?? 500;

export const registerAnalyticsClusterStateRoute = (
  router: IRouter,
  logger: Logger,
  { getSampleDashboardIds }: { getSampleDashboardIds: () => readonly string[] }
): void => {
  router.get(
    {
      path: ANALYTICS_CLUSTER_STATE_PATH,
      validate: false,
      options: { access: 'internal' },
      security: {
        authz: AuthzDisabled.fromReason(
          'Every read runs as the caller: Elasticsearch scopes the indices, data streams and document counts to what the caller may read, and the dashboards are authorized by the saved objects client'
        ),
      },
    },
    async (context, request, response) => {
      try {
        const core = await context.core;
        const body: AnalyticsClusterState = await fetchAnalyticsClusterState({
          client: core.elasticsearch.client,
          savedObjectsClient: core.savedObjects.getClient(),
          logger,
          sampleDashboardIds: getSampleDashboardIds(),
        });

        return response.ok({ body });
      } catch (error) {
        const statusCode = getStatusCode(error);
        if (statusCode === 403) {
          logger.debug(`${FAILURE_MESSAGE}, the caller lacks privileges: ${error.message}`);
          return response.forbidden({
            body: { message: 'Insufficient privileges to read the analytics cluster state' },
          });
        }
        logger.error(`${FAILURE_MESSAGE}: ${error.message}`);
        return response.customError({ statusCode, body: { message: FAILURE_MESSAGE } });
      }
    }
  );
};
