/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { attachmentTools, internalTools } from '@kbn/agent-builder-common';
import type { AttackDiscoveryAgentBuilderExample } from '../types';

/**
 * One definition of "a call the model did not choose", shared by the two metrics
 * that count tool calls, so they grade the same work:
 *
 * - `StrictTrajectory` divides its expected path by these calls' complement
 *   (precision),
 * - `CostPerAlert` divides the same complement by the alerts the run passed
 *   (cost).
 *
 * A call is non-investigative for one of two reasons: the harness pays it on
 * every run whatever route the model picks, or the platform's/example's own
 * contract requires it. Neither is a routing decision, so counting either
 * against the model measures the scaffolding instead of the investigation.
 */

/**
 * Calls the harness pays on every run, whatever route the model picks.
 * `load_skill` is how the skill that carries the expected tool path is reached,
 * so it has never counted against precision.
 */
export const HARNESS_TOOL_CALLS = [internalTools.loadSkill];

/**
 * Calls the platform's own instructions make on any multi-step task, so they
 * measure the platform's bookkeeping contract rather than the model's route.
 *
 * - `write_todos` — its own tool description tells the agent to "use this tool
 *   frequently", for "any task that requires 3 or more distinct actions" and
 *   "after receiving new instructions". Every example in this suite is such a
 *   task, so the call is the platform's plan-tracking requirement, not an
 *   investigative choice.
 * - `attachments.add` — the report contract. The generator skill's own output
 *   format renders the attack flow graph as an attachment (`attachments.add`,
 *   type `graph`), so a compliant report pays the write-back.
 *
 * The ids come from the platform's own tool registry, so a rename in Agent
 * Builder updates this exclusion instead of silently scoring scaffolding
 * against the model.
 */
export const BOOKKEEPING_TOOL_CALLS = [internalTools.writeTodos, attachmentTools.add];

/**
 * Calls the EXAMPLE's own contract forces on a compliant run.
 *
 * An example that hands its alerts as an attachment cannot be answered without
 * reading that attachment, so the read is the fixture's requirement and not a
 * routing decision the model made.
 *
 * The exclusion is conditional on the example declaring attachments, so an
 * attachment read on an example that ships none is still counted as the
 * mis-route it is.
 */
export const fixtureRequiredToolCalls = (
  input: AttackDiscoveryAgentBuilderExample['input'] | undefined
): string[] => (input?.attachments?.length ? [attachmentTools.read] : []);

export const excludedToolCallIds = (
  input: AttackDiscoveryAgentBuilderExample['input'] | undefined
): Set<string> =>
  new Set([...HARNESS_TOOL_CALLS, ...BOOKKEEPING_TOOL_CALLS, ...fixtureRequiredToolCalls(input)]);

/**
 * Splits a recorded tool sequence into the calls that express an investigative
 * choice and the ones the harness, the platform or the fixture paid for.
 */
export const partitionToolCalls = (
  toolIds: string[],
  input: AttackDiscoveryAgentBuilderExample['input'] | undefined
): { investigativeToolCalls: string[]; excludedToolCalls: string[] } => {
  const excluded = excludedToolCallIds(input);
  return {
    investigativeToolCalls: toolIds.filter((toolId) => !excluded.has(toolId)),
    excludedToolCalls: toolIds.filter((toolId) => excluded.has(toolId)),
  };
};
