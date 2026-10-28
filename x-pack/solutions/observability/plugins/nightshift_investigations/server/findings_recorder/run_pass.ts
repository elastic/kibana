/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import { getEventActorDisplayName, type ConversationRoundStep } from '@kbn/agent-builder-common';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { INVESTIGATION_SEVERITY_CHANGED_EVENT_TYPE } from '@kbn/agentic-investigations-plugin/common';
import type { Hypothesis } from '@kbn/agentic-investigations-plugin/common';
import type { AgenticInvestigationsPluginStart } from '@kbn/agentic-investigations-plugin/server';
import { createOptimizeModel } from '../lib/create_optimize_model';
import { createInvestigationUsageTelemetry } from '../lib/investigation_usage_telemetry';
import type { PassGuard, RecorderMemory } from './coordinator';
import {
  buildRecorderMessages,
  countTurns,
  toolNamesToDefine,
  STRUCTURED_OUTPUT_TOOL,
} from './messages';
import {
  FINDINGS_JSON_SCHEMA,
  entityIdFor,
  findingsOutputSchema,
  limitFindings,
  type FindingsRecord,
} from './output_schema';
import { FINDINGS_RECORDER_SYSTEM_PROMPT } from './prompt';

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
  /** The recorder's earlier answers for this investigation, and where to keep this one. */
  memory: RecorderMemory;
  /** The human message that started the investigation. */
  question?: string;
  /** Set on the final pass: the agent's own answer. Its presence makes the pass final. */
  answer?: string;
}

const MAX_METADATA_TEXT_LENGTH = 10_000;
const FALLBACK_SUMMARY_CHARS = 1_000;
/** A malformed structured answer is the usual failure, so a pass asks again before giving up. */
const MAX_ATTEMPTS = 2;

