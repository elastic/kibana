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

const GENERATE_WORKFLOW_TOOL_ID = 'platform.core.generate_workflow';
const VALIDATE_WORKFLOW_TOOL_ID = 'platform.workflows.validate_workflow';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const messagePartsOf = (output: unknown): string[] => {
  const messages = (output ?? {}) as { messages?: unknown } | null;
  const parts: string[] = [];
  if (Array.isArray(messages?.messages)) {
    messages.messages.forEach((entry) => {
      const message = isRecord(entry) ? entry.message : undefined;
      if (typeof message === 'string') {
        parts.push(message);
      }
    });
  }
  return parts;
};

// `id` may follow other attributes (`<render_attachment version="1" id="…"/>`).
const RENDER_ATTACHMENT_ID_PATTERN = /<render_attachment\b[^>]*\bid\s*=\s*["']([^"']+)["']/g;

/**
 * Pull the text that can contain the delivered workflow. In Agent Builder runs
 * the YAML is NOT in the `generate_workflow` result (it returns only
 * attachment/proposal ids plus a prose comment) and `validate_workflow`
 * returns only `{ result }`, so exactly one artifact is read, the first of:
 *  - the conversation's current `workflow.yaml` attachments
 *    (`workflowAttachments`, read back by the chat client). When several exist,
 *    only the one the final message rendered (`<render_attachment … id=…>`) is
 *    scored, falling back to the last one — a leftover draft must not rescue
 *    the run;
 *  - the last `data.yaml` of `generate_workflow` results (the shape the tool
 *    returns to non-agent callers). Never combined with an attachment: an
 *    intermediate generation must not rescue a delivered workflow that
 *    dropped the connector;
 *  - the LAST `validate_workflow` `params.yaml`: the candidate the agent
 *    finished on. Earlier validation inputs are superseded drafts.
 * The final answer messages are scored only when none of these yields YAML
 * (the model pasted the workflow inline). When an artifact exists, a message
 * restating the prompt (`type: http` plus the connector id) cannot vouch for it.
 *
 * Deliberately NOT scanned: `generate_workflow` params (`query`/`context` are
 * the model restating the prompt, connector id included), params of every
 * other tool, `validate_workflow` results (diagnostics, not the artifact), the
 * generate_workflow `comment` prose, reasoning steps, and the precomputed
 * correctness/groundedness analyses. An echo in any of those is not an
 * authored workflow targeting the connector.
 */
export const collectDeliveredArtifact = (output: unknown): string | undefined => {
  const messageParts = messagePartsOf(output);
  const { steps, workflowAttachments } = (output ?? {}) as {
    steps?: unknown;
    workflowAttachments?: unknown;
  };

  const attachments: Array<{ id?: string; yaml: string }> = [];
  if (Array.isArray(workflowAttachments)) {
    workflowAttachments.forEach((attachment) => {
      if (isRecord(attachment) && typeof attachment.yaml === 'string') {
        attachments.push({
          id: typeof attachment.id === 'string' ? attachment.id : undefined,
          yaml: attachment.yaml,
        });
      }
    });
  }
  const renderedIds = new Set(
    Array.from(messageParts.join('\n').matchAll(RENDER_ATTACHMENT_ID_PATTERN), ([, id]) => id)
  );
  const rendered = attachments.filter(({ id }) => id !== undefined && renderedIds.has(id));
  const candidates = rendered.length ? rendered : attachments;
  const deliveredAttachment = candidates[candidates.length - 1];

  const generated: string[] = [];
  let lastValidatedYaml: string | undefined;
  if (Array.isArray(steps)) {
    steps.forEach((step) => {
      if (!isRecord(step)) return;
      const { tool_id: toolId, params, results } = step;
      if (toolId === VALIDATE_WORKFLOW_TOOL_ID && isRecord(params)) {
        if (typeof params.yaml === 'string') {
          lastValidatedYaml = params.yaml;
        }
      }
      if (toolId === GENERATE_WORKFLOW_TOOL_ID && Array.isArray(results)) {
        results.forEach((result) => {
          const data = isRecord(result) ? result.data : undefined;
          if (isRecord(data) && typeof data.yaml === 'string') {
            generated.push(data.yaml);
          }
        });
      }
    });
  }

  return deliveredAttachment?.yaml ?? generated[generated.length - 1] ?? lastValidatedYaml;
};

export const collectProducedText = (output: unknown): string =>
  collectDeliveredArtifact(output) ?? messagePartsOf(output).join('\n');

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
