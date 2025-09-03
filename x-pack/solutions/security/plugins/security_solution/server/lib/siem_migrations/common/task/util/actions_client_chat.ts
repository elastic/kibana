/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { Logger } from '@kbn/core/server';
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
import { TELEMETRY_SIEM_MIGRATION_ID } from './constants';

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
  constructor(private readonly actionsClient: ActionsClient, private readonly logger: Logger) {}

  public async createModel({
    migrationId,
    connectorId,
    abortController,
  }: CreateModelParams): Promise<ChatModel> {
    const connector = await this.actionsClient.get({ id: connectorId });
    if (!connector) {
      throw new Error(`Connector not found: ${connectorId}`);
    }
    if (!isSupportedActionTypeId(connector.actionTypeId)) {
      throw new Error(`Connector type not supported: ${connector.actionTypeId}`);
    }

    const llmType = this.getLLMType(connector.actionTypeId);

    const ChatModelClass = this.getLLMClass(llmType);

    const model = new ChatModelClass({
      actionsClient: this.actionsClient,
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

  private getLLMClass(llmType: LlmType): ActionsClientChatModelClass {
    switch (llmType) {
      case 'bedrock':
        return ActionsClientChatBedrockConverse;
      case 'gemini':
        return ActionsClientChatVertexAI;
      case 'inference':
      case 'openai':
      default:
        return ActionsClientChatOpenAI;
    }
  }
}
