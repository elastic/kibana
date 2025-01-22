/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { StringOutputParser } from '@langchain/core/output_parsers';

import { ChatPromptTemplate } from '@langchain/core/prompts';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AgentState, NodeParamsBase } from '../types';
import { NodeType } from '../constants';

export const GENERATE_CHAT_TITLE_PROMPT = (responseLanguage: string, llmType?: string) =>
  llmType === 'bedrock'
    ? ChatPromptTemplate.fromMessages([
        [
          'system',
          `You are a helpful assistant for Elastic Security. Assume the following user message is the start of a conversation between you and a user; give this conversation a title based on the content below. DO NOT UNDER ANY CIRCUMSTANCES wrap this title in single or double quotes. This title is shown in a list of conversations to the user, so title it for the user, not for you. Please create the title in ${responseLanguage}. Respond with the title only with no other text explaining your response. As an example, for the given MESSAGE, this is the TITLE:

    MESSAGE: I am having trouble with the Elastic Security app.
    TITLE: Troubleshooting Elastic Security app issues
    `,
        ],
        ['human', '{input}'],
      ])
    : llmType === 'gemini'
    ? ChatPromptTemplate.fromMessages([
        [
          'system',
          `You are a title generator for a helpful assistant for Elastic Security. Assume the following human message is the start of a conversation between you and a human. Generate a relevant conversation title for the human's message in plain text. Make sure the title is formatted for the user, without using quotes or markdown. The title should clearly reflect the content of the message and be appropriate for a list of conversations. Please create the title in ${responseLanguage}. Respond only with the title. As an example, for the given MESSAGE, this is the TITLE:

    MESSAGE: I am having trouble with the Elastic Security app.
    TITLE: Troubleshooting Elastic Security app issues
    `,
        ],
        ['human', '{input}'],
      ])
    : ChatPromptTemplate.fromMessages([
        [
          'system',
          `You are a helpful assistant for Elastic Security. Assume the following user message is the start of a conversation between you and a user; give this conversation a title based on the content below. DO NOT UNDER ANY CIRCUMSTANCES wrap this title in single or double quotes. This title is shown in a list of conversations to the user, so title it for the user, not for you. Please create the title in ${responseLanguage}. As an example, for the given MESSAGE, this is the TITLE:

    MESSAGE: I am having trouble with the Elastic Security app.
    TITLE: Troubleshooting Elastic Security app issues
    `,
        ],
        ['human', '{input}'],
      ]);

export interface GenerateChatTitleParams extends NodeParamsBase {
  state: AgentState;
  model: BaseChatModel;
}

export async function generateChatTitle({
  logger,
  state,
  model,
}: GenerateChatTitleParams): Promise<Partial<AgentState>> {
  try {
    logger.debug(
      () => `${NodeType.GENERATE_CHAT_TITLE}: Node state:\n${JSON.stringify(state, null, 2)}`
    );

    const outputParser = new StringOutputParser();
    const graph = GENERATE_CHAT_TITLE_PROMPT(state.responseLanguage, state.llmType)
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
