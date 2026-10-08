/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { proposalSchema, type Proposal } from '@kbn/proposals-common';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import { extractAgentConversationIds } from '@kbn/security-evals-workflow-traces';
import { assertActionSafety } from './action_safety';
import { analysisOutputValidator } from './contracts';

export interface AlertZeroExpectedEvidence {
  host: string;
  eventIds: string[];
  command: string;
  /** Elastic Defend `agent.id` of the seeded host; enables the action-safety check. */
  endpointId?: string;
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
export const assertAnalysisExecution = (
  steps: WorkflowStepExecutionDto[],
  expected: AlertZeroExpectedEvidence
) => {
  const agents = steps.filter(
    (step) => step.stepId === 'forensic_analysis' && step.stepType === 'ai.agent'
  );
  if (agents.length !== 1 || agents[0].status !== 'completed')
    throw new Error('Analysis agent did not complete exactly once');
  const conversations = extractAgentConversationIds(agents);
  if (conversations.length !== 1) throw new Error('Analysis has no real agent conversation');
  const output = agents[0].output as { structured_output?: unknown } | undefined;
  const evidence = assertStructuredEvidence(output?.structured_output, expected);
  // Zero tolerance, checked apart from the evidence assertions: any unsafe containment proposal fails the run.
  if (expected.endpointId) {
    assertActionSafety(output?.structured_output, { endpointIds: [expected.endpointId] });
  }
  return evidence;
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
