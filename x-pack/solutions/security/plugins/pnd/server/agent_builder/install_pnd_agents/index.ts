/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';

import { PND_AGENTS } from '../pnd_agents';

export interface EnsurePndAgentsParams {
  /**
   * Agent Builder's start contract. Optional because `agentBuilder` is an **optional** PND plugin
   * dependency: on a deployment without it the installer is a no-op and the caller omits the agent
   * ids, so the orchestrators fall back to the default agent.
   */
  agentBuilder?: AgentBuilderPluginStart;
  /** Space resolved from the request (security finding S9). Agents are per-space. */
  spaceId: string;
}

export interface PndAgentInstaller {
  /**
   * Ensure the three per-phase PND agents exist in `spaceId`.
   *
   * Resolves `true` only when every agent is present, which is the caller's signal that it may
   * return the agent ids. Resolves `false` — never rejects — when Agent Builder is absent or an
   * `ensure` failed.
   */
  ensurePndAgents: (params: EnsurePndAgentsParams) => Promise<boolean>;
}

/**
 * Create the per-space, idempotent installer for the three PND agents (plan A2).
 *
 * **Why this installs from a route handler rather than at `start()`.** Agents are per-space, and
 * enumerating spaces at start-time still misses every space created later. So installation is a side
 * effect of the first `GET /internal/pnd/conversations/_derive` in a space — the same just-in-time
 * pattern `significant_events` uses for its discovery agents. `agents.ensure()` is itself idempotent
 * (it treats an existing agent, and a concurrent create, as success, and never overwrites later user
 * edits), so the in-memory `Set` is a redundant-work guard, not a correctness one: it keeps the
 * steady-state cost of `_derive` at zero extra requests. It is deliberately per-instance rather than
 * module state, so a restart re-verifies and tests cannot leak state into one another.
 *
 * **Why a failure is not an error.** The caller returns the agent ids only when this resolves `true`.
 * That makes agent existence and agent-id availability succeed or degrade **together** (ADR-011): a
 * failed install means `_derive` omits `investigationAgentId` / `incidentAgentId` / `tuningAgentId`,
 * the YAML's `agent-id` renders empty, and `run_agent_step` falls back to the default agent — rather
 * than pointing an `ai.agent` step at an agent that was never ensured, which would hard-fail the
 * step. Preparing conversation context must never be the reason a Watch cannot run.
 */
export const createPndAgentInstaller = ({ logger }: { logger: Logger }): PndAgentInstaller => {
  const installedSpaces = new Set<string>();

  return {
    ensurePndAgents: async ({ agentBuilder, spaceId }) => {
      if (agentBuilder == null) {
        logger.debug(
          () => `Agent Builder is unavailable; skipping PND agent installation in "${spaceId}"`
        );
        return false;
      }

      if (installedSpaces.has(spaceId)) {
        return true;
      }

      try {
        await Promise.all(
          PND_AGENTS.map((agent) => agentBuilder.agents.ensure({ agent, spaceId }))
        );

        installedSpaces.add(spaceId);
        logger.debug(() => `Ensured the PND Agent Builder agents in space "${spaceId}"`);
        return true;
      } catch (error) {
        // Not cached, so the next `_derive` retries.
        logger.error(
          `Failed to install the PND Agent Builder agents in space "${spaceId}": ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        return false;
      }
    },
  };
};
