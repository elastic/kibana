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

  describe('isCcsEnabled', () => {
    let service: EndpointAppContextService;
    let startContract: ReturnType<typeof createMockEndpointAppContextServiceStartContract>;

    const remoteInfoMock = () => startContract.esClient.cluster.remoteInfo as unknown as jest.Mock;

    const startService = (defendRemoteOutputCcs: boolean) => {
      const base = createMockEndpointAppContextServiceStartContract();
      startContract = {
        ...base,
        experimentalFeatures: { ...base.experimentalFeatures, defendRemoteOutputCcs },
      };
      service.setup(createMockEndpointAppContextServiceSetupContract());
      service.start(startContract);
    };

    beforeEach(() => {
      service = new EndpointAppContextService();
    });

    afterEach(() => {
      service.stop();
    });

    it('returns false without calling remoteInfo when the feature flag is disabled', async () => {
      startService(false);

      expect(await service.isCcsEnabled()).toBe(false);
      expect(remoteInfoMock()).not.toHaveBeenCalled();
    });

    it('returns true when the flag is on and a remote cluster is connected', async () => {
      startService(true);
      remoteInfoMock().mockResolvedValue({ remote_a: { connected: true } });

      expect(await service.isCcsEnabled()).toBe(true);
    });

    it('returns false when the flag is on but no remote cluster is connected', async () => {
      startService(true);
      remoteInfoMock().mockResolvedValue({ remote_a: { connected: false } });

      expect(await service.isCcsEnabled()).toBe(false);
    });

    it('caches the remote-cluster check within the TTL', async () => {
      startService(true);
      remoteInfoMock().mockResolvedValue({ remote_a: { connected: true } });

      await service.isCcsEnabled();
      await service.isCcsEnabled();

      expect(remoteInfoMock()).toHaveBeenCalledTimes(1);
    });

    it('does not cache a transient remoteInfo failure and retries on the next call', async () => {
      startService(true);
      remoteInfoMock()
        .mockRejectedValueOnce(new Error('transient'))
        .mockResolvedValue({ remote_a: { connected: true } });

      // first call hits the transient failure -> false, and must NOT be cached
      expect(await service.isCcsEnabled()).toBe(false);
      // next call retries instead of serving the stale false, and sees the recovered remote
      expect(await service.isCcsEnabled()).toBe(true);
      expect(remoteInfoMock()).toHaveBeenCalledTimes(2);
    });
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
