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
import {
  INVESTIGATION_SEVERITY_CHANGED_EVENT_TYPE,
  INVESTIGATION_TEMPLATE_ID,
} from '@kbn/agentic-investigations-plugin/common';
import type { Hypothesis, ImpactEntity } from '@kbn/agentic-investigations-plugin/common';
import type { AgenticInvestigationsPluginStart } from '@kbn/agentic-investigations-plugin/server';
import type { ProposalDecision, ProposalStatus } from '@kbn/proposals-common';
import { createOptimizeModel } from '../lib/create_optimize_model';
import { createInvestigationUsageTelemetry } from '../lib/investigation_usage_telemetry';
import type { ModelUsageCollector } from '../lib/model_usage_collector';
import { trackBackgroundActivity, type NightshiftTelemetryClient } from '../telemetry';
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
  MAX_OPEN_PROPOSALS,
  entityIdFor,
  findingsOutputSchema,
  limitFindings,
  type FindingsRecord,
} from './output_schema';
import { buildRecorderSystemPrompt } from './prompt';
import { RECORDER_MAX_TOOL_CALLS, RECORDER_MAX_TOOL_ROUNDS } from './constants';
import {
  RECORDER_READ_FILE_SCHEMA,
  RECORDER_READ_FILE_TOOL,
  type RecorderWorkspace,
} from './workspace_tools';

export interface ExistingRecorderProposal {
  id: string;
  title: string;
  comment: string;
  status: ProposalStatus;
  decision?: ProposalDecision;
  impact?: string;
  confidence?: string;
}

export interface RecorderProposalInput {
  title: string;
  comment: string;
  impact?: string;
  confidence?: string;
}

/** What the final pass needs from the proposals plugin: what is already proposed, and to propose or revise. */
export interface RecorderProposals {
  /** The non-superseded proposals the investigation already has, oldest first. */
  list: (args: {
    request: KibanaRequest;
    conversationId: string;
  }) => Promise<ExistingRecorderProposal[]>;
  propose: (args: {
    request: KibanaRequest;
    conversationId: string;
    proposal: RecorderProposalInput;
  }) => Promise<void>;
  revise: (args: {
    request: KibanaRequest;
    proposalId: string;
    proposal: RecorderProposalInput;
  }) => Promise<void>;
  retire: (args: { request: KibanaRequest; proposalId: string }) => Promise<void>;
}

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
  getProposals?: () => RecorderProposals | undefined;
  getWorkspace?: (args: {
    request: KibanaRequest;
    conversationId: string;
    allowedConnectorIds: readonly string[];
  }) => Promise<RecorderWorkspace | undefined>;
  /** Reports each pass's LLM usage, which the round's own usage does not include. */
  telemetry?: NightshiftTelemetryClient;
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
 * The entities to store. An entity the record lists again keeps the id, type, links and evidence
 * already stored for it: the model sees entities by name, but a stored id can differ from its name (an
 * Entity Store id), and the id is what the UI opens the entity by. A write replaces the whole list.
 */
