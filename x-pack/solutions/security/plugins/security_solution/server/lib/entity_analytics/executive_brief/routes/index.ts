/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { IKibanaResponse } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { APP_ID } from '../../../../../common';
import { API_VERSIONS } from '../../../../../common/entity_analytics/constants';
import {
  EXECUTIVE_BRIEF_POC_GENERATE_URL,
  EXECUTIVE_BRIEF_POC_JOB_URL,
  POC_JOB_TIMEOUT_MS,
} from '../../../../../common/entity_analytics/executive_brief/constants';
import type {
  ExecutiveBriefJob,
  GenerateBriefRequestBody,
  GenerateBriefResponse,
} from '../../../../../common/entity_analytics/executive_brief/types';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { InferenceBriefGenerator } from '../generation/inference_brief_generator';
import { TemplateBriefGenerator } from '../generation/template_brief_generator';
import type { BriefGenerator } from '../generation/types';
import { buildBlindSpots } from '../blind_spots';
import { createBriefJobStore, markInterruptedIfStale } from '../job/brief_job_store';
import { runExecutiveBrief } from '../job/run_executive_brief';
import { fetchBriefEntities } from '../snapshot/entities';
import { buildGlance } from '../snapshot/glance';
import { EvidenceRegistry } from '../snapshot/evidence_registry';
import { buildStorylines } from '../storylines';
import { briefJobParamsSchema, checkTimeRange, generateBriefRequestBodySchema } from './schemas';

/**
 * Registers the Executive Brief PoC routes:
 * - `POST EXECUTIVE_BRIEF_POC_GENERATE_URL` creates a job and runs it in-process (202 `{ id, status }`)
 * - `GET EXECUTIVE_BRIEF_POC_JOB_URL` returns the job document
 *
 * The job document is written with the internal user; every snapshot read uses the caller's
 * own scoped clients, and a job is only readable by the user who created it.
 */
export const registerExecutiveBriefRoutes = ({
  router,
  logger,
  getStartServices,
  ml,
}: EntityAnalyticsRoutesDeps): void => {
  router.versioned
    .post({
      access: 'internal',
      path: EXECUTIVE_BRIEF_POC_GENERATE_URL,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: { body: buildRouteValidationWithZod(generateBriefRequestBodySchema) },
        },
      },
      async (context, request, response): Promise<IKibanaResponse> => {
        const siemResponse = buildSiemResponse(response);
        try {
          const params: GenerateBriefRequestBody = request.body;

          const timeRangeCheck = checkTimeRange(params.timeRange);
          if (!timeRangeCheck.ok) {
            return siemResponse.error({ statusCode: 400, body: timeRangeCheck.message });
          }

          const coreContext = await context.core;
          const securitySolution = await context.securitySolution;
          const spaceId = securitySolution.getSpaceId();
          const username = coreContext.security.authc.getCurrentUser()?.username;
          if (!username) {
            return siemResponse.error({
              statusCode: 401,
              body: 'Unable to resolve the current user',
            });
          }

          const [, startPlugins] = await getStartServices();

          let generator: BriefGenerator;
          if (params.generator === 'inference') {
            const { connectorId } = params;
            if (!connectorId) {
              return siemResponse.error({
                statusCode: 400,
                body: 'connectorId is required when generator is "inference"',
              });
            }
            // Resolve the connector now so a bad connector is an immediate 400, not a failed job.
            let connectorName: string;
            try {
              const connector = await startPlugins.inference.getConnectorById(connectorId, request);
              connectorName = connector.name || connectorId;
            } catch (error) {
              return siemResponse.error({
                statusCode: 400,
                body: `Unable to use connector ${connectorId}: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              });
            }
            generator = new InferenceBriefGenerator(
              startPlugins.inference.getClient({ request, bindTo: { connectorId } }),
              connectorName
            );
          } else {
            generator = new TemplateBriefGenerator();
          }

          const store = createBriefJobStore({
            esClient: coreContext.elasticsearch.client.asInternalUser,
            logger,
            spaceId,
          });
          await store.ensureIndex();

          const id = uuidv4();
          const nowIso = new Date().toISOString();
          await store.create({
            id,
            spaceId,
            status: 'pending',
            createdAt: nowIso,
            updatedAt: nowIso,
            createdBy: { username },
            params,
          });

          const soClient = coreContext.savedObjects.client;
          const mitreDataClient = securitySolution.getMitreDataClient();
          const rulesClient = await (await context.alerting).getRulesClient();
          const casesClient = await startPlugins.cases?.getCasesClientWithRequest(request);

          // In-process, fire and forget (lead generation pattern). The run records its own
          // outcome on the job document; this catch only covers a failure to record it.
          void runExecutiveBrief({
            briefId: id,
            params,
            generator,
            store,
            context: {
              spaceId,
              timeRange: params.timeRange,
              esClient: coreContext.elasticsearch.client.asCurrentUser,
              request,
              logger,
              abortSignal: AbortSignal.timeout(POC_JOB_TIMEOUT_MS),
              registry: new EvidenceRegistry(),
              services: {
                rulesClient,
                casesClient,
                ml,
                entityStore: startPlugins.entityStore,
                fleetPackageService: startPlugins.fleet?.packageService,
              },
            },
            builders: {
              buildGlance,
              buildStorylines,
              buildBlindSpots: (ctx, input) =>
                buildBlindSpots(ctx, input, { soClient, mitreDataClient }),
              fetchBriefEntities,
            },
          }).catch((error: Error) =>
            logger.error(
              `[ExecutiveBrief] ${id}: could not record the job outcome: ${error.message}`
            )
          );

          const body: GenerateBriefResponse = { id, status: 'pending' };
          return response.custom({ statusCode: 202, body });
        } catch (e) {
          logger.error(`[ExecutiveBrief] Error starting brief generation: ${e}`);
          const error = transformError(e);
          return siemResponse.error({ statusCode: error.statusCode, body: error.message });
        }
      }
    );

  router.versioned
    .get({
      access: 'internal',
      path: EXECUTIVE_BRIEF_POC_JOB_URL,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: { params: buildRouteValidationWithZod(briefJobParamsSchema) },
        },
      },
      async (context, request, response): Promise<IKibanaResponse> => {
        const siemResponse = buildSiemResponse(response);
        try {
          const coreContext = await context.core;
          const spaceId = (await context.securitySolution).getSpaceId();
          const username = coreContext.security.authc.getCurrentUser()?.username;

          const store = createBriefJobStore({
            esClient: coreContext.elasticsearch.client.asInternalUser,
            logger,
            spaceId,
          });
          const job = await store.get(request.params.id);

          // A job is only visible to the user it was generated for (it contains their view of the data).
          if (!job || job.createdBy.username !== username || job.spaceId !== spaceId) {
            return siemResponse.error({ statusCode: 404, body: 'Brief job not found' });
          }

          const body: ExecutiveBriefJob = markInterruptedIfStale(job, Date.now());
          return response.ok({ body });
        } catch (e) {
          logger.error(`[ExecutiveBrief] Error reading brief job: ${e}`);
          const error = transformError(e);
          return siemResponse.error({ statusCode: error.statusCode, body: error.message });
        }
      }
    );
};
