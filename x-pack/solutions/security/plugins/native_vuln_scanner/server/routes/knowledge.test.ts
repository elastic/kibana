/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'querystring';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { MAX_KNOWLEDGE_ADVISORIES } from '@kbn/cloud-security-posture-common/native_vuln_scanner/constants';
import { KNOWLEDGE_INDEX } from '../lib/knowledge';
import { registerKnowledgeRoute } from './knowledge';
import { createContext, createResponse, setupRoute } from './route_harness.mock';

const CVE_ID = 'cve:ubuntu:noble:CVE-2026-0001';
const ADVISORY_ID = 'adv:redhat:9:RHSA-2026:0001';

const setup = (licenseType: 'enterprise' | 'basic' = 'enterprise') => {
  const mget = jest.fn();
  const route = setupRoute(registerKnowledgeRoute, 'get', { licenseType });
  const context = createContext({ elasticsearch: { client: { asCurrentUser: { mget } } } });
  return { ...route, mget, context };
};

const run = async (
  { handler, context }: ReturnType<typeof setup>,
  params: { knowledge_id: string } = { knowledge_id: CVE_ID },
  query: { advisory_ids?: string[] } = {}
) => {
  const request = httpServerMock.createKibanaRequest({ params, query });
  const response = createResponse();
  await handler(context, request, response);
  return response;
};

interface Validator {
  validate: (value: unknown) => unknown;
}

/**
 * Parses a real query string the way the HTTP layer does (one occurrence of a key is a string,
 * repeats are an array), runs it through the route's query schema, then calls the handler with
 * the validated query, so a schema that rejects what a browser sends fails here.
 */
const runWithQueryString = async (ctx: ReturnType<typeof setup>, queryString: string) => {
  const { query } = (ctx.versionConfig.validate as unknown as { request: { query: Validator } })
    .request;
  const validated = query.validate(parse(queryString)) as { advisory_ids?: string | string[] };
  const request = httpServerMock.createKibanaRequest({
    params: { knowledge_id: CVE_ID },
    query: validated,
  });
  const response = createResponse();
  await ctx.handler(ctx.context, request, response);
  return response;
};

const hit = (id: string, source: object) => ({ _id: id, found: true, _source: source });

