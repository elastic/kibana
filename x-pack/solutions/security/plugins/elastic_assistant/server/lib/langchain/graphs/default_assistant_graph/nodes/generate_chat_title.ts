/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { StringOutputParser } from '@langchain/core/output_parsers';

import { ChatPromptTemplate } from '@langchain/core/prompts';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { TelemetryParams } from '@kbn/langchain/server/tracers/telemetry/telemetry_tracer';
import { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import { NEW_CHAT } from '../../../../../routes/helpers';
import { AIAssistantConversationsDataClient } from '../../../../../ai_assistant_data_clients/conversations';
import { INVOKE_ASSISTANT_ERROR_EVENT } from '../../../../telemetry/event_based_telemetry';
import { getPrompt, promptDictionary } from '../../../../prompt';
import { GraphInputs, NodeParamsBase } from '../types';
import { NodeType } from '../constants';
import { promptGroupId } from '../../../../prompt/local_prompt_object';
import { getActionTypeId } from '../../../../../routes/utils';

export const GENERATE_CHAT_TITLE_PROMPT = ({
  prompt,
  responseLanguage,
}: {
  prompt: string;
  responseLanguage: string;
}) =>
  ChatPromptTemplate.fromMessages([
    ['system', `${prompt}\nPlease create the title in ${responseLanguage}.`],
    ['human', '{input}'],
  ]);

export interface GenerateChatTitleParams extends NodeParamsBase {
  state: Pick<
    GraphInputs,
    'connectorId' | 'conversationId' | 'llmType' | 'responseLanguage' | 'input' | 'isStream'
  >;
  model: BaseChatModel;
  conversationsDataClient?: AIAssistantConversationsDataClient;
  telemetryParams?: TelemetryParams;
  telemetry: AnalyticsServiceSetup;
}

export async function generateChatTitle({
  actionsClient,
  conversationsDataClient,
  logger,
  savedObjectsClient,
  state,
  model,
  telemetryParams,
  telemetry,
}: GenerateChatTitleParams): Promise<void> {
  if (!state.conversationId) {
    return;
  }
  try {
    logger.debug(
      () => `${NodeType.GENERATE_CHAT_TITLE}: Node state:\n${JSON.stringify(state, null, 2)}`
    );
    const conversation = await conversationsDataClient?.getConversation({
      id: state.conversationId,
    });
    if (!conversation) {
      logger.debug('No conversation found, skipping chat title generation');
      return;
    }
    if (conversation?.title?.length && conversation?.title !== NEW_CHAT) {
      return;
    }

    const outputParser = new StringOutputParser();
    const prompt = await getPrompt({
      actionsClient,
      connectorId: state.connectorId,
      promptId: promptDictionary.chatTitle,
      promptGroupId: promptGroupId.aiAssistant,
      provider: state.llmType,
      savedObjectsClient,
    });
    const graph = GENERATE_CHAT_TITLE_PROMPT({
      prompt,
      responseLanguage: state.responseLanguage ?? 'English',
    })
      .pipe(model)
      .pipe(outputParser)
      .withConfig({ runName: 'Generate Chat Title' });

    const chatTitle = await graph.invoke({
      input: JSON.stringify(state.input, null, 2),
    });
    logger.debug(`chatTitle: ${chatTitle}`);

    if (conversation?.title !== chatTitle) {
      await conversationsDataClient?.updateConversation({
        conversationUpdateProps: {
          id: state.conversationId,
          title: chatTitle,
        },
      });
    }
  } catch (e) {
    telemetry.reportEvent(INVOKE_ASSISTANT_ERROR_EVENT.eventType, {
      actionTypeId: telemetryParams?.actionTypeId ?? getActionTypeId(state.llmType ?? `.gen-ai`),
      model: telemetryParams?.model,
      errorMessage: e.message ?? e.toString(),
      assistantStreamingEnabled:
        telemetryParams?.assistantStreamingEnabled ?? state.isStream ?? true,
      isEnabledKnowledgeBase: telemetryParams?.isEnabledKnowledgeBase ?? false,
      errorLocation: 'generateChatTitle',
    });
    await conversationsDataClient?.updateConversation({
      conversationUpdateProps: {
        id: state.conversationId,
        title: (e.name ?? e.message ?? e.toString()).slice(0, 60),
      },
    });
  }
}
