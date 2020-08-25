/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import httpProxy from 'http-proxy';

export const getHttpProxyServer = async (
  targetUrl: string,
  kbnTestServerConfig: any,
  onProxyResHandler: (proxyRes?: unknown, req?: unknown, res?: unknown) => void
): Promise<httpProxy> => {
  const proxyServer = httpProxy.createProxyServer({
    target: targetUrl,
    secure: false,
    selfHandleResponse: false,
  });

  proxyServer.on('proxyRes', (proxyRes: unknown, req: unknown, res: unknown) => {
    onProxyResHandler(proxyRes, req, res);
  });

  const proxyPort = getProxyPort(kbnTestServerConfig);
  proxyServer.listen(proxyPort);

  return proxyServer;
};

export const getProxyPort = (kbnTestServerConfig: any): number => {
  const proxyUrl = kbnTestServerConfig
    .find((val: string) => val.startsWith('--xpack.actions.proxyUrl='))
    .replace('--xpack.actions.proxyUrl=', '');

  const urlObject = new URL(proxyUrl);
  return Number(urlObject.port);
};
