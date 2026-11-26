/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { EndpointAppContextService } from './endpoint_app_context_services';
import {
  createMockEndpointAppContextServiceSetupContract,
  createMockEndpointAppContextServiceStartContract,
} from './mocks';

describe('test endpoint app context services', () => {
  it('should return undefined on getManifestManager if dependencies are not enabled', async () => {
    const endpointAppContextService = new EndpointAppContextService();
    expect(endpointAppContextService.getManifestManager()).toEqual(undefined);
  });

  describe('getEndpointAuthz', () => {
    let service: EndpointAppContextService;
    let startContract: ReturnType<typeof createMockEndpointAppContextServiceStartContract>;
    let fromRequest: jest.Mock;

    const startService = () => {
      startContract = createMockEndpointAppContextServiceStartContract();
      service.setup(createMockEndpointAppContextServiceSetupContract());
      service.start(startContract);
      fromRequest = startContract.fleetStartServices.authz.fromRequest as jest.Mock;
    };

    beforeEach(() => {
      service = new EndpointAppContextService();
    });

    afterEach(() => {
      service.stop();
    });

    it('does not cache by default', async () => {
      startService();
      const request = httpServerMock.createKibanaRequest();

      await service.getEndpointAuthz(request);
      await service.getEndpointAuthz(request);

      expect(fromRequest).toHaveBeenCalledTimes(2);
    });

    it('does not read from the cache when called without caching', async () => {
      startService();
      const request = httpServerMock.createKibanaRequest();

      await service.getEndpointAuthz(request, { cache: true });
      await service.getEndpointAuthz(request);

      expect(fromRequest).toHaveBeenCalledTimes(2);
    });

    it('caches the privilege resolution for the same request', async () => {
      startService();
      const request = httpServerMock.createKibanaRequest();

      await service.getEndpointAuthz(request, { cache: true });
      await service.getEndpointAuthz(request, { cache: true });

      expect(fromRequest).toHaveBeenCalledTimes(1);
      expect(fromRequest).toHaveBeenCalledWith(request);
    });

    it('resolves once for concurrent cached calls on the same request', async () => {
      startService();
      const request = httpServerMock.createKibanaRequest();

      await Promise.all([
        service.getEndpointAuthz(request, { cache: true }),
        service.getEndpointAuthz(request, { cache: true }),
      ]);

      expect(fromRequest).toHaveBeenCalledTimes(1);
    });

    it('freezes the cached result so callers cannot mutate it', async () => {
      startService();
      const request = httpServerMock.createKibanaRequest();

      const cached = await service.getEndpointAuthz(request, { cache: true });
      const uncached = await service.getEndpointAuthz(request);

      expect(Object.isFrozen(cached)).toBe(true);
      expect(Object.isFrozen(uncached)).toBe(false);
    });

    it('resolves privileges separately for different requests', async () => {
      startService();

      await service.getEndpointAuthz(httpServerMock.createKibanaRequest(), { cache: true });
      await service.getEndpointAuthz(httpServerMock.createKibanaRequest(), { cache: true });

      expect(fromRequest).toHaveBeenCalledTimes(2);
    });

    it('does not cache a rejected resolve and retries on the next call', async () => {
      startService();
      const request = httpServerMock.createKibanaRequest();
      fromRequest.mockRejectedValueOnce(new Error('transient'));

      await expect(service.getEndpointAuthz(request, { cache: true })).rejects.toThrow('transient');
      await expect(service.getEndpointAuthz(request, { cache: true })).resolves.toBeDefined();

      expect(fromRequest).toHaveBeenCalledTimes(2);
    });
  });
});
