/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { withActiveInferenceSpan, ElasticGenAIAttributes } from '@kbn/inference-tracing';
import type {
  ModelProvider,
  ToolEventEmitter,
  ToolPromptManager,
  ToolStateManager,
} from '@kbn/agent-builder-server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { createRemediationWorkflowToolGraph } from './graph';
import type { RemediationWorkflowToolInput } from './remediation_workflow_schema';

export const getToolHandler = async ({
  modelProvider,
  events,
  request,
  spaceId,
  workflowApi,
  prompts,
  stateManager,
  logger,
  toolParams,
}: {
  modelProvider: ModelProvider;
  events: ToolEventEmitter;
  request: KibanaRequest;
  spaceId: string;
  workflowApi: WorkflowsServerPluginSetup['management'];
  prompts: ToolPromptManager;
  stateManager: ToolStateManager;
  logger: Logger;
  toolParams: RemediationWorkflowToolInput;
}) => {
  const toolGraph = await createRemediationWorkflowToolGraph({
    modelProvider,
    events,
    request,
    spaceId,
    workflowApi,
    prompts,
    stateManager,
    logger,
  });

  return withActiveInferenceSpan(
    'RemediationWorkflowToolGraph',
    {
      attributes: {
        [ElasticGenAIAttributes.InferenceSpanKind]: 'CHAIN',
      },
    },
    async () => {
      const outState = await toolGraph.invoke(
        { query: toolParams.query },
        {
          tags: ['remediation_workflow_tool'],
          metadata: { graphName: 'remediation_workflow_tool' },
        }
      );
      return outState.toolOutput;
    }
  );
};
