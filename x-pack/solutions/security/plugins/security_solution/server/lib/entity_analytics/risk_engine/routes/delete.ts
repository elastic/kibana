/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { withRiskEnginePrivilegeCheck } from '../risk_engine_privileges';
import { RISK_ENGINE_CLEANUP_URL, APP_ID, API_VERSIONS } from '../../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { RiskEngineAuditActions } from '../audit';
import { AUDIT_CATEGORY, AUDIT_OUTCOME, AUDIT_TYPE } from '../../audit';
import type { CleanUpRiskEngineResponse } from '../../../../../common/api/entity_analytics';
import { deleteSavedObjects } from '../utils/saved_object_configuration';

export const riskEngineCleanupRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices']
) => {
  router.versioned
    .delete({
      access: 'public',
      path: RISK_ENGINE_CLEANUP_URL,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
        },
      },
    })
    .addVersion(
      { version: API_VERSIONS.public.v1, validate: {} },
      withRiskEnginePrivilegeCheck(
        getStartServices,
        async (context, request, response): Promise<IKibanaResponse<CleanUpRiskEngineResponse>> => {
          const siemResponse = buildSiemResponse(response);
          const securitySolution = await context.securitySolution;
          const core = await context.core;
          const namespace = securitySolution.getSpaceId();
          const esClient = core.elasticsearch.client.asInternalUser;
          const errors: Error[] = [];
          const addError = (error: unknown) => {
            errors.push(error instanceof Error ? error : new Error(String(error)));
          };

          securitySolution.getAuditLogger()?.log({
            message: 'User attempted to clean up risk score resources',
            event: {
              action: RiskEngineAuditActions.RISK_ENGINE_REMOVE_TASK,
              category: AUDIT_CATEGORY.DATABASE,
              type: AUDIT_TYPE.DELETION,
              outcome: AUDIT_OUTCOME.UNKNOWN,
            },
          });

          try {
            await deleteSavedObjects({
              savedObjectsClient: core.savedObjects.client,
              namespace,
            }).catch(addError);

            const riskScoreErrors = await securitySolution.getRiskScoreDataClient().tearDown();
            errors.push(...riskScoreErrors);

            const alias = `risk-score.risk-score-${namespace}`;
            await esClient
              .delete(
                {
                  index: '.kibana_task_manager',
                  id: `task:risk-score:${namespace}`,
                  refresh: true,
                },
                { ignore: [404] }
              )
              .catch(addError);
            await esClient.indices.delete({ index: alias }, { ignore: [404] }).catch(addError);
            await esClient.ingest
              .deletePipeline(
                { id: `entity_analytics_create_eventIngest_from_timestamp-pipeline-${namespace}` },
                { ignore: [404] }
              )
              .catch(addError);

            if (errors.length > 0) {
              return siemResponse.error({
                statusCode: 500,
                body: {
                  cleanup_successful: false,
                  errors: errors.map((error, seq) => ({
                    seq: seq + 1,
                    error: error.message,
                  })),
                },
                bypassErrorFormat: true,
              });
            }

            return response.ok({ body: { cleanup_successful: true } });
          } catch (error) {
            return siemResponse.error({
              statusCode: 500,
              body: {
                cleanup_successful: false,
                errors: [{ seq: 1, error: error instanceof Error ? error.message : String(error) }],
              },
              bypassErrorFormat: true,
            });
          }
        }
      )
    );
};
