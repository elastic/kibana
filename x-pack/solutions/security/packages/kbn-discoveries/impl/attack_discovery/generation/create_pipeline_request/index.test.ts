/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, FakeRawRequest, KibanaRequest, Logger } from '@kbn/core/server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { asSpaceId } from '@kbn/core-spaces-common';

import { createPipelineRequest, PIPELINE_API_KEY_EXPIRATION } from '.';
import { DEFAULT_PIPELINE_TIMEOUT_MS } from '../run_manual_orchestration';

const grantAsInternalUser = jest.fn();

const createCoreStart = (): CoreStart =>
  ({
    security: {
      authc: {
        apiKeys: {
          grantAsInternalUser,
        },
      },
    },
  } as unknown as CoreStart);

const createLogger = (): Logger =>
  ({
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger);

const createInteractiveRequest = (): KibanaRequest =>
  httpServerMock.createKibanaRequest({
    headers: { authorization: 'Bearer session-access-token' },
  });

const createFakeRequest = (): KibanaRequest => {
  const fakeRawRequest: FakeRawRequest = {
    headers: { authorization: 'ApiKey already-a-key' },
    path: '/',
    spaceId: asSpaceId('default'),
  };

  return kibanaRequestFactory(fakeRawRequest);
};

/** Converts an Elasticsearch time value, e.g. `1h`, to milliseconds. */
const toMilliseconds = (timeValue: string): number => {
  const match = /^(\d+)(ms|s|m|h|d)$/.exec(timeValue);

  if (match == null) {
    throw new Error(`Unsupported time value: ${timeValue}`);
  }

  const [, amount, unit] = match;
  const unitMilliseconds = { d: 86400000, h: 3600000, m: 60000, ms: 1, s: 1000 };

  return Number(amount) * unitMilliseconds[unit as keyof typeof unitMilliseconds];
};

describe('PIPELINE_API_KEY_EXPIRATION', () => {
  it('outlives the pipeline budget, so the credential cannot end a run early', () => {
    expect(toMilliseconds(PIPELINE_API_KEY_EXPIRATION)).toBeGreaterThan(
      DEFAULT_PIPELINE_TIMEOUT_MS
    );
  });
});

describe('createPipelineRequest', () => {
  const defaultParams = {
    executionUuid: 'test-execution-uuid',
    spaceId: 'default',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    grantAsInternalUser.mockResolvedValue({
      api_key: 'granted-secret',
      id: 'granted-id',
      name: 'attack-discovery-test-execution-uuid',
    });
  });

  it('returns the original request when the incoming request is already a fake request', async () => {
    const request = createFakeRequest();

    const result = await createPipelineRequest({
      ...defaultParams,
      coreStart: createCoreStart(),
      logger: createLogger(),
      request,
    });

    expect(result.request).toBe(request);
  });

  it('returns an undefined apiKeyId when the incoming request is already a fake request', async () => {
    const result = await createPipelineRequest({
      ...defaultParams,
      coreStart: createCoreStart(),
      logger: createLogger(),
      request: createFakeRequest(),
    });

    expect(result.apiKeyId).toBeUndefined();
  });

  it('does not grant an API key when the incoming request is already a fake request', async () => {
    await createPipelineRequest({
      ...defaultParams,
      coreStart: createCoreStart(),
      logger: createLogger(),
      request: createFakeRequest(),
    });

    expect(grantAsInternalUser).not.toHaveBeenCalled();
  });

  it('grants the API key with the incoming request so Elasticsearch bounds it to the caller', async () => {
    const request = createInteractiveRequest();

    await createPipelineRequest({
      ...defaultParams,
      coreStart: createCoreStart(),
      logger: createLogger(),
      request,
    });

    expect(grantAsInternalUser.mock.calls[0][0]).toBe(request);
  });

  it('grants the API key with an expiration, managed metadata, and empty role descriptors', async () => {
    await createPipelineRequest({
      ...defaultParams,
      coreStart: createCoreStart(),
      logger: createLogger(),
      request: createInteractiveRequest(),
    });

    expect(grantAsInternalUser.mock.calls[0][1]).toEqual({
      expiration: PIPELINE_API_KEY_EXPIRATION,
      metadata: { managed: true },
      name: 'attack-discovery-test-execution-uuid',
      role_descriptors: {},
    });
  });

  it('returns the id of the granted API key', async () => {
    const result = await createPipelineRequest({
      ...defaultParams,
      coreStart: createCoreStart(),
      logger: createLogger(),
      request: createInteractiveRequest(),
    });

    expect(result.apiKeyId).toEqual('granted-id');
  });

  it('encodes the credential as base64 of the granted id and secret', async () => {
    const result = await createPipelineRequest({
      ...defaultParams,
      coreStart: createCoreStart(),
      logger: createLogger(),
      request: createInteractiveRequest(),
    });

    expect(result.request.headers.authorization).toEqual(
      `ApiKey ${Buffer.from('granted-id:granted-secret').toString('base64')}`
    );
  });

  it('returns a fake request so downstream consumers do not depend on the session credential', async () => {
    const result = await createPipelineRequest({
      ...defaultParams,
      coreStart: createCoreStart(),
      logger: createLogger(),
      request: createInteractiveRequest(),
    });

    expect(result.request.isFakeRequest).toBe(true);
  });

  it('binds the returned request to the space resolved from the incoming request', async () => {
    const result = await createPipelineRequest({
      ...defaultParams,
      coreStart: createCoreStart(),
      logger: createLogger(),
      request: createInteractiveRequest(),
      spaceId: 'my-space',
    });

    expect(result.request.spaceId).toEqual('my-space');
  });

  it('returns the original request when the grant resolves null', async () => {
    grantAsInternalUser.mockResolvedValue(null);
    const request = createInteractiveRequest();

    const result = await createPipelineRequest({
      ...defaultParams,
      coreStart: createCoreStart(),
      logger: createLogger(),
      request,
    });

    expect(result.request).toBe(request);
  });

  it('returns an undefined apiKeyId when the grant resolves null', async () => {
    grantAsInternalUser.mockResolvedValue(null);

    const result = await createPipelineRequest({
      ...defaultParams,
      coreStart: createCoreStart(),
      logger: createLogger(),
      request: createInteractiveRequest(),
    });

    expect(result.apiKeyId).toBeUndefined();
  });

  it('returns the original request when the grant throws', async () => {
    grantAsInternalUser.mockRejectedValue(new Error('token expired'));
    const request = createInteractiveRequest();

    const result = await createPipelineRequest({
      ...defaultParams,
      coreStart: createCoreStart(),
      logger: createLogger(),
      request,
    });

    expect(result.request).toBe(request);
  });

  it('logs a warning when the grant throws', async () => {
    grantAsInternalUser.mockRejectedValue(new Error('token expired'));
    const logger = createLogger();

    await createPipelineRequest({
      ...defaultParams,
      coreStart: createCoreStart(),
      logger,
      request: createInteractiveRequest(),
    });

    expect(logger.warn).toHaveBeenCalled();
  });

  it('returns the original request when the security service is unavailable', async () => {
    const request = createInteractiveRequest();

    const result = await createPipelineRequest({
      ...defaultParams,
      coreStart: {} as unknown as CoreStart,
      logger: createLogger(),
      request,
    });

    expect(result.request).toBe(request);
  });

  it('does not modify the authorization header of the incoming request', async () => {
    const request = createInteractiveRequest();

    await createPipelineRequest({
      ...defaultParams,
      coreStart: createCoreStart(),
      logger: createLogger(),
      request,
    });

    expect(request.headers.authorization).toEqual('Bearer session-access-token');
  });
});
