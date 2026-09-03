/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import { loggerMock } from '@kbn/logging-mocks';

import { PND_AGENTS } from '../pnd_agents';
import { createPndAgentInstaller } from '.';

const createAgentBuilder = () => {
  const ensure = jest.fn().mockResolvedValue(undefined);
  return { agentBuilder: { agents: { ensure } } as unknown as AgentBuilderPluginStart, ensure };
};

const createInstaller = () => {
  const logger = loggerMock.create();
  return { installer: createPndAgentInstaller({ logger }), logger };
};

describe('createPndAgentInstaller', () => {
  it('ensures every PND agent in the request space', async () => {
    const { agentBuilder, ensure } = createAgentBuilder();
    const { installer } = createInstaller();

    await installer.ensurePndAgents({ agentBuilder, spaceId: 'agent-2' });

    expect(ensure.mock.calls.map(([{ agent, spaceId }]) => [agent.id, spaceId])).toEqual(
      PND_AGENTS.map(({ id }) => [id, 'agent-2'])
    );
  });

  it('reports the agents as installed once they are ensured', async () => {
    const { agentBuilder } = createAgentBuilder();
    const { installer } = createInstaller();

    await expect(installer.ensurePndAgents({ agentBuilder, spaceId: 'agent-2' })).resolves.toBe(
      true
    );
  });

  it('ensures each agent exactly once for a space it has already installed', async () => {
    const { agentBuilder, ensure } = createAgentBuilder();
    const { installer } = createInstaller();

    await installer.ensurePndAgents({ agentBuilder, spaceId: 'agent-2' });
    await installer.ensurePndAgents({ agentBuilder, spaceId: 'agent-2' });

    expect(ensure).toHaveBeenCalledTimes(PND_AGENTS.length);
  });

  it('still reports installed on a repeat call for the same space', async () => {
    const { agentBuilder } = createAgentBuilder();
    const { installer } = createInstaller();

    await installer.ensurePndAgents({ agentBuilder, spaceId: 'agent-2' });

    await expect(installer.ensurePndAgents({ agentBuilder, spaceId: 'agent-2' })).resolves.toBe(
      true
    );
  });

  // Agents are per-space and a space can be created long after `start()`, which is why this installs
  // from a route handler rather than at start-time. The guard must therefore be keyed per space.
  it('installs again for a space it has not seen', async () => {
    const { agentBuilder, ensure } = createAgentBuilder();
    const { installer } = createInstaller();

    await installer.ensurePndAgents({ agentBuilder, spaceId: 'agent-2' });
    await installer.ensurePndAgents({ agentBuilder, spaceId: 'other-space' });

    expect(ensure).toHaveBeenCalledTimes(PND_AGENTS.length * 2);
  });

  it('is a no-op when Agent Builder is absent', async () => {
    const { installer } = createInstaller();

    await expect(installer.ensurePndAgents({ spaceId: 'agent-2' })).resolves.toBe(false);
  });

  it('never throws when Agent Builder is absent', async () => {
    const { installer } = createInstaller();

    await expect(installer.ensurePndAgents({ spaceId: 'agent-2' })).resolves.not.toThrow();
  });

  // The caller returns the agent ids only when this resolves `true`, so a failed install degrades to
  // "no agent-id" — the `ai.agent` step falls back to the default agent instead of hard-failing on
  // an agent that was never ensured (ADR-011).
  it('reports not installed when ensuring an agent fails', async () => {
    const { agentBuilder, ensure } = createAgentBuilder();
    ensure.mockRejectedValue(new Error('boom'));
    const { installer } = createInstaller();

    await expect(installer.ensurePndAgents({ agentBuilder, spaceId: 'agent-2' })).resolves.toBe(
      false
    );
  });

  it('never throws when ensuring an agent fails', async () => {
    const { agentBuilder, ensure } = createAgentBuilder();
    ensure.mockRejectedValue(new Error('boom'));
    const { installer } = createInstaller();

    await expect(
      installer.ensurePndAgents({ agentBuilder, spaceId: 'agent-2' })
    ).resolves.not.toThrow();
  });

  it('logs the failure so a missing agent is diagnosable', async () => {
    const { agentBuilder, ensure } = createAgentBuilder();
    ensure.mockRejectedValue(new Error('boom'));
    const { installer, logger } = createInstaller();

    await installer.ensurePndAgents({ agentBuilder, spaceId: 'agent-2' });

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('agent-2'));
  });

  it('retries on the next call rather than poisoning the space after a failure', async () => {
    const { agentBuilder, ensure } = createAgentBuilder();
    ensure.mockRejectedValueOnce(new Error('boom'));
    const { installer } = createInstaller();

    await installer.ensurePndAgents({ agentBuilder, spaceId: 'agent-2' });

    await expect(installer.ensurePndAgents({ agentBuilder, spaceId: 'agent-2' })).resolves.toBe(
      true
    );
  });

  it('scopes the guard to its own instance', async () => {
    const { agentBuilder, ensure } = createAgentBuilder();
    const first = createInstaller();
    const second = createInstaller();

    await first.installer.ensurePndAgents({ agentBuilder, spaceId: 'agent-2' });
    await second.installer.ensurePndAgents({ agentBuilder, spaceId: 'agent-2' });

    expect(ensure).toHaveBeenCalledTimes(PND_AGENTS.length * 2);
  });
});
