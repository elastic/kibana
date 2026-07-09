/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Stub: the real skill tool implementation lands in PR8 (Skills). PR3
// imports the symbols (id + factory + type) so attack_discovery_generator_skill
// and register_skills can type-check FF-off. The tool is never registered
// at runtime when the feature flag is OFF.

import { ToolType } from '@kbn/agent-builder-common';
import type { SkillBoundedTool } from '@kbn/agent-builder-server/skills';

export const GET_ATTACK_DISCOVERY_STATUS_TOOL_ID = 'security.attack-discovery.get_status' as const;

export interface WorkflowExecutionLookup {
  // Shape mirrors `workflowsManagementApi.getWorkflowExecution`; callers in
  // PR3 (plugin.ts) construct this from that API. Kept permissive on the
  // return type so PR8's real impl can refine without breaking the stub
  // contract.
  getWorkflowExecution: (
    executionId: string,
    spaceId: string,
    options?: { includeInput?: boolean; includeOutput?: boolean }
  ) => Promise<unknown>;
}

// Return type is `SkillBoundedTool` so callers that assemble
// `getInlineTools: () => [...]` arrays type-check; the placeholder is
// never actually invoked unless the FF is on (skill is FF-gated).
export const getAttackDiscoveryStatusTool = (_deps: unknown): SkillBoundedTool =>
  ({
    id: GET_ATTACK_DISCOVERY_STATUS_TOOL_ID,
    type: ToolType.builtin,
  } as unknown as SkillBoundedTool);
