/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator, TaskOutput } from '@kbn/evals';
import { internalTools } from '@kbn/agent-builder-common';
import type { SecurityDatasetExample } from './evaluate_dataset';

/**
 * Mirrors the tool id constants exported by the endpoint response actions
 * skill (`security_solution/server/agent_builder/skills/endpoint_response_actions/index.ts`).
 * The plugin's server entry cannot be imported from a functional-tests package,
 * so the contract is pinned here and by the unit tests in
 * `endpoint_response_actions_routing_evaluator.test.ts`.
 */
export const ENDPOINT_RESPONSE_ACTIONS_SKILL_ID = 'endpoint-response-actions';
const TROUBLESHOOTING_SKILL_ID = 'elastic-defend-configuration-troubleshooting';
export const GET_ENDPOINT_STATUS_TOOL_ID = 'endpoint-response-actions.get_endpoint_status';
export const LIST_ENDPOINTS_TOOL_ID = 'endpoint-response-actions.list_endpoints';
export const GET_RESPONSE_ACTION_STATUS_TOOL_ID =
  'endpoint-response-actions.get_response_action_status';

export const ENDPOINT_RESPONSE_ACTIONS_TOOL_ROUTING_EVALUATOR_NAME =
  'Endpoint Response Actions Tool Routing';

export type EndpointResponseActionsRouting = 'forbid' | 'require' | 'require_troubleshooting';

export interface EndpointResponseActionsRoutingExpected {
  routing?: EndpointResponseActionsRouting;
  required_tool?: string;
}

interface ToolCallStep {
  type?: unknown;
  tool_id?: unknown;
  params?: unknown;
  results?: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getToolCallSteps = (output: TaskOutput): ToolCallStep[] => {
  if (!isRecord(output) || !Array.isArray(output.steps)) {
    return [];
  }

  return output.steps.filter(
    (step): step is ToolCallStep => isRecord(step) && step.type === 'tool_call'
  );
};

/**
 * Skill-activation matching mirrors agent_builder's activation paths: a
 * `load_skill` call whose `skill` argument references the skill, a
 * `read_file` of the skill's folder / SKILL.md path, or a legacy
 * `filestore.read` of the same.
 */
const isSkillActivation = (step: ToolCallStep, skillId: string): boolean => {
  if (
    step.tool_id !== internalTools.loadSkill &&
    step.tool_id !== internalTools.readFile &&
    step.tool_id !== 'filestore.read'
  ) {
    return false;
  }

  const args = isRecord(step.params) ? JSON.stringify(step.params) : String(step.params ?? '');

  return args.includes(skillId) || args.includes(`${skillId}/SKILL.md`);
};

const isErrorResult = (result: unknown): boolean => isRecord(result) && result.type === 'error';

const hasNonErrorResult = (step: ToolCallStep): boolean =>
  Array.isArray(step.results) && step.results.some((result) => !isErrorResult(result));

const hasSuccessfulToolCall = (steps: ToolCallStep[], toolId: string): boolean =>
  steps.some((step) => step.tool_id === toolId && hasNonErrorResult(step));

/**
 * Deterministic routing evaluator. In `require` mode a call of the required
 * tool with a non-error result passes — a "not found" tool result still counts
 * as correct routing, since this is a routing check, not a data check.
 * `require_troubleshooting` requires a non-error troubleshooting skill activation.
 */
export function createEndpointResponseActionsRoutingEvaluator(): Evaluator<
  SecurityDatasetExample,
  TaskOutput
> {
  return {
    name: ENDPOINT_RESPONSE_ACTIONS_TOOL_ROUTING_EVALUATOR_NAME,
    kind: 'CODE',
    direction: 'maximize',
    evaluate: async ({ output, expected }) => {
      const steps = getToolCallSteps(output);
      const routing = expected?.routing ?? 'forbid';

      if (routing === 'require_troubleshooting') {
        const passed = steps.some(
          (step) => isSkillActivation(step, TROUBLESHOOTING_SKILL_ID) && hasNonErrorResult(step)
        );
        return { score: passed ? 1 : 0, label: passed ? 'pass' : 'fail' };
      }

      if (routing === 'require') {
        const requiredTool = expected?.required_tool ?? GET_ENDPOINT_STATUS_TOOL_ID;
        const passed = hasSuccessfulToolCall(steps, requiredTool);
        return { score: passed ? 1 : 0, label: passed ? 'pass' : 'fail' };
      }

      const usedResponseActionsTool = steps.some(
        (step) =>
          typeof step.tool_id === 'string' &&
          step.tool_id.startsWith(`${ENDPOINT_RESPONSE_ACTIONS_SKILL_ID}.`)
      );
      const activatedResponseActionsSkill = steps.some((step) =>
        isSkillActivation(step, ENDPOINT_RESPONSE_ACTIONS_SKILL_ID)
      );
      const passed = !usedResponseActionsTool && !activatedResponseActionsSkill;

      return { score: passed ? 1 : 0, label: passed ? 'pass' : 'fail' };
    },
  };
}
