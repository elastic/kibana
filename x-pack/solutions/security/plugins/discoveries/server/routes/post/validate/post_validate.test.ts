/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import { PostValidateRequestBody } from '@kbn/discoveries-schemas';
import { getSpaceId } from '@kbn/discoveries/impl/lib/helpers/get_space_id';
import { assertWorkflowsEnabled } from '../../../lib/assert_workflows_enabled';
import { registerValidateRoute } from './post_validate';
import { validateAttackDiscoveries } from './helpers/validate_attack_discoveries';

jest.mock('../../../lib/assert_workflows_enabled', () => ({
  assertWorkflowsEnabled: jest.fn().mockResolvedValue(null),
}));

jest.mock('@kbn/discoveries/impl/lib/helpers/get_space_id', () => ({
  getSpaceId: jest.fn(),
}));

jest.mock('./helpers/validate_attack_discoveries', () => ({
  validateAttackDiscoveries: jest.fn(),
}));

const mockWorkflowInitService = {
  ensureWorkflowsForSpace: jest.fn().mockResolvedValue(null),
  verifyAndRepairWorkflows: jest.fn(),
};

describe('registerValidateRoute', () => {
  const adhocAttackDiscoveryDataClient = {} as unknown as IRuleDataClient;

  const logger = {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  } as unknown as Logger;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 404 when workflows feature flag is disabled', async () => {
    const mockNotFoundResponse = { statusCode: 404 };
    (assertWorkflowsEnabled as jest.Mock).mockResolvedValueOnce(mockNotFoundResponse);

    const router = httpServiceMock.createRouter();
    const addVersionMock = jest.fn();
    (router.versioned.post as jest.Mock).mockReturnValue({ addVersion: addVersionMock });

    registerValidateRoute(router, logger, {
      adhocAttackDiscoveryDataClient,
      getStartServices: jest.fn(),
      workflowInitService: mockWorkflowInitService,
    });

    const handler = addVersionMock.mock.calls[0][1] as (
      ctx: unknown,
      req: unknown,
      res: unknown
    ) => Promise<unknown>;

    const response = httpServerMock.createResponseFactory();
    const request = httpServerMock.createKibanaRequest({ body: {} });

    const result = await handler({}, request, response);

    expect(result).toEqual(mockNotFoundResponse);
    expect(response.ok).not.toHaveBeenCalled();
  });

  it('returns 400 when request body validation fails', async () => {
    const router = httpServiceMock.createRouter();
    const addVersionMock = jest.fn();
    (router.versioned.post as jest.Mock).mockReturnValue({ addVersion: addVersionMock });

    registerValidateRoute(router, logger, {
      adhocAttackDiscoveryDataClient,
      getStartServices: jest.fn(),
      workflowInitService: mockWorkflowInitService,
    });

    const handler = addVersionMock.mock.calls[0][1] as (
      ctx: unknown,
      req: unknown,
      res: unknown
    ) => Promise<unknown>;

    const error = { message: 'bad' };
    jest.spyOn(PostValidateRequestBody, 'safeParse').mockReturnValue({
      error,
      success: false,
    } as unknown as ReturnType<typeof PostValidateRequestBody.safeParse>);

    const response = httpServerMock.createResponseFactory();
    const request = httpServerMock.createKibanaRequest({ body: {} });

    await handler(
      {
        core: Promise.resolve({
          featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
        }),
      },
      request,
      response
    );

    expect(response.badRequest).toHaveBeenCalledWith({ body: error });
  });

  it('returns 500 when authenticated user is missing', async () => {
    const router = httpServiceMock.createRouter();
    const addVersionMock = jest.fn();
    (router.versioned.post as jest.Mock).mockReturnValue({ addVersion: addVersionMock });

    const getStartServices = jest.fn().mockResolvedValue({
      pluginsStart: {
        security: { authc: { getCurrentUser: jest.fn().mockReturnValue(null) } },
        spaces: { spacesService: null },
      },
    });

    registerValidateRoute(router, logger, {
      adhocAttackDiscoveryDataClient,
      getStartServices,
      workflowInitService: mockWorkflowInitService,
    });

    const handler = addVersionMock.mock.calls[0][1] as (
      ctx: unknown,
      req: unknown,
      res: unknown
    ) => Promise<unknown>;

    jest.spyOn(PostValidateRequestBody, 'safeParse').mockReturnValue({
      data: { attack_discoveries: [], generation_uuid: 'g1' },
      success: true,
    } as unknown as ReturnType<typeof PostValidateRequestBody.safeParse>);

    const response = httpServerMock.createResponseFactory();
    const request = httpServerMock.createKibanaRequest({
      body: { attack_discoveries: [], generation_uuid: 'g1' },
    });

    await handler(
      {
        core: Promise.resolve({
          featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
        }),
      },
      request,
      response
    );

    expect(response.customError).toHaveBeenCalled();
  });

  it('logs the stringified error message when the thrown value is not an Error', async () => {
    const router = httpServiceMock.createRouter();
    const addVersionMock = jest.fn();
    (router.versioned.post as jest.Mock).mockReturnValue({ addVersion: addVersionMock });

    const getStartServices = jest.fn().mockResolvedValue({
      pluginsStart: {
        security: { authc: { getCurrentUser: jest.fn().mockReturnValue({ username: 'u1' }) } },
        spaces: { spacesService: null },
      },
    });

    (getSpaceId as jest.Mock).mockReturnValue('default');
    (validateAttackDiscoveries as jest.Mock).mockRejectedValue('boom');

    registerValidateRoute(router, logger, {
      adhocAttackDiscoveryDataClient,
      getStartServices,
      workflowInitService: mockWorkflowInitService,
    });

    const handler = addVersionMock.mock.calls[0][1] as (
      ctx: unknown,
      req: unknown,
      res: unknown
    ) => Promise<unknown>;

    jest.spyOn(PostValidateRequestBody, 'safeParse').mockReturnValue({
      data: { attack_discoveries: [], generation_uuid: 'g1' },
      success: true,
    } as unknown as ReturnType<typeof PostValidateRequestBody.safeParse>);

    const response = httpServerMock.createResponseFactory();
    const request = httpServerMock.createKibanaRequest({
      body: { attack_discoveries: [], generation_uuid: 'g1' },
    });

    await handler(
      {
        core: Promise.resolve({
          featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
        }),
      },
      request,
      response
    );

    expect(logger.error).toHaveBeenCalledWith('Error validating discoveries: boom');
  });

  it('returns 200 when validation succeeds', async () => {
    const router = httpServiceMock.createRouter();
    const addVersionMock = jest.fn();
    (router.versioned.post as jest.Mock).mockReturnValue({ addVersion: addVersionMock });

    const getStartServices = jest.fn().mockResolvedValue({
      pluginsStart: {
        security: { authc: { getCurrentUser: jest.fn().mockReturnValue({ username: 'u1' }) } },
        spaces: { spacesService: {} },
      },
    });

    (getSpaceId as jest.Mock).mockReturnValue('default');
    (validateAttackDiscoveries as jest.Mock).mockResolvedValue({ validated_discoveries: [] });

    registerValidateRoute(router, logger, {
      adhocAttackDiscoveryDataClient,
      getStartServices,
      workflowInitService: mockWorkflowInitService,
    });

    const handler = addVersionMock.mock.calls[0][1] as (
      ctx: unknown,
      req: unknown,
      res: unknown
    ) => Promise<unknown>;

    jest.spyOn(PostValidateRequestBody, 'safeParse').mockReturnValue({
      data: { attack_discoveries: [], generation_uuid: 'g1' },
      success: true,
    } as unknown as ReturnType<typeof PostValidateRequestBody.safeParse>);

    const response = httpServerMock.createResponseFactory();
    const request = httpServerMock.createKibanaRequest({
      body: { attack_discoveries: [], generation_uuid: 'g1' },
    });

    await handler(
      {
        core: Promise.resolve({
          featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
        }),
      },
      request,
      response
    );

    expect(response.ok).toHaveBeenCalledWith({ body: { validated_discoveries: [] } });
  });
});
