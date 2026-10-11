/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { AgentClient, AgentService } from '@kbn/fleet-plugin/server';
import {
  makeResolveHostEnrollment,
  makeScopedResolveHostEnrollment,
} from './resolve_host_enrollment';

describe('makeResolveHostEnrollment', () => {
  it('returns enrolled: false for every host when no agent client is available', async () => {
    const resolve = makeResolveHostEnrollment(undefined);
    await expect(resolve('host-a')).resolves.toEqual({ enrolled: false });
  });

  it('returns the agent id when Fleet finds an active agent for the host', async () => {
    const listAgents = jest.fn().mockResolvedValue({ agents: [{ id: 'agent-1' }], total: 1 });
    const resolve = makeResolveHostEnrollment({ listAgents } as unknown as AgentClient);

    await expect(resolve('host-a')).resolves.toEqual({ enrolled: true, agentId: 'agent-1' });
    expect(listAgents).toHaveBeenCalledWith({
      kuery: 'local_metadata.host.hostname:"host-a" or local_metadata.host.name:"host-a"',
      showInactive: false,
      perPage: 2,
    });
  });

  // A re-enrolled machine or a cloned image can leave two active agents answering to the same
  // name. The proposal this feeds isolates or kills by agent id, so resolving to the first match
  // would act on a machine nobody named.
  it('treats a host name matching more than one active agent as unenrolled', async () => {
    const logger = loggingSystemMock.createLogger();
    const listAgents = jest
      .fn()
      .mockResolvedValue({ agents: [{ id: 'agent-1' }, { id: 'agent-2' }], total: 2 });
    const resolve = makeResolveHostEnrollment({ listAgents } as unknown as AgentClient, logger);

    await expect(resolve('host-a')).resolves.toEqual({ enrolled: false });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('matches more than one active agent')
    );
  });

  it('reports an ambiguous host name even without a logger', async () => {
    const listAgents = jest
      .fn()
      .mockResolvedValue({ agents: [{ id: 'agent-1' }, { id: 'agent-2' }], total: 2 });
    const resolve = makeResolveHostEnrollment({ listAgents } as unknown as AgentClient);

    await expect(resolve('host-a')).resolves.toEqual({ enrolled: false });
  });

  // The caller collects entities from either `host.name` or `host.hostname`, and the two
  // routinely differ on one machine. Matching a single field reports an enrolled host as
  // unenrolled, which quietly turns an executable action into a recommendation.
  it('matches a host recorded under either Fleet name field', async () => {
    const listAgents = jest.fn().mockResolvedValue({ agents: [], total: 0 });
    const resolve = makeResolveHostEnrollment({ listAgents } as unknown as AgentClient);

    await resolve('web-01.corp.example.com');

    const { kuery } = listAgents.mock.calls[0][0];
    expect(kuery).toContain('local_metadata.host.hostname:"web-01.corp.example.com"');
    expect(kuery).toContain('local_metadata.host.name:"web-01.corp.example.com"');
  });

  it('returns enrolled: false when Fleet finds no agent for the host', async () => {
    const listAgents = jest.fn().mockResolvedValue({ agents: [], total: 0 });
    const resolve = makeResolveHostEnrollment({ listAgents } as unknown as AgentClient);

    await expect(resolve('host-a')).resolves.toEqual({ enrolled: false });
  });

  // Packaging runs after the hunt has written its evidence, so the report is no longer swept
  // automatically: a throw here would strand a confirmed hit outside the Proposal queue.
  it('treats the host as unenrolled when the Fleet lookup fails, rather than failing packaging', async () => {
    const logger = loggingSystemMock.createLogger();
    const listAgents = jest.fn().mockRejectedValue(new Error('Fleet unavailable'));
    const resolve = makeResolveHostEnrollment({ listAgents } as unknown as AgentClient, logger);

    await expect(resolve('host-a')).resolves.toEqual({ enrolled: false });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Fleet unavailable'));
  });

  it('reports a failed lookup even without a logger', async () => {
    const listAgents = jest.fn().mockRejectedValue(new Error('Fleet unavailable'));
    const resolve = makeResolveHostEnrollment({ listAgents } as unknown as AgentClient);

    await expect(resolve('host-a')).resolves.toEqual({ enrolled: false });
  });

  it('escapes quotes and backslashes in the host name before building the kuery', async () => {
    const listAgents = jest.fn().mockResolvedValue({ agents: [], total: 0 });
    const resolve = makeResolveHostEnrollment({ listAgents } as unknown as AgentClient);

    await resolve('weird"host\\name');
    expect(listAgents).toHaveBeenCalledWith(
      expect.objectContaining({
        kuery:
          'local_metadata.host.hostname:"weird\\"host\\\\name" or local_metadata.host.name:"weird\\"host\\\\name"',
      })
    );
  });
});

describe('makeScopedResolveHostEnrollment', () => {
  const agentService = (listAgents = jest.fn()) => {
    const asInternalScopedUser = jest.fn(() => ({ listAgents } as unknown as AgentClient));
    return { service: { asInternalScopedUser } as unknown as AgentService, asInternalScopedUser };
  };

  it('scopes the agent lookup to the space it is called with', async () => {
    const listAgents = jest.fn().mockResolvedValue({ agents: [{ id: 'agent-1' }], total: 1 });
    const { service, asInternalScopedUser } = agentService(listAgents);

    const resolve = makeScopedResolveHostEnrollment(() => service)('space-a');
    await expect(resolve('host-a')).resolves.toEqual({ enrolled: true, agentId: 'agent-1' });

    expect(asInternalScopedUser).toHaveBeenCalledWith('space-a');
  });

  it('resolves a client per space rather than reusing one across spaces', () => {
    const { service, asInternalScopedUser } = agentService();
    const scoped = makeScopedResolveHostEnrollment(() => service);

    scoped('space-a');
    scoped('space-b');

    expect(asInternalScopedUser.mock.calls).toEqual([['space-a'], ['space-b']]);
  });

  it('reads the service lazily, so steps registered before start still get it', async () => {
    const listAgents = jest.fn().mockResolvedValue({ agents: [{ id: 'agent-1' }], total: 1 });
    const { service } = agentService(listAgents);
    const getAgentService = jest.fn<AgentService | undefined, []>().mockReturnValue(undefined);

    const scoped = makeScopedResolveHostEnrollment(getAgentService);
    await expect(scoped('space-a')('host-a')).resolves.toEqual({ enrolled: false });

    getAgentService.mockReturnValue(service);
    await expect(scoped('space-a')('host-a')).resolves.toEqual({
      enrolled: true,
      agentId: 'agent-1',
    });
  });

  it('treats every host as unenrolled when Fleet is absent', async () => {
    const resolve = makeScopedResolveHostEnrollment(() => undefined)('space-a');
    await expect(resolve('host-a')).resolves.toEqual({ enrolled: false });
  });

  it('never falls back to an unscoped client when the space is empty', async () => {
    const { service, asInternalScopedUser } = agentService();

    const resolve = makeScopedResolveHostEnrollment(() => service)('');
    await expect(resolve('host-a')).resolves.toEqual({ enrolled: false });

    expect(asInternalScopedUser).not.toHaveBeenCalled();
  });
});
