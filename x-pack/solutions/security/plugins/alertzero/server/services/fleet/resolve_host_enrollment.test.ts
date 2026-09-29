/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentClient } from '@kbn/fleet-plugin/server';
import { makeResolveHostEnrollment } from './resolve_host_enrollment';

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
      kuery: 'local_metadata.host.hostname:"host-a"',
      showInactive: false,
      perPage: 1,
    });
  });

  it('returns enrolled: false when Fleet finds no agent for the host', async () => {
    const listAgents = jest.fn().mockResolvedValue({ agents: [], total: 0 });
    const resolve = makeResolveHostEnrollment({ listAgents } as unknown as AgentClient);

    await expect(resolve('host-a')).resolves.toEqual({ enrolled: false });
  });

  it('escapes quotes and backslashes in the host name before building the kuery', async () => {
    const listAgents = jest.fn().mockResolvedValue({ agents: [], total: 0 });
    const resolve = makeResolveHostEnrollment({ listAgents } as unknown as AgentClient);

    await resolve('weird"host\\name');
    expect(listAgents).toHaveBeenCalledWith(
      expect.objectContaining({ kuery: 'local_metadata.host.hostname:"weird\\"host\\\\name"' })
    );
  });
});
