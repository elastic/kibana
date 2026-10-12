/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Message } from '@kbn/inference-common';
import { MessageRole } from '@kbn/inference-common';
import type { VerifyBriefResult } from '../verification/verify_brief';
import { verifyBrief } from '../verification/verify_brief';
import type { ComposeAttempt } from './compose_brief';
import { composeBrief } from './compose_brief';
import { formatEvidence } from './format_evidence';
import { buildRepairMessages } from './repair';
import { buildSystemPrompt, buildUserMessage } from './system_prompt';
import type {
  ComposeVerifiedBrief,
  ComposeVerifiedBriefParams,
  ComposeVerifiedBriefResult,
} from './types';
import { BriefCompositionError } from './types';
import { noopBriefTelemetry } from '../telemetry/types';

const MAX_ERRORS_IN_MESSAGE = 5;

interface Checked {
  verified?: VerifyBriefResult;
  /** Structural problems: schema errors or verification failures only the model can fix. */
  errors: string[];
}

const abortedError = (): BriefCompositionError =>
  new BriefCompositionError('llm_error', 'Brief composition was aborted');

const toCompositionError = (error: unknown, abortSignal: AbortSignal): BriefCompositionError => {
  if (error instanceof BriefCompositionError) {
    return error;
  }
  if (abortSignal.aborted) {
    return abortedError();
  }
  const message = error instanceof Error ? error.message : String(error);
  return new BriefCompositionError('llm_error', `The AI connector call failed: ${message}`);
};

/**
 * Compose → verify → (one repair) → verified brief. One `chatComplete` call composes the brief from
 * the formatted evidence; verification cleans it and reports structural problems (invalid output,
 * a verdict without valid evidence or numbers, guardrail violations). Those go back to the model
 * exactly once; if the repaired output still fails, the job fails with `llm_output`. Connector
 * failures become `llm_error`. Token usage is summed across attempts.
 */
export const composeVerifiedBrief: ComposeVerifiedBrief = async ({
  inferenceClient,
  evidence,
  timeRange,
  abortSignal,
  logger,
  onStage,
  telemetry = noopBriefTelemetry,
}: ComposeVerifiedBriefParams): Promise<ComposeVerifiedBriefResult> => {
  const system = buildSystemPrompt();
  const messages: Message[] = [
    {
      role: MessageRole.User,
      content: buildUserMessage({ formattedEvidence: formatEvidence(evidence), timeRange }),
    },
  ];
  const tokens = { prompt: 0, completion: 0, total: 0 };
  let model: string | undefined;

  const attempt = async (conversation: Message[]): Promise<ComposeAttempt> => {
    if (abortSignal.aborted) {
      throw abortedError();
    }
    await onStage?.('compose');
    let result: ComposeAttempt;
    try {
      result = await composeBrief({
        inferenceClient,
        system,
        messages: conversation,
        abortSignal,
        logger,
      });
    } catch (error) {
      const failure = toCompositionError(error, abortSignal);
      throw new BriefCompositionError(failure.code, failure.message, { ...tokens });
    }
    if (result.tokens) {
      tokens.prompt += result.tokens.prompt;
      tokens.completion += result.tokens.completion;
      tokens.total += result.tokens.total;
    }
    model = result.model ?? model;
    await onStage?.('verify');
    return result;
  };

  const check = (result: ComposeAttempt): Promise<Checked> =>
    telemetry.withSpan('verify', {}, async () => {
      if (!result.ok) {
        return { errors: result.errors.map((error) => `invalid output: ${error}`) };
      }
      const verified = verifyBrief(result.brief, evidence, { range: timeRange.range });
      verified.notes.forEach((note) => logger.debug(`Executive brief verification: ${note}`));
      return { verified, errors: verified.structuralErrors };
    });

  const finish = (verified: VerifyBriefResult, repaired: boolean): ComposeVerifiedBriefResult => ({
    brief: verified.brief,
    verification: { ...verified.summary, repaired },
    ...(model ? { model } : {}),
    tokens,
  });

  const first = await attempt(messages);
  const firstCheck = await check(first);
  if (firstCheck.verified && firstCheck.errors.length === 0) {
    return finish(firstCheck.verified, false);
  }

  logger.debug(
    `Executive brief needs a repair (${
      firstCheck.errors.length
    } problems): ${firstCheck.errors.join(' | ')}`
  );
  const second = await attempt([
    ...messages,
    ...buildRepairMessages({ toolCall: first.toolCall, errors: firstCheck.errors }),
  ]);
  const secondCheck = await check(second);
  if (secondCheck.verified && secondCheck.errors.length === 0) {
    return finish(secondCheck.verified, true);
  }

  const shown = secondCheck.errors.slice(0, MAX_ERRORS_IN_MESSAGE).join(' ');
  const more =
    secondCheck.errors.length > MAX_ERRORS_IN_MESSAGE
      ? ` (and ${secondCheck.errors.length - MAX_ERRORS_IN_MESSAGE} more)`
      : '';
  throw new BriefCompositionError(
    'llm_output',
    `The AI output failed verification after one repair: ${shown}${more}`,
    { ...tokens }
  );
};
