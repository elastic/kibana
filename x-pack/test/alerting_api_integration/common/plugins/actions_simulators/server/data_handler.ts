/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import http from 'http';

export const getDataFromRequest = async (request: http.IncomingMessage) => {
  if (request.method !== 'POST' && request.method !== 'PATCH') {
    return {};
  }

  const buffers = [];

  for await (const chunk of request) {
    buffers.push(chunk);
  }

  return JSON.parse(Buffer.concat(buffers).toString());
};
