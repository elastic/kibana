/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowStepExecutionDto } from '@kbn/workflows';

/** Upper bounds mirror the proposal-row schema (`@kbn/pnd-common`) so the row always validates. */
const MAX_TITLE_LENGTH = 1024;
const MAX_MESSAGE_LENGTH = 4096;

export interface GatePrompt {
  /** JSON schema the gate expects the `_respond` input to satisfy. `{}` when absent. */
  inputSchema: Record<string, unknown>;
  /** Human prompt (`waitForInput.with.message`); empty string when absent. */
  message: string;
  /** Short row title, derived from the message or the step id. */
  title: string;
}

const truncate = (value: string, max: number): string =>
  value.length > max ? value.slice(0, max) : value;

/**
 * Project a paused `waitForInput` step's `input` (its rendered `with` block) into the
 * prompt fields a proposal row renders. Mirrors the Workflows inbox mapper
 * (`to_inbox_action.ts`): `input.message` is the responder prompt and `input.schema`
 * the response shape. `waitForInput` itself carries no proposal metadata — that comes
 * from the gate registry — so this only surfaces what the author wrote on the step.
 *
 * Every field is defensively typed (the engine stores `input` as free-form JSON) and
 * length-bounded to the proposal-row schema so a hostile or oversized template can
 * never make the response fail validation.
 */
export const extractGatePrompt = (step: WorkflowStepExecutionDto): GatePrompt => {
  const input = (step.input ?? {}) as { message?: unknown; schema?: unknown };

  const message =
    typeof input.message === 'string' && input.message.length > 0
      ? truncate(input.message, MAX_MESSAGE_LENGTH)
      : '';

  const inputSchema =
    input.schema != null && typeof input.schema === 'object' && !Array.isArray(input.schema)
      ? (input.schema as Record<string, unknown>)
      : {};

  const title = truncate(
    message.length > 0 ? message : `Step "${step.stepId}" is waiting for input`,
    MAX_TITLE_LENGTH
  );

  return { inputSchema, message, title };
};
