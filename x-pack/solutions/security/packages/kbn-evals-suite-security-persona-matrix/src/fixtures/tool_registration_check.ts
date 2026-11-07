/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/kbn-client';
import type { ToolingLog } from '@kbn/tooling-log';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { personaMatrixDataset } from '../datasets';
import { type AgentProfile, withProfileExpectedTools } from '../agent_profile';
import { PERSONA_MATRIX_PARITY_TOOL_IDS } from './persona_matrix_tools_seed';

/**
 * Collects every expectedTools entry declared across the dataset's examples.
 */
export function collectExpectedToolIds(
  dataset: Array<{ metadata?: { expectedTools?: string[] } }>
): string[] {
  const ids = new Set<string>();
  for (const ex of dataset) {
    for (const t of ex.metadata?.expectedTools ?? []) {
      ids.add(t);
    }
  }
  return [...ids].sort();
}

interface AgentBuilderTool {
  id: string;
}

/**
 * Returns the subset of `toolIds` that are NOT registered in Agent Builder.
 * Works for any tool id the registry lists: custom eval-seeded tools and, where
 * the caller asks, availability-gated built-ins (platform.core.*, security.*).
 */
export async function findUnregisteredToolIds(
  kbnClient: KbnClient,
  toolIds: string[]
): Promise<string[]> {
  let registered: AgentBuilderTool[] = [];
  try {
    const response = await kbnClient.request<{
      results?: AgentBuilderTool[];
      tools?: AgentBuilderTool[];
    }>({
      method: 'GET',
      path: '/api/agent_builder/tools',
      query: { per_page: 1000 },
      headers: {
        'kbn-xsrf': 'persona-matrix-tool-check',
        // Public versioned API: date format required, like the seed client.
        // '1' is rejected with 400 "Invalid version".
        'elastic-api-version': '2023-10-31',
        'x-elastic-internal-origin': 'kbn-evals',
      },
    });
    const body = (response as { data?: unknown }).data ?? response;
    const list = body as { results?: AgentBuilderTool[]; tools?: AgentBuilderTool[] };
    registered = list.results ?? list.tools ?? [];
  } catch (error) {
    // If we can't list tools, don't block the suite on a guess — return all as
    // unverified-but-not-missing is wrong; surface the failure instead.
    throw new Error(`tool-registration pre-flight: failed to list Agent Builder tools: ${error}`);
  }
  const present = new Set(registered.map((t) => t.id));
  return toolIds.filter((id) => !present.has(id));
}

/**
 * Built-ins that are injected into an agent run's tool set at execution time
 * (run_agent/utils/select_tools) and therefore never appear in the registry
 * tools list. Their absence there is by design, not an availability gate.
 */
const CONVERSATION_SCOPED_TOOL_PREFIXES = ['attachments.'];

/**
 * The subset of expected built-in tool ids whose presence must be asserted via
 * the public tools list — i.e. excluding conversation-scoped ones.
 */
export function selectListAssertableBuiltins(toolIds: string[]): string[] {
  return toolIds.filter(
    (id) =>
      id.includes('.') && !CONVERSATION_SCOPED_TOOL_PREFIXES.some((prefix) => id.startsWith(prefix))
  );
}

/**
 * Pre-flight assertion: every expectedTools entry that is an eval-seeded
 * custom tool (i.e. NOT a platform.* / security.* built-in) must be registered
 * before the suite runs. A renamed or unseeded custom tool otherwise silently
 * zeroes the ExpectedToolCalled evaluator and shows up as a confusing score
 * drop rather than an actionable error. Fails fast with the missing ids.
 */
