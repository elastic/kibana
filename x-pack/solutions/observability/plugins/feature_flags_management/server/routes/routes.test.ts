/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/server/mocks';
import { API_PATHS, API_PRIVILEGES, API_VERSION } from '../../common/constants';
import type { GetServices } from '../types';
import { registerRoutes } from '.';

const getServices: GetServices = () => Promise.reject(new Error('not used'));

type Method = 'get' | 'post' | 'put' | 'delete';

const READ_ROUTES: Array<[Method, string]> = [
  ['get', API_PATHS.environments],
  ['get', API_PATHS.environment],
  ['get', API_PATHS.apps],
  ['get', API_PATHS.app],
  ['get', API_PATHS.appCredentials],
  ['get', API_PATHS.flags],
  ['get', API_PATHS.flag],
  ['get', API_PATHS.flagHistory],
  ['get', API_PATHS.observedContexts],
  ['get', API_PATHS.observedContextAttributes],
  ['get', API_PATHS.observedContextValues],
];

const MANAGE_ROUTES: Array<[Method, string]> = [
  ['post', API_PATHS.environments],
  ['put', API_PATHS.environment],
  ['delete', API_PATHS.environment],
  ['post', API_PATHS.apps],
  ['put', API_PATHS.app],
  ['delete', API_PATHS.app],
  ['post', API_PATHS.appCredentialRotate],
  ['delete', API_PATHS.appCredential],
  ['post', API_PATHS.flags],
  ['put', API_PATHS.flag],
  ['delete', API_PATHS.flag],
];

describe('feature flags routes', () => {
  const router = httpServiceMock.createRouter();
  registerRoutes(router, getServices);

  it('registers every route under /api/feature_flags', () => {
    const registered = (['get', 'post', 'put', 'delete'] as const).flatMap((method) =>
      router.versioned[method].mock.calls.map(([config]) => `${method} ${config.path}`)
    );
    expect(registered.sort()).toEqual(
      [...READ_ROUTES, ...MANAGE_ROUTES].map(([method, path]) => `${method} ${path}`).sort()
    );
    registered.forEach((route) => expect(route).toMatch(/^\w+ \/api\/feature_flags\//));
  });

  it.each(READ_ROUTES)('%s %s requires the read privilege', (method, path) => {
    const { config } = router.versioned.getRoute(method, path);
    expect(config.security).toEqual({ authz: { requiredPrivileges: [API_PRIVILEGES.read] } });
  });

  it.each(MANAGE_ROUTES)('%s %s requires the manage privilege', (method, path) => {
    const { config } = router.versioned.getRoute(method, path);
    expect(config.security).toEqual({ authz: { requiredPrivileges: [API_PRIVILEGES.manage] } });
  });

  it.each([...READ_ROUTES, ...MANAGE_ROUTES])(
    '%s %s is a documented, experimental public route',
    (method, path) => {
      const { config, versions } = router.versioned.getRoute(method, path);
      expect(config.access).toBe('public');
      expect(config.summary).toEqual(expect.any(String));
      expect(config.description).toEqual(expect.any(String));
      expect(config.options).toEqual(
        expect.objectContaining({
          tags: ['oas-tag:feature flags'],
          availability: { stability: 'experimental' },
        })
      );
      expect(Object.keys(versions)).toEqual([API_VERSION]);
      expect(versions[API_VERSION].config.validate).toEqual(
        expect.objectContaining({ response: expect.objectContaining({}) })
      );
    }
  );
});
