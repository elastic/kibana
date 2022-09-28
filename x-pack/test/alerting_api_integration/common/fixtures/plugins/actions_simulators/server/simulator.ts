/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import getPort from 'get-port';
import http from 'http';
import { getDataFromPostRequest } from './data_handler';

export abstract class Simulator {
  private _requestData: Record<string, unknown> | undefined;
  protected server: http.Server;

  constructor() {
    this.server = http.createServer(this.baseHandler);
  }

  private baseHandler = async (request: http.IncomingMessage, response: http.ServerResponse) => {
    const data = await getDataFromPostRequest(request);
    this._requestData = data;

    return this.handler(request, response, data);
  };

  protected abstract handler(
    request: http.IncomingMessage,
    response: http.ServerResponse,
    data: Record<string, unknown>
  ): Promise<void>;

  public async start() {
    const port = await getPort({ port: getPort.makeRange(9000, 9100) });
    if (!this.server.listening) {
      this.server.listen(port);
    }
    const url = `http://localhost:${port}`;

    return url;
  }

  public close() {
    this.server.close();
  }

  public get requestData() {
    return this._requestData;
  }
}
