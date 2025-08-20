/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { runAgent } from './run_agent';
import type { AIMessageChunk } from '@langchain/core/messages';
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { BaseLanguageModelInput } from '@langchain/core/language_models/base';
import type { BaseChatModelCallOptions } from '@langchain/core/language_models/chat_models';
import type { Runnable } from '@langchain/core/runnables';

class ModelForTesting {
  private result: string;

  withConfig: jest.Mock;
  invoke: jest.Mock;

  constructor(result: string) {
    this.result = result;

    this.withConfig = jest.fn().mockReturnThis();
    this.invoke = jest.fn().mockResolvedValue(new AIMessage(this.result));
  }
}

describe('run agent', () => {
  const mockLoggerFactory = loggingSystemMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('invoke called with correct params', async () => {
    const model = new ModelForTesting('This is the response') as unknown as Runnable<
      BaseLanguageModelInput,
      AIMessageChunk,
      BaseChatModelCallOptions
    >;
    const abortController = new AbortController();
    const messages = [
      new SystemMessage('You are a system prompt'),
      new HumanMessage('["some","json","string"]'),
    ];
    const stateUpdate = await runAgent({
      logger: mockLoggerFactory.get(),
      model,
      state: {
        messages,
      },
      config: {
        signal: abortController.signal,
      },
    });

    expect(stateUpdate).toEqual(
      expect.objectContaining({
        lastNode: 'agent',
        messages: [new AIMessage('This is the response')],
      })
    );
    expect(model.withConfig).toHaveBeenCalledTimes(1);
    expect(model.withConfig).toHaveBeenCalledWith({
      tags: ['agent_run'],
      signal: abortController.signal,
    });
    expect(model.invoke).toBeCalledTimes(1);
    expect(model.invoke).toHaveBeenCalledWith([
      new SystemMessage('You are a system prompt'),
      new HumanMessage('["some","json","string"].'),
    ]);
  });
});
