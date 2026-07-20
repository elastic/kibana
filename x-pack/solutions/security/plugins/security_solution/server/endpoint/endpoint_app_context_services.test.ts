/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
});
