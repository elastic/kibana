/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as esErrors } from '@elastic/elasticsearch';
import { forbidden } from '@hapi/boom';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { createDigitalExperienceServerRoute } from './create_digital_experience_server_route';

const ENDPOINT = 'GET /internal/digital_experience/test';

let logger: ReturnType<typeof loggingSystemMock.createLogger>;

beforeEach(() => {
  logger = loggingSystemMock.createLogger();
});

const createResources = (flagEnabled: boolean) => {
  const getBooleanValue = jest.fn().mockResolvedValue(flagEnabled);
  return {
    getBooleanValue,
    resources: {
      logger,
      context: { core: Promise.resolve({ featureFlags: { getBooleanValue } }) },
    },
  };
};

const run = (handler: () => Promise<{ ok: boolean }>, flagEnabled = true) => {
  const route = createDigitalExperienceServerRoute({
    endpoint: ENDPOINT,
    options: { access: 'internal' },
    security: { authz: { enabled: false, reason: 'test' } },
    handler,
  });
  const wrapped = route[ENDPOINT].handler as unknown as (resources: unknown) => Promise<unknown>;
  return wrapped(createResources(flagEnabled).resources);
};

describe('createDigitalExperienceServerRoute', () => {
  it('answers 404 without calling the handler when the feature flag is off', async () => {
    const handler = jest.fn().mockResolvedValue({ ok: true });

    await expect(run(handler, false)).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 404 },
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it('leaves a failure to evaluate the feature flag to the route framework, not as a data failure', async () => {
    const handler = jest.fn().mockResolvedValue({ ok: true });
    const { getBooleanValue, resources } = createResources(true);
    const flagError = new Error('flag provider down');
    getBooleanValue.mockRejectedValue(flagError);
    const route = createDigitalExperienceServerRoute({
      endpoint: ENDPOINT,
      options: { access: 'internal' },
      security: { authz: { enabled: false, reason: 'test' } },
      handler,
    });
    const wrapped = route[ENDPOINT].handler as unknown as (resources: unknown) => Promise<unknown>;

    await expect(wrapped(resources)).rejects.toBe(flagError);
    expect(handler).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('evaluates the feature flag with a false fallback and calls the handler when it is on', async () => {
    const handler = jest.fn().mockResolvedValue({ ok: true });
    const { getBooleanValue, resources } = createResources(true);
    const route = createDigitalExperienceServerRoute({
      endpoint: ENDPOINT,
      options: { access: 'internal' },
      security: { authz: { enabled: false, reason: 'test' } },
      handler,
    });
    const wrapped = route[ENDPOINT].handler as unknown as (resources: unknown) => Promise<unknown>;

    await expect(wrapped(resources)).resolves.toEqual({ ok: true });
    expect(getBooleanValue).toHaveBeenCalledWith('digitalExperience.enabled', false);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('returns what the handler returns', async () => {
    await expect(run(async () => ({ ok: true }))).resolves.toEqual({ ok: true });
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('logs a failure and answers without its details', async () => {
    await expect(
      run(async () => {
        throw new Error('no such index [logs-generic.otel-default]');
      })
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 500 },
      message: 'Could not load the data. Check the Kibana server logs for details.',
    });
    expect(logger.error).toHaveBeenCalledWith(
      `${ENDPOINT} failed: no such index [logs-generic.otel-default]`
    );
  });

  it('rethrows the errors a route chose and aborted requests without logging them', async () => {
    const chosen = forbidden('no access');
    const aborted = new esErrors.RequestAbortedError('aborted');

    await expect(
      run(async () => {
        throw chosen;
      })
    ).rejects.toBe(chosen);
    await expect(
      run(async () => {
        throw aborted;
      })
    ).rejects.toBe(aborted);
    expect(logger.error).not.toHaveBeenCalled();
  });
});
