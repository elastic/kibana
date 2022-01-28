/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
        switch (data) {
          case 'success':
            response.statusCode = 200;
            response.end('OK');
            return;
          case 'respond-with-40x':
            response.statusCode = 400;
            response.end('Error');
            return;
          case 'respond-with-429':
            response.statusCode = 429;
            response.end('Error');
            return;
          case 'respond-with-502':
            response.statusCode = 502;
            response.end('Error');
            return;
        }
      });
    } else {
      response.writeHead(400, { 'Content-Type': 'text/plain' });
      response.end('Not supported http method to request xMatters simulator');
      return;
    }
  });
}
