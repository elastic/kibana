/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { schema } from '@kbn/config-schema';
import { transformError } from '@kbn/securitysolution-es-utils';
import { enterpriseLicenseMiddleware } from '@kbn/entity-store/server';
import {
  ENTITY_RESOLUTION_CSV_UPLOAD_URL,
  RESOLUTION_CSV_MAX_SIZE_BYTES,
} from '../../../../../common/entity_analytics/entity_store/constants';
import { APP_ID } from '../../../../../common/constants';
import { API_VERSIONS } from '../../../../../common/entity_analytics/constants';
import type { HapiReadableStream } from '../../../../types';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import type { ResolutionCsvUploadResponse, CsvErrorCategory } from '../csv_upload';
import { processResolutionCsvUpload } from '../csv_upload';
import { ENTITY_STORE_RESOLUTION_CSV_UPLOAD_EVENT } from '../../../telemetry/event_based/events';

export const entityResolutionCsvUploadRoute = ({
  router,
  logger,
  getStartServices,
}: EntityAnalyticsRoutesDeps) => {
  router.versioned
    .post({
      access: 'internal',
      path: ENTITY_RESOLUTION_CSV_UPLOAD_URL,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
        },
      },
      options: {
        body: {
          output: 'stream',
          accepts: 'multipart/form-data',
          maxBytes: RESOLUTION_CSV_MAX_SIZE_BYTES,
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: schema.object({
              file: schema.stream(),
            }),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<ResolutionCsvUploadResponse>> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const denied = await enterpriseLicenseMiddleware(
            context as unknown as Parameters<typeof enterpriseLicenseMiddleware>[0],
            request,
            response
          );
          if (denied) {
            return denied;
          }

          const [coreStart, startPlugins] = await getStartServices();
          const { entityStore: entityStoreStart } = startPlugins;

          const coreContext = await context.core;
          const esClient = coreContext.elasticsearch.client.asCurrentUser;
          const securitySolution = await context.securitySolution;
          const namespace = securitySolution.getSpaceId();

          const crudClient = entityStoreStart.createCRUDClient(esClient, namespace);
          const resolutionClient = entityStoreStart.createResolutionClient(esClient, namespace);

          const fileStream = request.body.file as HapiReadableStream;

          logger.debug(`Parsing entity resolution CSV file ${fileStream.hapi.filename}`);

          const startMs = Date.now();
          const result = await processResolutionCsvUpload(fileStream, {
            crudClient,
            resolutionClient,
            logger,
          });
          const durationMs = Date.now() - startMs;

          const { errorCounts, ...body } = result;

          logger.debug(
            () =>
              `Entity resolution CSV upload completed: ${result.successful} successful, ${result.failed} failed, ${result.unmatched} unmatched out of ${result.total} total`
          );

          const errors = (Object.entries(errorCounts) as Array<[CsvErrorCategory, number]>).map(
            ([errorCategory, count]) => ({
              errorCategory,
              count,
            })
          );

          try {
            coreStart.analytics.reportEvent(ENTITY_STORE_RESOLUTION_CSV_UPLOAD_EVENT.eventType, {
              total: result.total,
              successful: result.successful,
              failed: result.failed,
              unmatched: result.unmatched,
              durationMs,
              ...(errors.length > 0 ? { errors } : {}),
              namespace,
            });
          } catch (err) {
            logger.error(
              `Failed to report entity resolution CSV upload telemetry: ${
                err instanceof Error ? err.message : String(err)
              }`
            );
          }

          return response.ok({ body });
        } catch (e) {
          logger.error(`Error during entity resolution CSV upload: ${e}`);
          const error = transformError(e);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
