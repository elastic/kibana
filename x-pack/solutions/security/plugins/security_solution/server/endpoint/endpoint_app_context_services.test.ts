/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { asSpaceId } from '@kbn/core-spaces-common';
import { EndpointAppContextService } from './endpoint_app_context_services';
import {
  createMockEndpointAppContextServiceSetupContract,
  createMockEndpointAppContextServiceStartContract,
} from './mocks';
import type { ResponseActionsClient } from './services';

// Keep the real `./services` module, but replace the response actions client factory so tests can
// assert exactly what `getInternalResponseActionsClient()` hands it.
jest.mock('./services', () => ({
  ...jest.requireActual('./services'),
  getResponseActionsClient: jest.fn(),
}));

import { getResponseActionsClient } from './services';

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

  describe('CPS scoped read accessors', () => {
    let service: EndpointAppContextService;
    let startContract: ReturnType<typeof createMockEndpointAppContextServiceStartContract>;
    const request = httpServerMock.createKibanaRequest();

    const startService = (cpsActive: boolean) => {
      startContract = {
        ...createMockEndpointAppContextServiceStartContract(),
        isCpsActive: jest.fn().mockResolvedValue(cpsActive),
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

    it('reports CPS as inactive when the resolver resolves to false', async () => {
      startService(false);

      expect(await service.isCpsActive(request)).toBe(false);
    });

    it('returns the internal ES client when CPS is inactive', async () => {
      startService(false);

      expect(await service.getReadEsClient(request)).toBe(startContract.esClient);
      expect(startContract.clusterClient.asScoped).not.toHaveBeenCalled();
    });

    it('reads origin-only when the resolver reports no linked projects, and never scopes the cluster client', async () => {
      // Capability and feature flag may both be on; the resolver still returns false when this
      // principal can see no linked projects (or listing them failed). That must not fan out.
      startService(false);

      expect(await service.isCpsRead(request)).toBe(false);
      expect(await service.getReadEsClient(request)).toBe(startContract.esClient);
      expect(startContract.clusterClient.asScoped).not.toHaveBeenCalled();
    });

    it('reports a read with no request identity as not fanning out, whatever the flag says', async () => {
      startService(true);

      expect(await service.isCpsRead()).toBe(false);
      expect(await service.isCpsRead(request)).toBe(true);
    });

    it('returns the internal ES client when CPS is active but the caller has no request', async () => {
      startService(true);

      expect(await service.getReadEsClient()).toBe(startContract.esClient);
      expect(startContract.clusterClient.asScoped).not.toHaveBeenCalled();
    });

    it('returns a current-user client with space project routing when CPS is active', async () => {
      startService(true);

      const client = await service.getReadEsClient(request);

      expect(startContract.clusterClient.asScoped).toHaveBeenCalledWith(request, {
        projectRouting: 'space',
      });
      expect(client).toBe(startContract.clusterClient.asScoped.mock.results[0].value.asCurrentUser);
      expect(client).not.toBe(startContract.esClient);
    });

    it('scopes the search client without project routing when CPS is inactive', async () => {
      startService(false);

      await service.getScopedSearchClient(request);

      expect(startContract.dataStart.search.asScoped).toHaveBeenCalledWith(request);
    });

    it('scopes the search client with space project routing when CPS is active', async () => {
      startService(true);

      await service.getScopedSearchClient(request);

      expect(startContract.dataStart.search.asScoped).toHaveBeenCalledWith(request, {
        projectRouting: 'space',
      });
    });
  });

  describe('asScoped', () => {
    let service: EndpointAppContextService;
    let startContract: ReturnType<typeof createMockEndpointAppContextServiceStartContract>;
    const request = httpServerMock.createKibanaRequest();

    const startService = (cpsActive: boolean) => {
      startContract = {
        ...createMockEndpointAppContextServiceStartContract(),
        isCpsActive: jest.fn().mockResolvedValue(cpsActive),
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

    it('isCpsRead() returns false when the resolver is inactive', async () => {
      startService(false);

      expect((await service.asScoped(request)).isCpsRead()).toBe(false);
    });

    it('isCpsRead() returns true when the resolver is active and a request is present', async () => {
      startService(true);

      expect((await service.asScoped(request)).isCpsRead()).toBe(true);
    });

    it('getEsClient() returns a different client than the internal one when the resolver is active', async () => {
      startService(true);

      const scoped = await service.asScoped(request);

      expect(scoped.getEsClient()).not.toBe(startContract.esClient);
    });

    it('getSpace() delegates to getActiveSpace', async () => {
      startService(true);
      const expectedSpace = {
        id: asSpaceId('some-space'),
        name: 'Some Space',
        disabledFeatures: [],
      };
      jest.spyOn(service, 'getActiveSpace').mockResolvedValue(expectedSpace);

      const result = await (await service.asScoped(request)).getSpace();

      expect(result).toBe(expectedSpace);
      expect(service.getActiveSpace).toHaveBeenCalledWith(request);
    });
  });

  describe('getCurrentUsername', () => {
    let service: EndpointAppContextService;
    let startContract: ReturnType<typeof createMockEndpointAppContextServiceStartContract>;
    let getCurrentUserMock: jest.Mock;

    const startService = () => {
      startContract = createMockEndpointAppContextServiceStartContract();
      service.setup(createMockEndpointAppContextServiceSetupContract());
      service.start(startContract);
      getCurrentUserMock = startContract.security.authc.getCurrentUser as jest.Mock;
    };

    beforeEach(() => {
      service = new EndpointAppContextService();
    });

    afterEach(() => {
      service.stop();
    });

    it("returns the authenticated user's username for the request", () => {
      startService();
      getCurrentUserMock.mockReturnValue({ username: 'some-analyst' });

      expect(service.getCurrentUsername(httpServerMock.createKibanaRequest())).toBe('some-analyst');
      expect(getCurrentUserMock).toHaveBeenCalledTimes(1);
    });

    it('returns undefined when the request is unauthenticated', () => {
      startService();
      getCurrentUserMock.mockReturnValue(null);

      expect(service.getCurrentUsername(httpServerMock.createKibanaRequest())).toBeUndefined();
    });

    it('returns undefined when the security plugin is not available', () => {
      // no setup/start — `this.security` is null
      expect(service.getCurrentUsername(httpServerMock.createKibanaRequest())).toBeUndefined();
    });
  });

  describe('getInternalResponseActionsClient', () => {
    let service: EndpointAppContextService;

    const responseActionsClientFactoryMock = getResponseActionsClient as jest.Mock;
    const fakeClient = {} as ResponseActionsClient;

    const startService = () => {
      service = new EndpointAppContextService();
      service.setup(createMockEndpointAppContextServiceSetupContract());
      service.start(createMockEndpointAppContextServiceStartContract());
    };

    beforeEach(() => {
      responseActionsClientFactoryMock.mockReset();
      responseActionsClientFactoryMock.mockReturnValue(fakeClient);
    });

    afterEach(() => {
      service.stop();
    });

    it('defaults isAutomated to true to preserve behavior for rule-triggered actions', () => {
      startService();

      const client = service.getInternalResponseActionsClient({ spaceId: 'default' });

      expect(client).toBe(fakeClient);
      expect(responseActionsClientFactoryMock).toHaveBeenCalledTimes(1);
      const [, options] = responseActionsClientFactoryMock.mock.calls[0];
      expect(options.isAutomated).toBe(true);
    });

    it('passes isAutomated: false through to the response actions client factory', () => {
      startService();

      const client = service.getInternalResponseActionsClient({
        spaceId: 'default',
        isAutomated: false,
      });

      expect(client).toBe(fakeClient);
      expect(responseActionsClientFactoryMock).toHaveBeenCalledTimes(1);
      const [, options] = responseActionsClientFactoryMock.mock.calls[0];
      expect(options.isAutomated).toBe(false);
    });

    it('throws if the service was not started', () => {
      service = new EndpointAppContextService();

      expect(() => service.getInternalResponseActionsClient({ spaceId: 'default' })).toThrow(
        /has not been started/
      );
      expect(responseActionsClientFactoryMock).not.toHaveBeenCalled();
    });
  });
});
