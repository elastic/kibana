/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, IRouter, KibanaResponseFactory, Logger } from '@kbn/core/server';
import { AuthzDisabled } from '@kbn/core-security-server';
import {
  ANALYTICS_SAMPLE_EVENTS_INDEX,
  ANALYTICS_SAMPLE_EVENTS_PATH,
} from '../../common/analytics_sample_events';
import type {
  AnalyticsSampleEventsInstallResult,
  AnalyticsSampleEventsRemoveResult,
} from '../../common/analytics_sample_events';
import { installSampleEvents, removeSampleEvents } from '../lib/analytics_sample_events';
import { getStatusCode } from './analytics_cluster_state';
import type { RequestError } from './analytics_cluster_state';

const INSTALL_FAILURE_MESSAGE = 'Failed to install the sample events';
const REMOVE_FAILURE_MESSAGE = 'Failed to remove the sample events';

const security = {
  authz: AuthzDisabled.fromReason(
    'Every request runs as the caller: Elasticsearch decides whether they may create, write to and delete the sample events index'
  ),
};

const toErrorResponse = (
  response: KibanaResponseFactory,
  logger: Logger,
  error: RequestError,
  failureMessage: string,
  requiredPrivileges: string
): IKibanaResponse => {
  const statusCode = getStatusCode(error);
  if (statusCode === 403) {
    logger.debug(`${failureMessage}, the caller lacks privileges: ${error.message}`);
    return response.forbidden({
      body: {
        message: `${failureMessage}: your role needs the ${requiredPrivileges} index privileges on ${ANALYTICS_SAMPLE_EVENTS_INDEX}`,
      },
    });
  }
  logger.error(`${failureMessage}: ${error.message}`);
  return response.customError({ statusCode, body: { message: failureMessage } });
};

/** Installs and removes the generated sample event stream with the caller's own index privileges. */
export const registerAnalyticsSampleEventsRoutes = (
  router: IRouter,
  logger: Logger,
  { isServerless }: { isServerless: boolean }
): void => {
  router.post(
    {
      path: ANALYTICS_SAMPLE_EVENTS_PATH,
      validate: false,
      options: { access: 'internal' },
      security,
    },
    async (context, request, response) => {
      try {
        const { elasticsearch } = await context.core;
        const body: AnalyticsSampleEventsInstallResult = await installSampleEvents({
          client: elasticsearch.client,
          logger,
          isServerless,
        });

        return response.ok({ body });
      } catch (error) {
        return toErrorResponse(
          response,
          logger,
          error,
          INSTALL_FAILURE_MESSAGE,
          'read, view_index_metadata, create_index, index and delete_index'
        );
      }
    }
  );

  router.delete(
    {
      path: ANALYTICS_SAMPLE_EVENTS_PATH,
      validate: false,
      options: { access: 'internal' },
      security,
    },
    async (context, request, response) => {
      try {
        const { elasticsearch } = await context.core;
        const body: AnalyticsSampleEventsRemoveResult = await removeSampleEvents({
          client: elasticsearch.client,
        });

        return response.ok({ body });
      } catch (error) {
        return toErrorResponse(response, logger, error, REMOVE_FAILURE_MESSAGE, 'delete_index');
      }
    }
  );
};
