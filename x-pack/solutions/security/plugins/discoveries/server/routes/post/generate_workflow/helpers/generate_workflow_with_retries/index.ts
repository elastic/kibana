/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { AgentConfigurationOverrides } from '@kbn/agent-builder-common';
import type { RunAgentFn } from '@kbn/agent-builder-server/agents';
import type { WorkflowYaml } from '@kbn/workflows';

import { invokeAgent } from '../invoke_agent';
import { extractWorkflowYaml } from '../extract_workflow_yaml';
import { validateWorkflowYaml } from '../validate_workflow_yaml';

/** Default maximum number of retry attempts for workflow generation */
export const DEFAULT_MAX_RETRIES = 3;

interface GenerateWorkflowWithRetriesParams {
  /** The ID of the agent to invoke for workflow generation */
  agentId: string;
  /** An optional signal to abort the generation */
  abortSignal?: AbortSignal;
  /** Optional runtime configuration overrides (e.g. instructions and tools) */
  configurationOverrides?: AgentConfigurationOverrides;
  /** The connector ID to use for the LLM call */
  connectorId: string;
  /** The user's natural language description of the desired workflow */
  description: string;
  /** Optional logger for debug-level retry tracing */
  logger?: Logger;
  /** Maximum number of retry attempts (defaults to 3) */
  maxRetries?: number;
  /** The authenticated Kibana request */
  request: KibanaRequest;
  /** The agent builder runAgent function */
  runAgent: RunAgentFn;
}

interface GenerateWorkflowWithRetriesSuccess {
  ok: true;
  /** The number of retry attempts that were made (0 = first attempt succeeded) */
  retries: number;
  /** The validated workflow object */
  workflow: WorkflowYaml;
  /** The raw YAML string that was validated */
  yaml: string;
}

interface GenerateWorkflowWithRetriesFailure {
  ok: false;
  /** Description of the final failure */
  error: string;
  /** The number of retry attempts that were made */
  retries: number;
}

export type GenerateWorkflowWithRetriesResult =
  | GenerateWorkflowWithRetriesSuccess
  | GenerateWorkflowWithRetriesFailure;

/**
 * Builds the initial prompt message for the agent, incorporating the user's
 * natural language description of the desired workflow.
 */
const buildInitialPrompt = (description: string): string =>
  `Generate an Elastic Workflow YAML for the following alert retrieval requirement:\n\n${description}\n\nReturn ONLY the workflow YAML inside a \`\`\`yaml code fence. Do not include any other text or explanation outside the code fence.`;

/**
 * Builds a retry prompt that includes the previous validation errors
 * as feedback, so the agent can correct its output.
 */
const buildRetryPrompt = ({
  description,
  errors,
  previousYaml,
}: {
  description: string;
  errors: string[];
  previousYaml: string;
}): string =>
  `The previously generated workflow YAML failed validation. Please fix the errors and return corrected YAML.\n\nOriginal requirement:\n${description}\n\nPrevious YAML that failed:\n\`\`\`yaml\n${previousYaml}\n\`\`\`\n\nValidation errors:\n${errors
    .map((e) => `- ${e}`)
    .join('\n')}\n\nReturn ONLY the corrected workflow YAML inside a \`\`\`yaml code fence.`;

interface AttemptState {
  lastError: string;
  lastErrors: string[];
  lastYaml: string;
}

/**
 * Orchestrates workflow generation by invoking the agent, extracting YAML from
 * the response, and validating it against the workflow schema. On validation
 * failure, retries up to `maxRetries` times, passing the validation errors
 * as feedback to the agent so it can correct its output.
 */
export const generateWorkflowWithRetries = async ({
  abortSignal,
  agentId,
  configurationOverrides,
  connectorId,
  description,
  logger,
  maxRetries = DEFAULT_MAX_RETRIES,
  request,
  runAgent,
}: GenerateWorkflowWithRetriesParams): Promise<GenerateWorkflowWithRetriesResult> => {
  const tryAttempt = async (
    attemptNumber: number,
    state: AttemptState
  ): Promise<GenerateWorkflowWithRetriesResult> => {
    if (attemptNumber > maxRetries) {
      return {
        error: `Workflow generation failed after ${maxRetries + 1} attempts. Last error: ${
          state.lastError
        }`,
        ok: false,
        retries: attemptNumber - 1,
      };
    }

    const message =
      attemptNumber === 0
        ? buildInitialPrompt(description)
        : buildRetryPrompt({
            description,
            errors: state.lastErrors,
            previousYaml: state.lastYaml,
          });

    logger?.debug(
      () =>
        `[generate_workflow] Attempt ${attemptNumber + 1}/${maxRetries + 1} for workflow generation`
    );

    // Step 1: Invoke agent
    const invokeResult = await invokeAgent({
      abortSignal,
      agentId,
      configurationOverrides,
      connectorId,
      message,
      request,
      runAgent,
    });

    if (!invokeResult.ok) {
      logger?.debug(() => `[generate_workflow] Agent invocation failed: ${invokeResult.error}`);
      return tryAttempt(attemptNumber + 1, {
        lastError: invokeResult.error,
        lastErrors: state.lastErrors,
        lastYaml: state.lastYaml,
      });
    }

    // Step 2: Extract YAML
    const extractResult = extractWorkflowYaml(invokeResult.responseMessage);

    if (!extractResult.ok) {
      logger?.debug(() => `[generate_workflow] YAML extraction failed: ${extractResult.error}`);
      return tryAttempt(attemptNumber + 1, {
        lastError: extractResult.error,
        lastErrors: [extractResult.error],
        lastYaml: '',
      });
    }

    // Step 3: Validate YAML
    const validateResult = validateWorkflowYaml(extractResult.yaml);

    if (!validateResult.ok) {
      logger?.debug(
        () =>
          `[generate_workflow] Validation failed (${
            validateResult.errors.length
          } errors): ${validateResult.errors.join('; ')}`
      );
      return tryAttempt(attemptNumber + 1, {
        lastError: `Validation failed: ${validateResult.errors.join('; ')}`,
        lastErrors: validateResult.errors,
        lastYaml: extractResult.yaml,
      });
    }

    // Success!
    logger?.debug(
      () => `[generate_workflow] Workflow generated successfully on attempt ${attemptNumber + 1}`
    );

    return {
      ok: true,
      retries: attemptNumber,
      workflow: validateResult.workflow,
      yaml: extractResult.yaml,
    };
  };

  return tryAttempt(0, { lastError: '', lastErrors: [], lastYaml: '' });
};
