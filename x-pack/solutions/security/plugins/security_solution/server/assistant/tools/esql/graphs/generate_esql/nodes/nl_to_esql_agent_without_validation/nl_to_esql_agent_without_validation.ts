/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom } from 'rxjs';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { naturalLanguageToEsql } from '@kbn/inference-plugin/server';
import type { ChatCompletionMessageEvent } from '@kbn/inference-common';
import { Command } from '@langchain/langgraph';
import { responseToLangchainMessage } from '@kbn/inference-langchain/src/chat_model/from_inference';
import type { GenerateEsqlAnnotation } from '../../state';

export const getNlToEsqlAgentWithoutValidation = ({
  connectorId,
  inference,
  logger,
  request,
}: {
  connectorId: string;
  inference: InferenceServerStart;
  logger: Logger;
  request: KibanaRequest;
}) => {
  return async (state: typeof GenerateEsqlAnnotation.State) => {
    const { input } = state;

    if (!input) {
      throw new Error('Input is required');
    }

    const result = (await lastValueFrom(
      naturalLanguageToEsql({
        client: inference.getClient({ request }),
        connectorId,
        logger,
        input: input.question,
        system: "Just produce the query fenced by the esql tag. Don't explain it.",
      })
    )) as ChatCompletionMessageEvent;

    return new Command({
      update: {
        messages: [responseToLangchainMessage(result)],
      },
    });
  };
};
