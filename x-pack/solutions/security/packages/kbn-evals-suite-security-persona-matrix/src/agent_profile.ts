/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';

/**
 * Agent profile:
 *  - `default`: converse with the built-in Elastic AI Agent, the way users reach
 *    shipped skills. Weekly matrix runs always use this profile.
 *  - `chrysalis-parity`: converse with a dedicated agent that mirrors the one used
 *    by the external EIS model benchmark (its tools, skills and instructions), so
 *    its per-model results can be reproduced. Requires SEED_PROFILE=parity.
 */
export type AgentProfile = 'default' | 'chrysalis-parity';

export const CHRYSALIS_PARITY_AGENT_ID = 'chrysalis-hunting-agent';

export const resolveAgentProfile = (raw: string | undefined): AgentProfile => {
  if (raw === undefined || raw === '' || raw === 'default') return 'default';
  if (raw === 'chrysalis-parity') return raw;
  throw new Error(`Unknown AGENT_PROFILE '${raw}'. Valid profiles: 'default', 'chrysalis-parity'.`);
};

export const agentProfile: AgentProfile = resolveAgentProfile(process.env.AGENT_PROFILE);

export const resolveAgentId = (profile: AgentProfile): string =>
  profile === 'chrysalis-parity' ? CHRYSALIS_PARITY_AGENT_ID : agentBuilderDefaultAgentId;

/**
 * The parity agent carries the external benchmark's tool ids, not the seeded
 * `virustotal_lookup` / `on_call_lookup` the dataset's `expectedTools` name. Both
 * lookups answer the same prompt, so the parity profile's expectations use the
 * parity equivalents; every other id is unchanged.
 */
const PARITY_EXPECTED_TOOL_ALIASES: Readonly<Record<string, string>> = {
  virustotal_lookup: 'vt.hash.lookup',
  on_call_lookup: 'check.on.call.schedule',
};

export const resolveExpectedToolId = (toolId: string, profile: AgentProfile): string =>
  (profile === 'chrysalis-parity' && PARITY_EXPECTED_TOOL_ALIASES[toolId]) || toolId;

/** Copy of `examples` whose `metadata.expectedTools` name the tools `profile`'s agent has. */
export const withProfileExpectedTools = <
  T extends { metadata?: { expectedTools?: string[] } & Record<string, unknown> }
>(
  examples: readonly T[],
  profile: AgentProfile
): T[] =>
  examples.map((example) =>
    profile === 'default' || !example.metadata?.expectedTools
      ? example
      : {
          ...example,
          metadata: {
            ...example.metadata,
            expectedTools: example.metadata.expectedTools.map((id) =>
              resolveExpectedToolId(id, profile)
            ),
          },
        }
  );
