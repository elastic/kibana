/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNlToEsqlAgent } from './nl_to_esql_agent';
import type { KibanaRequest } from '@kbn/core/server';
import type { ExecuteConnectorRequestBody } from '@kbn/elastic-assistant-common';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { loggerMock } from '@kbn/logging-mocks';
import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import { Observable } from 'rxjs';
import type { ChatCompletionMessageEvent } from '@kbn/inference-common';
import { ChatCompletionEventType } from '@kbn/inference-common';
import { naturalLanguageToEsql } from '@kbn/inference-plugin/server';
import type { GenerateEsqlAnnotation } from '../../state';

jest.mock('@kbn/inference-plugin/server', () => ({
  naturalLanguageToEsql: jest.fn(),
}));

describe('nl to esql agent', () => {
  const request = {
    body: {
      isEnabledKnowledgeBase: false,
      alertsIndexPattern: '.alerts-security.alerts-default',
      allow: ['@timestamp', 'cloud.availability_zone', 'user.name'],
      allowReplacement: ['user.name'],
      replacements: { key: 'value' },
      size: 20,
    },
  } as unknown as KibanaRequest<unknown, unknown, ExecuteConnectorRequestBody>;
  const logger = loggerMock.create();
  const inference = {
    getClient: jest.fn(),
  } as unknown as InferenceServerStart;
  const connectorId = 'fake-connector';
  const rest = {
    logger,
    request,
    inference,
    connectorId,
    tools: [],
  };

  const sampleState: typeof GenerateEsqlAnnotation.State = {
    input: {
      question: 'test',
    },
    messages: [],
    validateEsqlResults: [],
    maximumValidationAttempts: 3,
    maximumEsqlGenerationAttempts: 3,
    selectedIndexPattern: '',
  };

  const sampleMessageLog = [
    new HumanMessage({
      content: 'Human message hello',
    }),
    new AIMessage({
      content: 'AI message hello',
      tool_calls: [
        {
          name: 'sampleTool',
          id: '123',
          args: {},
        },
      ],
    }),
    new ToolMessage({
      tool_call_id: '123',
      content: 'Tool message hello',
    }),
  ];

  it('calls naturalLanguageToEsql with the correct parameters', async () => {
    const agent = getNlToEsqlAgent({ ...rest });
    (naturalLanguageToEsql as unknown as jest.Mock).mockReturnValue(
      new Observable((subscriber) => {
        const result: ChatCompletionMessageEvent = {
          content: 'Hello, World!',
          type: ChatCompletionEventType.ChatCompletionMessage,
          toolCalls: [],
        };
        subscriber.next(result);
        subscriber.complete();
      })
    );

    const result = await agent({
      ...sampleState,
      messages: sampleMessageLog,
    });

    expect(naturalLanguageToEsql).toHaveBeenCalledTimes(1);
    expect(naturalLanguageToEsql).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            content: 'Human message hello',
          }),
          expect.objectContaining({
            content: 'AI message hello',
          }),
          expect.objectContaining({
            name: '123',
            response: {
              response: 'Tool message hello',
            },
          }),
        ]),
      })
    );
    expect((result.update as { messages: unknown[] })?.messages[0]).toBeInstanceOf(AIMessage);
  });
});
