/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import http from 'http';

export const initPlugin = async () => http.createServer(handler);

const sendResponse = (response: http.ServerResponse, data: any) => {
  response.statusCode = 200;
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(data, null, 4));
};

const handler = (request: http.IncomingMessage, response: http.ServerResponse) => {
  if (request.method === 'POST') {
    return sendResponse(response, {
      id: 'wowzeronza',
      name: 'ET-69',
      createdDate: '2021-06-01T17:29:51.092Z',
    });
  }

  if (request.method === 'PATCH') {
    return sendResponse(response, {
      id: 'wowzeronza',
      name: 'ET-69',
      modifiedDate: '2021-06-01T17:29:51.092Z',
    });
  }

  // Return an 400 error if http method is not supported
  response.statusCode = 400;
  response.setHeader('Content-Type', 'application/json');
  response.end('Not supported http method to request swimlane simulator');
};
