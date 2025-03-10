/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom } from 'rxjs';
import {
  langchainMessageToInferenceMessage,
  langchainToolsToInferenceTools,
  nlToEsqlTaskEventToLangchainMessage,
} from '@kbn/elastic-assistant-common';
import type { StructuredToolInterface } from '@langchain/core/tools';
import type { KibanaRequest } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { naturalLanguageToEsql } from '@kbn/inference-plugin/server';
import type { Logger } from '@kbn/core/server';
import type { ChatCompletionMessageEvent } from '@kbn/inference-common';
import { Command } from '@langchain/langgraph';
import type { EsqlSelfHealingAnnotation } from './state';

export const getNlToEsqlAgent = ({
  connectorId,
  inference,
  logger,
  request,
  tools,
}: {
  connectorId: string;
  inference: InferenceServerStart;
  logger: Logger;
  request: KibanaRequest;
  tools: StructuredToolInterface[];
}) => {
  return async (state: typeof EsqlSelfHealingAnnotation.State) => {
    const { messages: stateMessages } = state;

    const inferenceMessages = stateMessages.map(langchainMessageToInferenceMessage);

    const result = (await lastValueFrom(
      naturalLanguageToEsql({
        client: inference.getClient({ request }),
        connectorId,
        functionCalling: 'auto',
        logger,
        tools: langchainToolsToInferenceTools(tools),
        messages: inferenceMessages,
      })
    )) as ChatCompletionMessageEvent;

        return new Command({
            update:{
                messages : [nlToEsqlTaskEventToLangchainMessage(result)],
                maximumLLMCalls: state.maximumLLMCalls - 1
            }
        })
    }
}