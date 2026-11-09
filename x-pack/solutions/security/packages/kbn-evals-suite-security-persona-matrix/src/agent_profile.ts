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
 *    its per-model results can be reproduced. Requires SEED_PROFILE=parity; both are
 *    selected by running the `security-persona-matrix-parity` suite id.
 */
export type AgentProfile = 'default' | 'chrysalis-parity';

export const CHRYSALIS_PARITY_AGENT_ID = 'chrysalis-hunting-agent';

export const resolveAgentProfile = (raw: string | undefined): AgentProfile => {
  if (raw === undefined || raw === '' || raw === 'default') return 'default';
  if (raw === 'chrysalis-parity') return raw;
  throw new Error(`Unknown AGENT_PROFILE '${raw}'. Valid profiles: 'default', 'chrysalis-parity'.`);
};

/**
 * The registry suite id each profile runs under. The scores index records
 * `EVAL_SUITE_ID` as `suite_id` and the matrix report filters on it, so the
 * suite id is the single source for which profiles a run uses and for the
 * experiment's reporting name.
 */
export const PERSONA_MATRIX_SUITE_IDS = {
  default: 'security-persona-matrix',
  'chrysalis-parity': 'security-persona-matrix-parity',
} as const satisfies Record<AgentProfile, string>;

interface ProfileEnv {
  seed?: string;
  agent?: string;
}

/**
 * Raw SEED_PROFILE / AGENT_PROFILE values implied by `suiteId`. The parity suite id selects
 * the parity seed and agent; an explicit value that disagrees with the suite id throws,
 * since the run would otherwise land in a report it does not belong to. Other suite ids
 * pass the raw values through, except that the default suite id rejects non-default ones.
 */
export const resolveSuiteProfileEnv = (
  suiteId: string | undefined,
  raw: ProfileEnv = { seed: process.env.SEED_PROFILE, agent: process.env.AGENT_PROFILE }
): ProfileEnv => {
  const parity = suiteId === PERSONA_MATRIX_SUITE_IDS['chrysalis-parity'];
  const isDefaultSuite = suiteId === PERSONA_MATRIX_SUITE_IDS.default;
  if (!parity && !isDefaultSuite) return raw;

  const expected: Required<ProfileEnv> = parity
    ? { seed: 'parity', agent: 'chrysalis-parity' }
    : { seed: 'minimal', agent: 'default' };
  const conflicts = (['seed', 'agent'] as const).filter((key) => {
    const value = raw[key];
    return value !== undefined && value !== '' && value !== expected[key];
  });
  if (conflicts.length > 0) {
    const hint = isDefaultSuite
      ? `To run the parity profile, use \`--suite ${PERSONA_MATRIX_SUITE_IDS['chrysalis-parity']}\` instead.`
      : 'Unset it, or run the suite id that matches the profile.';
    throw new Error(
      `EVAL_SUITE_ID='${suiteId}' runs with SEED_PROFILE='${expected.seed}' and AGENT_PROFILE='${expected.agent}', ` +
        `but ${conflicts
          .map((key) => `${key === 'seed' ? 'SEED_PROFILE' : 'AGENT_PROFILE'}='${raw[key]}'`)
          .join(' and ')} was set. ${hint}`
    );
  }
  return expected;
};

export const agentProfile: AgentProfile = resolveAgentProfile(
  resolveSuiteProfileEnv(process.env.EVAL_SUITE_ID).agent
);

export const resolveAgentId = (profile: AgentProfile): string =>
  profile === 'chrysalis-parity' ? CHRYSALIS_PARITY_AGENT_ID : agentBuilderDefaultAgentId;

/**
 * The parity agent carries the external benchmark's tool ids, not the ones the
 * dataset's `expectedTools` name: the seeded `virustotal_lookup` / `on_call_lookup`
 * and the cases-management `platform.core.cases.manage`. Each pair answers the same
 * prompt (the parity agent is told to "Use create.case to open a Security case",
 * and `UnrequestedSideEffects` already treats a cases.manage create as
 * `create.case`), so the parity profile's expectations use the parity
 * equivalents; every other id is unchanged.
 */
const PARITY_EXPECTED_TOOL_ALIASES: Readonly<Record<string, string>> = {
  virustotal_lookup: 'vt.hash.lookup',
  on_call_lookup: 'check.on.call.schedule',
  'platform.core.cases.manage': 'create.case',
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
