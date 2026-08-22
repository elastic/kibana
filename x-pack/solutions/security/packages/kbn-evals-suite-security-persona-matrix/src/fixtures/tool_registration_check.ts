/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/kbn-client';
import type { ToolingLog } from '@kbn/tooling-log';
import { personaMatrixDataset } from '../datasets';

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
 * Custom eval-seeded tools live in the Agent Builder registry; platform
 * built-ins (platform.core.*, security.*) are always present and not listed
 * here, so this check targets the eval-seeded surface only.
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
 * Pre-flight assertion: every expectedTools entry that is an eval-seeded
 * custom tool (i.e. NOT a platform.* / security.* built-in) must be registered
 * before the suite runs. A renamed or unseeded custom tool otherwise silently
 * zeroes the ExpectedToolCalled evaluator and shows up as a confusing score
 * drop rather than an actionable error. Fails fast with the missing ids.
 */
export async function assertPersonaMatrixToolsRegistered({
  kbnClient,
  log,
}: {
  kbnClient: KbnClient;
  log: ToolingLog;
}): Promise<void> {
  const expected = collectExpectedToolIds(personaMatrixDataset);
  // Only custom (eval-seeded) tools are listed in the Agent Builder registry;
  // platform.* and security.* built-ins are always available and not registered
  // as custom tools, so they're excluded from this check.
  const custom = expected.filter((id) => !id.includes('.'));
  if (custom.length === 0) {
    log.info('[persona-matrix] pre-flight: no custom expectedTools to verify');
    return;
  }
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