export const toImpactEntities = (
  entities: readonly RecordEntity[],
  stored: readonly ImpactEntity[]
): ImpactEntity[] => {
  const storedById = new Map(stored.map((entity) => [entity.id, entity]));
  const storedByName = new Map(
    stored.flatMap((entity) => (entity.name ? [[entity.name, entity] as const] : []))
  );
  return entities.map(({ name, type, evidence }) => {
    const known = storedById.get(entityIdFor(name)) ?? storedByName.get(name);
    const id = known?.id ?? entityIdFor(name);
    const kept = evidence ?? known?.evidence;
    const kind = type ?? known?.type;
    // The Knowledge Indicator and source links (`featureId`, `streamName`) are not the model's to
    // set, and a write replaces the list, so they are carried over from what is stored.
    return {
      ...(known?.featureId ? { featureId: known.featureId } : {}),
      ...(known?.streamName ? { streamName: known.streamName } : {}),
      id,
      name,
      ...(kind ? { type: kind } : {}),
      ...(kept ? { evidence: kept } : {}),
    };
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

interface ConversationEventLike {
  type: string;
  data?: { severity?: string; previous_severity?: string };
  actor?: Parameters<typeof getEventActorDisplayName>[0];
}

interface ConversationLike {
  /** Set to the investigation template for an investigation. Ask mode has none. */
  template_id?: string;
  /** The rounds already finished. A run that starts with some is a follow-up. */
  rounds?: unknown[];
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

const OPEN_PROPOSAL_COMMENT_NOTICE_CHARS = 1_000;
const CLOSED_PROPOSAL_COMMENT_NOTICE_CHARS = 240;

const clipNoticeText = (text: string, max: number): string =>
  text.length > max ? `${text.slice(0, max)}…` : text;

const titleKey = (title: string): string => title.trim().replace(/\s+/g, ' ').toLowerCase();
const collapseSpace = (text: string): string => text.trim().replace(/\s+/g, ' ');

const isSameProposal = (existing: ExistingRecorderProposal, next: RecorderProposalInput): boolean =>
  titleKey(existing.title) === titleKey(next.title) &&
  collapseSpace(existing.comment) === collapseSpace(next.comment) &&
  (next.impact === undefined || next.impact === existing.impact) &&
  (next.confidence === undefined || next.confidence === existing.confidence);

const closedOutcomeLabel = ({ decision, status }: ExistingRecorderProposal): string => {
  if (decision === 'approved') return 'applied';
  if (decision === 'dismissed') return 'declined';
  if (status === 'expired') return 'expired';
  return status;
};

/**
 * Indexes open proposals as `P1`, `P2`, ... and builds a final-pass notice showing both open and
 * already-closed proposals, so the recorder updates open ones in place and never repeats closed ones.
 */
const buildProposalsContext = (
  existing: readonly ExistingRecorderProposal[]
): { byHandle: Map<string, ExistingRecorderProposal>; notice?: string } => {
  const byHandle = new Map<string, ExistingRecorderProposal>();
  if (existing.length === 0) return { byHandle };

  const open = existing.filter(({ status }) => status === 'pending');
  const closed = existing.filter(({ status }) => status !== 'pending');
  const sections: string[] = ['Existing proposed actions on this investigation:'];

  if (open.length > 0) {
    const lines = open.map((proposal, index) => {
      const handle = `P${index + 1}`;
      byHandle.set(handle.toLowerCase(), proposal);
      const ratings = [
        proposal.impact ? `impact: ${proposal.impact}` : undefined,
        proposal.confidence ? `confidence: ${proposal.confidence}` : undefined,
      ]
        .filter(Boolean)
        .join(', ');
      const body = clipNoticeText(proposal.comment.trim(), OPEN_PROPOSAL_COMMENT_NOTICE_CHARS)
        .split('\n')
        .map((line) => `  ${line}`)
        .join('\n');
      return `- ${handle}: ${proposal.title.trim()}${ratings ? ` [${ratings}]` : ''}\n${body}`;
    });
    sections.push(
      `Open (${
        open.length
      } of ${MAX_OPEN_PROPOSALS} open slots used — leave unchanged ones out; set supersedes to an ID such as P1 to refine or replace in place; list obsolete IDs in retire_proposals):\n${lines.join(
        '\n'
      )}`
    );
  }

  if (closed.length > 0) {
    const lines = closed.map((proposal) => {
      const summary = clipNoticeText(
        collapseSpace(proposal.comment),
        CLOSED_PROPOSAL_COMMENT_NOTICE_CHARS
      );
      return `- [${closedOutcomeLabel(proposal)}] ${proposal.title.trim()}${
        summary ? ` — ${summary}` : ''
      }`;
    });
    sections.push(`Already closed (do not re-propose or supersede):\n${lines.join('\n')}`);
  }

  return { byHandle, notice: sections.join('\n\n') };
};

const writeRecorderProposals = async ({
  proposals,
  request,
  conversationId,
  existingAtPrompt,
  openByHandle,
  wanted = [],
  retire = [],
}: {
  proposals: RecorderProposals;
  request: KibanaRequest;
  conversationId: string;
  existingAtPrompt: readonly ExistingRecorderProposal[];
  openByHandle: ReadonlyMap<string, ExistingRecorderProposal>;
  wanted?: FindingsRecord['proposals'];
  retire?: FindingsRecord['retire_proposals'];
}): Promise<void> => {
  // Re-read right before writing: a human or another round may have acted while the model ran.
  const latest = await proposals.list({ request, conversationId });
  const latestById = new Map(latest.map((proposal) => [proposal.id, proposal]));
  const promptById = new Map(existingAtPrompt.map((proposal) => [proposal.id, proposal]));
  const openByTitle = new Map<string, ExistingRecorderProposal>();
  const closedIds = new Set<string>();
  const closedTitles = new Set<string>();

  for (const proposal of existingAtPrompt) {
    const current = latestById.get(proposal.id) ?? proposal;
    if (current.status !== 'pending') {
      closedIds.add(current.id);
      closedTitles.add(titleKey(current.title));
    }
  }
  for (const proposal of latest) {
    if (proposal.status === 'pending') {
      const key = titleKey(proposal.title);
      if (!openByTitle.has(key)) openByTitle.set(key, proposal);
    } else {
      closedIds.add(proposal.id);
      closedTitles.add(titleKey(proposal.title));
    }
  }

  const resolveRef = (rawRef: string): ExistingRecorderProposal | undefined => {
    const ref = rawRef.trim();
    return (
      openByHandle.get(ref.toLowerCase()) ??
      latestById.get(ref) ??
      promptById.get(ref) ??
      openByTitle.get(titleKey(ref))
    );
  };

  // Protect any open proposal that `wanted` is revising in this pass so an overlapping
  // `retire_proposals` entry cannot retire the revision target before `revise()` runs.
  const reservedForRevise = new Set<string>();
  for (const item of wanted) {
    const target =
      (item.supersedes ? resolveRef(item.supersedes) : undefined) ??
      openByTitle.get(titleKey(item.title));
    if (target) reservedForRevise.add(target.id);
  }

  let openCount = latest.filter(({ status }) => status === 'pending').length;
  const touchedIds = new Set<string>();
  const emittedTitles = new Set<string>();
  let firstError: unknown;

  const runWrite = async (fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (error) {
      firstError ??= error;
    }
  };

  // Retire obsolete open proposals first so freed slots are available to net-new proposals below.
  for (const rawRef of retire) {
    const matched = resolveRef(rawRef);
    if (!matched) continue;
    const current = latestById.get(matched.id) ?? matched;
    if (current.status !== 'pending' || closedIds.has(current.id)) continue;
    if (touchedIds.has(current.id) || reservedForRevise.has(current.id)) continue;
    touchedIds.add(current.id);
    const key = titleKey(current.title);
    if (openByTitle.get(key)?.id === current.id) {
      openByTitle.delete(key);
    }
    openCount = Math.max(0, openCount - 1);
    await runWrite(() => proposals.retire({ request, proposalId: current.id }));
  }

  for (const item of wanted) {
    const payload: RecorderProposalInput = {
      title: item.title,
      comment: item.comment,
      ...(item.impact !== undefined ? { impact: item.impact } : {}),
      ...(item.confidence !== undefined ? { confidence: item.confidence } : {}),
    };

    if (item.supersedes) {
      const ref = item.supersedes.trim();
      const matched = resolveRef(ref);
      if (matched) {
        const current = latestById.get(matched.id) ?? matched;
        if (current.status !== 'pending' || closedIds.has(current.id)) continue;
        if (touchedIds.has(current.id)) continue;
        touchedIds.add(current.id);
        emittedTitles.add(titleKey(item.title));
        if (isSameProposal(current, payload)) continue;
        await runWrite(() =>
          proposals.revise({ request, proposalId: current.id, proposal: payload })
        );
        continue;
      }
      if (closedTitles.has(titleKey(ref))) continue;
    }

    const key = titleKey(item.title);
    if (emittedTitles.has(key) || closedTitles.has(key)) continue;

    const sameOpen = openByTitle.get(key);
    if (sameOpen) {
      if (touchedIds.has(sameOpen.id)) continue;
      touchedIds.add(sameOpen.id);
      emittedTitles.add(key);
      if (isSameProposal(sameOpen, payload)) continue;
      await runWrite(() =>
        proposals.revise({ request, proposalId: sameOpen.id, proposal: payload })
      );
      continue;
    }

    if (openCount >= MAX_OPEN_PROPOSALS) continue;
    emittedTitles.add(key);
    openCount++;
    await runWrite(() => proposals.propose({ request, conversationId, proposal: payload }));
  }

  if (firstError !== undefined) throw firstError;
};

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
export const runFindingsPass = (
  deps: FindingsPassDeps,
  params: FindingsPassParams
): Promise<boolean> =>
  trackBackgroundActivity(
    {
      telemetry: deps.telemetry,
      activity: 'findings_recorder',
      conversationId: params.conversationId,
    },
    (modelUsage) => runTrackedFindingsPass(deps, params, modelUsage)
  );

const runTrackedFindingsPass = async (
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
  }: FindingsPassParams,
  modelUsage: ModelUsageCollector
): Promise<boolean> => {
  const { logger } = deps;
  const final = answer !== undefined;
  const agentBuilder = deps.getAgentBuilder();
  const agenticInvestigations = deps.getAgenticInvestigations();
  if (!agentBuilder || !agenticInvestigations) return false;

  // The record belongs to an investigation. The agent can also be chatted with outside one (ask
  // mode, with no investigation template, and a conversation that may not be saved yet), where
  // there is nothing to write to, so the pass has no work and no warning to log.
  const conversation = await readConversation(agentBuilder, request, conversationId);
  if (conversation.template_id !== INVESTIGATION_TEMPLATE_ID) {
    logger.debug(`Findings recorder skipped ${conversationId}: not an investigation conversation`);
    return false;
  }

  let output: FindingsRecord | undefined;
  let existingProposals: ExistingRecorderProposal[] = [];
  let openByHandle = new Map<string, ExistingRecorderProposal>();
  try {
    const model = await createOptimizeModel({
      request,
      roundConnectorId: connectorId,
      agentBuilder,
      inference: deps.getInference(),
      savedObjects: deps.getSavedObjects(),
      uiSettings: deps.getUiSettings(),
      telemetryMetadata: createInvestigationUsageTelemetry(conversationId),
      modelUsage,
      logger,
    });
    if (!model) return false;

    if (memory.turns().length === 0) {
      const stored = await storedRecord(
        agenticInvestigations,
        request,
        conversationId,
        conversation
      );
      if (stored) memory.remember({ atGroups: 0, final: false, answer: stored });
    }
    if (final) {
      existingProposals =
        (await deps
          .getProposals?.()
          ?.list({ request, conversationId })
          .catch(() => [])) ?? [];
    }
    const { byHandle, notice: proposalsNotice } = buildProposalsContext(existingProposals);
    openByHandle = byHandle;
    const notices = [
      ...severityNotices(conversation),
      ...(proposalsNotice ? [proposalsNotice] : []),
    ];

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
        // A description that says what the answer is. With the generic one ("respond in structured
        // data") Claude Sonnet 5.5 returned nothing at all to a live pass, every time.
        description: final
          ? 'Record the final findings of the investigation: summary, verdict, severity, impact, evidence and hypotheses.'
          : 'Record the summary and the hypotheses of the investigation so far.',
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

    const readFile = async (call: ModelCall, ws: RecorderWorkspace): Promise<string> => {
      if (call.function.name !== RECORDER_READ_FILE_TOOL) {
        return `Error: ${call.function.name} is not available here. Answer with ${STRUCTURED_OUTPUT_TOOL}.`;
      }
      const args = (call.function.arguments ?? {}) as Record<string, unknown>;
      try {
        return await ws.readFile({
          path: String(args.path ?? ''),
          offset: typeof args.offset === 'number' ? args.offset : undefined,
          length: typeof args.length === 'number' ? args.length : undefined,
        });
      } catch (error) {
        return `Error: ${error instanceof Error ? error.message : String(error)}`;
      }
    };

    /**
     * The final pass with files: the model may read files, then it answers with the answer tool,
     * as every pass does. Returns nothing when it never answers, so the caller falls back to a
     * single call without files.
     */
    const readThenAnswer = async (ws: RecorderWorkspace): Promise<FindingsRecord | undefined> => {
      const conversationSoFar: Message[] = [...messages];
      let reads = 0;
      for (let round = 1; round <= RECORDER_MAX_TOOL_ROUNDS && !guard.signal.aborted; round++) {
        const mustAnswer = round === RECORDER_MAX_TOOL_ROUNDS || reads >= RECORDER_MAX_TOOL_CALLS;
        const response = await ask(
          conversationSoFar,
          toolsWithFiles,
          mustAnswer ? { function: STRUCTURED_OUTPUT_TOOL } : 'auto',
          true
        );
        const calls = response.toolCalls ?? [];
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
        for (const call of calls) {
          reads++;
          conversationSoFar.push({
            role: MessageRole.Tool,
            name: call.function.name,
            toolCallId: call.toolCallId,
            response:
              reads > RECORDER_MAX_TOOL_CALLS
                ? `Error: no more files can be read. Answer with ${STRUCTURED_OUTPUT_TOOL} now.`
                : await readFile(call, ws),
          });
        }
      }
      return undefined;
    };

    if (workspace) {
      try {
        output = await readThenAnswer(workspace);
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
  // A follow-up already has hypotheses with evidence. A live pass is too thin to revise them
  // faithfully, so it only refreshes the summary and the final pass updates the hypotheses.
  const keepHypotheses = !final && (conversation.rounds?.length ?? 0) > 0;

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
  if (record && !keepHypotheses) {
    writes.push([
      'hypotheses',
      () =>
        writer.setHypotheses({
          conversationId,
          hypotheses: withStoredEvidence(record.hypotheses, stored?.hypotheses ?? []),
        }),
    ]);
    // Any impact field is a write: a pass may retract the evidence (`null`) or change the
    // entities without restating the summary, and an absent field keeps what is stored.
    if (
      final &&
      (record.impact_summary !== undefined ||
        record.impact_evidence !== undefined ||
        record.impact_entities !== undefined)
    ) {
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
            ...(impactSummary !== undefined ? { summary: impactSummary } : {}),
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
    const proposals = deps.getProposals?.();
    if (final && proposals && (record.proposals?.length || record.retire_proposals?.length)) {
      const { proposals: wanted, retire_proposals: retire } = record;
      writes.push([
        'proposals',
        () =>
          writeRecorderProposals({
            proposals,
            request,
            conversationId,
            existingAtPrompt: existingProposals,
            openByHandle,
            wanted,
            retire,
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
