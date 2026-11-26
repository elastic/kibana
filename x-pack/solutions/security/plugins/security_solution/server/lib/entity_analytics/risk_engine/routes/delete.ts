/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { ENTITY_LATEST, getEntitiesAlias } from '@kbn/entity-store/common';
import { withRiskEnginePrivilegeCheck } from '../../risk_score/routes/risk_engine_privileges';
import { RISK_ENGINE_CLEANUP_URL, APP_ID, API_VERSIONS } from '../../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { RiskEngineAuditActions } from '../audit';
import { AUDIT_CATEGORY, AUDIT_OUTCOME, AUDIT_TYPE } from '../../audit';
import type { CleanUpRiskEngineResponse } from '../../../../../common/api/entity_analytics';
import { deleteSavedObjects } from '../../risk_score/configuration/saved_object_configuration';
import { getIndexPatternLookup } from '../../risk_score/configurations';
import { RISK_SCORE_MAINTAINER_ID } from '../../../../../common/entity_analytics/risk_score/constants';
import {
  MISSING_RISK_SCORE_DELETE_PRIVILEGES_ERROR,
  missingEntityIndexPrivilegesError,
  RISK_SCORE_CLEANUP_IN_PROGRESS_ERROR,
  TASK_MANAGER_UNAVAILABLE_ERROR,
} from '../../risk_score/routes/translations';

const CLEAR_ENTITY_RISK_SCRIPT = `
  if (ctx._source.entity != null) {
    ctx._source.entity.remove('risk');
    if (ctx._source.entity.relationships != null && ctx._source.entity.relationships.resolution != null) {
      ctx._source.entity.relationships.resolution.remove('risk');
    }
  }
`;

