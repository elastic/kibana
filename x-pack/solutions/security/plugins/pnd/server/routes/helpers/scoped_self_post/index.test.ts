/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpServiceStart, KibanaRequest } from '@kbn/core/server';

import { scopedSelfPost } from '.';

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

const params = {
  body: { hello: 'world' },
  path: '/api/x',
  request,
  spaceId: 'default',
  version: '1',
};

describe('scopedSelfPost', () => {
  it('scopes the self client to the incoming request (security finding S3/D7)', async () => {
    const { http, asScoped } = createHttp(createResponse(200, '{}'));

    await scopedSelfPost({ ...params, http });

    expect(asScoped).toHaveBeenCalledWith(request);
  });

  it('prefixes the path with the space for a non-default space', async () => {
    const { http, fetch } = createHttp(createResponse(200, '{}'));

    await scopedSelfPost({ ...params, http, spaceId: 'agent-1' });

    expect(fetch).toHaveBeenCalledWith('/s/agent-1/api/x', expect.anything());
  });

  it('does not prefix the path in the default space', async () => {
    const { http, fetch } = createHttp(createResponse(200, '{}'));

    await scopedSelfPost({ ...params, http });

    expect(fetch).toHaveBeenCalledWith('/api/x', expect.anything());
  });

  it('hands the body over as an object, never as a JSON string', async () => {
    const { http, fetch } = createHttp(createResponse(200, '{}'));

    await scopedSelfPost({ ...params, http });

    const [, options] = fetch.mock.calls[0];
    expect(options.body).toEqual({ hello: 'world' });
    expect(typeof options.body).not.toEqual('string');
  });

  it('posts with rawResponse so a non-2xx is a status rather than a throw', async () => {
    const { http, fetch } = createHttp(createResponse(200, '{}'));

    await scopedSelfPost({ ...params, http });

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        asResponse: true,
        method: 'POST',
        prependBasePath: false,
        rawResponse: true,
      })
    );
  });

  it('defaults to the public access surface', async () => {
    const { http, fetch } = createHttp(createResponse(200, '{}'));

    await scopedSelfPost({ ...params, http });

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ access: 'public' })
    );
  });

  it('forwards the internal access surface, which stamps the internal-origin header', async () => {
    const { http, fetch } = createHttp(createResponse(200, '{}'));

    await scopedSelfPost({ ...params, access: 'internal', http });

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ access: 'internal' })
    );
  });

  it('sends no version header for an unversioned target route', async () => {
    const { http, fetch } = createHttp(createResponse(200, '{}'));

    await scopedSelfPost({ ...params, http, version: undefined });

    expect(fetch.mock.calls[0][1].version).toBeUndefined();
  });

  it('forwards the requested timeout', async () => {
    const { http, fetch } = createHttp(createResponse(200, '{}'));

    await scopedSelfPost({ ...params, http, timeout: 120_000 });

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ timeout: 120_000 })
    );
  });

  it('parses the JSON body on a 2xx response', async () => {
    const { http } = createHttp(createResponse(200, '{"value":42}'));

    expect(await scopedSelfPost<{ value: number }>({ ...params, http })).toEqual({
      body: { value: 42 },
      status: 200,
    });
  });

  it('returns an undefined body for an empty 2xx response', async () => {
    const { http } = createHttp(createResponse(200, ''));

    expect(await scopedSelfPost({ ...params, http })).toEqual({ body: undefined, status: 200 });
  });

  it('returns the status without a body for a non-2xx response', async () => {
    const { http } = createHttp(createResponse(404, 'not found'));

    expect(await scopedSelfPost({ ...params, http })).toEqual({ body: undefined, status: 404 });
  });

  it('propagates transport errors so the caller can map them to a 500', async () => {
    const fetch = jest.fn().mockRejectedValue(new Error('boom'));
    const http = {
      selfClient: { asScoped: jest.fn().mockReturnValue({ fetch }) },
    } as unknown as HttpServiceStart;

    await expect(scopedSelfPost({ ...params, http })).rejects.toThrow('boom');
  });
});
