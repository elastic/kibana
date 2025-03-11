/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { AssetCriticalityUpsert } from '../../../../../common/entity_analytics/asset_criticality/types';
import {
  CreateAssetCriticalityRecordRequestBody,
  type CreateAssetCriticalityRecordResponse,
} from '../../../../../common/api/entity_analytics';
import {
  ASSET_CRITICALITY_PUBLIC_URL,
  APP_ID,
  API_VERSIONS,
} from '../../../../../common/constants';
import { checkAndInitAssetCriticalityResources } from '../check_and_init_asset_criticality_resources';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { AssetCriticalityAuditActions } from '../audit';
import { AUDIT_CATEGORY, AUDIT_OUTCOME, AUDIT_TYPE } from '../../audit';

export const assetCriticalityPublicUpsertRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger
) => {
  router.versioned
    .post({
      access: 'public',
      path: ASSET_CRITICALITY_PUBLIC_URL,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(CreateAssetCriticalityRecordRequestBody),
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<CreateAssetCriticalityRecordResponse>> => {
        const siemResponse = buildSiemResponse(response);
        try {
          await checkAndInitAssetCriticalityResources(context, logger);

          const securitySolution = await context.securitySolution;
          const assetCriticalityClient = securitySolution.getAssetCriticalityDataClient();

          const assetCriticalityRecord: AssetCriticalityUpsert = {
            idField: request.body.id_field,
            idValue: request.body.id_value,
            criticalityLevel: request.body.criticality_level,
          };

          const result = await assetCriticalityClient.upsert(
            assetCriticalityRecord,
            request.body.refresh
          );

          securitySolution.getAuditLogger()?.log({
            message: 'User attempted to assign the asset criticality level for an entity',
            event: {
              action: AssetCriticalityAuditActions.ASSET_CRITICALITY_UPDATE,
              category: AUDIT_CATEGORY.DATABASE,
              type: AUDIT_TYPE.CREATION,
              outcome: AUDIT_OUTCOME.UNKNOWN,
            },
          });

          return response.ok({
            body: result,
          });
        } catch (e) {
          const error = transformError(e);

          return siemResponse.error({
            statusCode: error.statusCode,
            body: { message: error.message, full_error: JSON.stringify(e) },
            bypassErrorFormat: true,
          });
        }
      }
    );
};
