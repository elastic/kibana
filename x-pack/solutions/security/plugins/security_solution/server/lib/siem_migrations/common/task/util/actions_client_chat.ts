/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import {
  ActionsClientChatBedrockConverse,
  ActionsClientChatOpenAI,
  ActionsClientChatVertexAI,
} from '@kbn/langchain/server';
import type { CustomChatModelInput as ActionsClientBedrockChatModelParams } from '@kbn/langchain/server/language_models/bedrock_chat';
import type { ActionsClientChatOpenAIParams } from '@kbn/langchain/server/language_models/chat_openai';
import type {
  CustomChatModelInput as ActionsClientChatVertexAIParams,
  ActionsClientGeminiChatModel,
} from '@kbn/langchain/server/language_models/gemini_chat';
import type { CustomChatModelInput as ActionsClientSimpleChatModelParams } from '@kbn/langchain/server/language_models/simple_chat_model';
import { InferenceChatModel } from '@kbn/inference-langchain';
import { INFERENCE_CHAT_MODEL_DISABLED_FEATURE_FLAG } from '@kbn/elastic-assistant-common/constants';
import { TELEMETRY_SIEM_MIGRATION_ID } from './constants';
import type { SiemMigrationsClientDependencies } from '../../types';

export type ChatModel =
  | ActionsClientChatBedrockConverse
  | ActionsClientChatOpenAI
  | ActionsClientGeminiChatModel
  | ActionsClientChatVertexAI
  | InferenceChatModel;

export type ActionsClientChatModelClass =
  | typeof ActionsClientChatBedrockConverse
  | typeof ActionsClientChatOpenAI
  | typeof ActionsClientGeminiChatModel
  | typeof ActionsClientChatVertexAI;

export type ChatModelParams = Partial<ActionsClientSimpleChatModelParams> &
  Partial<ActionsClientChatOpenAIParams> &
  Partial<ActionsClientBedrockChatModelParams> &
  Partial<ActionsClientChatVertexAIParams>;

const llmTypeDictionary = {
  '.gen-ai': 'openai',
  '.bedrock': 'bedrock',
  '.gemini': 'gemini',
  '.inference': 'inference',
} as const;
type SupportedActionTypeId = keyof typeof llmTypeDictionary;
type LlmType = (typeof llmTypeDictionary)[SupportedActionTypeId];

const isSupportedActionTypeId = (actionTypeId: string): actionTypeId is SupportedActionTypeId => {
  return actionTypeId in llmTypeDictionary;
};

interface CreateModelParams {
  migrationId: string;
  connectorId: string;
  abortController: AbortController;
}

export class ActionsClientChat {
  constructor(
    private readonly request: KibanaRequest,
    private readonly dependencies: SiemMigrationsClientDependencies,
    private readonly logger: Logger
  ) {}

  public async createModel({
    migrationId,
    connectorId,
    abortController,
  }: CreateModelParams): Promise<ChatModel> {
    const { actionsClient, inferenceService, featureFlags } = this.dependencies;
    const connector = await actionsClient.get({ id: connectorId });
    if (!connector) {
      throw new Error(`Connector not found: ${connectorId}`);
    }
    if (!isSupportedActionTypeId(connector.actionTypeId)) {
      throw new Error(`Connector type not supported: ${connector.actionTypeId}`);
    }

    const inferenceChatModelDisabled = await featureFlags.getBooleanValue(
      INFERENCE_CHAT_MODEL_DISABLED_FEATURE_FLAG,
      false
    );

    const llmType = this.getLLMType(connector.actionTypeId);
    if (!inferenceChatModelDisabled || llmType === 'inference') {
      return inferenceService.getChatModel({
        request: this.request,
        connectorId,
        chatModelOptions: {
          // not passing specific `model`, we'll always use the connector default model
          // temperature may need to be parametrized in the future
          temperature: 0.05,
          // Only retry once inside the model call, we already handle backoff retries in the task runner for the entire task
          maxRetries: 1,
          // Disable streaming explicitly
          disableStreaming: true,
          // Set a hard limit of 50 concurrent requests
          maxConcurrency: 50,
          telemetryMetadata: { pluginId: TELEMETRY_SIEM_MIGRATION_ID, aggregateBy: migrationId },
          signal: abortController.signal,
        },
      });
    }

    const ChatModelClass = this.getLLMClass(llmType);

    const model = new ChatModelClass({
      actionsClient,
      connectorId,
      llmType,
      model: connector.config?.defaultModel,
      streaming: false,
      convertSystemMessageToHumanContent: false,
      temperature: 0.05,
      maxRetries: 1, // Only retry once inside the model, we will handle backoff retries in the task runner
      telemetryMetadata: { pluginId: TELEMETRY_SIEM_MIGRATION_ID, aggregateBy: migrationId },
      signal: abortController.signal,
      logger: this.logger,
    });
    return model;
  }

  public getModelName(model: ChatModel): string {
    if (model instanceof InferenceChatModel) {
      const modelName = model.identifyingParams().model_name;
      return `inference${modelName ? ` (${modelName})` : ''}`;
    }
    return model.model;
  }

  private getLLMType(actionTypeId: SupportedActionTypeId): LlmType {
    if (llmTypeDictionary[actionTypeId]) {
      return llmTypeDictionary[actionTypeId];
    }
    throw new Error(`Unknown LLM type for action type ID: ${actionTypeId}`);
  }

  private getLLMClass(llmType: Omit<LlmType, 'inference'>): ActionsClientChatModelClass {
    switch (llmType) {
      case 'bedrock':
        return ActionsClientChatBedrockConverse;
      case 'gemini':
        return ActionsClientChatVertexAI;
      case 'openai':
      default:
        return ActionsClientChatOpenAI;
    }
  }
}
