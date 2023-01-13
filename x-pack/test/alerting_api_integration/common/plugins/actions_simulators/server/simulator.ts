/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import getPort from 'get-port';
import http from 'http';
import httpProxy from 'http-proxy';
import { getProxyPort } from '../../../lib/get_proxy_server';
import { getDataFromRequest } from './data_handler';

export interface ProxyArgs {
  config: string;
  proxyHandler?: (proxyRes?: unknown, req?: unknown, res?: unknown) => void;
}

export abstract class Simulator {
  private _requestData: Record<string, unknown> | undefined;
  private _requestUrl: string | undefined;
  private proxyServer: httpProxy | undefined;
  private readonly proxyArgs: ProxyArgs | undefined;
  protected server: http.Server;

  constructor(proxy?: ProxyArgs) {
    this.server = http.createServer(this.baseHandler);

    if (proxy) {
      this.proxyArgs = proxy;
    }
  }

  private createAndStartHttpProxyServer = (targetUrl: string) => {
    if (!this.proxyArgs) {
      return;
    }

    this.proxyServer = httpProxy.createProxyServer({
      target: targetUrl,
      secure: false,
      selfHandleResponse: false,
    });

    this.proxyServer.on('proxyRes', (proxyRes: unknown, req: unknown, res: unknown) => {
      if (this.proxyArgs?.proxyHandler) {
        this.proxyArgs.proxyHandler(proxyRes, req, res);
      }
    });

    const proxyPort = getProxyPort(this.proxyArgs.config);
    this.proxyServer.listen(proxyPort);
  };

  private baseHandler = async (request: http.IncomingMessage, response: http.ServerResponse) => {
    const data = await getDataFromRequest(request);
    this._requestData = data;
    this._requestUrl = new URL(request.url ?? '', `http://${request.headers.host}`).toString();

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

    this.createAndStartHttpProxyServer(url);
    return url;
  }

  public close() {
    this.proxyServer?.close();
    this.server.close();
  }

  public get requestData() {
    return this._requestData;
  }

  public get requestUrl() {
    return this._requestUrl;
  }
}
