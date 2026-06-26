/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentRegistry } from '@kbn/agent-builder-server';
import { ERROR_SENTRY_AGENT_ID } from '../../common/constants';
import { detectiveRalphCreateRequest, SCS_TOOL_IDS } from '../agent/detective_ralph';

const EXPECTED_TOOL_IDS = new Set<string>(SCS_TOOL_IDS);
const EXPECTED_INSTRUCTIONS = detectiveRalphCreateRequest.configuration.instructions;

const hasExpectedTools = (toolSelections: Array<{ tool_ids: string[] }>): boolean => {
  const actual = new Set(toolSelections.flatMap((s) => s.tool_ids));
  if (actual.size !== EXPECTED_TOOL_IDS.size) return false;
  for (const id of EXPECTED_TOOL_IDS) {
    if (!actual.has(id)) return false;
  }
  return true;
};

export const installDetectiveRalph = async (registry: AgentRegistry): Promise<void> => {
  const exists = await registry.has(ERROR_SENTRY_AGENT_ID);

  if (!exists) {
    await registry.create(detectiveRalphCreateRequest);
    return;
  }

  const ralph = await registry.get(ERROR_SENTRY_AGENT_ID);
  const needsUpdate =
    !hasExpectedTools(ralph.configuration.tools) ||
    ralph.configuration.instructions !== EXPECTED_INSTRUCTIONS;

  if (needsUpdate) {
    await registry.delete({ id: ERROR_SENTRY_AGENT_ID });
    await registry.create(detectiveRalphCreateRequest);
  }
};