export async function assertPersonaMatrixToolsRegistered({
  kbnClient,
  log,
  examples = personaMatrixDataset,
  agentId = agentBuilderDefaultAgentId,
  profile = 'default',
}: {
  kbnClient: KbnClient;
  log: ToolingLog;
  /** Agent profile; the parity agent is checked against its own tool ids. */
  profile?: AgentProfile;
  /** Agent the run converses with; its configuration must carry the custom tools. */
  agentId?: string;
  /** Examples that will actually run; tools of filtered-out examples are not required. */
  examples?: Array<{ metadata?: { expectedTools?: string[] } }>;
}): Promise<void> {
  const expected = collectExpectedToolIds(withProfileExpectedTools(examples, profile));
  // Custom (eval-seeded) tools must be registered by the suite; built-ins
  // (platform.* / security.*) are not seeded, so they skip the registration
  // check here and are asserted against the public tools list separately below.
  const custom = expected.filter((id) => !id.includes('.'));
  if (custom.length === 0) {
    log.info('[persona-matrix] pre-flight: no custom expectedTools to verify');
  } else {
    const missing = await findUnregisteredToolIds(kbnClient, custom);
    if (missing.length > 0) {
      throw new Error(
        `[persona-matrix] pre-flight tool-registration check failed: expected custom tools not registered: ${missing.join(
          ', '
        )}. Seed them via seedPersonaMatrixTools before running the suite.`
      );
    }
    log.info(
      `[persona-matrix] pre-flight: ${custom.length} custom tools registered (${custom.join(', ')})`
    );
  }

  // BUILT-IN EXPECTED TOOLS: registration alone is not enough. The public
  // tools list already excludes built-ins whose availability handler returned
  // unavailable (skills flags, missing indices, license gates), and the model
  // sees exactly that filtered list — so an expected built-in that is
  // availability-gated off in this stack zeroes ExpectedToolCalled for every
  // example declaring it. This is how security.entity_risk_score scored 0 on
  // 34/34 runs before its availability contract was understood.
  const builtins = selectListAssertableBuiltins(expected);
  if (builtins.length > 0) {
    const gatedOff = await findUnregisteredToolIds(kbnClient, builtins);
    if (gatedOff.length > 0) {
      throw new Error(
        `[persona-matrix] pre-flight tool-availability check failed: expected built-in tools ` +
          `not exposed by the Agent Builder tools list (availability-gated off in this stack): ` +
          `${gatedOff.join(', ')}. Fix the environment or the expectedTools contract — ` +
          `running anyway would silently score these examples 0.`
      );
    }
    log.info(
      `[persona-matrix] pre-flight: ${builtins.length} built-in expectedTools exposed by the tools list`
    );
  }

  // Registration is necessary but NOT sufficient: `selectTools` only exposes
  // tools attached to the agent's configuration plus `defaultAgentToolIds`.
  // A registered-but-unattached tool is invisible to the model, which zeroes
  // ExpectedToolCalled while every other signal looks healthy.
  // Parity tool ids contain dots, so the custom filter above misses them.
  const parityIds: readonly string[] = PERSONA_MATRIX_PARITY_TOOL_IDS;
  const mustBeAttached = [...custom, ...expected.filter((id) => parityIds.includes(id))];
  if (mustBeAttached.length === 0) {
    return;
  }
  const unattached = await findUnattachedToolIds(kbnClient, mustBeAttached, agentId);
  if (unattached.length > 0) {
    throw new Error(
      `[persona-matrix] pre-flight tool-attachment check failed: tools registered but not attached ` +
        `to agent '${agentId}': ${unattached.join(', ')}. ` +
        `Call seedPersonaMatrixTools, which attaches them, before running the suite.`
    );
  }
  log.info(`[persona-matrix] pre-flight: expected tools attached to '${agentId}'`);
}

export async function findUnattachedToolIds(
  kbnClient: KbnClient,
  toolIds: readonly string[],
  agentId: string = agentBuilderDefaultAgentId
): Promise<string[]> {
  const response = await kbnClient.request<{
    configuration?: { tools?: Array<{ tool_ids?: string[] }> };
  }>({
    method: 'GET',
    path: `/api/agent_builder/agents/${agentId}`,
    headers: {
      'kbn-xsrf': 'persona-matrix-tool-check',
      'elastic-api-version': '2023-10-31',
    },
  });
  const attached = new Set(
    (response.data?.configuration?.tools ?? []).flatMap((entry) => entry.tool_ids ?? [])
  );
  return toolIds.filter((id) => !attached.has(id));
}
