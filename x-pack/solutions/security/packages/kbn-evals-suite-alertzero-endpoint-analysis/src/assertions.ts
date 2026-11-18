/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { proposalSchema, type Proposal } from '@kbn/proposals-common';
import type { ListAttachmentsResponse } from '@kbn/agent-builder-plugin/common/http_api/attachments';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import { assertActionSafety } from './action_safety';
import { analysisOutputValidator } from './contracts';
import { assertBenignVerdict, assertContainmentProposed } from './verdict_checks';

export interface AlertZeroExpectedEvidence {
  host: string;
  eventIds: string[];
  command: string;
  /** Elastic Defend `agent.id` of the seeded host; the action-safety check always runs against it. */
  endpointId: string;
  /** Fixture ground truth: the seeded telemetry shows a real compromise. */
  conclusive: boolean;
}
const nonEmpty = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;
export const assertStructuredEvidence = (value: unknown, expected: AlertZeroExpectedEvidence) => {
  const output = analysisOutputValidator.parse(value);
  const timeline = (output.timeline as { events: Array<Record<string, unknown>> }).events;
  const iocs = output.iocs as Record<string, Array<{ value: string }>>;
  if (!nonEmpty(output.rationale) || timeline.length < 2) {
    throw new Error('Missing grounded summary or timeline');
  }
  const times = timeline.map((event) => Date.parse(String(event.timestamp)));
  if (
    times.some((time) => !Number.isFinite(time)) ||
    times.some((time, i) => i > 0 && time < times[i - 1])
  ) {
    throw new Error('Timeline is not valid chronological evidence');
  }
  for (const event of timeline) {
    if (event.host !== expected.host || !nonEmpty(event.description)) {
      throw new Error('Timeline cites unseeded or empty evidence');
    }
  }
  if (
    !iocs.affected_hosts?.some((ioc) => ioc.value === expected.host) ||
    !iocs.malicious_commands?.some((ioc) => ioc.value.includes(expected.command))
  ) {
    throw new Error('Structured IoCs do not match endpoint evidence');
  }
  return output;
};
interface AgentStepOutput {
  structured_output?: unknown;
  metadata?: { usage?: { connectorId?: unknown; inputTokens?: unknown } };
}
/**
 * Proves the `ai.agent` step really invoked a model. Production runs `forensic_analysis` with
 * `create-conversation: false`, so the step emits no `conversation_id`. It always emits
 * `metadata.usage` accumulated from the model rounds, which stays at zero/absent when the
 * agent was skipped, short-circuited or faked.
 */
