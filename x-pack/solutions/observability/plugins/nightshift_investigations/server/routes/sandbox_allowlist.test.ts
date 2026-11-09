/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoom } from '@hapi/boom';
import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import {
  MAX_SANDBOX_ALLOWLIST_HOSTS,
  MAX_SANDBOX_ALLOWLIST_RAW_HOST_LENGTH,
} from '../../common/sandbox_allowlist';
import {
  SandboxAllowlistDisabledError,
  SandboxAllowlistValidationError,
} from '../sandbox_allowlist';
import { rethrowSandboxAllowlistError, sandboxAllowlistRoutes } from './sandbox_allowlist';

const getRoute = sandboxAllowlistRoutes['GET /internal/nightshift/sandbox_allowlist'];
const putRoute = sandboxAllowlistRoutes['PUT /internal/nightshift/sandbox_allowlist'];

const statusOf = (error: unknown): number | undefined => {
  try {
    rethrowSandboxAllowlistError(error);
  } catch (thrown) {
    return isBoom(thrown) ? thrown.output.statusCode : undefined;
  }
};

const createRouteContext = (enabled = true) => {
  const sandboxAllowlistClient = {
    get: jest.fn().mockResolvedValue({ hosts: ['api.github.com'] }),
    replace: jest.fn().mockResolvedValue({ hosts: ['api.github.com'] }),
  };
  const request = {};
  const context = {
    core: Promise.resolve({
      featureFlags: {
        getBooleanValue: jest.fn().mockResolvedValue(enabled),
      },
    }),
  };
  return { sandboxAllowlistClient, request, context };
};

describe('rethrowSandboxAllowlistError', () => {
  it('maps validation errors to 400', () => {
    expect(statusOf(new SandboxAllowlistValidationError('bad host'))).toBe(400);
  });

  it('maps a disabled Nightshift to 404', () => {
    expect(statusOf(new SandboxAllowlistDisabledError())).toBe(404);
  });

  it('rethrows unknown errors unchanged', () => {
    const error = new Error('unexpected');
    expect(() => rethrowSandboxAllowlistError(error)).toThrow(error);
  });
});

describe('sandboxAllowlistRoutes', () => {
  it('requires the Nightshift manage privilege on both GET and PUT routes', () => {
    for (const route of [getRoute, putRoute]) {
      const { authz } = route.security;
      expect('requiredPrivileges' in authz && authz.requiredPrivileges).toEqual([
        NIGHTSHIFT_API_PRIVILEGES.manage,
      ]);
    }
  });

  it('delegates GET and PUT to sandboxAllowlistClient when Nightshift is enabled', async () => {
    const deps = createRouteContext(true);

    await expect(getRoute.handler({ ...deps, params: {} } as never)).resolves.toEqual({
      hosts: ['api.github.com'],
    });
    expect(deps.sandboxAllowlistClient.get).toHaveBeenCalledWith(deps.request);

    await expect(
      putRoute.handler({
        ...deps,
        params: { body: { hosts: ['api.github.com'] } },
      } as never)
    ).resolves.toEqual({ hosts: ['api.github.com'] });
    expect(deps.sandboxAllowlistClient.replace).toHaveBeenCalledWith(deps.request, {
      hosts: ['api.github.com'],
    });
  });

  it('returns 404 and does not call sandboxAllowlistClient when Nightshift is disabled', async () => {
    const deps = createRouteContext(false);

    await expect(getRoute.handler({ ...deps, params: {} } as never)).rejects.toMatchObject({
      output: { statusCode: 404 },
    });
    await expect(
      putRoute.handler({ ...deps, params: { body: { hosts: [] } } } as never)
    ).rejects.toMatchObject({
      output: { statusCode: 404 },
    });
    expect(deps.sandboxAllowlistClient.get).not.toHaveBeenCalled();
    expect(deps.sandboxAllowlistClient.replace).not.toHaveBeenCalled();
  });

  it('enforces size bounds on PUT body.hosts', () => {
    expect(putRoute.params.safeParse({ body: { hosts: ['api.github.com'] } }).success).toBe(true);
    expect(
      putRoute.params.safeParse({
        body: { hosts: ['a'.repeat(MAX_SANDBOX_ALLOWLIST_RAW_HOST_LENGTH + 1)] },
      }).success
    ).toBe(false);
    expect(
      putRoute.params.safeParse({
        body: {
          hosts: Array.from(
            { length: MAX_SANDBOX_ALLOWLIST_HOSTS * 4 + 1 },
            (_, i) => `h${i}.example`
          ),
        },
      }).success
    ).toBe(false);
  });
});
