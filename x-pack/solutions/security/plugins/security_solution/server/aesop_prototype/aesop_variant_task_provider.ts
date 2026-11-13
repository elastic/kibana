/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvalsTaskProvider } from '@kbn/evals-plugin/server/task_providers';
import {
  normalizeTraceId,
  withEvalsTaskSpan,
} from '@kbn/evals-plugin/server/task_providers/tracing';

/**
 * AESOP prototype: converse with `configuration_overrides.skill_ids` pinned to
 * the step's `params.skill_id`, so A/B arms differ only in the loaded skill.
 * `params.no_skill: true` runs the no-skill baseline arm instead: an empty
 * explicit skill set with Elastic capabilities off resolves to zero skills.
 */

const CONVERSE_PATH = '/api/agent_builder/converse';
const AGENT_BUILDER_API_VERSION = '2023-10-31';

const PROMPT_KEYS = ['input', 'prompt', 'question', 'query', 'text', 'message'] as const;

const extractInput = (input: Record<string, unknown>): string => {
  for (const key of PROMPT_KEYS) {
    const value = input[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return JSON.stringify(input);
};

interface ConverseApiResponse {
  conversation_id?: string;
  /** A round can carry one trace id, or several when it spans multiple executions. */
  trace_id?: string | string[];
  steps?: unknown[];
  response?: { message?: string; structured_output?: unknown };
}

export const createAesopVariantTaskProvider = (): EvalsTaskProvider => ({
  name: 'security.aesopVariant',
  description:
    'Runs an Agent Builder converse call with configuration_overrides.skill_ids pinned to one skill (AESOP prototype).',
  run: async ({ input, params, connectorId, agentId, callKibanaApi }) => {
    if (!agentId) {
      throw new Error('The "security.aesopVariant" task provider requires an agent_id');
    }
    // Workflow templating renders `{{ }}` values as strings, so accept 'true' too.
    const noSkill = params?.no_skill === true || params?.no_skill === 'true';
    const skillId = typeof params?.skill_id === 'string' ? params.skill_id : '';
    if (!noSkill && skillId.length === 0) {
      throw new Error(
        'The "security.aesopVariant" task provider requires params.skill_id or params.no_skill'
      );
    }
    const configurationOverrides: { skill_ids: string[]; enable_elastic_capabilities?: boolean } =
      noSkill ? { skill_ids: [], enable_elastic_capabilities: false } : { skill_ids: [skillId] };

    // Fresh per-example root span, same as the built-in converse provider: without it
    // every example folds into one trace and trace-based metrics mis-score.
    return withEvalsTaskSpan('task · aesop variant', async () => {
      const { body } = await callKibanaApi<ConverseApiResponse>({
        method: 'POST',
        path: CONVERSE_PATH,
        headers: { 'elastic-api-version': AGENT_BUILDER_API_VERSION },
        body: {
          agent_id: agentId,
          connector_id: connectorId,
          input: extractInput(input),
          configuration_overrides: configurationOverrides,
          _execution_mode: 'local',
        },
      });

      const traceId = Array.isArray(body.trace_id) ? body.trace_id[0] : body.trace_id;

      return {
        output: {
          message: body.response?.message ?? '',
          ...(body.response?.structured_output !== undefined
            ? { structured_output: body.response.structured_output }
            : {}),
          ...(body.steps ? { steps: body.steps } : {}),
          ...(body.conversation_id ? { conversation_id: body.conversation_id } : {}),
        },
        traceId: normalizeTraceId(traceId),
      };
    });
  },
});