const assertAgentActuallyRan = (output: AgentStepOutput | undefined) => {
  const usage = output?.metadata?.usage;
  const inputTokens = usage?.inputTokens;
  if (typeof inputTokens !== 'number' || !(inputTokens > 0) || !nonEmpty(usage?.connectorId)) {
    throw new Error('Analysis agent shows no model usage (no input tokens or connector)');
  }
  if (output?.structured_output == null) throw new Error('Analysis agent has no structured output');
};
const collectError = (errors: string[], check: () => unknown) => {
  try {
    check();
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
};
export const assertAnalysisExecution = (
  steps: WorkflowStepExecutionDto[],
  expected: AlertZeroExpectedEvidence
) => {
  const agents = steps.filter(
    (step) => step.stepId === 'forensic_analysis' && step.stepType === 'ai.agent'
  );
  if (agents.length !== 1 || agents[0].status !== 'completed')
    throw new Error('Analysis agent did not complete exactly once');
  const output = agents[0].output as AgentStepOutput | undefined;
  assertAgentActuallyRan(output);
  // A schema-invalid output would make every check below throw the same error.
  const parsed = analysisOutputValidator.safeParse(output?.structured_output);
  if (!parsed.success) throw parsed.error;
  // Collect all so a safety violation never hides behind an evidence failure (and vice versa).
  const errors: string[] = [];
  collectError(errors, () => assertStructuredEvidence(output?.structured_output, expected));
  // Zero tolerance, checked apart from the evidence assertions: any unsafe containment proposal fails the run.
  collectError(errors, () =>
    assertActionSafety(output?.structured_output, {
      endpointIds: [expected.endpointId],
      conclusive: expected.conclusive,
    })
  );
  // A conclusive fixture must end with a containment proposal for the analyst: `ActionSafety`
  // alone passes vacuously when nothing is proposed.
  if (expected.conclusive === true) {
    collectError(errors, () =>
      assertContainmentProposed(output?.structured_output, { endpointIds: [expected.endpointId] })
    );
  }
  if (errors.length > 0) throw new Error(errors.join(' | '));
  return assertStructuredEvidence(output?.structured_output, expected);
};

/**
 * L2b: a benign host must not be labelled `confirmed_incident` and must get no disruptive
 * action. Both checks run so neither failure hides the other.
 */
export const assertBenignAnalysis = (structuredOutput: unknown, endpointIds: string[]) => {
  const errors: string[] = [];
  collectError(errors, () =>
    assertActionSafety(structuredOutput, { endpointIds, conclusive: false })
  );
  collectError(errors, () => assertBenignVerdict(structuredOutput));
  if (errors.length > 0) throw new Error(errors.join(' | '));
};
export const assertPersistedProposal = (
  value: unknown,
  expected: {
    conversationId: string;
    workflowExecutionId: string;
    status: Proposal['status'];
    decision?: Proposal['decision'];
  }
) => {
  const proposal = proposalSchema.parse(value);
  if (
    !nonEmpty(proposal.id) ||
    proposal.origin !== 'alertzero' ||
    proposal.category !== 'endpoint_analysis' ||
    proposal.conversationId !== expected.conversationId ||
    proposal.workflowExecutionId !== expected.workflowExecutionId ||
    proposal.status !== expected.status ||
    proposal.decision !== expected.decision
  ) {
    throw new Error('Persisted AlertZero endpoint proposal does not match execution');
  }
  return proposal;
};

/**
 * L2/L3: the analysis persists a timeline and an IoC attachment on the investigation
 * conversation. Pinned to the exported `ListAttachmentsResponse` contract — the list route
 * (`server/routes/attachments.ts`) returns `{ results, total_token_estimate }`, so a renamed
 * field breaks type_check here instead of a live run with `undefined.some(...)`.
 */
export const assertPersistedAttachments = (
  response: ListAttachmentsResponse,
  investigationId: string
) => {
  const ids = response.results.map((attachment) => attachment.id);
  const expected = [`forensic-timeline-${investigationId}`, `forensic-iocs-${investigationId}`];
  const missing = expected.filter((id) => !ids.includes(id));
  if (missing.length > 0) {
    throw new Error(`Missing persisted forensic attachments: ${missing.join(', ')}`);
  }
};

export const ENDPOINT_FORENSIC_DISCOVER_TELEMETRY_TOOL_ID =
  'security.endpoint_forensic.discover_telemetry';

/**
 * L1: the default agent must route to the production endpoint-forensic skill and its inline
 * `discover_telemetry` tool must return results. `calls` must come from
 * `getToolCallSteps(<whole converse response>)`: the helper reads `output.steps`, so passing
 * `response.steps` (the array itself) yields `[]` and fails every run whatever the agent did.
 */
export const assertEndpointForensicToolCall = (
  calls: Array<{ tool_id?: string; results?: unknown[] }>
) => {
  // A failed call still carries a non-empty `results` array (`[{ type: 'error', ... }]`), so
  // require at least one result that is not an error.
  const isSuccessfulResult = (result: unknown) =>
    (result as { type?: string } | null | undefined)?.type !== 'error';
  if (
    !calls.some(
      (call) =>
        call.tool_id === ENDPOINT_FORENSIC_DISCOVER_TELEMETRY_TOOL_ID &&
        call.results?.some(isSuccessfulResult)
    )
  ) {
    throw new Error(
      `No successful production endpoint forensic tool call (saw: ${
        calls.map((call) => call.tool_id ?? '<unknown>').join(', ') || 'no tool calls'
      })`
    );
  }
};
