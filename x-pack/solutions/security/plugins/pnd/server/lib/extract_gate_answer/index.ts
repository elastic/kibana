/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus, type WorkflowStepExecutionDto } from '@kbn/workflows';

/**
 * The engine's placeholder when it cannot resolve who resumed a run (`resumedBy` falls back to this
 * literal). Never surfaced as a responder: an actor named "unknown" reads like a real account.
 */
const UNKNOWN_RESPONDER = 'unknown';

/** How a gate was answered, as recorded on its `waitForInput` step execution. */
export interface GateAnswer {
  decision?: 'approve' | 'dismiss';
  rationale?: string;
  respondedAt: string;
  respondedBy?: string;
}

/** Narrow an unvalidated step-execution `output` to a plain object, or `undefined`. */
const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

/**
 * The decision the responder submitted, read out of the step's output.
 *
 * `_respond` resumes the gate with `{ decision, rationale }`, and the engine records the resume
 * payload as `output.response` (`transformResumeInput` in `wait_for_input_step`), so that is where a
 * decision lives — not in `input`, which holds what the step was *waiting* with.
 *
 * An unrecognized value returns `undefined` rather than defaulting, for the same reason `_respond`'s
 * decision is closed (security finding D2): a gate answered before that field was required carries a
 * rationale and no decision, and rendering that as an approval would be the read-side fail-open.
 */
const readDecision = (
  response: Record<string, unknown> | undefined
): 'approve' | 'dismiss' | undefined => {
  const decision = response?.decision;

  return decision === 'approve' || decision === 'dismiss' ? decision : undefined;
};

/**
 * Who answered the gate. `hitl.respondedBy` is authoritative: it is written server-side by
 * `markStepAsResponded` from the request's authenticated principal. The step output's `respondedBy`
 * is the engine's own view and is only a fallback, because an external resume can settle a gate
 * without the PND route ever stamping the HITL envelope.
 */
const resolveResponder = ({
  outputRespondedBy,
  respondedBy,
}: {
  outputRespondedBy: unknown;
  respondedBy: string | undefined;
}): string | undefined => {
  if (respondedBy != null && respondedBy !== '') {
    return respondedBy;
  }

  return typeof outputRespondedBy === 'string' &&
    outputRespondedBy !== '' &&
    outputRespondedBy !== UNKNOWN_RESPONDER
    ? outputRespondedBy
    : undefined;
};

/**
 * Read how a gate was answered, or `undefined` when it has not been answered.
 *
 * A gate still waiting is **not** history: it is a row in the Brief queue, and returning an answer
 * with no decision and no responder for it would put an unanswered row in the audit trail. A gate
 * counts as answered when the HITL envelope carries a `respondedAt` (the PND `_respond` path) or the
 * step itself completed (any other resume path, including an autonomy-level auto-accept).
 */
export const extractGateAnswer = (
  stepExecution: WorkflowStepExecutionDto
): GateAnswer | undefined => {
  const { finishedAt, hitl, output, startedAt, status } = stepExecution;

  const isAnswered = hitl?.respondedAt != null || status === ExecutionStatus.COMPLETED;
  if (!isAnswered) {
    return undefined;
  }

  // The server-recorded response time when there is one; the step's own timestamps otherwise.
  const respondedAt = hitl?.respondedAt ?? finishedAt ?? startedAt;
  if (!respondedAt) {
    return undefined;
  }

  const outputRecord = asRecord(output);
  const response = asRecord(outputRecord?.response);
  const decision = readDecision(response);
  const { rationale } = response ?? {};
  const respondedBy = resolveResponder({
    outputRespondedBy: outputRecord?.respondedBy,
    respondedBy: hitl?.respondedBy,
  });

  return {
    ...(decision != null ? { decision } : {}),
    ...(typeof rationale === 'string' && rationale !== '' ? { rationale } : {}),
    respondedAt,
    ...(respondedBy != null ? { respondedBy } : {}),
  };
};
