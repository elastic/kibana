/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';

const REQUEST_TIMEOUT_MS = 60_000;

export interface HttpResponse {
  status: number;
  statusText: string;
  body: Buffer;
}

export const send = (
  url: string,
  {
    method = 'GET',
    headers,
    body,
  }: { method?: string; headers: Record<string, string>; body?: Buffer }
): Promise<HttpResponse> =>
  new Promise((resolve, reject) => {
    const doRequest = url.startsWith('https:') ? httpsRequest : httpRequest;
    const req = doRequest(url, { method, headers, timeout: REQUEST_TIMEOUT_MS }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('error', reject);
      res.on('end', () =>
        resolve({
          status: res.statusCode ?? 0,
          statusText: res.statusMessage ?? '',
          body: Buffer.concat(chunks),
        })
      );
    });
    req.on('timeout', () => req.destroy(new Error(`Request to ${url} timed out`)));
    req.on('error', reject);
    req.end(body);
  });

export const ensureOk = ({ status, statusText, body }: HttpResponse): Buffer => {
  if (status < 200 || status >= 300) {
    throw new Error(`HTTP ${status} ${statusText}: ${body.toString().slice(0, 200)}`);
  }
  return body;
};
