/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoom } from '@hapi/boom';
import { loggerMock } from '@kbn/logging-mocks';
import { SandboxElasticsearchAccessDisabledError } from '../sandbox_elasticsearch_access';
import { sandboxElasticsearchAccessRoutes } from './sandbox_elasticsearch_access';
import { onboardingRoutes } from './onboarding';

const ACCESS = {
  serviceAccountId: 'sa-id',
  spaceId: 'space-a',
  boundAt: '2026-10-15T00:00:00.000Z',
};

const createAccessClient = ({ enabled = true } = {}) => ({
  isEnabled: jest.fn().mockReturnValue(enabled),
  getSpaceId: jest.fn().mockReturnValue('space-a'),
  get: jest.fn().mockResolvedValue(ACCESS),
  getServiceAccountId: jest.fn(),
  ensure: jest.fn().mockResolvedValue(ACCESS),
});

describe('sandbox Elasticsearch access routes', () => {
  const { handler: getHandler } =
    sandboxElasticsearchAccessRoutes['GET /internal/nightshift/sandbox/elasticsearch_access'];
  const { handler: ensureHandler } =
    sandboxElasticsearchAccessRoutes['POST /internal/nightshift/sandbox/elasticsearch_access'];

  it('GET reports the service account bound in the request space', async () => {
    const sandboxElasticsearchAccessClient = createAccessClient();
    const request = {};

    await expect(
      getHandler({ request, params: {}, sandboxElasticsearchAccessClient } as never)
    ).resolves.toEqual({
      uiam_enabled: true,
      space_id: 'space-a',
      service_account_id: 'sa-id',
      bound_at: ACCESS.boundAt,
    });
    expect(sandboxElasticsearchAccessClient.get).toHaveBeenCalledWith(request);
  });

  it('GET reports no service account before one is bound', async () => {
    const sandboxElasticsearchAccessClient = createAccessClient();
    sandboxElasticsearchAccessClient.get.mockResolvedValue(undefined);

    await expect(
      getHandler({ request: {}, params: {}, sandboxElasticsearchAccessClient } as never)
    ).resolves.toEqual({ uiam_enabled: true, space_id: 'space-a' });
  });

  it('GET does not read bindings when UIAM mode is disabled', async () => {
    const sandboxElasticsearchAccessClient = createAccessClient({ enabled: false });

    await expect(
      getHandler({ request: {}, params: {}, sandboxElasticsearchAccessClient } as never)
    ).resolves.toEqual({ uiam_enabled: false, space_id: 'space-a' });
    expect(sandboxElasticsearchAccessClient.get).not.toHaveBeenCalled();
  });

  it('POST ensures the service account with the caller request', async () => {
    const sandboxElasticsearchAccessClient = createAccessClient();
    const request = {};

    await expect(
      ensureHandler({ request, params: {}, sandboxElasticsearchAccessClient } as never)
    ).resolves.toEqual({
      uiam_enabled: true,
      space_id: 'space-a',
      service_account_id: 'sa-id',
      bound_at: ACCESS.boundAt,
    });
    expect(sandboxElasticsearchAccessClient.ensure).toHaveBeenCalledWith(request);
  });

  it('POST maps a disabled UIAM mode to 400', async () => {
    const sandboxElasticsearchAccessClient = createAccessClient({ enabled: false });
    sandboxElasticsearchAccessClient.ensure.mockRejectedValue(
      new SandboxElasticsearchAccessDisabledError('UIAM mode is disabled.')
    );

    const error = await ensureHandler({
      request: {},
      params: {},
      sandboxElasticsearchAccessClient,
    } as never).catch((e: unknown) => e);

    expect(isBoom(error) && error.output.statusCode).toBe(400);
  });
});

describe('onboarding start', () => {
  const { handler } = onboardingRoutes['POST /internal/nightshift/onboarding/suggestions'];
  const started = { execution_id: 'execution-1' };

  it('ensures the sandbox service account before starting onboarding', async () => {
    const sandboxElasticsearchAccessClient = createAccessClient();
    const onboardingClient = { start: jest.fn().mockResolvedValue(started) };
    const request = {};

    await expect(
      handler({
        request,
        params: {},
        logger: loggerMock.create(),
        onboardingClient,
        sandboxElasticsearchAccessClient,
      } as never)
    ).resolves.toEqual(started);
    expect(sandboxElasticsearchAccessClient.ensure).toHaveBeenCalledWith(request);
  });

  it('starts onboarding and logs a warning when the service account cannot be created', async () => {
    const sandboxElasticsearchAccessClient = createAccessClient();
    sandboxElasticsearchAccessClient.ensure.mockRejectedValue(new Error('missing manage_security'));
    const onboardingClient = { start: jest.fn().mockResolvedValue(started) };
    const logger = loggerMock.create();

    await expect(
      handler({
        request: {},
        params: {},
        logger,
        onboardingClient,
        sandboxElasticsearchAccessClient,
      } as never)
    ).resolves.toEqual(started);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('missing manage_security'));
  });

  it('skips the service account when UIAM mode is disabled', async () => {
    const sandboxElasticsearchAccessClient = createAccessClient({ enabled: false });
    const onboardingClient = { start: jest.fn().mockResolvedValue(started) };

    await handler({
      request: {},
      params: {},
      logger: loggerMock.create(),
      onboardingClient,
      sandboxElasticsearchAccessClient,
    } as never);

    expect(sandboxElasticsearchAccessClient.ensure).not.toHaveBeenCalled();
  });
});
