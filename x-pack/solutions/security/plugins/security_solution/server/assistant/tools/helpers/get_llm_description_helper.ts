/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { StartServicesAccessor } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';

import { getPrompt } from '@kbn/elastic-assistant-plugin/server/lib/prompt';
import { getModelOrOss } from '@kbn/elastic-assistant-plugin/server/lib/prompt/helpers';
import { getLlmType } from '@kbn/elastic-assistant-plugin/server/routes/utils';
import type { SecuritySolutionPluginStartDependencies } from '../../../plugin_contract';

interface ToolRequestBody {
  actionTypeId?: string;
  model?: string;
}

interface ToolRequestParams {
  connectorId?: string;
}

interface ToolContext {
  request: KibanaRequest<ToolRequestParams, unknown, ToolRequestBody>;
}

export interface GetLlmDescriptionParams {
  description: string;
  context: ToolContext | null | undefined;
  promptId: string;
  promptGroupId: string;
  getStartServices: StartServicesAccessor<SecuritySolutionPluginStartDependencies>;
  savedObjectsClient?: SavedObjectsClientContract; // Optional for tools that use workaround
}

/**
 * Helper function to get LLM-specific description for internal tools.
 * This centralizes the logic for fetching model-aware prompts.
 */
export const getLlmDescriptionHelper = async ({
  description,
  context,
  promptId,
  promptGroupId,
  getStartServices,
  savedObjectsClient,
}: GetLlmDescriptionParams): Promise<string> => {
  try {
    if (!context || !savedObjectsClient) {
      return description;
    }

    const [, pluginsStart] = await getStartServices();
    const { actions } = pluginsStart;

    // Get the actions client from the context
    const actionsClient = await actions.getActionsClientWithRequest(context.request);

    // Try to get the model-aware prompt
    // We need to determine the model type from the request context
    // Try to extract actionTypeId from request body
    const requestBody = context.request.body;
    const actionTypeId = requestBody?.actionTypeId || '.gen-ai'; // Default fallback
    const modelType = getLlmType(actionTypeId);
    const modelForPrompts = getModelOrOss(modelType, false, requestBody?.model);

    // Try to get connector ID from request params
    const connectorId = context.request.params?.connectorId || 'default';

    const prompt = await getPrompt({
      actionsClient,
      connectorId,
      model: modelForPrompts,
      promptId,
      promptGroupId,
      provider: modelType,
      savedObjectsClient,
    });

    return prompt;
  } catch (error) {
    // Fall back to default description if prompt fetching fails
    return description;
  }
};
