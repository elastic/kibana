/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import http from 'http';

import { ProxyArgs, Simulator } from './simulator';

export class D3SecuritySimulator extends Simulator {
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
      return D3SecuritySimulator.sendErrorResponse(response);
    }

    return D3SecuritySimulator.sendResponse(response);
  }

  private static sendResponse(response: http.ServerResponse) {
    response.statusCode = 202;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(d3SecuritySuccessResponse, null, 4));
  }

  private static sendErrorResponse(response: http.ServerResponse) {
    response.statusCode = 422;
    response.setHeader('Content-Type', 'application/json;charset=UTF-8');
    response.end(JSON.stringify(d3SecurityFailedResponse, null, 4));
  }
}

export const d3SecuritySuccessResponse = {
  refid: '80be4a0d-5f0e-4d6c-b00e-8cb918f7df1f',
};
export const d3SecurityFailedResponse = {
  error: {
    statusMessage: 'Bad job',
  },
};
