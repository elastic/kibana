/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import http from 'http';

export const getDataFromPostRequest = async (request: http.IncomingMessage) => {
  let data: Record<string, unknown> = {};

  if (request.method === 'POST') {
    const buffers = [];

    for await (const chunk of request) {
      buffers.push(chunk);
    }

    data = JSON.parse(Buffer.concat(buffers).toString());
  }

  return data;
};
