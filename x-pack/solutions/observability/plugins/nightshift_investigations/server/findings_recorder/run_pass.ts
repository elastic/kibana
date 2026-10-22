/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import type { ConversationRoundStep } from '@kbn/agent-builder-common';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { Hypothesis } from '@kbn/agentic-investigations-plugin/common';
import type { AgenticInvestigationsPluginStart } from '@kbn/agentic-investigations-plugin/server';
import { createOptimizeModel } from '../lib/create_optimize_model';
import { createInvestigationUsageTelemetry } from '../lib/investigation_usage_telemetry';
import type { PassGuard } from './coordinator';
import { buildDigest } from './digest';
import { FINDINGS_JSON_SCHEMA, findingsOutputSchema, type FindingsOutput } from './output_schema';
import {
  buildRecorderInput,
  FINDINGS_RECORDER_SYSTEM_PROMPT,
  type CurrentFindings,
} from './prompt';

export interface FindingsPassDeps {
  getAgentBuilder: () => AgentBuilderPluginStart | undefined;
  getInference: () => InferenceServerStart | undefined;
  getSavedObjects: () => CoreStart['savedObjects'] | undefined;
  getUiSettings: () => CoreStart['uiSettings'] | undefined;
  getAgenticInvestigations: () => AgenticInvestigationsPluginStart | undefined;
  logger: Logger;
}

export interface FindingsPassParams {
  request: KibanaRequest;
  conversationId: string;
  steps: readonly ConversationRoundStep[];
  guard: PassGuard;
  /** What the investigation was asked, to keep the record about it. */
  question?: string;
  /** Set on the final pass: the agent's own answer. Its presence makes the pass final. */
  answer?: string;
}

const MAX_METADATA_TEXT_LENGTH = 10_000;

/** Keeps the first confirmed hypothesis: at most one may be the root cause. */
export const limitToOneConfirmed = (hypotheses: FindingsOutput['hypotheses']): Hypothesis[] => {
  let confirmedSeen = false;
  return hypotheses.map((hypothesis) => {
    if (hypothesis.status !== 'confirmed') return hypothesis;
    if (!confirmedSeen) {
      confirmedSeen = true;
      return hypothesis;
    }
    return { ...hypothesis, status: 'investigating' as const };
  });
};

const readCurrent = async (
  agenticInvestigations: AgenticInvestigationsPluginStart,
  request: KibanaRequest,
  conversationId: string
): Promise<CurrentFindings> => {
  try {
    const investigation = await agenticInvestigations
      .getInvestigationsClient(request)
      .get(conversationId);
    const { summary, verdict, severity } = investigation.metadata;
    return {
      summary,
      verdict,
      severity,
      impactSummary: investigation.impact?.summary,
      hypotheses: investigation.hypotheses?.hypotheses,
    };
  } catch {
    // A first pass finds nothing recorded yet; any other read failure only costs continuity.
    return {};
  }
};

/**
 * One recorder pass: reads what is recorded, asks the model to update it from the investigation
 * so far, and writes the result. Returns whether it wrote. Never throws for a model or write
 * failure; it logs and returns false, because the investigation must not depend on it.
 */
export const runFindingsPass = async (
  deps: FindingsPassDeps,
  { request, conversationId, steps, guard, question, answer }: FindingsPassParams
): Promise<boolean> => {
  const { logger } = deps;
  const final = answer !== undefined;
  const agentBuilder = deps.getAgentBuilder();
  const agenticInvestigations = deps.getAgenticInvestigations();
  if (!agentBuilder || !agenticInvestigations) return false;

  let output: FindingsOutput | undefined;
  try {
    const model = await createOptimizeModel({
      request,
      agentBuilder,
      inference: deps.getInference(),
      savedObjects: deps.getSavedObjects(),
      uiSettings: deps.getUiSettings(),
      telemetryMetadata: createInvestigationUsageTelemetry(conversationId),
      logger,
    });
    if (!model) return false;

    const current = await readCurrent(agenticInvestigations, request, conversationId);
    const response = await model.inferenceClient.output({
      id: 'nightshift_findings_recorder',
      abortSignal: guard.signal,
      system: FINDINGS_RECORDER_SYSTEM_PROMPT,
      input: buildRecorderInput({ digest: buildDigest({ steps }), current, question, answer }),
      schema: FINDINGS_JSON_SCHEMA as never,
    });
    const parsed = findingsOutputSchema.safeParse(response.output);
    if (!parsed.success) {
      logger.warn(`Findings recorder returned an invalid record: ${parsed.error.message}`);
    } else {
      output = parsed.data;
    }
  } catch (error) {
    if (!guard.signal.aborted) {
      logger.warn(
        `Findings recorder pass failed for ${conversationId}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  // A final pass that could not extract still records the agent's own answer as the verdict.
  if (!output && !(final && answer)) return false;
  if (!guard.claimWrite()) return false;

  const writer = agenticInvestigations.getFindingsWriter(request);
  const conversations = await agentBuilder.conversations.getScopedClient({ request });
  const verdict = final ? output?.verdict ?? answer?.slice(0, MAX_METADATA_TEXT_LENGTH) : undefined;

  const writes: Array<[string, () => Promise<unknown>]> = [
    [
      'metadata',
      () =>
        conversations.patchMetadata(conversationId, {
          ...(output?.summary ? { summary: output.summary } : {}),
          ...(output?.severity ? { severity: output.severity } : {}),
          ...(verdict ? { verdict } : {}),
        }),
    ],
  ];
  if (output) {
    writes.push([
      'hypotheses',
      () =>
        writer.setHypotheses({
          conversationId,
          hypotheses: limitToOneConfirmed(output.hypotheses),
        }),
    ]);
    if (output.impact) {
      const { summary, entities = [] } = output.impact;
      writes.push([
        'impact',
        () =>
          writer.setImpact({
            conversationId,
            summary,
            // The entity form is only for two or more entities affected in different ways.
            entities:
              entities.length >= 2
                ? entities.map(({ name, type }) => ({ id: name, name, ...(type ? { type } : {}) }))
                : [],
          }),
      ]);
    }
  }

  const results = await Promise.allSettled(writes.map(([, write]) => write()));
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      logger.warn(
        `Findings recorder could not write ${writes[index][0]} for ${conversationId}: ${
          result.reason instanceof Error ? result.reason.message : String(result.reason)
        }`
      );
    }
  });
  return results.some((result) => result.status === 'fulfilled');
};
