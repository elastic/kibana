/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import type { SandboxCallContext } from './tool_utils';
import {
  REQUEST_SCOPED_CONNECTOR_ID,
  checkRequestScopedConnector,
  readRequestApiKey,
} from './request_scoped_connector';

const SECRET = 'task-manager-cloned-secret';
const ENCODED = Buffer.from(`key-id:${SECRET}`).toString('base64');
const ES_URL = 'https://es.example.com';

const fakeRequest = (authorization?: string) =>
  httpServerMock.createFakeKibanaRequest({
    headers: authorization ? { authorization } : {},
  });

const callContext = (
  request = fakeRequest(`ApiKey ${ENCODED}`),
  allowedConnectorIds: readonly string[] = [REQUEST_SCOPED_CONNECTOR_ID]
): SandboxCallContext => ({ request, allowedConnectorIds });

describe('readRequestApiKey', () => {
  it('returns the encoded key and its secret from a fake request', () => {
    expect(readRequestApiKey(fakeRequest(`ApiKey ${ENCODED}`))).toEqual({
      encoded: ENCODED,
      secret: SECRET,
    });
  });

  it('accepts the scheme case-insensitively', () => {
    expect(readRequestApiKey(fakeRequest(`apikey ${ENCODED}`))).toEqual({
      encoded: ENCODED,
      secret: SECRET,
    });
  });

  it('rejects real requests so a caller-owned key never reaches the sandbox', () => {
    const request = httpServerMock.createKibanaRequest({
      headers: { authorization: `ApiKey ${ENCODED}` },
    });

    expect(readRequestApiKey(request)).toEqual({
      errorMessage: expect.stringContaining('Task Manager'),
    });
  });

  it.each([
    ['no authorization header', undefined],
    ['a bearer token', 'Bearer some-token'],
    ['basic credentials', `Basic ${Buffer.from('elastic:changeme').toString('base64')}`],
  ])('rejects %s', (_, authorization) => {
    expect(readRequestApiKey(fakeRequest(authorization))).toEqual({
      errorMessage: expect.stringContaining('not authenticated with an API key'),
    });
  });

  it('rejects UIAM keys, which need the UIAM shared secret to authenticate', () => {
    expect(readRequestApiKey(fakeRequest('ApiKey essu_internal_key'))).toEqual({
      errorMessage: expect.stringContaining('UIAM'),
    });
  });

  it('rejects a malformed key', () => {
    const malformed = Buffer.from('no-separator').toString('base64');

    expect(readRequestApiKey(fakeRequest(`ApiKey ${malformed}`))).toEqual({
      errorMessage: expect.stringContaining('malformed'),
    });
  });
});

describe('checkRequestScopedConnector', () => {
  it('returns the URL and key for an allow-listed agent', () => {
    expect(checkRequestScopedConnector(callContext(), ES_URL)).toEqual({
      url: ES_URL,
      encoded: ENCODED,
      secret: SECRET,
    });
  });

  it('denies agents that do not allow-list the connector', () => {
    expect(checkRequestScopedConnector(callContext(undefined, ['other']), ES_URL)).toEqual({
      errorMessage: expect.stringContaining('not assigned'),
    });
  });

  it('is unavailable without a sandbox-reachable Elasticsearch URL', () => {
    expect(checkRequestScopedConnector(callContext(), undefined)).toEqual({
      errorMessage: expect.stringContaining('sandbox.elasticsearch.url'),
    });
  });
});