const isMissingResourceError = (error: unknown): boolean => {
  if (typeof error !== 'object' || error == null) {
    return false;
  }
  const statusCode = (error as { meta?: { statusCode?: number } }).meta?.statusCode;
  if (statusCode === 404) {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('resource_not_found_exception') ||
    message.includes('index_not_found_exception') ||
    message.includes('not_found')
  );
};

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
          const currentUserEsClient = core.elasticsearch.client.asCurrentUser;
          const lookupIndex = getIndexPatternLookup(namespace);
          const [, plugins] = await getStartServices();
          const errors: Error[] = [];
          const addError = (error: unknown) => {
            if (isMissingResourceError(error)) {
              return;
            }
            errors.push(error instanceof Error ? error : new Error(String(error)));
          };
          const failureResponse = () =>
            siemResponse.error({
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

          securitySolution.getAuditLogger()?.log({
            message: 'User attempted to clean up risk score resources',
            event: {
              action: RiskEngineAuditActions.RISK_ENGINE_REMOVE_TASK,
              category: AUDIT_CATEGORY.DATABASE,
              type: AUDIT_TYPE.DELETION,
              outcome: AUDIT_OUTCOME.UNKNOWN,
            },
          });

          if (!plugins.taskManager) {
            return siemResponse.error({
              statusCode: 400,
              body: TASK_MANAGER_UNAVAILABLE_ERROR,
            });
          }

          try {
            const alias = `risk-score.risk-score-${namespace}`;
            const entityIndex = getEntitiesAlias(ENTITY_LATEST, namespace);
            const taskId = `${RISK_SCORE_MAINTAINER_ID}:${namespace}`;
            // The caller may have read and write without view_index_metadata. Checking
            // existence as that user can 403 before Elasticsearch reports a missing index,
            // which blocks cleanup after Entity Store is uninstalled. This is one alias.
            const entityIndexExists = await core.elasticsearch.client.asInternalUser.indices.exists(
              { index: entityIndex }
            );
            // update_by_query needs read and write. Skip the check when the entity index is gone,
            // so uninstalling Entity Store does not block cleanup of the remaining risk resources.
            if (entityIndexExists) {
              const entityPrivileges = await currentUserEsClient.security.hasPrivileges({
                index: [{ names: [entityIndex], privileges: ['read', 'write'] }],
              });
              if (!entityPrivileges.has_all_requested) {
                return siemResponse.error({
                  statusCode: 403,
                  body: missingEntityIndexPrivilegesError(entityIndex),
                });
              }
            }

            // The risk-engine privilege check grants read and write, not delete_index.
            // Refuse before removing the task, or a denied delete leaves the space with
            // its data and no schedule.
            const deletePrivileges = await currentUserEsClient.security.hasPrivileges({
              index: [{ names: [alias, lookupIndex.alias], privileges: ['delete_index'] }],
            });
            if (!deletePrivileges.has_all_requested) {
              return siemResponse.error({
                statusCode: 403,
                body: MISSING_RISK_SCORE_DELETE_PRIVILEGES_ERROR,
              });
            }

            // removeIfExists does not abort a run that has already been claimed, and Task
            // Manager has no API to cancel one task. Refuse while a run is active.
            try {
              const task = await plugins.taskManager.get(taskId);
              if (task.status === 'running' || task.status === 'claiming') {
                return siemResponse.error({
                  statusCode: 409,
                  body: RISK_SCORE_CLEANUP_IN_PROGRESS_ERROR,
                });
              }
            } catch (error) {
              if (!SavedObjectsErrorHelpers.isNotFoundError(error as Error)) {
                addError(error);
                return failureResponse();
              }
            }

            // The task is idle or already gone. Remove it before the deletes so a new
            // run cannot start and recreate the risk-score name as a plain index.
            await plugins.taskManager.removeIfExists(taskId).catch(addError);
            if (errors.length > 0) {
              return failureResponse();
            }

            // The risk-score name is a data stream, and the index delete API rejects a data
            // stream name. Delete the data stream first, as the current user.
            await currentUserEsClient.indices
              .deleteDataStream({ name: alias }, { ignore: [404] })
              .catch(addError);
            await currentUserEsClient.indices
              .delete({ index: alias }, { ignore: [404] })
              .catch(addError);
            await currentUserEsClient.indices
              .delete({ index: lookupIndex.alias }, { ignore: [404] })
              .catch(addError);
            await currentUserEsClient.indices
              .deleteIndexTemplate({ name: lookupIndex.template }, { ignore: [404] })
              .catch(addError);
            if (errors.length > 0) {
              return failureResponse();
            }

            if (entityIndexExists) {
              const clearEntityRisk = () =>
                currentUserEsClient.updateByQuery({
                  index: entityIndex,
                  ignore_unavailable: true,
                  conflicts: 'proceed',
                  refresh: true,
                  query: {
                    bool: {
                      should: [
                        { exists: { field: 'entity.risk' } },
                        { exists: { field: 'entity.relationships.resolution.risk' } },
                      ],
                      minimum_should_match: 1,
                    },
                  },
                  script: { lang: 'painless', source: CLEAR_ENTITY_RISK_SCRIPT },
                });
              const incompleteClear = (
                result: Awaited<ReturnType<typeof clearEntityRisk>> | undefined
              ) =>
                result != null &&
                ((result.version_conflicts ?? 0) > 0 ||
                  (result.failures?.length ?? 0) > 0 ||
                  result.timed_out === true);
              let clearResult = await clearEntityRisk().catch((error: unknown) => {
                addError(error);
                return undefined;
              });
              if (incompleteClear(clearResult)) {
                clearResult = await clearEntityRisk().catch((error: unknown) => {
                  addError(error);
                  return undefined;
                });
              }
              if (incompleteClear(clearResult) && clearResult != null) {
                const failureCount = clearResult.failures?.length ?? 0;
                const message = clearResult.timed_out
                  ? 'Clearing entity risk fields timed out'
                  : failureCount > 0
                  ? `${failureCount} entity risk updates failed`
                  : `${clearResult.version_conflicts} entity documents still have risk fields after a retry`;
                addError(new Error(message));
              }
              if (errors.length > 0) {
                return failureResponse();
              }
            }

            const riskScoreErrors = await securitySolution.getRiskScoreDataClient().tearDown();
            errors.push(...riskScoreErrors);
            await deleteSavedObjects({
              savedObjectsClient: core.savedObjects.client,
              namespace,
            }).catch(addError);

            if (errors.length > 0) {
              return failureResponse();
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
