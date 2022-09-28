/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import http from 'http';

import { Simulator } from './simulator';

export class OpsgenieSimulator extends Simulator {
  constructor(private readonly returnError: boolean = false) {
    super();
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
    response.setHeader('Content-Type', 'application/json;charset=UTF-8');
    response.end(
      JSON.stringify(
        {
          result: 'Request will be processed',
          took: 0.107,
          requestId: '43a29c5c-3dbf-4fa4-9c26-f4f71023e120',
        },
        null,
        4
      )
    );
  }

  private static sendErrorResponse(response: http.ServerResponse) {
    response.statusCode = 422;
    response.setHeader('Content-Type', 'application/json;charset=UTF-8');
    response.end(
      JSON.stringify(
        {
          result: 'error',
          errors: {
            message: 'failed',
          },
          took: 0.107,
          requestId: '43a29c5c-3dbf-4fa4-9c26-f4f71023e120',
        },
        null,
        4
      )
    );
  }
}
