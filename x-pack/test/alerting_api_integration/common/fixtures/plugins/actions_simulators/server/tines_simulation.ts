/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import http from 'http';

import { ProxyArgs, Simulator } from './simulator';

export class TinesSimulator extends Simulator {
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
      return TinesSimulator.sendErrorResponse(response);
    }
    return TinesSimulator.sendResponse(request, response);
  }

  private static sendResponse(request: http.IncomingMessage, response: http.ServerResponse) {
    response.statusCode = 202;
    response.setHeader('Content-Type', 'application/json');
    let body;
    if (request.url?.match('/stories')) {
      body = tinesStoriesResponse;
    } else if (request.url?.match('/agents')) {
      body = tinesAgentsResponse;
    } else if (request.url?.match('/webhook')) {
      body = tinesWebhookSuccessResponse;
    }
    response.end(JSON.stringify(body, null, 4));
  }

  private static sendErrorResponse(response: http.ServerResponse) {
    response.statusCode = 422;
    response.setHeader('Content-Type', 'application/json;charset=UTF-8');
    response.end(JSON.stringify(tinesFailedResponse, null, 4));
  }
}

export const tinesStory1 = { name: 'story 1', id: 1, team: 'team' };
export const tinesStory2 = { name: 'story 2', id: 2, team: 'team' };

export const tinesAgentWebhook = {
  name: 'agent 1',
  id: 1,
  story_id: 1,
  options: { secret: 'secret', path: 'path' },
  type: 'Agents::WebhookAgent',
};
export const tinesAgentNotWebhook = {
  name: 'agent 1',
  id: 1,
  story_id: 1,
  options: { url: 'url' },
  type: 'Agents::HttpRequest',
};

export const tinesStoriesResponse = {
  stories: [tinesStory1, tinesStory2],
  meta: {
    next_page: null,
  },
};

export const tinesAgentsResponse = {
  agents: [tinesAgentWebhook, tinesAgentNotWebhook],
  meta: {
    next_page: null,
  },
};

export const tinesWebhookSuccessResponse = {
  status: 'ok',
};

export const tinesFailedResponse = {
  result: 'error',
  errors: {
    message: 'failed',
  },
  took: 0.107,
  requestId: '43a29c5c-3dbf-4fa4-9c26-f4f71023e120',
};
