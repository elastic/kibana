/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import type { CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import { getEventActorDisplayName, type ConversationRoundStep } from '@kbn/agent-builder-common';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { MessageRole, type Message, type ToolCall } from '@kbn/inference-common';
import { INVESTIGATION_SEVERITY_CHANGED_EVENT_TYPE } from '@kbn/agentic-investigations-plugin/common';
import type { Hypothesis, ImpactEntity } from '@kbn/agentic-investigations-plugin/common';
import type { AgenticInvestigationsPluginStart } from '@kbn/agentic-investigations-plugin/server';
import { createOptimizeModel } from '../lib/create_optimize_model';
import { createInvestigationUsageTelemetry } from '../lib/investigation_usage_telemetry';
import type { PassGuard, RecorderMemory } from './coordinator';
import {
  buildRecorderMessages,
  clippedResultFiles,
  countTurns,
  toolNamesToDefine,
  STRUCTURED_OUTPUT_TOOL,
} from './messages';
import {
  FINDINGS_JSON_SCHEMA,
  LIVE_FINDINGS_JSON_SCHEMA,
  entityIdFor,
  findingsOutputSchema,
  limitFindings,
  type FindingsRecord,
} from './output_schema';
import { buildRecorderSystemPrompt } from './prompt';
import { RECORDER_MAX_TOOL_CALLS, RECORDER_MAX_TOOL_ROUNDS } from './constants';
import {
  RECORDER_LIST_FILES_SCHEMA,
  RECORDER_LIST_FILES_TOOL,
  RECORDER_READ_FILE_SCHEMA,
  RECORDER_READ_FILE_TOOL,
  RECORDER_WRITE_FILE_SCHEMA,
  RECORDER_WRITE_FILE_TOOL,
  type RecorderWorkspace,
} from './workspace_tools';

export interface FindingsPassDeps {
  getAgentBuilder: () => AgentBuilderPluginStart | undefined;
  getInference: () => InferenceServerStart | undefined;
  getSavedObjects: () => CoreStart['savedObjects'] | undefined;
  getUiSettings: () => CoreStart['uiSettings'] | undefined;
  getAgenticInvestigations: () => AgenticInvestigationsPluginStart | undefined;
  /**
   * A read-only view of the investigation's sandbox workspace, for the final pass. Absent or
   * resolving to `undefined` when there is no sandbox: the final pass then answers without files.
   */
  getWorkspace?: (args: {
    request: KibanaRequest;
    conversationId: string;
    allowedConnectorIds: readonly string[];
  }) => Promise<RecorderWorkspace | undefined>;
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
  /** The connector the investigation ran on, so the recorder uses the same model. */
  connectorId?: string;
  /** The connectors the investigator may use, so their credentials are redacted from file reads. */
  allowedConnectorIds?: readonly string[];
}

const MAX_METADATA_TEXT_LENGTH = 10_000;
const FALLBACK_SUMMARY_CHARS = 1_000;
/** A malformed structured answer is the usual failure, so a pass asks again before giving up. */
const MAX_ATTEMPTS = 2;

type RecordEntity = NonNullable<FindingsRecord['impact_entities']>[number];

/**
 * The entities to store. An entity the model lists again without evidence keeps the evidence
 * already stored for it, since a write replaces the whole list.
 */
export const toImpactEntities = (
  entities: readonly RecordEntity[],
  stored: readonly ImpactEntity[]
): ImpactEntity[] => {
  const storedById = new Map(stored.map((entity) => [entity.id, entity]));
  return entities.map(({ name, type, evidence }) => {
    const id = entityIdFor(name);
    const kept = evidence ?? storedById.get(id)?.evidence;
    return { id, name, ...(type ? { type } : {}), ...(kept ? { evidence: kept } : {}) };
  });
};

type RecordHypothesis = FindingsRecord['hypotheses'][number];

/**
 * The hypotheses to store, each keeping the evidence already stored for the same candidate when
 * the pass gave none. A write replaces the whole list, and a live pass does not carry evidence.
 */
export const withStoredEvidence = (
  hypotheses: readonly RecordHypothesis[],
  stored: readonly Hypothesis[]
): RecordHypothesis[] => {
  const evidenceByCandidate = new Map(
    stored.map(({ candidate, evidence }) => [candidate, evidence])
  );
  return hypotheses.map((hypothesis) => {
    if (hypothesis.evidence?.length) return hypothesis;
    const kept = evidenceByCandidate.get(hypothesis.candidate);
    return kept?.length ? { ...hypothesis, evidence: kept } : hypothesis;
  });
};

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
    const { hypotheses, impactSummary, impactEvidence, impactEntities } =
      await agenticInvestigations.getFindingsWriter(request).getFindings({ conversationId });
    const { summary, severity, verdict } = conversation.metadata ?? {};
    if (hypotheses.length === 0 && typeof summary !== 'string') return undefined;
    return {
      summary: typeof summary === 'string' && summary ? summary : '(none recorded yet)',
      ...(typeof verdict === 'string' && verdict ? { verdict } : {}),
      ...(typeof severity === 'string' && severity ? { severity } : {}),
      ...(impactSummary ? { impact_summary: impactSummary } : {}),
      ...(impactEvidence ? { impact_evidence: impactEvidence } : {}),
      ...(impactEntities.length
        ? {
            impact_entities: impactEntities.map(({ id, name, type, evidence }) => ({
              name: name ?? id,
              ...(type ? { type } : {}),
              ...(evidence ? { evidence } : {}),
            })),
          }
        : {}),
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
  {
    request,
    conversationId,
    steps,
    guard,
    memory,
    question,
    answer,
    connectorId,
    allowedConnectorIds = [],
  }: FindingsPassParams
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
      roundConnectorId: connectorId,
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

    // The final pass can read the investigation's workspace. The round's long tool results are
    // written there first, so what the recorder is shown clipped can be read in full.
    const workspace = final
      ? await deps
          .getWorkspace?.({ request, conversationId, allowedConnectorIds })
          .catch((error) => {
            logger.warn(
              `Findings recorder has no workspace for ${conversationId}: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
            return undefined;
          })
      : undefined;
    const resultFiles = workspace ? clippedResultFiles(steps) : [];
    const resultsWritten =
      workspace && resultFiles.length > 0
        ? await workspace.writeResults(resultFiles).then(
            () => true,
            (error) => {
              logger.warn(
                `Findings recorder could not write tool results for ${conversationId}: ${
                  error instanceof Error ? error.message : String(error)
                }`
              );
              return false;
            }
          )
        : false;
    const buildMessages = (withFiles: boolean) =>
      buildRecorderMessages({
        question,
        steps,
        turns: memory.turns(),
        final,
        answer,
        notices,
        ...(withFiles && resultsWritten
          ? {
              resultPaths: new Map(resultFiles.map(({ toolCallId, path }) => [toolCallId, path])),
            }
          : {}),
      });
    const messages = buildMessages(Boolean(workspace));

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
    const answerTool = {
      [STRUCTURED_OUTPUT_TOOL]: {
        description:
          "Use the following schema to respond to the user's request in structured data, so it can be parsed and handled.",
        // While the investigation runs the record is only the summary and the hypotheses.
        schema: final ? FINDINGS_JSON_SCHEMA : LIVE_FINDINGS_JSON_SCHEMA,
      },
    };
    const tools = { ...replayed, ...answerTool };
    const toolsWithFiles = {
      ...tools,
      [RECORDER_READ_FILE_TOOL]: {
        description:
          "Reads a file in the investigation's workspace. Use it for the full output of a tool result that was clipped.",
        schema: RECORDER_READ_FILE_SCHEMA,
      },
      [RECORDER_LIST_FILES_TOOL]: {
        description: "Lists a directory in the investigation's workspace.",
        schema: RECORDER_LIST_FILES_SCHEMA,
      },
      [RECORDER_WRITE_FILE_TOOL]: {
        description:
          'Writes the record, as JSON in the given format, to the findings file. It is the only file that can be written, and it takes no path. Checks the record and says what to fix.',
        schema: RECORDER_WRITE_FILE_SCHEMA,
      },
    };

    interface ModelCall {
      toolCallId: string;
      function: { name: string; arguments: unknown };
    }
    const ask = async (
      conversationMessages: Message[],
      toolDefinitions: Record<string, unknown>,
      toolChoice: unknown,
      withFiles: boolean
    ) =>
      (await model.inferenceClient.chatComplete({
        system: buildRecorderSystemPrompt({ final, files: withFiles }),
        messages: conversationMessages,
        tools: toolDefinitions as never,
        toolChoice: toolChoice as never,
        // The conversation only grows at the end, so ask for the prefix to be cached, as the
        // agent's own calls do: a retry or the next pass then reads most of it back.
        cacheControl: { type: 'ephemeral', ttl: '5m' },
        sessionId: conversationId,
        abortSignal: guard.signal,
      })) as unknown as { content?: string | null; toolCalls?: ModelCall[] };

    const parseRecord = (raw: unknown, label: string): FindingsRecord | undefined => {
      const parsed = findingsOutputSchema.safeParse(raw);
      if (parsed.success) return limitFindings(parsed.data);
      logger.warn(
        `Findings recorder returned an invalid record (${label}): ${parsed.error.message}`
      );
      return undefined;
    };

    /**
     * The model's answer as a file: JSON in the output format. A record that does not parse or
     * match is sent back to the model as the tool's result, so it can write it again.
     */
    const checkWrittenRecord = (raw: unknown): { record: FindingsRecord } | { error: string } => {
      const content = (raw as { content?: unknown } | undefined)?.content;
      if (typeof content !== 'string') {
        return { error: 'Error: content must be the whole record as a JSON string.' };
      }
      let json: unknown;
      try {
        json = JSON.parse(content);
      } catch (error) {
        return {
          error: `Error: the content is not valid JSON (${
            error instanceof Error ? error.message : String(error)
          }). Write the whole record again.`,
        };
      }
      const parsed = findingsOutputSchema.safeParse(json);
      if (!parsed.success) {
        const issues = parsed.error.issues
          .slice(0, 8)
          .map(({ path, message }) => `${path.join('.') || '(record)'}: ${message}`);
        return {
          error: `Error: the record does not match the format. Fix and write it again.\n${issues.join(
            '\n'
          )}`,
        };
      }
      return { record: limitFindings(parsed.data) };
    };

    const runWorkspaceTool = async (call: ModelCall, ws: RecorderWorkspace): Promise<string> => {
      const args = (call.function.arguments ?? {}) as Record<string, unknown>;
      try {
        if (call.function.name === RECORDER_READ_FILE_TOOL) {
          return await ws.readFile({
            path: String(args.path ?? ''),
            offset: typeof args.offset === 'number' ? args.offset : undefined,
            length: typeof args.length === 'number' ? args.length : undefined,
          });
        }
        if (call.function.name === RECORDER_LIST_FILES_TOOL) {
          return await ws.listFiles({ dir: String(args.dir ?? '') });
        }
        return `Error: ${call.function.name} is not available here. Write the record with ${RECORDER_WRITE_FILE_TOOL}.`;
      } catch (error) {
        return `Error: ${error instanceof Error ? error.message : String(error)}`;
      }
    };

    /**
     * The final pass with files: the model may read files, then it writes its record to the
     * findings file. Returns nothing when it never writes a valid one, so the caller falls back
     * to a single call without files.
     */
    const readThenWrite = async (ws: RecorderWorkspace): Promise<FindingsRecord | undefined> => {
      const conversationSoFar: Message[] = [...messages];
      let reads = 0;
      for (let round = 1; round <= RECORDER_MAX_TOOL_ROUNDS && !guard.signal.aborted; round++) {
        const mustWrite = round === RECORDER_MAX_TOOL_ROUNDS || reads >= RECORDER_MAX_TOOL_CALLS;
        const response = await ask(
          conversationSoFar,
          toolsWithFiles,
          mustWrite ? { function: RECORDER_WRITE_FILE_TOOL } : 'auto',
          true
        );
        const calls = response.toolCalls ?? [];
        // A model that answers with the answer tool instead of the file is not turned away.
        const answerCall = calls.find((call) => call.function.name === STRUCTURED_OUTPUT_TOOL);
        if (answerCall) {
          return parseRecord(answerCall.function.arguments, `with files, round ${round}`);
        }
        if (calls.length === 0) return undefined;
        conversationSoFar.push({
          role: MessageRole.Assistant,
          content: response.content ?? null,
          toolCalls: calls as unknown as ToolCall[],
        });
        let written: FindingsRecord | undefined;
        for (const call of calls) {
          let result: string;
          if (call.function.name === RECORDER_WRITE_FILE_TOOL) {
            const checked = checkWrittenRecord(call.function.arguments);
            if ('record' in checked) {
              written = checked.record;
              result = 'Saved.';
              // The file mirrors the record that is committed. A failed write does not lose it.
              await ws
                .writeFindings((call.function.arguments as { content: string }).content)
                .catch((error) =>
                  logger.warn(
                    `Findings recorder could not write the findings file for ${conversationId}: ${
                      error instanceof Error ? error.message : String(error)
                    }`
                  )
                );
            } else {
              result = checked.error;
            }
          } else {
            reads++;
            result =
              reads > RECORDER_MAX_TOOL_CALLS
                ? `Error: no more files can be read. Write the record with ${RECORDER_WRITE_FILE_TOOL} now.`
                : await runWorkspaceTool(call, ws);
          }
          conversationSoFar.push({
            role: MessageRole.Tool,
            name: call.function.name,
            toolCallId: call.toolCallId,
            response: result,
          });
        }
        if (written) return written;
      }
      return undefined;
    };

    if (workspace) {
      try {
        output = await readThenWrite(workspace);
      } catch (error) {
        if (!guard.signal.aborted) {
          logger.warn(
            `Findings recorder could not read files for ${conversationId}, answering without them: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
    }

    // One call, forced to answer. This is every live pass, and the final pass when it has no
    // files or could not use them. The replay carries no file paths it could not follow.
    const plainMessages = workspace ? buildMessages(false) : messages;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS && !output && !guard.signal.aborted; attempt++) {
      try {
        const response = await ask(
          plainMessages,
          tools,
          { function: STRUCTURED_OUTPUT_TOOL },
          false
        );
        const call = response.toolCalls?.find((c) => c.function.name === STRUCTURED_OUTPUT_TOOL);
        output = parseRecord(call?.function.arguments, `attempt ${attempt}`);
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

  // While the investigation runs only the summary and the hypotheses are recorded. A live answer
  // that carries more is not written: the rest is written once, from the final pass.
  const record: FindingsRecord | undefined =
    output && !final
      ? {
          summary: output.summary,
          hypotheses: output.hypotheses.map((hypothesis) => omit(hypothesis, 'evidence')),
        }
      : output;

  const writer = agenticInvestigations.getFindingsWriter(request);
  const conversations = await agentBuilder.conversations.getScopedClient({ request });
  // A severity a user chose is theirs: the recorder is told so, and never replaces it either way.
  // Read again here, not before the model call: a user may change it while the model is answering.
  const severityChosenByUser =
    severityNotices(await readConversation(agentBuilder, request, conversationId)).length > 0;
  const verdict = final ? record?.verdict ?? answer?.slice(0, MAX_METADATA_TEXT_LENGTH) : undefined;
  // A write replaces the hypothesis and entity lists, so what is stored is read first to keep the
  // evidence of what the pass lists again without any.
  const stored = record
    ? await writer.getFindings({ conversationId }).catch(() => undefined)
    : undefined;

  const writes: Array<[string, () => Promise<unknown>]> = [
    [
      'metadata',
      () =>
        conversations.patchMetadata(conversationId, {
          ...(record?.summary
            ? { summary: record.summary }
            : // A final pass without a record replaces an early live summary with the answer.
            final && answer
            ? { summary: answer.slice(0, FALLBACK_SUMMARY_CHARS) }
            : {}),
          ...(final && record?.severity && !severityChosenByUser
            ? { severity: record.severity }
            : {}),
          ...(verdict ? { verdict } : {}),
        }),
    ],
  ];
  if (record) {
    writes.push([
      'hypotheses',
      () =>
        writer.setHypotheses({
          conversationId,
          hypotheses: limitToOneConfirmed(
            withStoredEvidence(record.hypotheses, stored?.hypotheses ?? [])
          ),
        }),
    ]);
    if (final && record.impact_summary) {
      const {
        impact_summary: impactSummary,
        impact_entities: entities,
        impact_evidence: impactEvidence,
      } = record;
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
                      ? toImpactEntities(entities, stored?.impactEntities ?? [])
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
  if (wrote && record) {
    memory.remember({
      atGroups: countTurns(steps),
      final,
      answer: record as Record<string, unknown>,
    });
  }
  return wrote;
};
