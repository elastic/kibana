/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpServiceStart, KibanaRequest } from '@kbn/core/server';
import { patchDetectionRule } from '.';

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

describe('patchDetectionRule', () => {
  it('scopes the self client to the approving user request (security finding S2)', async () => {
    const { http, asScoped } = createHttp(createResponse(200, '{"id":"rule-1"}'));

    await patchDetectionRule({ body: { id: 'rule-1' }, http, request, spaceId: 'default' });

    expect(asScoped).toHaveBeenCalledWith(request);
  });

  it('issues a PATCH against the public detection-engine rules route', async () => {
    const { http, fetch } = createHttp(createResponse(200, '{"id":"rule-1"}'));

    await patchDetectionRule({ body: { id: 'rule-1' }, http, request, spaceId: 'default' });

    expect(fetch).toHaveBeenCalledWith(
      '/api/detection_engine/rules',
      expect.objectContaining({ access: 'public', method: 'PATCH', version: '2023-10-31' })
    );
  });

  it('hands the rule patch over as an object, so the self client sets content-type and the route parses it', async () => {
    const { http, fetch } = createHttp(createResponse(200, '{"id":"rule-1"}'));

    await patchDetectionRule({
      body: { enabled: false, id: 'rule-1' },
      http,
      request,
      spaceId: 'default',
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ body: { enabled: false, id: 'rule-1' } })
    );
  });

  it('never pre-serializes the body, which the self client would forward unparsed', async () => {
    const { http, fetch } = createHttp(createResponse(200, '{"id":"rule-1"}'));

    await patchDetectionRule({ body: { id: 'rule-1' }, http, request, spaceId: 'default' });

    expect(typeof fetch.mock.calls[0][1].body).not.toBe('string');
  });

  it('prefixes the path with the space for a non-default space (S9)', async () => {
    const { http, fetch } = createHttp(createResponse(200, '{"id":"rule-1"}'));

    await patchDetectionRule({ body: { id: 'rule-1' }, http, request, spaceId: 'agent-3' });

    expect(fetch).toHaveBeenCalledWith('/s/agent-3/api/detection_engine/rules', expect.anything());
  });

  it('never lets the self client prepend the base path a second time', async () => {
    const { http, fetch } = createHttp(createResponse(200, '{"id":"rule-1"}'));

    await patchDetectionRule({ body: { id: 'rule-1' }, http, request, spaceId: 'agent-3' });

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ prependBasePath: false })
    );
  });

  it('returns the updated rule id and status on success', async () => {
    const { http } = createHttp(createResponse(200, '{"id":"rule-1"}'));

    const result = await patchDetectionRule({
      body: { id: 'rule-1' },
      http,
      request,
      spaceId: 'default',
    });

    expect(result).toEqual({ ruleId: 'rule-1', status: 200 });
  });

  it('returns the status without a rule id for a forbidden response (S2)', async () => {
    const { http } = createHttp(createResponse(403, 'forbidden'));

    const result = await patchDetectionRule({
      body: { id: 'rule-1' },
      http,
      request,
      spaceId: 'default',
    });

    expect(result).toEqual({ ruleId: undefined, status: 403 });
  });

  it('propagates transport errors so the caller can map them to a 500', async () => {
    const fetch = jest.fn().mockRejectedValue(new Error('boom'));
    const http = {
      selfClient: { asScoped: jest.fn().mockReturnValue({ fetch }) },
    } as unknown as HttpServiceStart;

    await expect(
      patchDetectionRule({ body: { id: 'rule-1' }, http, request, spaceId: 'default' })
    ).rejects.toThrow('boom');
  });
});
