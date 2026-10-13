/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  IKibanaResponse,
  KibanaRequest,
  KibanaResponseFactory,
  Logger,
  RouteSecurity,
  StartServicesAccessor,
} from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { APP_ID } from '../../../../common';
import {
  BRIEF_LIMITS,
  BRIEF_RANGE_MS,
  EXECUTIVE_BRIEF_API_PATH,
  EXECUTIVE_BRIEF_API_VERSION,
  EXECUTIVE_BRIEF_INFERENCE_FEATURE_ID,
  EXECUTIVE_BRIEF_STATUS_API_PATH,
} from '../../../../common/entity_analytics/executive_brief/constants';
import type { DeleteExecutiveBriefResponse } from '../../../../common/api/entity_analytics/executive_brief/delete.gen';
import type { GenerateExecutiveBriefResponse } from '../../../../common/api/entity_analytics/executive_brief/generate.gen';
import { GenerateExecutiveBriefRequestBody } from '../../../../common/api/entity_analytics/executive_brief/generate.gen';
import type { GetExecutiveBriefResponse } from '../../../../common/api/entity_analytics/executive_brief/get.gen';
import type { GetExecutiveBriefStatusResponse } from '../../../../common/api/entity_analytics/executive_brief/get_status.gen';
import type { StartPlugins } from '../../../plugin';
import type {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../types';
import { withMinimumLicense } from '../utils/with_minimum_license';
import type { BriefKey, BriefStore } from './store/brief_store';
import { BriefStoreConflictError } from './store/errors';
import { getBriefOwner } from './store/owner_id';
import { scheduleGenerateBriefTask } from './task';

const ROUTE_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`] },
};

/** Returned in `attributes.code`, so the UI can explain what to do. */
type BriefRouteErrorCode =
  | 'no_encryption_key'
  | 'no_stable_user'
  | 'no_connector'
  | 'too_many_running'
  | 'conflict'
  | 'not_found'
  | 'internal';

const errorResponse = (
  response: KibanaResponseFactory,
  statusCode: number,
  code: BriefRouteErrorCode,
  message: string
): IKibanaResponse => response.customError({ statusCode, body: { message, attributes: { code } } });

const notFound = (response: KibanaResponseFactory): IKibanaResponse =>
  errorResponse(response, 404, 'not_found', 'No brief in this space.');

export interface BriefRouteDeps {
  router: SecuritySolutionPluginRouter;
  logger: Logger;
  getStartServices: StartServicesAccessor<StartPlugins>;
  getBriefStore: () => Promise<BriefStore>;
  /** `encryptedSavedObjects.canEncrypt`; Task Manager needs it to store the user's API key. */
  hasEncryptionKey: boolean;
}

/** Registers POST, GET, GET status and DELETE; every route acts on the caller's brief in the space. */
export const registerBriefRoutes = ({
  router,
  logger,
  getStartServices,
  getBriefStore,
  hasEncryptionKey,
}: BriefRouteDeps): void => {
  /** Resolves the caller and space for `fn`, and maps errors to responses. */
  const forCaller = async (
    context: SecuritySolutionRequestHandlerContext,
    request: KibanaRequest,
    response: KibanaResponseFactory,
    action: string,
    fn: (key: BriefKey, store: BriefStore) => Promise<IKibanaResponse>
  ): Promise<IKibanaResponse> => {
    try {
      const { security, elasticsearch } = await context.core;
      const owner = await getBriefOwner({
        authUser: security.authc.getCurrentUser(),
        request,
        esClient: elasticsearch.client.asCurrentUser,
      });
      if (!owner) {
        return errorResponse(
          response,
          400,
          'no_stable_user',
          'Executive briefs need a user with a stable identity (a user profile or realm user).'
        );
      }
      const spaceId = (await context.securitySolution).getSpaceId();
      return await fn({ ownerId: owner.id, spaceId }, await getBriefStore());
    } catch (error) {
      if (error instanceof BriefStoreConflictError) {
        return errorResponse(response, 409, 'conflict', error.message);
      }
      const { statusCode, message } = transformError(error);
      logger.error(`Executive brief: failed to ${action}: ${message}`);
      return errorResponse(response, statusCode, 'internal', message);
    }
  };

  /** The requested connector if it exists, else the feature's configured one, else the default. */
  const resolveConnectorId = async (
    request: KibanaRequest,
    requestedId: string | undefined
  ): Promise<string | undefined> => {
    const [, { inference, searchInferenceEndpoints }] = await getStartServices();
    if (requestedId) {
      return inference.getConnectorById(requestedId, request).then(
        ({ connectorId }) => connectorId,
        () => undefined
      );
    }
    const configured = await searchInferenceEndpoints?.endpoints.getForFeature(
      EXECUTIVE_BRIEF_INFERENCE_FEATURE_ID,
      request,
      { onlyReturnConfigured: true }
    );
    return (
      configured?.endpoints[0]?.connectorId ??
      (await inference.getDefaultConnector(request))?.connectorId
    );
  };

  // Starts a job, replacing any in progress, and schedules the generate task as the caller.
  router.versioned
    .post({ access: 'internal', path: EXECUTIVE_BRIEF_API_PATH, security: ROUTE_SECURITY })
    .addVersion(
      {
        version: EXECUTIVE_BRIEF_API_VERSION,
        validate: {
          request: { body: buildRouteValidationWithZod(GenerateExecutiveBriefRequestBody) },
        },
      },
      withMinimumLicense((context, request, response) =>
        forCaller(context, request, response, 'start a brief', async (key, store) => {
          if (!hasEncryptionKey) {
            return errorResponse(
              response,
              400,
              'no_encryption_key',
              'Executive briefs require xpack.encryptedSavedObjects.encryptionKey to be set.'
            );
          }
          const [, { taskManager }] = await getStartServices();
          if (!taskManager) {
            return errorResponse(response, 500, 'internal', 'Task Manager is not available.');
          }
          const { range, connectorId: requestedId } = request.body;
          const connectorId = await resolveConnectorId(request, requestedId);
          if (!connectorId) {
            const message = requestedId
              ? `Connector ${requestedId} is not available.`
              : 'No AI connector is configured. Configure a connector to generate a brief.';
            return errorResponse(response, 400, 'no_connector', message);
          }
          if ((await store.countRunning(key)) >= BRIEF_LIMITS.maxRunningBriefs) {
            return errorResponse(
              response,
              429,
              'too_many_running',
              'Too many briefs are being generated right now. Try again shortly.'
            );
          }

          // The server fixes the window; client timestamps are never trusted.
          const now = Date.now();
          const { docId, job } = await store.startJob(key, uuidv4());
          const params = {
            docId,
            jobId: job.id,
            spaceId: key.spaceId,
            range,
            from: new Date(now - BRIEF_RANGE_MS[range]).toISOString(),
            to: new Date(now).toISOString(),
            connectorId,
          };
          try {
            await scheduleGenerateBriefTask({ taskManager, request, params, logger });
          } catch (error) {
            const failed = {
              code: 'internal' as const,
              message: `Could not schedule: ${error.message}`,
            };
            await store
              .updateJob(docId, job.id, { job: { status: 'failed', error: failed } })
              .catch(() => false);
            throw error;
          }
          const body: GenerateExecutiveBriefResponse = job;
          return response.ok({ body });
        })
      )
    );

  router.versioned
    .get({ access: 'internal', path: EXECUTIVE_BRIEF_API_PATH, security: ROUTE_SECURITY })
    .addVersion(
      { version: EXECUTIVE_BRIEF_API_VERSION, validate: false },
      withMinimumLicense((context, request, response) =>
        forCaller(context, request, response, 'read the brief', async (key, store) => {
          const body: GetExecutiveBriefResponse | undefined = await store.get(key);
          return body ? response.ok({ body }) : notFound(response);
        })
      )
    );

  router.versioned
    .get({ access: 'internal', path: EXECUTIVE_BRIEF_STATUS_API_PATH, security: ROUTE_SECURITY })
    .addVersion(
      { version: EXECUTIVE_BRIEF_API_VERSION, validate: false },
      withMinimumLicense((context, request, response) =>
        forCaller(context, request, response, 'read the brief status', async (key, store) => {
          const body: GetExecutiveBriefStatusResponse | undefined = await store.getJob(key);
          return body ? response.ok({ body }) : notFound(response);
        })
      )
    );

  // A running job's next write fails its `job.id` check, so the task can't recreate the document.
  router.versioned
    .delete({ access: 'internal', path: EXECUTIVE_BRIEF_API_PATH, security: ROUTE_SECURITY })
    .addVersion(
      { version: EXECUTIVE_BRIEF_API_VERSION, validate: false },
      withMinimumLicense((context, request, response) =>
        forCaller(context, request, response, 'delete the brief', async (key, store) => {
          const body: DeleteExecutiveBriefResponse = { deleted: await store.delete(key) };
          return response.ok({ body });
        })
      )
    );
};
