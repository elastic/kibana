/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { AuthenticatedUser, ElasticsearchClient, Logger } from '@kbn/core/server';
import type { estypes } from '@elastic/elasticsearch';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import {
  ALERTS_API_ALL,
  ALERTS_API_UPDATE_DEPRECATED_PRIVILEGE,
} from '@kbn/security-solution-features/constants';
import { ALERT_CLOSING_REASON_VALIDATION_ERROR } from './translations';
import { DefaultClosingReasonSchema } from '../../../../../common/types';
import { SetAlertsStatusRequestBody } from '../../../../../common/api/detection_engine/signals';
import { AlertStatusEnum } from '../../../../../common/api/model';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import {
  DEFAULT_ALERTS_INDEX,
  DEFAULT_DETECTIONS_CLOSE_REASONS_KEY,
  DETECTION_ENGINE_SIGNALS_STATUS_URL,
} from '../../../../../common/constants';
import { buildSiemResponse } from '../utils';
import type { ITelemetryEventsSender } from '../../../telemetry/sender';
import { INSIGHTS_CHANNEL } from '../../../telemetry/constants';
import {
  createAlertStatusPayloads,
  getSessionIDfromKibanaRequest,
} from '../../../telemetry/insights';
import {
  getUpdateSignalStatusScript,
  setWorkflowStatusHandler,
} from '../common/set_workflow_status_handler';
import {
  resolveRuntimeMappingsFromIndices,
  resolveSourceIndicesForRules,
} from './bulk_close_runtime_mappings';

export const setSignalsStatusRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger,
  sender: ITelemetryEventsSender
) => {
  router.versioned
    .post({
      path: DETECTION_ENGINE_SIGNALS_STATUS_URL,
      access: 'public',
      security: {
        authz: {
          requiredPrivileges: [
            { anyRequired: [ALERTS_API_ALL, ALERTS_API_UPDATE_DEPRECATED_PRIVILEGE] },
          ],
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            body: buildRouteValidationWithZod(SetAlertsStatusRequestBody),
          },
        },
      },
      async (context, request, response) => {
        const { status } = request.body;

        const core = await context.core;
        const securitySolution = await context.securitySolution;
        const esClient = core.elasticsearch.client.asCurrentUser;
        const siemClient = securitySolution?.getAppClient();
        const siemResponse = buildSiemResponse(response);
        const spaceId = securitySolution?.getSpaceId() ?? 'default';

        let reason;
        if (request.body.status === AlertStatusEnum.closed) {
          const customReasons = await core.uiSettings.client.get(
            DEFAULT_DETECTIONS_CLOSE_REASONS_KEY
          );
          const validReasons = new Set([...DefaultClosingReasonSchema.options, ...customReasons]);
          if (request.body.reason === undefined || validReasons.has(request.body.reason)) {
            reason = request.body.reason;
          } else {
            return siemResponse.error({
              body: ALERT_CLOSING_REASON_VALIDATION_ERROR(request.body.reason),
              statusCode: 400,
            });
          }
        }

        if (!siemClient) {
          return siemResponse.error({ statusCode: 404 });
        }
        const user = core.security.authc.getCurrentUser();

        const clusterId = sender.getClusterID();
        const isTelemetryOptedIn = await sender.isTelemetryOptedIn();

        if (isTelemetryOptedIn && clusterId) {
          // Sometimes the ids are in the query not passed in the request?
          const toSendAlertIds =
            'signal_ids' in request.body
              ? request.body.signal_ids
              : (get(request.body.query, 'bool.filter.terms._id') as string[]);
          // Get Context for Insights Payloads
          const sessionId = getSessionIDfromKibanaRequest(clusterId, request);
          if (user?.username && toSendAlertIds && sessionId && status) {
            const insightsPayloads = createAlertStatusPayloads(
              clusterId,
              toSendAlertIds,
              sessionId,
              user.username,
              DETECTION_ENGINE_SIGNALS_STATUS_URL,
              status
            );
            logger.debug(() => `Sending Insights Payloads ${JSON.stringify(insightsPayloads)}`);
            await sender.sendOnDemand(INSIGHTS_CHANNEL, insightsPayloads);
          }
        }

        try {
          if ('signal_ids' in request.body) {
            // Use common handler for "by IDs" case
            const getIndexPattern = async () => `${DEFAULT_ALERTS_INDEX}-${spaceId}`;
            return setWorkflowStatusHandler({
              context,
              request,
              response,
              getIndexPattern,
            });
          } else {
            const { conflicts, query, rule_ids: ruleStaticIds } = request.body;

            // Resolve the runtime mappings server-side from the rule's own
            // declared source indices.
            const rulesClient = await (await context.alerting).getRulesClient();
            const savedObjectsClient = core.savedObjects.client;
            const sourceIndices = await resolveSourceIndicesForRules(
              rulesClient,
              savedObjectsClient,
              ruleStaticIds,
              logger
            );
            const runtimeMappings = await resolveRuntimeMappingsFromIndices(
              esClient,
              sourceIndices,
              logger
            );

            const body = await updateSignalsStatusByQuery(
              status,
              query,
              { conflicts: conflicts ?? 'abort' },
              spaceId,
              esClient,
              user,
              logger,
              reason,
              runtimeMappings
            );

            return response.ok({ body });
          }
        } catch (err) {
          // error while getting or updating signal with id: id in signal index .siem-signals
          const error = transformError(err);
          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};

/**
 * Please avoid using `updateSignalsStatusByQuery` when possible, use the
 * common handler with "by IDs" instead.
 *
 * This method calls `updateByQuery` with `refresh: true` which is expensive on
 * serverless.
 *
 * When `runtimeMappings` are provided, they are attached to the `_update_by_query`
 * request alongside the filter. ES evaluates the runtime scripts in the
 * query's filter context against each candidate alert.
 *
 * `runtime_mappings` is a valid top-level field on the `_update_by_query`
 * request, but it isn't typed on
 * `UpdateByQueryRequest` in the JS client (yet). We widen the request type
 * inline rather than suppressing the type error.
 */
const updateSignalsStatusByQuery = async (
  status: SetAlertsStatusRequestBody['status'],
  query: object | undefined,
  options: { conflicts: 'abort' | 'proceed' },
  spaceId: string,
  esClient: ElasticsearchClient,
  user: AuthenticatedUser | null,
  logger: Logger,
  reason?: string,
  runtimeMappings?: estypes.MappingRuntimeFields
) => {
  const index = `${DEFAULT_ALERTS_INDEX}-${spaceId}`;
  const hasRuntimeMappings = runtimeMappings != null && Object.keys(runtimeMappings).length > 0;

  const request: estypes.UpdateByQueryRequest & {
    runtime_mappings?: estypes.MappingRuntimeFields;
  } = {
    index,
    conflicts: options.conflicts,
    refresh: true,
    script: getUpdateSignalStatusScript(status, user, reason),
    query: { bool: { filter: query as estypes.QueryDslQueryContainer | undefined } },
    ignore_unavailable: true,
    ...(hasRuntimeMappings ? { runtime_mappings: runtimeMappings } : {}),
  };

  return esClient.updateByQuery(request);
};
