/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import http from 'http';

import { ProxyArgs, Simulator } from './simulator';

export class OpenAISimulator extends Simulator {
  private readonly returnError: boolean;

  constructor({ returnError = false, proxy }: { returnError?: boolean; proxy?: ProxyArgs }) {
    super(proxy);

    this.returnError = returnError;
  }

  public async handler(
    request: http.IncomingMessage,
    response: http.ServerResponse,
    data: Record<string, unknown>
  ) {
    if (this.returnError) {
      return OpenAISimulator.sendErrorResponse(response);
    }

    return OpenAISimulator.sendResponse(response);
  }

  private static sendResponse(response: http.ServerResponse) {
    response.statusCode = 202;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(genAiSuccessResponse, null, 4));
  }

  private static sendErrorResponse(response: http.ServerResponse) {
    response.statusCode = 422;
    response.setHeader('Content-Type', 'application/json;charset=UTF-8');
    response.end(JSON.stringify(genAiFailedResponse, null, 4));
  }
}

export const genAiSuccessResponse = {
  id: 'chatcmpl-7Gruzw7iTrb9X5mmQ533cSOGZU5Kh',
  object: 'chat.completion',
  created: 1684254865,
  model: 'gpt-3.5-turbo-0301',
  usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
  choices: [
    {
      message: { role: 'assistant', content: 'Hello there! How may I assist you today?' },
      finish_reason: 'stop',
      index: 0,
    },
  ],
};
export const genAiFailedResponse = {
  error: {
    message: 'The model `bad model` does not exist',
    type: 'invalid_request_error',
    param: null,
    code: null,
  },
};
