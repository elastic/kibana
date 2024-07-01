/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServer } from '@mswjs/http-middleware';

import { http, bypass, HttpResponse } from 'msw';

import { usageAPIHandler } from './usage.handler.mock';

export const setupMockServer = ({ debug = false }: { debug?: boolean } = {}) => {
  const server = createServer(usageAPIHandler);

  //   if (debug) {
  //     // Debug: log all requests to the console
  //     server.events.on('request:start', async ({ request }) => {
  //       const payload = await request.clone().text();
  //       // eslint-disable-next-line no-console
  //       console.log('MSW intercepted request:', request.method, request.url, payload);
  //     });
  //     server.events.on('response:mocked', async ({ request, response }) => {
  //       const body = await response.json();
  //       // eslint-disable-next-line no-console
  //       console.log(
  //         '%s %s received %s %s %s',
  //         request.method,
  //         request.url,
  //         response.status,
  //         response.statusText,
  //         JSON.stringify(body, null, 2)
  //       );
  //     });
  //   }
  return server;
};
