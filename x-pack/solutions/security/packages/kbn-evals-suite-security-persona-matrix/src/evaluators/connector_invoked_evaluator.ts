/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';

export const CONNECTOR_INVOKED_EVALUATOR_NAME = 'ConnectorInvoked';

/**
 * Deterministic check that an authored workflow targets the connector the
 * prompt demanded.
 *
 * `ExpectedToolCalled` only proves the agent CALLED `generate_workflow`, never
 * what came back — a workflow with no http step, or one aimed at the wrong
 * connector, still scores 1.0. Being CODE rather than LLM-judged, a
 * plausible-sounding answer cannot talk its way past this.
 */

export interface ConnectorExpectation {
  /** Connector id that must appear in the authored workflow. */
  expectedConnectorId?: string;
  /** Step type that must appear, e.g. `http`. */
  expectedStepType?: string;
}

const WORKFLOW_ARTIFACT_TOOL_IDS = new Set([
  'platform.core.generate_workflow',
  'platform.workflows.validate_workflow',
]);

const collectStrings = (node: unknown, parts: string[]): void => {
  if (typeof node === 'string') {
    parts.push(node);
  } else if (Array.isArray(node)) {
    node.forEach((child) => collectStrings(child, parts));
  } else if (node && typeof node === 'object') {
    Object.values(node as Record<string, unknown>).forEach((child) => collectStrings(child, parts));
  }
};

/**
 * Pull the text that can contain the authored workflow: the final answer
 * messages plus the `results` of the workflow-authoring tools. The YAML can
 * surface in either depending on whether the model rendered it inline or left
 * it in the generate_workflow response.
 *
 * Deliberately NOT scanned: tool-call `params` (the agent echoes the
 * prompt's connector id there), reasoning steps, and the precomputed
 * correctness/groundedness analyses. An echo in any of those is not an
 * authored workflow targeting the connector.
 */
export const collectProducedText = (output: unknown): string => {
  const parts: string[] = [];
  const { messages, steps } = (output ?? {}) as { messages?: unknown; steps?: unknown };
  if (Array.isArray(messages)) {
    messages.forEach((entry) => {
      const message = (entry as { message?: unknown } | undefined)?.message;
      if (typeof message === 'string') {
        parts.push(message);
      }
    });
  }
  if (Array.isArray(steps)) {
    steps.forEach((step) => {
      const { tool_id: toolId, results } = (step ?? {}) as { tool_id?: string; results?: unknown };
      if (toolId && WORKFLOW_ARTIFACT_TOOL_IDS.has(toolId)) {
        collectStrings(results, parts);
      }
    });
  }
  return parts.join('\n');
};

export const createConnectorInvokedEvaluator = (): Evaluator => ({
  name: CONNECTOR_INVOKED_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, metadata }) => {
    const meta = metadata as ConnectorExpectation | undefined;
    const expectedConnectorId = meta?.expectedConnectorId;
    const expectedStepType = meta?.expectedStepType;

    if (!expectedConnectorId && !expectedStepType) {
      return {
        score: null,
        label: 'N/A',
        explanation: 'No connector expectation declared — ConnectorInvoked does not apply.',
        metadata: {},
      };
    }

    const produced = collectProducedText(output);

    // Connector ids are opaque identifiers; a substring match is exact enough
    // and avoids depending on YAML indentation or quoting style.
    const connectorPresent = expectedConnectorId ? produced.includes(expectedConnectorId) : true;

    // Step type must appear as a YAML key (`type: http`), not merely in prose,
    // so a model narrating "I would use an http step" does not pass. Escaped:
    // the value comes from dataset metadata, not a trusted literal.
    const escapedStepType = expectedStepType?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const stepPresent = escapedStepType
      ? new RegExp(`type\\s*:\\s*["']?${escapedStepType}\\b`, 'i').test(produced)
      : true;

    const passed = connectorPresent && stepPresent;

    const missing: string[] = [];
    if (!connectorPresent) missing.push(`connector id ${expectedConnectorId}`);
    if (!stepPresent) missing.push(`step type ${expectedStepType}`);

    return {
      score: Number(passed),
      explanation: passed
        ? 'Authored workflow targets the required connector.'
        : `Authored workflow is missing: ${missing.join(', ')}.`,
      metadata: {
        expectedConnectorId,
        expectedStepType,
        connectorPresent,
        stepPresent,
      },
    };
  },
});
