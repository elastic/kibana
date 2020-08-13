/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import httpProxy from 'http-proxy';

export const getHttpProxyServer = (
  targetUrl: string,
  onProxyResHandler: (proxyRes?: unknown, req?: unknown, res?: unknown) => void
): httpProxy => {
  const proxyServer = httpProxy.createProxyServer({
    target: targetUrl,
    secure: false,
    selfHandleResponse: false,
  });
  proxyServer.on('proxyRes', (proxyRes: unknown, req: unknown, res: unknown) => {
    onProxyResHandler(proxyRes, req, res);
  });
  return proxyServer;
};

export const getProxyUrl = (kbnTestServerConfig: any) => {
  const proxySlackSimulatorURL = kbnTestServerConfig
    .find((val: string) => val.startsWith('--xpack.actions.proxyUrl='))
    .replace('--xpack.actions.proxyUrl=', '');

  return new URL(proxySlackSimulatorURL);
};
