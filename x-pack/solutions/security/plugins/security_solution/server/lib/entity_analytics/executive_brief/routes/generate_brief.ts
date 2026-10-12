/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { IKibanaResponse } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { generateBriefRequestBodySchema } from '../../../../../common/entity_analytics/executive_brief/api';
import {
  BRIEF_LIMITS,
  BRIEF_RANGE_MS,
  EXECUTIVE_BRIEF_API_PATH,
  EXECUTIVE_BRIEF_API_VERSION,
} from '../../../../../common/entity_analytics/executive_brief/constants';
import type {
  BriefJob,
  GenerateBriefResponse,
} from '../../../../../common/entity_analytics/executive_brief/document';
import { withMinimumLicense } from '../../utils/with_minimum_license';
import { resolveConnector } from '../pipeline/resolve_connector';
import { isJobActive } from '../store/brief_store';
import { BriefStoreConflictError } from '../store/errors';
import { scheduleGenerateBriefTask } from '../tasks/generate_brief_task';
import type { ExecutiveBriefRouteDeps } from './route_utils';
import {
  EXECUTIVE_BRIEF_ROUTE_SECURITY,
  briefErrorResponse,
  getRequestOwner,
  internalErrorResponse,
  noStableUserResponse,
} from './route_utils';

const toGenerateResponse = (job: BriefJob, reused: boolean): GenerateBriefResponse => ({
  job: { id: job.id, status: job.status, ...(job.stage ? { stage: job.stage } : {}) },
  reused,
});

/**
 * POST: starts a brief job for the caller in this space (or returns the running one) and
 * schedules the generate task as the caller. Returns 202 with the job.
 */
export const generateBriefRoute = ({
  router,
  logger,
  getStartServices,
  getBriefStore,
  hasEncryptionKey,
}: ExecutiveBriefRouteDeps): void => {
  router.versioned
    .post({
      access: 'internal',
      path: EXECUTIVE_BRIEF_API_PATH,
      security: EXECUTIVE_BRIEF_ROUTE_SECURITY,
    })
    .addVersion(
      {
        version: EXECUTIVE_BRIEF_API_VERSION,
        validate: {
          request: { body: buildRouteValidationWithZod(generateBriefRequestBodySchema) },
        },
      },
      withMinimumLicense(async (context, request, response): Promise<IKibanaResponse> => {
        if (!hasEncryptionKey) {
          return briefErrorResponse(
            response,
            400,
            'no_encryption_key',
            'Executive briefs require xpack.encryptedSavedObjects.encryptionKey to be set.'
          );
        }

        try {
          const owner = await getRequestOwner(context, request);
          if (!owner) {
            return noStableUserResponse(response);
          }

          const spaceId = (await context.securitySolution).getSpaceId();
          const [, startPlugins] = await getStartServices();
          const { taskManager } = startPlugins;
          if (!taskManager) {
            return briefErrorResponse(response, 500, 'internal', 'Task Manager is not available.');
          }

          const store = await getBriefStore();

          // Dedupe before the cluster cap, so a second click returns the caller's own job.
          const existing = await store.get({ ownerId: owner.id, spaceId });
          if (existing && isJobActive(existing.document.job, new Date())) {
            return response.accepted({ body: toGenerateResponse(existing.document.job, true) });
          }

          const connector = await resolveConnector({
            connectorId: request.body.connectorId,
            request,
            inference: startPlugins.inference,
            searchInferenceEndpoints: startPlugins.searchInferenceEndpoints,
            logger,
          });
          if (connector.connectorId === undefined) {
            return briefErrorResponse(response, 400, 'no_connector', connector.message);
          }

          if ((await store.countRunning()) >= BRIEF_LIMITS.maxRunningBriefs) {
            return briefErrorResponse(
              response,
              429,
              'too_many_running',
              'Too many briefs are being generated right now. Try again shortly.'
            );
          }

          const { range } = request.body;
          const now = Date.now();
          const to = new Date(now).toISOString();
          const from = new Date(now - BRIEF_RANGE_MS[range]).toISOString();

          const started = await store.startJob({ owner, spaceId, jobId: uuidv4() });
          if (started.reused) {
            return response.accepted({ body: toGenerateResponse(started.job, true) });
          }

          try {
            await scheduleGenerateBriefTask({
              taskManager,
              request,
              logger,
              params: {
                docId: started.docId,
                jobId: started.job.id,
                spaceId,
                range,
                from,
                to,
                connectorId: connector.connectorId,
              },
            });
          } catch (scheduleError) {
            await store
              .failJob({
                docId: started.docId,
                jobId: started.job.id,
                error: {
                  code: 'internal',
                  message: `Could not schedule the brief: ${scheduleError.message}`,
                },
              })
              .catch(() => false);
            throw scheduleError;
          }

          return response.accepted({ body: toGenerateResponse(started.job, false) });
        } catch (error) {
          if (error instanceof BriefStoreConflictError) {
            return briefErrorResponse(response, 409, 'conflict', error.message);
          }
          return internalErrorResponse(response, logger, error, 'start a brief');
        }
      })
    );
};
