/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { IKibanaResponse, RequestHandler } from '@kbn/core/server';
import { ExecutionStatus } from '@kbn/agent-builder-plugin/server';
import type { CreateWorkflowInsightRequestBody } from '../../../../common/api/endpoint/workflow_insights';
import { CreateWorkflowInsightRequestSchema } from '../../../../common/api/endpoint/workflow_insights/workflow_insights';
import { errorHandler } from '../error_handler';
import { WORKFLOW_INSIGHTS_ROUTE } from '../../../../common/endpoint/constants';
import { withEndpointAuthz } from '../with_endpoint_authz';
import type {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../types';
import type { EndpointAppContext } from '../../types';
import { AUTOMATIC_TROUBLESHOOTING_TAG } from '.';

export const registerCreateInsightsRoute = (
  router: SecuritySolutionPluginRouter,
  endpointContext: EndpointAppContext
) => {
  router.versioned
    .post({
      access: 'internal',
      path: WORKFLOW_INSIGHTS_ROUTE,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
      options: { authRequired: true },
    })
    .addVersion(
      {
        version: '1',
        validate: { request: CreateWorkflowInsightRequestSchema },
      },
      withEndpointAuthz(
        { all: ['canWriteWorkflowInsights'] },
        endpointContext.logFactory.get('workflowInsights'),
        createInsightsRouteHandler(endpointContext)
      )
    );
};

const createInsightsRouteHandler = (
  endpointContext: EndpointAppContext
): RequestHandler<
  never,
  never,
  CreateWorkflowInsightRequestBody,
  SecuritySolutionRequestHandlerContext
> => {
  const logger = endpointContext.logFactory.get('workflowInsights');

  return async (
    context,
    request,
    response
  ): Promise<IKibanaResponse<{ executionId: string; conversationId?: string }>> => {
    const { automaticTroubleshootingSkill } = endpointContext.experimentalFeatures;

    if (!automaticTroubleshootingSkill) {
      return response.badRequest({
        body: 'automaticTroubleshootingSkill feature flag is disabled',
      });
    }

    const { insightType } = request.body;

    try {
      const agentBuilder = endpointContext.service.getAgentBuilder();

      const inFlightExecutions = await agentBuilder.execution.findExecutions(request, {
        filter: {
          metadata: { source: AUTOMATIC_TROUBLESHOOTING_TAG, insightType },
          status: [ExecutionStatus.running, ExecutionStatus.scheduled],
        },
        size: 1,
      });

      if (inFlightExecutions.length > 0) {
        const existing = inFlightExecutions[0];
        return response.ok({
          body: {
            executionId: existing.executionId,
            conversationId: existing.agentParams.conversationId,
          },
        });
      }

      const conversationId = uuidv4();
      const metadata: Record<string, string> = {
        source: AUTOMATIC_TROUBLESHOOTING_TAG,
        insightType,
      };

      const message = `Run automatic troubleshooting for ${insightType} on this endpoint.`;

      const { executionId } = await agentBuilder.execution.executeAgent({
        request,
        metadata,
        params: {
          conversationId,
          autoCreateConversationWithId: true,
          nextInput: { message },
        },
      });

      return response.ok({ body: { executionId, conversationId } });
    } catch (e) {
      return errorHandler(logger, response, e);
    }
  };
};
