/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';
import type { LicenseType } from '@kbn/licensing-types';
import type { RouteDependencies, RouteServices } from './types';

type Method = 'get' | 'post';
type Handler = (
  context: unknown,
  request: ReturnType<typeof httpServerMock.createKibanaRequest>,
  response: ReturnType<typeof httpServerMock.createResponseFactory>
) => Promise<unknown>;

interface RouteOptions {
  path: string;
  access: string;
  security: { authz: { requiredPrivileges: string[] } };
}

interface VersionConfig {
  version: string;
  validate: false | { request: { body: { validate: (value: unknown) => unknown } } };
}

/** Registers one route on a mock router; the returned handler is already licence-gated. */
export const setupRoute = (
  register: (dependencies: RouteDependencies) => void,
  method: Method,
  {
    licenseType = 'enterprise',
    services = {},
  }: { licenseType?: LicenseType; services?: Partial<RouteServices> } = {}
) => {
  const router = httpServiceMock.createRouter();
  const addVersion = jest.fn();
  (router.versioned[method] as jest.Mock).mockReturnValue({ addVersion });
  const logger = loggingSystemMock.createLogger();
  const getServices = jest.fn().mockResolvedValue(services);

  register({
    router,
    logger,
    getLicense: async () => licenseMock.createLicense({ license: { type: licenseType } }),
    getServices,
  } as unknown as RouteDependencies);

  const [routeOptions] = (router.versioned[method] as jest.Mock).mock.calls[0] as [RouteOptions];
  const [versionConfig, handler] = addVersion.mock.calls[0] as [VersionConfig, Handler];
  return { router, logger, getServices, routeOptions, versionConfig, handler };
};

export const createContext = (core: Record<string, unknown> = {}) => ({
  core: Promise.resolve(core),
});

export const createResponse = () => httpServerMock.createResponseFactory();
export const createRequest = httpServerMock.createKibanaRequest;
