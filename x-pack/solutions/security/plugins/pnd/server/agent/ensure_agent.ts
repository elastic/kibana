/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import { createAgentRequest, PND_THIN_AGENT_ID } from './agent';

interface EnsureAgentParams {
  agentBuilder: AgentBuilderPluginStart;
  spaceId: string;
}

/**
 * Idempotent install of the shared thin agent in specified space.
 * Create-if-absent via `agents.ensure` — does not overwrite later user edits.
 *
 * Consider that updates to the agent should instead be made to the agent type,
 * since agent type updates ship with code deploys without rewriting the persisted agent document.
 *
 * TODO - no current concept of readonly system agents (just agent types) so users can still edit this agent
 */
export const ensureAgent = async ({ agentBuilder, spaceId }: EnsureAgentParams): Promise<void> => {
  await agentBuilder.agents.ensure({
    spaceId,
    agent: createAgentRequest(),
  });
};

type EnsureAgentSafeParams = EnsureAgentParams & {
  logger: Logger;
};
/**
 * Best-effort ensure for plugin start / space first-use. Logs and swallows so
 * Watch workflow install is not blocked if Agent Builder is unavailable or ensure fails.
 */
export const ensureAgentSafe = async ({
  agentBuilder,
  spaceId,
  logger,
}: EnsureAgentSafeParams): Promise<void> => {
  try {
    await ensureAgent({ agentBuilder, spaceId });
  } catch (error) {
    logger.error(
      `Failed to ensure PND default agent "${PND_THIN_AGENT_ID}" in space "${spaceId}": ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};
