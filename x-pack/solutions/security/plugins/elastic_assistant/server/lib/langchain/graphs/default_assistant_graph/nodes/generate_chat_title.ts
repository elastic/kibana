/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { StringOutputParser } from '@langchain/core/output_parsers';

import { ChatPromptTemplate } from '@langchain/core/prompts';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { getPrompt, promptDictionary } from '../../../../prompt';
import { AgentState, NodeParamsBase } from '../types';
import { NodeType } from '../constants';
import { promptGroupId } from '../../../../prompt/local_prompt_object';

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
  state: AgentState;
  model: BaseChatModel;
}

export async function generateChatTitle({
  actionsClient,
  logger,
  savedObjectsClient,
  state,
  model,
}: GenerateChatTitleParams): Promise<Partial<AgentState>> {
  try {
    logger.debug(
      () => `${NodeType.GENERATE_CHAT_TITLE}: Node state:\n${JSON.stringify(state, null, 2)}`
    );

    const outputParser = new StringOutputParser();
    const prompt = await getPrompt({
      actionsClient,
      connectorId: state.connectorId,
      promptId: promptDictionary.chatTitle,
      promptGroupId: promptGroupId.aiAssistant,
      provider: state.llmType,
      savedObjectsClient,
    });
    const graph = GENERATE_CHAT_TITLE_PROMPT({ prompt, responseLanguage: state.responseLanguage })
      .pipe(model)
      .pipe(outputParser);

    const chatTitle = await graph.invoke({
      input: JSON.stringify(state.input, null, 2),
    });
    logger.debug(`chatTitle: ${chatTitle}`);

    return {
      chatTitle,
      lastNode: NodeType.GENERATE_CHAT_TITLE,
    };
  } catch (e) {
    return {
      // generate a chat title if there is an error in order to complete the graph
      // limit title to 60 characters
      chatTitle: (e.name ?? e.message ?? e.toString()).slice(0, 60),
      lastNode: NodeType.GENERATE_CHAT_TITLE,
    };
  }
}