/** Keeps the first confirmed hypothesis: at most one may be the root cause. */
export const limitToOneConfirmed = (hypotheses: FindingsRecord['hypotheses']): Hypothesis[] => {
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

interface ConversationEventLike {
  type: string;
  data?: { severity?: string; previous_severity?: string };
  actor?: Parameters<typeof getEventActorDisplayName>[0];
}

interface ConversationLike {
  events?: ConversationEventLike[];
  metadata?: { summary?: unknown; severity?: unknown; verdict?: unknown };
}

const readConversation = async (
  agentBuilder: AgentBuilderPluginStart,
  request: KibanaRequest,
  conversationId: string
): Promise<ConversationLike> => {
  try {
    const conversations = await agentBuilder.conversations.getScopedClient({ request });
    return ((await conversations.get(conversationId)) as ConversationLike) ?? {};
  } catch {
    return {};
  }
};

/** What a person changing the severity looks like to the recorder, one notice per change. */
const severityNotices = ({ events = [] }: ConversationLike): string[] =>
  events
    .filter(({ type }) => type === INVESTIGATION_SEVERITY_CHANGED_EVENT_TYPE)
    .map(
      ({ data, actor }) =>
        `${(actor && getEventActorDisplayName(actor)) ?? 'A user'} (a human) changed the ` +
        `investigation severity ${
          data?.previous_severity ? `from "${data.previous_severity}" ` : ''
        }to "${data?.severity}". Do not set the severity.`
    );

/**
 * The record already stored for the investigation, as an earlier answer of the recorder's own.
 * A follow-up round starts with none of the recorder's memory, and without this it would replace
 * the stored hypotheses with whatever the follow-up looked at. It lives only in the recorder's
 * conversation: nothing is added to the agent's.
 */
const storedRecord = async (
  agenticInvestigations: AgenticInvestigationsPluginStart,
  request: KibanaRequest,
  conversationId: string,
  conversation: ConversationLike
): Promise<Record<string, unknown> | undefined> => {
  try {
    const { hypotheses, impactSummary, impactEvidence } = await agenticInvestigations
      .getFindingsWriter(request)
      .getFindings({ conversationId });
    const { summary, severity, verdict } = conversation.metadata ?? {};
    if (hypotheses.length === 0 && typeof summary !== 'string') return undefined;
    return {
      summary: typeof summary === 'string' && summary ? summary : '(none recorded yet)',
      ...(typeof verdict === 'string' && verdict ? { verdict } : {}),
      ...(typeof severity === 'string' && severity ? { severity } : {}),
      ...(impactSummary ? { impact_summary: impactSummary } : {}),
      ...(impactEvidence ? { impact_evidence: impactEvidence } : {}),
      hypotheses: hypotheses.map(({ candidate, confidence, status, reason, evidence }) => ({
        candidate,
        confidence,
        status,
        ...(reason ? { reason } : {}),
        ...(evidence?.length ? { evidence } : {}),
      })),
    };
  } catch {
    return undefined;
  }
};

/**
 * One recorder pass: replays the agent's conversation to the model with its own earlier records
 * in it, asks for the updated record, and writes the result. Returns whether it wrote. Never
 * throws for a model or write failure; it logs and returns false, because the investigation must
 * not depend on it.
 */
export const runFindingsPass = async (
  deps: FindingsPassDeps,
  { request, conversationId, steps, guard, memory, question, answer }: FindingsPassParams
): Promise<boolean> => {
  const { logger } = deps;
  const final = answer !== undefined;
  const agentBuilder = deps.getAgentBuilder();
  const agenticInvestigations = deps.getAgenticInvestigations();
  if (!agentBuilder || !agenticInvestigations) return false;

  let output: FindingsRecord | undefined;
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

    const conversation = await readConversation(agentBuilder, request, conversationId);
    if (memory.turns().length === 0) {
      const stored = await storedRecord(
        agenticInvestigations,
        request,
        conversationId,
        conversation
      );
      if (stored) memory.remember({ atGroups: 0, final: false, answer: stored });
    }
    const notices = severityNotices(conversation);
    const messages = buildRecorderMessages({
      question,
      steps,
      turns: memory.turns(),
      final,
      answer,
      notices,
    });
    // The agent's tool calls are replayed as they happened, so each tool needs a definition for
    // the provider to accept them. The list is fixed so the cached prefix survives from one pass
    // to the next. The recorder never calls them: only the answer tool is forced.
    const replayed = Object.fromEntries(
      toolNamesToDefine(messages).map((name) => [
        name,
        {
          description: 'Called earlier in this conversation.',
          schema: { type: 'object', properties: {} },
        },
      ])
    );
    const tools = {
      ...replayed,
      [STRUCTURED_OUTPUT_TOOL]: {
        description:
          "Use the following schema to respond to the user's request in structured data, so it can be parsed and handled.",
        schema: FINDINGS_JSON_SCHEMA,
      },
    };

    for (let attempt = 1; attempt <= MAX_ATTEMPTS && !output && !guard.signal.aborted; attempt++) {
      try {
        const response = (await model.inferenceClient.chatComplete({
          system: FINDINGS_RECORDER_SYSTEM_PROMPT,
          messages,
          tools: tools as never,
          toolChoice: { function: STRUCTURED_OUTPUT_TOOL } as never,
          // The conversation only grows at the end, so ask for the prefix to be cached, as the
          // agent's own calls do: a retry or the next pass then reads most of it back.
          cacheControl: { type: 'ephemeral', ttl: '5m' },
          sessionId: conversationId,
          abortSignal: guard.signal,
        })) as unknown as {
          toolCalls?: Array<{ function: { name: string; arguments: unknown } }>;
        };
        const call = response.toolCalls?.find((c) => c.function.name === STRUCTURED_OUTPUT_TOOL);
        const parsed = findingsOutputSchema.safeParse(call?.function.arguments);
        if (parsed.success) {
          output = limitFindings(parsed.data);
        } else {
          logger.warn(
            `Findings recorder returned an invalid record (attempt ${attempt}): ${parsed.error.message}`
          );
        }
      } catch (error) {
        if (!guard.signal.aborted) {
          // A tool validation error says which fields failed only in its metadata.
          const reason = (error as { meta?: { errorsText?: string } }).meta?.errorsText;
          logger.warn(
            `Findings recorder pass failed for ${conversationId} (attempt ${attempt}): ${
              error instanceof Error ? error.message : String(error)
            }${reason ? ` (${reason})` : ''}`
          );
        }
      }
    }
  } catch (error) {
    if (!guard.signal.aborted) {
      logger.warn(
        `Findings recorder could not start a pass for ${conversationId}: ${
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
  // A severity a user chose is theirs: the recorder is told so, and never replaces it either way.
  // Read again here, not before the model call: a user may change it while the model is answering.
  const severityChosenByUser =
    severityNotices(await readConversation(agentBuilder, request, conversationId)).length > 0;
  const verdict = final ? output?.verdict ?? answer?.slice(0, MAX_METADATA_TEXT_LENGTH) : undefined;

  const writes: Array<[string, () => Promise<unknown>]> = [
    [
      'metadata',
      () =>
        conversations.patchMetadata(conversationId, {
          ...(output?.summary
            ? { summary: output.summary }
            : // A final pass without a record replaces an early live summary with the answer.
            final && answer
            ? { summary: answer.slice(0, FALLBACK_SUMMARY_CHARS) }
            : {}),
          ...(output?.severity && !severityChosenByUser ? { severity: output.severity } : {}),
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
    if (output.impact_summary) {
      const {
        impact_summary: impactSummary,
        impact_entities: entities,
        impact_evidence: impactEvidence,
      } = output;
      writes.push([
        'impact',
        () =>
          writer.setImpact({
            conversationId,
            summary: impactSummary,
            // Omitted keeps the stored evidence; `null` removes it.
            ...(impactEvidence !== undefined ? { evidence: impactEvidence } : {}),
            // Omitted keeps the stored entities. The entity form is only for two or more entities
            // affected in different ways, so a shorter list clears it.
            ...(entities !== undefined
              ? {
                  entities:
                    entities.length >= 2
                      ? entities.map(({ name, type }) => ({
                          id: entityIdFor(name),
                          name,
                          ...(type ? { type } : {}),
                        }))
                      : [],
                }
              : {}),
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
  const wrote = results.some((result) => result.status === 'fulfilled');
  // What the model answered stays in its conversation, so the next pass builds on it.
  if (wrote && output) {
    memory.remember({
      atGroups: countTurns(steps),
      final,
      answer: output as Record<string, unknown>,
    });
  }
  return wrote;
};
