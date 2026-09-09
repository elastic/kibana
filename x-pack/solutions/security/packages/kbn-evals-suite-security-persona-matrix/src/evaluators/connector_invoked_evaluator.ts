/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';

export const CONNECTOR_INVOKED_EVALUATOR_NAME = 'ConnectorInvoked';

/**
 * Deterministic check that an authored workflow actually targets the connector
 * the prompt demanded.
 *
 * Why this exists: `ExpectedToolCalled` only proves the agent CALLED
 * `platform.core.generate_workflow`. It never inspects what came back. A model
 * that calls the tool and emits a workflow with no http step -- or one pointed
 * at the wrong connector -- still scores 1.0. That is a false green: the
 * benchmark reports "posts to Slack" while nothing addresses Slack at all.
 *
 * This evaluator reads the produced workflow text and asserts the required
 * connector id and/or step type is present. It is CODE, not LLM-judged, so a
 * plausible-sounding answer cannot talk its way past it.
 *
 * Scores `null` (N/A) when the example declares no connector expectation, so
 * it never dilutes datasets it does not apply to.
 */

export interface ConnectorExpectation {
  /** Connector id that must appear in the authored workflow. */
  expectedConnectorId?: string;
  /** Step type that must appear, e.g. `http`. */
  expectedStepType?: string;
}

/**
 * Pull every string the agent produced: the final answer plus any tool results.
 * The workflow YAML can surface in either depending on whether the model
 * rendered it inline or left it in the generate_workflow response.
 */
export const collectProducedText = (output: unknown): string => {
  const parts: string[] = [];
  const visit = (node: unknown): void => {
    if (typeof node === 'string') {
      parts.push(node);
    } else if (Array.isArray(node)) {
      node.forEach(visit);
    } else if (node && typeof node === 'object') {
      Object.values(node as Record<string, unknown>).forEach(visit);
    }
  };
  visit(output);
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

    // Step type must appear as a YAML key (`type: http`) rather than anywhere
    // in prose, so a model narrating "I would use an http step" does not pass.
    const stepPresent = expectedStepType
      ? new RegExp(`type\\s*:\\s*["']?${expectedStepType}\\b`, 'i').test(produced)
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
