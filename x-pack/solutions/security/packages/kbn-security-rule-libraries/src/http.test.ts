/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServer } from 'node:http';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { send } from './http';

describe('send', () => {
  let server: Server;
  let url: string;

  beforeAll(async () => {
    server = createServer((_request, response) => {
      response.end(Buffer.alloc(1000, 'a'));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it('returns the whole response when no limit is set', async () => {
    const { body } = await send(url, { headers: {} });
    expect(body).toHaveLength(1000);
  });

  it('returns a response that fits within the limit', async () => {
    const { body } = await send(url, { headers: {}, maxBytes: 1000 });
    expect(body).toHaveLength(1000);
  });

  it('fails a response that is larger than the limit, without naming the address', async () => {
    const result = send(url, { headers: {}, maxBytes: 999 });

    await expect(result).rejects.toThrow('The response is larger than 999 bytes');
    await expect(result).rejects.not.toThrow(url);
  });
});
