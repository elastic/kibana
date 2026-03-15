/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import type { SecuritySolutionPluginRouter } from '../../../types';
import type { ConfigType } from '../../../config';
import { createAlertVectorIndexService } from '../vector_storage';
import { createAlertEmbeddingService } from '../embedding';
import { createAlertSimilarityService } from '../similarity_search';
import { AlertVectorizationVectorizeRequest, AlertVectorizationSearchRequest } from './schemas';
import { DEFAULT_BATCH_SIZE, DEFAULT_INFERENCE_ENDPOINT_ID } from '../types';

const ALERT_VECTORIZATION_BASE_URL = '/internal/security_solution/alert_vectorization';

export const registerAlertVectorizationRoutes = (
  router: SecuritySolutionPluginRouter,
  config: ConfigType
) => {
  if (!config.experimentalFeatures.alertVectorizationEnabled) {
    return;
  }

  router.versioned
    .post({
      path: `${ALERT_VECTORIZATION_BASE_URL}/init`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: false,
      },
      async (context, _request, response) => {
        const siemResponse = buildSiemResponse(response);

        try {
          const securityContext = await context.securitySolution;
          const coreContext = await context.core;
          const esClient = coreContext.elasticsearch.client.asCurrentUser;
          const spaceId = securityContext.getSpaceId();
          const logger = securityContext.getLogger();

          const vectorIndexService = createAlertVectorIndexService({
            esClient,
            logger,
            spaceId,
          });

          await vectorIndexService.createIndex();

          return response.ok({
            body: {
              index_name: vectorIndexService.getIndexName(),
              created: true,
            },
          });
        } catch (err) {
          const error = transformError(err);
          return siemResponse.error({ statusCode: error.statusCode, body: error.message });
        }
      }
    );

  router.versioned
    .post({
      path: `${ALERT_VECTORIZATION_BASE_URL}/vectorize`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: buildRouteValidationWithZod(AlertVectorizationVectorizeRequest),
          },
        },
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);

        try {
          const securityContext = await context.securitySolution;
          const coreContext = await context.core;
          const esClient = coreContext.elasticsearch.client.asCurrentUser;
          const spaceId = securityContext.getSpaceId();
          const logger = securityContext.getLogger();

          const vectorIndexService = createAlertVectorIndexService({
            esClient,
            logger,
            spaceId,
          });

          const indexExists = await vectorIndexService.doesIndexExist();
          if (!indexExists) {
            return siemResponse.error({
              statusCode: 400,
              body: 'Alert vector index does not exist. Call /init first.',
            });
          }

          const embeddingService = createAlertEmbeddingService({
            esClient,
            logger,
            vectorIndexService,
            inferenceEndpointId:
              request.body.inference_endpoint_id ?? DEFAULT_INFERENCE_ENDPOINT_ID,
          });

          const { alert_ids: alertIds, batch_size: batchSize } = request.body;

          const alertsResponse = await esClient.mget({
            docs: alertIds.map((id) => ({
              _index: '.alerts-security.alerts-*',
              _id: id,
            })),
          });

          const alerts = alertsResponse.docs
            .filter(
              (doc): doc is { _id: string; _index: string; _source: Record<string, unknown> } =>
                'found' in doc && !!doc.found && '_source' in doc && doc._id != null
            )
            .map((doc) => ({
              id: doc._id,
              index: doc._index,
              doc: doc._source,
            }));

          const result = await embeddingService.batchVectorize(
            alerts,
            batchSize ?? DEFAULT_BATCH_SIZE
          );

          return response.ok({ body: result });
        } catch (err) {
          const error = transformError(err);
          return siemResponse.error({ statusCode: error.statusCode, body: error.message });
        }
      }
    );

  router.versioned
    .post({
      path: `${ALERT_VECTORIZATION_BASE_URL}/search`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: buildRouteValidationWithZod(AlertVectorizationSearchRequest),
          },
        },
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);

        try {
          const securityContext = await context.securitySolution;
          const coreContext = await context.core;
          const esClient = coreContext.elasticsearch.client.asCurrentUser;
          const spaceId = securityContext.getSpaceId();
          const logger = securityContext.getLogger();

          const vectorIndexService = createAlertVectorIndexService({
            esClient,
            logger,
            spaceId,
          });

          const indexExists = await vectorIndexService.doesIndexExist();
          if (!indexExists) {
            return siemResponse.error({
              statusCode: 400,
              body: 'Alert vector index does not exist. Call /init first.',
            });
          }

          const embeddingService = createAlertEmbeddingService({
            esClient,
            logger,
            vectorIndexService,
            inferenceEndpointId:
              request.body.inference_endpoint_id ?? DEFAULT_INFERENCE_ENDPOINT_ID,
          });

          const similarityService = createAlertSimilarityService({
            esClient,
            logger,
            vectorIndexService,
            embeddingService,
          });

          const { alert_id: alertId, text, threshold, max_results: maxResults } = request.body;

          let result;
          if (alertId) {
            result = await similarityService.searchByAlertId(alertId, {
              threshold,
              maxResults,
            });
          } else if (text) {
            result = await similarityService.searchByText(text, {
              threshold,
              maxResults,
            });
          } else {
            return siemResponse.error({
              statusCode: 400,
              body: 'Either alert_id or text must be provided',
            });
          }

          return response.ok({ body: result });
        } catch (err) {
          const error = transformError(err);
          return siemResponse.error({ statusCode: error.statusCode, body: error.message });
        }
      }
    );
};
