/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { collectOnboardingStatus } from '../lib/onboarding';
import { createContext, createRequest, createResponse, setupRoute } from './route_harness.mock';
import { registerOnboardingStatusRoute } from './onboarding_status';

jest.mock('../lib/onboarding', () => ({ collectOnboardingStatus: jest.fn() }));

const collect = collectOnboardingStatus as jest.MockedFunction<typeof collectOnboardingStatus>;

const createServices = () => {
  const asScoped = jest.fn().mockReturnValue({ listAgents: jest.fn() });
  return {
    fleet: { agentPolicyService: { list: jest.fn() }, agentService: { asScoped } },
    workflows: { getWorkflow: jest.fn() },
    es: {},
    packRepository: {},
    asScoped,
  };
};

describe('GET onboarding status', () => {
  beforeEach(() => collect.mockReset());

  it('is an internal route that needs fleet-agent-policies-read', () => {
    const { routeOptions, versionConfig } = setupRoute(registerOnboardingStatusRoute, 'get');
    expect(routeOptions.access).toBe('internal');
    expect(routeOptions.path).toBe('/internal/native_vuln_scanner/onboarding/status');
    expect(routeOptions.security.authz.requiredPrivileges).toEqual(['fleet-agent-policies-read']);
    expect(versionConfig.version).toBe('1');
  });

  it('answers 200 license insufficient below Enterprise instead of 403', async () => {
    const { handler } = setupRoute(registerOnboardingStatusRoute, 'get', {
      licenseType: 'platinum',
      services: createServices() as never,
    });
    const response = createResponse();
    await handler(createContext(), createRequest(), response);
    expect(response.ok).toHaveBeenCalledWith({ body: { license: 'insufficient' } });
    expect(collect).not.toHaveBeenCalled();
  });

  it('returns the aggregated status using request-scoped clients', async () => {
    const services = createServices();
    const status = { license: 'ok', policies: [] };
    collect.mockResolvedValue(status as never);
    const soClient = savedObjectsClientMock.create();
    const es = services.es;
    const { handler } = setupRoute(registerOnboardingStatusRoute, 'get', {
      services: services as never,
    });
    const request = createRequest();
    const response = createResponse();

    await handler(
      createContext({
        savedObjects: { client: soClient },
      }),
      request,
      response
    );

    expect(services.asScoped).toHaveBeenCalledWith(request);
    expect(collect).toHaveBeenCalledWith(
      expect.objectContaining({
        request,
        soClient,
        esInternal: es,
        agentPolicyService: services.fleet.agentPolicyService,
      })
    );
    expect(response.ok).toHaveBeenCalledWith({ body: status });
  });

  it('answers 503 when Fleet is not available', async () => {
    const { handler } = setupRoute(registerOnboardingStatusRoute, 'get', { services: {} });
    const response = createResponse();
    await handler(createContext(), createRequest(), response);
    expect(response.customError).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 503,
        body: expect.objectContaining({ attributes: { code: 'FLEET_UNAVAILABLE' } }),
      })
    );
  });

  it('answers 500 when collecting the status fails', async () => {
    collect.mockRejectedValue(new Error('boom'));
    const { handler, logger } = setupRoute(registerOnboardingStatusRoute, 'get', {
      services: createServices() as never,
    });
    const response = createResponse();
    await handler(
      createContext({
        savedObjects: { client: {} },
        elasticsearch: { client: { asCurrentUser: {} } },
      }),
      createRequest(),
      response
    );
    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: { message: 'boom' },
    });
    expect(logger.error).toHaveBeenCalled();
  });
});
