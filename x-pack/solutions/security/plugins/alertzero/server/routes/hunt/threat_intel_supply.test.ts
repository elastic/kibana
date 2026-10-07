/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import {
  HUNT_THREAT_INTEL_SUPPLY_RESTORE_URL,
  HUNT_THREAT_INTEL_SUPPLY_URL,
} from '@kbn/alertzero-common';
import { WorkflowsManagementOperationPrivileges } from '@kbn/workflows';
import type { RouteDependencies } from '../register_routes';
import { createRouteContextMock } from '../route_context.mock';
import {
  ThreatIntelSupplyHardGateError,
  ThreatIntelSupplyHuntDisabledError,
  ThreatIntelSupplyNotInstalledError,
} from '../../services/threat_intel_supply';
import { registerHuntThreatIntelSupplyRoutes } from './threat_intel_supply';

const STATUS = {
  workflows: [],
  hardGate: { ok: true, reasonCodes: [] },
  drift: false,
  huntEnabled: true,
};

const managedUpdateAuthzResult = Object.fromEntries(
  WorkflowsManagementOperationPrivileges.updateManaged.map((privilege) => [privilege, true])
);

const restoreRequest = () =>
  httpServerMock.createKibanaRequest({
    kibanaRequestState: {
      requestId: '123',
      requestUuid: '123e4567-e89b-12d3-a456-426614174000',
      startTime: new Date('2025-01-01T00:00:00.000Z').getTime(),
      authzResult: managedUpdateAuthzResult,
    },
  });

const setupRoutes = (
  supply: {
    getSupplyStatus: jest.Mock;
    restoreSupplyForSpace: jest.Mock;
  } | null
) => {
  const router = httpServiceMock.createRouter();
  const getAddVersion = jest.fn();
  const postAddVersion = jest.fn();
  (router.versioned.get as jest.Mock).mockReturnValue({ addVersion: getAddVersion });
  (router.versioned.post as jest.Mock).mockReturnValue({ addVersion: postAddVersion });

  registerHuntThreatIntelSupplyRoutes({
    router,
    logger: loggingSystemMock.createLogger(),
    getSpaceId: () => 'space-a',
    getThreatIntelSupplyService: () => supply,
  } as unknown as RouteDependencies);

  return {
    getHandler: getAddVersion.mock.calls[0][1] as (
      context: unknown,
      request: ReturnType<typeof httpServerMock.createKibanaRequest>,
      response: ReturnType<typeof httpServerMock.createResponseFactory>
    ) => Promise<unknown>,
    postHandler: postAddVersion.mock.calls[0][1] as (
      context: unknown,
      request: ReturnType<typeof httpServerMock.createKibanaRequest>,
      response: ReturnType<typeof httpServerMock.createResponseFactory>
    ) => Promise<unknown>,
  };
};

describe('registerHuntThreatIntelSupplyRoutes', () => {
  it('registers the status route at the Hunt supply URL', () => {
    const router = httpServiceMock.createRouter();
    (router.versioned.get as jest.Mock).mockReturnValue({ addVersion: jest.fn() });
    (router.versioned.post as jest.Mock).mockReturnValue({ addVersion: jest.fn() });

    registerHuntThreatIntelSupplyRoutes({
      router,
      logger: loggingSystemMock.createLogger(),
      getSpaceId: () => 'default',
      getThreatIntelSupplyService: () => null,
    } as unknown as RouteDependencies);

    expect(router.versioned.get).toHaveBeenCalledWith(
      expect.objectContaining({ path: HUNT_THREAT_INTEL_SUPPLY_URL })
    );
  });

  it('registers the restore route at the Hunt supply restore URL', () => {
    const router = httpServiceMock.createRouter();
    (router.versioned.get as jest.Mock).mockReturnValue({ addVersion: jest.fn() });
    (router.versioned.post as jest.Mock).mockReturnValue({ addVersion: jest.fn() });

    registerHuntThreatIntelSupplyRoutes({
      router,
      logger: loggingSystemMock.createLogger(),
      getSpaceId: () => 'default',
      getThreatIntelSupplyService: () => null,
    } as unknown as RouteDependencies);

    expect(router.versioned.post).toHaveBeenCalledWith(
      expect.objectContaining({ path: HUNT_THREAT_INTEL_SUPPLY_RESTORE_URL })
    );
  });

  it('returns supply status for the current space', async () => {
    const getSupplyStatus = jest.fn().mockResolvedValue(STATUS);
    const { getHandler } = setupRoutes({
      getSupplyStatus,
      restoreSupplyForSpace: jest.fn(),
    });
    const response = httpServerMock.createResponseFactory();

    await getHandler(createRouteContextMock(), httpServerMock.createKibanaRequest(), response);

    expect(response.ok).toHaveBeenCalledWith({ body: STATUS });
  });

  it('returns restored status after a successful Restore', async () => {
    const restoreSupplyForSpace = jest.fn().mockResolvedValue({ ...STATUS, drift: false });
    const { postHandler } = setupRoutes({
      getSupplyStatus: jest.fn(),
      restoreSupplyForSpace,
    });
    const response = httpServerMock.createResponseFactory();

    await postHandler(createRouteContextMock({ manageSecurity: true }), restoreRequest(), response);

    expect(response.ok).toHaveBeenCalledWith({ body: { ...STATUS, drift: false } });
  });

  it('rejects Restore when the hard-gate fails', async () => {
    const restoreSupplyForSpace = jest
      .fn()
      .mockRejectedValue(new ThreatIntelSupplyHardGateError(['embedding_endpoint_unavailable']));
    const { postHandler } = setupRoutes({
      getSupplyStatus: jest.fn(),
      restoreSupplyForSpace,
    });
    const response = httpServerMock.createResponseFactory();

    await postHandler(createRouteContextMock({ manageSecurity: true }), restoreRequest(), response);

    expect(response.badRequest).toHaveBeenCalled();
  });

  it('rejects Restore when Hunt is off', async () => {
    const restoreSupplyForSpace = jest
      .fn()
      .mockRejectedValue(new ThreatIntelSupplyHuntDisabledError());
    const { postHandler } = setupRoutes({
      getSupplyStatus: jest.fn(),
      restoreSupplyForSpace,
    });
    const response = httpServerMock.createResponseFactory();

    await postHandler(createRouteContextMock({ manageSecurity: true }), restoreRequest(), response);

    expect(response.badRequest).toHaveBeenCalled();
  });

  it('rejects Restore when TI docs are missing', async () => {
    const restoreSupplyForSpace = jest
      .fn()
      .mockRejectedValue(new ThreatIntelSupplyNotInstalledError('ingest'));
    const { postHandler } = setupRoutes({
      getSupplyStatus: jest.fn(),
      restoreSupplyForSpace,
    });
    const response = httpServerMock.createResponseFactory();

    await postHandler(createRouteContextMock({ manageSecurity: true }), restoreRequest(), response);

    expect(response.badRequest).toHaveBeenCalledWith({
      body: {
        message: expect.stringContaining(
          'not installed in this deployment yet. Wait until setup finishes'
        ),
      },
    });
  });
});
