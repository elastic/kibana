/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import type { IKibanaResponse, RequestHandler } from '@kbn/core/server';
import { ExecutionStatus } from '@kbn/agent-builder-plugin/server';
import type { GetPendingInsightsRequestQueryParams } from '../../../../common/api/endpoint/workflow_insights/workflow_insights';
import { GetPendingInsightsRequestSchema } from '../../../../common/api/endpoint/workflow_insights/workflow_insights';
import { errorHandler } from '../error_handler';
import { WORKFLOW_INSIGHTS_PENDING_ROUTE } from '../../../../common/endpoint/constants';
import { withEndpointAuthz } from '../with_endpoint_authz';
import type {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../types';
import type { EndpointAppContext } from '../../types';
import { AUTOMATIC_TROUBLESHOOTING_TAG, MAX_COMBOS } from '.';

interface PendingExecution {
  executionId: string;
  status: string;
  conversationId: string | undefined;
  insightType: string | undefined;
  endpointId: string | undefined;
  '@timestamp': string;
}

export const registerGetPendingRoute = (
  router: SecuritySolutionPluginRouter,
  endpointContext: EndpointAppContext
) => {
  router.versioned
    .get({
      access: 'internal',
      path: WORKFLOW_INSIGHTS_PENDING_ROUTE,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: { request: GetPendingInsightsRequestSchema },
      },
      withEndpointAuthz(
        { all: ['canReadWorkflowInsights'] },
        endpointContext.logFactory.get('workflowInsights'),
        getPendingRouteHandler(endpointContext)
      )
    );
};

const getPendingRouteHandler = (
  endpointContext: EndpointAppContext
): RequestHandler<
  never,
  GetPendingInsightsRequestQueryParams,
  never,
  SecuritySolutionRequestHandlerContext
> => {
  const logger = endpointContext.logFactory.get('workflowInsights');

  return async (
    context,
    request,
    response
  ): Promise<IKibanaResponse<{ pending: PendingExecution[] }>> => {
    const { automaticTroubleshootingSkill } = endpointContext.experimentalFeatures;

    if (!automaticTroubleshootingSkill) {
      return response.badRequest({
        body: 'automaticTroubleshootingSkill feature flag is disabled',
      });
    }

    try {
      const { insightTypes, endpointIds } = request.query;

      const insightTypesCount = insightTypes?.length ?? 1;
      const endpointIdsCount = endpointIds?.length ?? 1;
      const totalCombos = insightTypesCount * endpointIdsCount;
      if (totalCombos > MAX_COMBOS) {
        return response.badRequest({
          body: `Too many combinations (${totalCombos}). Maximum is ${MAX_COMBOS}.`,
        });
      }

      const agentBuilder = endpointContext.service.getAgentBuilder();

      // Terminal states (failed/aborted) are included so the FE can distinguish failure from
      // completion: empty response = scan complete; only failed/aborted = show error toast.
      const statusFilter = [
        ExecutionStatus.running,
        ExecutionStatus.scheduled,
        ExecutionStatus.failed,
        ExecutionStatus.aborted,
      ];

      // Known limitation: FindExecutionsFilter.metadata uses exact-match term queries
      // (Record<string, string>), so each findExecutions call can only filter by a single
      // insightType and a single endpointId. We loop over each combo and merge results.
      // This approach scales linearly with the number of combos. Revisit if real
      // multi-value support is needed (e.g., array support in FindExecutionsFilter).

      // Build an array of metadata filter combos to query
      const metadataFilters: Array<Record<string, string>> = [];

      if (insightTypes && insightTypes.length > 0 && endpointIds && endpointIds.length > 0) {
        // Loop over each insightType/endpointId combo
        for (const insightType of insightTypes) {
          for (const endpointId of endpointIds) {
            metadataFilters.push({
              source: AUTOMATIC_TROUBLESHOOTING_TAG,
              insightType,
              endpointId,
            });
          }
        }
      } else if (insightTypes && insightTypes.length > 0) {
        // Only insightTypes provided, no endpointIds
        for (const insightType of insightTypes) {
          metadataFilters.push({
            source: AUTOMATIC_TROUBLESHOOTING_TAG,
            insightType,
          });
        }
      } else if (endpointIds && endpointIds.length > 0) {
        // Only endpointIds provided, no insightTypes
        for (const endpointId of endpointIds) {
          metadataFilters.push({
            source: AUTOMATIC_TROUBLESHOOTING_TAG,
            endpointId,
          });
        }
      } else {
        // Neither provided — query with just the source tag
        metadataFilters.push({
          source: AUTOMATIC_TROUBLESHOOTING_TAG,
        });
      }

      let allResults: Awaited<ReturnType<typeof agentBuilder.execution.findExecutions>>;

      if (metadataFilters.length === 1) {
        allResults = await agentBuilder.execution.findExecutions(request, {
          filter: {
            metadata: metadataFilters[0],
            status: statusFilter,
          },
          size: 100,
        });
      } else {
        const perComboResults = await pMap(
          metadataFilters,
          (metadataFilter) =>
            agentBuilder.execution.findExecutions(request, {
              filter: {
                metadata: metadataFilter,
                status: statusFilter,
              },
              size: 100,
            }),
          { concurrency: 5 }
        );

        // Flatten and deduplicate by executionId
        const seen = new Set<string>();
        allResults = perComboResults.flat().filter((exec) => {
          if (seen.has(exec.executionId)) return false;
          seen.add(exec.executionId);
          return true;
        });
      }

      const pending = allResults.map((execution) => ({
        executionId: execution.executionId,
        status: execution.status,
        conversationId: execution.agentParams.conversationId,
        insightType: execution.metadata?.insightType,
        endpointId: execution.metadata?.endpointId,
        '@timestamp': execution['@timestamp'],
        ...(execution.error?.message ? { failureReason: execution.error.message } : {}),
      }));

      return response.ok({ body: { pending } });
    } catch (e) {
      return errorHandler(logger, response, e);
    }
  };
};
