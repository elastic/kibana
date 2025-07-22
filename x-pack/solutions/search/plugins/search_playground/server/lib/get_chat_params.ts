/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OPENAI_CONNECTOR_ID } from '@kbn/stack-connectors-plugin/common/openai/constants';
import { BEDROCK_CONNECTOR_ID } from '@kbn/stack-connectors-plugin/common/bedrock/constants';
import { GEMINI_CONNECTOR_ID } from '@kbn/stack-connectors-plugin/common/gemini/constants';
import { INFERENCE_CONNECTOR_ID } from '@kbn/stack-connectors-plugin/common/inference/constants';
import type { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import { BaseLanguageModel } from '@langchain/core/language_models/base';
import type { Connector } from '@kbn/actions-plugin/server/application/connector/types';
import { getDefaultArguments } from '@kbn/langchain/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';

import { Prompt, QuestionRewritePrompt } from '../../common/prompt';
import { isEISConnector } from '../utils/eis';

export const getChatParams = async (
  {
    connectorId,
    model,
    prompt,
    citations,
  }: { connectorId: string; model?: string; prompt: string; citations: boolean },
  {
    actions,
    inference,
    request,
  }: {
    actions: ActionsPluginStartContract;
    inference: InferenceServerStart;
    logger: Logger;
    request: KibanaRequest;
  }
): Promise<{
  chatModel: BaseLanguageModel;
  chatPrompt: string;
  questionRewritePrompt: string;
  connector: Connector;
  summarizationModel?: string;
}> => {
  let summarizationModel = model;
  const actionsClient = await actions.getActionsClientWithRequest(request);
  const connector = await actionsClient.get({ id: connectorId });

  let llmType: string;
  let modelType: 'openai' | 'anthropic' | 'gemini';

  if (isEISConnector(connector)) {
    llmType = 'bedrock';
    modelType = 'anthropic';
    if (!summarizationModel && connector.config?.providerConfig?.model_id) {
      summarizationModel = connector.config?.providerConfig?.model_id;
    }
  } else {
    switch (connector.actionTypeId) {
      case INFERENCE_CONNECTOR_ID:
        llmType = 'inference';
        modelType = 'openai';
        break;
      case OPENAI_CONNECTOR_ID:
        llmType = 'openai';
        modelType = 'openai';
        break;
      case BEDROCK_CONNECTOR_ID:
        llmType = 'bedrock';
        modelType = 'anthropic';
        break;
      case GEMINI_CONNECTOR_ID:
        llmType = 'gemini';
        modelType = 'gemini';
        break;
      default:
        throw new Error(`Invalid connector type: ${connector.actionTypeId}`);
    }
  }

  const chatPrompt = Prompt(prompt, {
    citations,
    context: true,
    type: modelType,
  });

  const questionRewritePrompt = QuestionRewritePrompt({
    type: modelType,
  });

  const chatModel = await inference.getChatModel({
    request,
    connectorId,
    chatModelOptions: {
      model: summarizationModel || connector?.config?.defaultModel,
      temperature: getDefaultArguments(llmType).temperature,
      // prevents the agent from retrying on failure
      // failure could be due to bad connector, we should deliver that result to the client asap
      maxRetries: 0,
      telemetryMetadata: { pluginId: 'search_playground' }, // hard-coded because the pluginId is not snake cased and the telemetry expects snake case
    },
  });

  return {
    chatModel,
    chatPrompt,
    questionRewritePrompt,
    connector,
    summarizationModel: summarizationModel || connector?.config?.defaultModel,
  };
};