describe('GET knowledge', () => {
  it('is an internal route that needs the CNVM read privilege', () => {
    const { routeOptions } = setup();
    expect(routeOptions.access).toBe('internal');
    expect(routeOptions.path).toBe('/internal/native_vuln_scanner/knowledge/{knowledge_id}');
    expect(routeOptions.security.authz.requiredPrivileges).toEqual(['cloud-security-posture-read']);
  });

  it('answers 403 LICENSE_REQUIRED below Enterprise and reads nothing', async () => {
    const ctx = setup('basic');
    const response = await run(ctx);
    expect(response.forbidden).toHaveBeenCalledWith({
      body: expect.objectContaining({ attributes: { code: 'LICENSE_REQUIRED' } }),
    });
    expect(ctx.mget).not.toHaveBeenCalled();
  });

  it.each([
    'cve:debian:noble:CVE-2026-0001',
    'cve:ubuntu:noble:',
    'cve:ubuntu:CVE-2026-0001',
    'cve:ubuntu::CVE-2026-0001',
    'cve:ubuntu:Noble:CVE-2026-0001',
    `cve:ubuntu:${'a'.repeat(17)}:CVE-2026-0001`,
    'foo:ubuntu:noble:CVE-2026-0001',
    'cve:ubuntu:noble:CVE 2026',
    `cve:ubuntu:noble:${'A'.repeat(65)}`,
  ])('rejects the id %s', (id) => {
    const { versionConfig } = setup();
    const { params } = (
      versionConfig.validate as unknown as {
        request: { params: { validate: (value: unknown) => unknown } };
      }
    ).request;
    expect(() => params.validate({ knowledge_id: id })).toThrow();
  });

  it.each([CVE_ID, ADVISORY_ID, 'cve:redhat:10:CVE-2026-0001'])('accepts the id %s', (id) => {
    const { versionConfig } = setup();
    const { params } = (
      versionConfig.validate as unknown as {
        request: { params: { validate: (value: unknown) => unknown } };
      }
    ).request;
    expect(() => params.validate({ knowledge_id: id })).not.toThrow();
  });

  it('returns the CVE doc and its advisory docs, read as the current user', async () => {
    const ctx = setup();
    ctx.mget.mockResolvedValue({
      docs: [
        hit(CVE_ID, { vulnerability: { id: 'CVE-2026-0001' } }),
        hit(ADVISORY_ID, { advisory: { id: 'RHSA-2026:0001' } }),
        { _id: 'adv:redhat:9:gone', found: false },
      ],
    });
    const response = await run(ctx, undefined, {
      advisory_ids: [ADVISORY_ID, 'adv:redhat:9:gone', CVE_ID.replace('cve:', 'x:')],
    });

    expect(ctx.mget).toHaveBeenCalledWith({
      index: KNOWLEDGE_INDEX,
      ids: [CVE_ID, ADVISORY_ID, 'adv:redhat:9:gone'],
    });
    expect(response.ok).toHaveBeenCalledWith({
      body: {
        knowledge: { vulnerability: { id: 'CVE-2026-0001' } },
        advisories: [{ advisory: { id: 'RHSA-2026:0001' } }],
      },
    });
  });

  it('answers 200 with knowledge null when only advisory docs exist', async () => {
    const ctx = setup();
    ctx.mget.mockResolvedValue({
      docs: [
        { _id: CVE_ID, found: false },
        hit(ADVISORY_ID, { advisory: { id: 'RHSA-2026:0001' } }),
      ],
    });
    const response = await run(ctx, undefined, { advisory_ids: [ADVISORY_ID] });

    expect(response.notFound).not.toHaveBeenCalled();
    expect(response.ok).toHaveBeenCalledWith({
      body: { knowledge: null, advisories: [{ advisory: { id: 'RHSA-2026:0001' } }] },
    });
  });

  it('answers 404 when neither the CVE doc nor any advisory doc exists', async () => {
    const ctx = setup();
    ctx.mget.mockResolvedValue({
      docs: [
        { _id: CVE_ID, found: false },
        { _id: ADVISORY_ID, found: false },
      ],
    });
    const response = await run(ctx, undefined, { advisory_ids: [ADVISORY_ID] });
    expect(response.notFound).toHaveBeenCalled();
    expect(response.ok).not.toHaveBeenCalled();
  });

  it('answers 404 when the CVE doc is missing and no advisories were requested', async () => {
    const ctx = setup();
    ctx.mget.mockResolvedValue({ docs: [{ _id: CVE_ID, found: false }] });
    const response = await run(ctx);
    expect(response.notFound).toHaveBeenCalled();
    expect(response.ok).not.toHaveBeenCalled();
  });

  describe('advisory_ids as a real query string', () => {
    const ADVISORY_2 = 'adv:redhat:9:RHSA-2026:0002';
    const encode = (id: string) => `advisory_ids=${encodeURIComponent(id)}`;

    it.each([
      ['no advisory ids', '', []],
      ['one advisory id (a bare key, not an array)', encode(ADVISORY_ID), [ADVISORY_ID]],
      [
        'two advisory ids (a repeated key)',
        `${encode(ADVISORY_ID)}&${encode(ADVISORY_2)}`,
        [ADVISORY_ID, ADVISORY_2],
      ],
    ])('passes validation and reads the right docs with %s', async (_name, queryString, ids) => {
      const ctx = setup();
      ctx.mget.mockResolvedValue({
        docs: [hit(CVE_ID, { vulnerability: { id: 'CVE-2026-0001' } })],
      });
      const response = await runWithQueryString(ctx, queryString);

      expect(ctx.mget).toHaveBeenCalledWith({ index: KNOWLEDGE_INDEX, ids: [CVE_ID, ...ids] });
      expect(response.ok).toHaveBeenCalled();
    });

    it('rejects an advisory id that is not a knowledge id, single or repeated', async () => {
      const ctx = setup();
      await expect(runWithQueryString(ctx, 'advisory_ids=nope')).rejects.toThrow();
      await expect(
        runWithQueryString(ctx, `${encode(ADVISORY_ID)}&advisory_ids=nope`)
      ).rejects.toThrow();
      expect(ctx.mget).not.toHaveBeenCalled();
    });

    it('rejects more advisory ids than the cap', async () => {
      const ctx = setup();
      const many = Array.from({ length: MAX_KNOWLEDGE_ADVISORIES + 1 }, (_, i) =>
        encode(`adv:redhat:9:RHSA-2026:${i}`)
      ).join('&');
      await expect(runWithQueryString(ctx, many)).rejects.toThrow();
    });
  });

  it('answers 404 when the index does not exist', async () => {
    const ctx = setup();
    ctx.mget.mockRejectedValue(Object.assign(new Error('no such index'), { statusCode: 404 }));
    const response = await run(ctx);
    expect(response.notFound).toHaveBeenCalled();
  });

  it('answers 403 when the user cannot read the index', async () => {
    const ctx = setup();
    ctx.mget.mockRejectedValue(Object.assign(new Error('forbidden'), { statusCode: 403 }));
    const response = await run(ctx);
    expect(response.forbidden).toHaveBeenCalled();
  });
});
