/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpServiceStart, KibanaRequest } from '@kbn/core/server';
import { scopedSelfGet } from '.';

const createResponse = (status: number, text: string) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    text: jest.fn().mockResolvedValue(text),
  } as unknown as Response);

const createHttp = (response: Response) => {
  const fetch = jest.fn().mockResolvedValue({ response });
  const asScoped = jest.fn().mockReturnValue({ fetch });
  return { http: { selfClient: { asScoped } } as unknown as HttpServiceStart, asScoped, fetch };
};

const request = {} as KibanaRequest;

describe('scopedSelfGet', () => {
  it('scopes the self client to the incoming request (security finding S3)', async () => {
    const { http, asScoped } = createHttp(createResponse(200, '{}'));

    await scopedSelfGet({ http, path: '/api/x', request, spaceId: 'default', version: '1' });

    expect(asScoped).toHaveBeenCalledWith(request);
  });

  it('prefixes the path with the space for a non-default space', async () => {
    const { http, fetch } = createHttp(createResponse(200, '{}'));

    await scopedSelfGet({ http, path: '/api/x', request, spaceId: 'agent-3', version: '1' });

    expect(fetch).toHaveBeenCalledWith('/s/agent-3/api/x', expect.anything());
  });

  it('does not prefix the path in the default space', async () => {
    const { http, fetch } = createHttp(createResponse(200, '{}'));

    await scopedSelfGet({ http, path: '/api/x', request, spaceId: 'default', version: '1' });

    expect(fetch).toHaveBeenCalledWith('/api/x', expect.anything());
  });

  it('never lets the self client prepend the base path a second time', async () => {
    const { http, fetch } = createHttp(createResponse(200, '{}'));

    await scopedSelfGet({ http, path: '/api/x', request, spaceId: 'agent-3', version: '1' });

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ prependBasePath: false })
    );
  });

  it('parses the JSON body on a 2xx response', async () => {
    const { http } = createHttp(createResponse(200, '{"value":42}'));

    const result = await scopedSelfGet<{ value: number }>({
      http,
      path: '/api/x',
      request,
      spaceId: 'default',
      version: '1',
    });

    expect(result).toEqual({ body: { value: 42 }, status: 200 });
  });

  it('returns an undefined body for an empty 2xx response', async () => {
    const { http } = createHttp(createResponse(200, ''));

    const result = await scopedSelfGet({
      http,
      path: '/api/x',
      request,
      spaceId: 'default',
      version: '1',
    });

    expect(result).toEqual({ body: undefined, status: 200 });
  });

  it('returns the status without a body for a non-2xx response', async () => {
    const { http } = createHttp(createResponse(403, 'forbidden'));

    const result = await scopedSelfGet({
      http,
      path: '/api/x',
      request,
      spaceId: 'default',
      version: '1',
    });

    expect(result).toEqual({ body: undefined, status: 403 });
  });

  it('propagates transport errors so the caller can map them to a 500', async () => {
    const fetch = jest.fn().mockRejectedValue(new Error('boom'));
    const http = {
      selfClient: { asScoped: jest.fn().mockReturnValue({ fetch }) },
    } as unknown as HttpServiceStart;

    await expect(
      scopedSelfGet({ http, path: '/api/x', request, spaceId: 'default', version: '1' })
    ).rejects.toThrow('boom');
  });
});
