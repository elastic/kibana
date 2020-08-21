/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import http from 'http';
import httpProxy from 'http-proxy';
import { ToolingLog } from '@kbn/dev-utils';
import getPort from 'get-port';

export const getHttpProxyServer = async (
  defaultKibanaTargetUrl: string,
  kbnTestServerConfig: any,
  log: ToolingLog
): Promise<http.Server> => {
  const proxy = httpProxy.createProxyServer({ secure: false, selfHandleResponse: false });

  const proxyPort = getProxyPort(kbnTestServerConfig);
  const proxyServer = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
    const targetUrl = new URL(req.url ?? defaultKibanaTargetUrl);

    if (targetUrl.hostname !== 'some.non.existent.com') {
      proxy.web(req, res, {
        target: `${targetUrl.protocol}//${targetUrl.hostname}:${targetUrl.port}`,
      });
    } else {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.write('error on call some.non.existent.com');
      res.end();
    }
  });

  let attempts = 0;
  let isSuccess = false;

  while (!isSuccess && attempts < 10) {
    const freePort = await getPort({ port: proxyPort });
    log.info('freePort ', freePort, 'getHttpProxyServer');
    if (freePort === proxyPort) {
      isSuccess = true;
    } else {
      attempts++;
      log.info('retry listening proxy on port', proxyPort, 'getHttpProxyServer');
      await delay(10000);
    }
  }

  proxyServer.listen(proxyPort);
  return proxyServer;
};

async function delay(ms: number) {
  // return await for better async stack trace support in case of errors.
  return await new Promise((resolve) => setTimeout(resolve, ms));
}

export const getProxyPort = (kbnTestServerConfig: any): number => {
  const proxyUrl = kbnTestServerConfig
    .find((val: string) => val.startsWith('--xpack.actions.proxyUrl='))
    .replace('--xpack.actions.proxyUrl=', '');

  const urlObject = new URL(proxyUrl);
  return Number(urlObject.port);
};
