/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
import { AUTOMATIC_TROUBLESHOOTING_TAG } from '.';

interface PendingExecution {
  executionId: string;
  status: string;
  conversationId: string | undefined;
  insightType: string | undefined;
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
      const { insightType } = request.query;
      const metadataFilter: Record<string, string> = {
        source: AUTOMATIC_TROUBLESHOOTING_TAG,
      };
      if (insightType) {
        metadataFilter.insightType = insightType;
      }

      const agentBuilder = endpointContext.service.getAgentBuilder();
      const results = await agentBuilder.execution.findExecutions(request, {
        filter: {
          metadata: metadataFilter,
          status: [ExecutionStatus.running, ExecutionStatus.scheduled],
        },
        size: 10,
      });

      const pending = results.map((execution) => ({
        executionId: execution.executionId,
        status: execution.status,
        conversationId: execution.agentParams.conversationId,
        insightType: execution.metadata?.insightType,
        '@timestamp': execution['@timestamp'],
      }));

      return response.ok({ body: { pending } });
    } catch (e) {
      return errorHandler(logger, response, e);
    }
  };
};
