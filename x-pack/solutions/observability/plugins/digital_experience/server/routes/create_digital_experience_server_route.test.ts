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

const run = (handler: () => Promise<{ ok: boolean }>) => {
  const route = createDigitalExperienceServerRoute({
    endpoint: ENDPOINT,
    options: { access: 'internal' },
    security: { authz: { enabled: false, reason: 'test' } },
    handler,
  });
  const wrapped = route[ENDPOINT].handler as unknown as (resources: unknown) => Promise<unknown>;
  return wrapped({ logger });
};

describe('createDigitalExperienceServerRoute', () => {
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
