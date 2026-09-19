/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { internalTools, platformCoreTools } from '@kbn/agent-builder-common/tools';
import { getToolCallSteps, type TaskOutput } from '@kbn/evals';

/** How the skill body was read before `load_skill` existed. */
const FILESTORE_READ_TOOL_ID = 'filestore.read';

/**
 * Tool ids the trajectory comparison ignores: the platform's knowledge lookups,
 * which resolve *what the agent knows* — which skill is relevant, what the
 * semantic metadata layer holds — rather than what the agent decided to do.
 *
 * They are not optional for any run that reaches a skill: measured on the
 * write-action boundary row, a run that declined the write correctly still
 * called `search_relevant_skills` and `platform.core.sml_search`, and a strict
 * empty `tool_sequence` failed it for read-only lookups the analyst never asked
 * for.
 *
 * API discovery is deliberately *not* here: `discover_apis` / `describe_api`
 * are the agent hunting for a way to act, and a row about the write path has to
 * keep seeing them.
 */
export const KNOWLEDGE_LOOKUP_TOOL_IDS: ReadonlySet<string> = new Set([
  FILESTORE_READ_TOOL_ID,
  internalTools.loadSkill,
  internalTools.searchRelevantSkills,
  platformCoreTools.smlSearch,
]);

/**
 * Tool ids the trajectory comparison sees: every tool call except the knowledge
 * lookups, so an explicit empty `tool_sequence` reads as "no tool call beyond
 * reading what the agent knows".
 */
export const extractTrajectoryToolIds = (output: TaskOutput): string[] =>
  getToolCallSteps(output)
    .map((step) => step.tool_id)
    .filter((id): id is string => typeof id === 'string' && !KNOWLEDGE_LOOKUP_TOOL_IDS.has(id));
