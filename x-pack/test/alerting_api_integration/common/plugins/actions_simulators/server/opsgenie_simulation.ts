/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import http from 'http';

import { ProxyArgs, Simulator } from './simulator';

export class OpsgenieSimulator extends Simulator {
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
      return OpsgenieSimulator.sendErrorResponse(response);
    }

    return OpsgenieSimulator.sendResponse(response);
  }

  private static sendResponse(response: http.ServerResponse) {
    response.statusCode = 202;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(opsgenieSuccessResponse, null, 4));
  }

  private static sendErrorResponse(response: http.ServerResponse) {
    response.statusCode = 422;
    response.setHeader('Content-Type', 'application/json;charset=UTF-8');
    response.end(JSON.stringify(opsgenieFailedResponse, null, 4));
  }
}

export const opsgenieSuccessResponse = {
  result: 'Request will be processed',
  took: 0.107,
  requestId: '43a29c5c-3dbf-4fa4-9c26-f4f71023e120',
};

export const opsgenieFailedResponse = {
  result: 'error',
  errors: {
    message: 'failed',
  },
  took: 0.107,
  requestId: '43a29c5c-3dbf-4fa4-9c26-f4f71023e120',
};
