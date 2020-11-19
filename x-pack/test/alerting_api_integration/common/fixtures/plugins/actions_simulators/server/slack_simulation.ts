/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import http from 'http';

export async function initPlugin() {
  return http.createServer((request, response) => {
    if (request.method === 'POST') {
      let data = '';
      request.on('data', (chunk) => {
        data += chunk;
      });
      request.on('end', () => {
        const body = JSON.parse(data);
        const text = body && body.text;

        if (text == null) {
          response.statusCode = 400;
          response.end('bad request to slack simulator');
          return;
        }

        switch (text) {
          case 'success': {
            response.statusCode = 200;
            response.end('ok');
            return;
          }
          case 'no_text':
            response.statusCode = 400;
            response.end('no_text');
            return;

          case 'invalid_payload':
            response.statusCode = 400;
            response.end('invalid_payload');
            return;

          case 'invalid_token':
            response.statusCode = 403;
            response.end('invalid_token');
            return;

          case 'status_500':
            response.statusCode = 500;
            response.end('simulated slack 500 response');
            return;

          case 'rate_limit':
            const res = {
              retry_after: 1,
              ok: false,
              error: 'rate_limited',
            };

            response.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': '1' });
            response.write(JSON.stringify(res));
            response.end();
            return;
        }
        response.statusCode = 400;
        response.end('unknown request to slack simulator');
      });
    } else {
      response.writeHead(400, { 'Content-Type': 'text/plain' });
      response.end('Not supported http method to request slack simulator');
    }
  });
}
