/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { Logger } from '@kbn/core/server';
import type { ActionsClientSimpleChatModel } from '@kbn/langchain/server';
import {
  ActionsClientBedrockChatModel,
  ActionsClientChatOpenAI,
  ActionsClientChatVertexAI,
} from '@kbn/langchain/server';
import type { CustomChatModelInput as ActionsClientBedrockChatModelParams } from '@kbn/langchain/server/language_models/bedrock_chat';
import type { ActionsClientChatOpenAIParams } from '@kbn/langchain/server/language_models/chat_openai';
import type { CustomChatModelInput as ActionsClientChatVertexAIParams } from '@kbn/langchain/server/language_models/gemini_chat';
import type { CustomChatModelInput as ActionsClientSimpleChatModelParams } from '@kbn/langchain/server/language_models/simple_chat_model';
import { TELEMETRY_SIEM_MIGRATION_ID } from './constants';

export type ChatModel =
  | ActionsClientSimpleChatModel
  | ActionsClientChatOpenAI
  | ActionsClientBedrockChatModel
  | ActionsClientChatVertexAI;

export type ActionsClientChatModelClass =
  | typeof ActionsClientSimpleChatModel
  | typeof ActionsClientChatOpenAI
  | typeof ActionsClientBedrockChatModel
  | typeof ActionsClientChatVertexAI;

export type ChatModelParams = Partial<ActionsClientSimpleChatModelParams> &
  Partial<ActionsClientChatOpenAIParams> &
  Partial<ActionsClientBedrockChatModelParams> &
  Partial<ActionsClientChatVertexAIParams>;

const llmTypeDictionary: Record<string, string> = {
  [`.gen-ai`]: `openai`,
  [`.bedrock`]: `bedrock`,
  [`.gemini`]: `gemini`,
  [`.inference`]: `inference`,
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

  private getLLMType(actionTypeId: string): string | undefined {
    if (llmTypeDictionary[actionTypeId]) {
      return llmTypeDictionary[actionTypeId];
    }
    throw new Error(`Unknown LLM type for action type ID: ${actionTypeId}`);
  }

  private getLLMClass(llmType?: string): ActionsClientChatModelClass {
    switch (llmType) {
      case 'bedrock':
        return ActionsClientBedrockChatModel;
      case 'gemini':
        return ActionsClientChatVertexAI;
      case 'openai':
      case 'inference':
      default:
        return ActionsClientChatOpenAI;
    }
  }
}
