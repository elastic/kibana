/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { TerminalExecutionStatuses } from '@kbn/workflows';
import { NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { AgentBuilderPluginStart, ConversationPublicClient } from '@kbn/agent-builder-server';
import type { AgentAvailabilityConfig } from '@kbn/agent-builder-server/agents';
import type { AgenticInvestigationsPluginStart } from '@kbn/agentic-investigations-plugin/server';
import type {
  InvestigationSubject as StoredInvestigationSubject,
  SlackSeenEvent,
  SlackThreadSubject,
} from '@kbn/agentic-investigations-plugin/common';
import {
  INVESTIGATION_TEMPLATE_ID,
  isInvestigationTitlePending,
  MAX_SLACK_SEEN_EVENTS,
  MAX_EVIDENCE_TEXT_LENGTH,
  MAX_SUBJECTS_PER_CONVERSATION,
} from '@kbn/agentic-investigations-plugin/common';
import { investigationStateSchema } from '@kbn/significant-events-schema';
import { assertNever } from '@kbn/std';
import { resolveNightshiftModelForRequest } from '@kbn/nightshift-ai';
import { installInvestigationAgent } from '../lib/install_investigation_agent';
import { isInvestigationWorkflowExecution } from '../lib/managed_workflows/is_investigation_workflow_execution';
import type { InvestigationQuotaCallback } from '../types';
import type {
  AlertInvestigationContext,
  AlertSnapshot,
  GetInvestigationResponse,
  InvestigationContext,
  InvestigationStatus,
  InvestigationSubject,
  InvestigationSubjectType,
  InvestigationTriggerType,
  ListInvestigationItem,
  ListInvestigationsRequest,
  ListInvestigationsResponse,
  UpdateInvestigationRequest,
  StartInvestigationRequest,
  StartInvestigationResponse,
} from '../../common';
import {
  alertInvestigationContextSchema,
  DEFAULT_INVESTIGATION_TRIGGER_TYPE,
  freeFormContextSchema,
} from '../../common';
import type {
  InvestigationAttributes,
  InvestigationPatch,
  InvestigationRecord,
  InvestigationRepository,
  ProjectedInvestigationRecord,
} from '../storage';
import { InvestigationStaleWriteError } from '../storage';
import { buildInvestigationMessage } from './build_investigation_message';
import {
  InvestigationConflictError,
  InvestigationNotFoundError,
  InvestigationQuotaDeniedError,
  InvalidInvestigationContextError,
  InvestigationUnavailableError,
} from './errors';
import { evaluateInvestigationQuota } from './evaluate_investigation_quota';
import {
  findInvestigationConversations,
  getOrCreateInvestigationConversation,
  type InvestigationConversation,
} from './investigation_conversation';
import {
  buildFollowUpMessage,
  recoverSubjectsFromInputs,
  toStartSubjects,
  toSubjectKeys,
  withoutRecordedSubjects,
  type WorkflowSubjectInput,
} from './investigation_subjects';

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v || undefined : undefined;
}

function isTerminalStatus(status: InvestigationStatus): boolean {
  return status === 'completed' || status === 'failed' || status === 'cancelled';
}

/** Used when persist omitted `error`. */
const FALLBACK_INVESTIGATION_ERROR = 'Investigation failed';

/** Keeps a derived summary to one readable line, since it is rendered as a list headline. */
const MAX_DERIVED_SUBJECT_SUMMARY_LENGTH = 200;

/**
 * A manual investigation's subject id is the placeholder `manual`, so the subject would carry no
 * description of the run. The prompt is the only thing that describes the run at this point, so
 * it stands in as the subject summary.
 */
const withDerivedSubjectSummary = (
  subject: InvestigationSubject,
  message: string
): InvestigationSubject => {
  if (subject.type !== 'manual' || subject.summary) {
    return subject;
  }

  const collapsed = message.replace(/\s+/g, ' ').trim();
  if (!collapsed) {
    return subject;
  }

  const summary =
    collapsed.length > MAX_DERIVED_SUBJECT_SUMMARY_LENGTH
      ? `${collapsed.slice(0, MAX_DERIVED_SUBJECT_SUMMARY_LENGTH - 1).trimEnd()}…`
      : collapsed;

  return { ...subject, summary };
};

const MAX_SLACK_THREAD_TITLE_LENGTH = 80;
const DEFAULT_SLACK_THREAD_TITLE = 'Slack investigation';

/** Response of POST /internal/nightshift/investigations/_slack_thread. */
export interface SlackThreadInvestigation {
  investigation_id: string;
  title: string;
  status_message_ts?: string;
  /** Another execution already handled this event, so the caller should not act on it again. */
  duplicate?: true;
}

/** A delivered Slack event and the workflow execution handling it. */
export interface SlackThreadEvent {
  eventId: string;
  executionId: string;
}

/**
 * The investigation's title is Agent Builder's to generate on the first round. Until it has, the
 * response's title is a headline from the thread's question.
 */
const toSlackThreadInvestigation = (
  { id, title }: InvestigationConversation,
  {
    statusMessageTs,
    question,
    duplicate,
  }: { statusMessageTs: string | undefined; question: string | undefined; duplicate: boolean }
): SlackThreadInvestigation => ({
  investigation_id: id,
  title: isInvestigationTitlePending(title) ? toSlackThreadTitle(question) : title,
  ...(statusMessageTs ? { status_message_ts: statusMessageTs } : {}),
  ...(duplicate && { duplicate: true }),
});

/** What one call of the Slack thread workflow records on the thread. */
interface SlackThreadActivity {
  statusMessageTs?: string;
  event?: SlackThreadEvent;
  /** Gives `event` back instead of recording it, when this execution was the one that recorded it. */
  releaseEvent?: boolean;
}

/** Whether an execution other than the one delivering `event` already handled it. */
const isDuplicateSlackEvent = (
  recorded: SlackThreadSubject | undefined,
  { event, releaseEvent }: SlackThreadActivity
): boolean =>
  event !== undefined &&
  !releaseEvent &&
  (recorded?.seen_events ?? []).some(
    (seen) => seen.event_id === event.eventId && seen.execution_id !== event.executionId
  );

/** The thread's handled events after `activity`, or undefined when they do not change. */
const toSeenEvents = (
  seen: SlackSeenEvent[],
  { event, releaseEvent }: SlackThreadActivity
): SlackSeenEvent[] | undefined => {
  if (!event) {
    return undefined;
  }
  if (releaseEvent) {
    const kept = seen.filter(
      (handled) => handled.event_id !== event.eventId || handled.execution_id !== event.executionId
    );
    return kept.length < seen.length ? kept : undefined;
  }
  if (seen.some((handled) => handled.event_id === event.eventId)) {
    return undefined;
  }
  return [...seen, { event_id: event.eventId, execution_id: event.executionId }].slice(
    -MAX_SLACK_SEEN_EVENTS
  );
};

/**
 * The thread subject's `slack` fields that change when it records `activity`, or undefined when
 * nothing changes. An event is remembered once, with the execution handling it; the oldest
 * remembered events make room.
 */
const toSlackThreadUpdate = (
  recorded: SlackThreadSubject | undefined,
  activity: SlackThreadActivity
): Pick<SlackThreadSubject, 'status_message_ts' | 'seen_events'> | undefined => {
  const { statusMessageTs } = activity;
  const seenEvents = toSeenEvents(recorded?.seen_events ?? [], activity);
  const recordStatusMessage =
    statusMessageTs !== undefined && statusMessageTs !== recorded?.status_message_ts;
  if (!seenEvents && !recordStatusMessage) {
    return undefined;
  }
  return {
    ...(recordStatusMessage && { status_message_ts: statusMessageTs }),
    ...(seenEvents && { seen_events: seenEvents }),
  };
};

/**
 * The key Agent Builder identifies a Slack thread's conversation by (its conversation origin),
 * which is also the thread's subject id. Channel ids are only unique within a workspace.
 */
export const toSlackThreadKey = ({
  workspace,
  channel,
  threadTs,
}: {
  workspace: string;
  channel: string;
  threadTs: string;
}): string => `team:${workspace}/channel:${channel}/thread:${threadTs}`;

/** The message text with Slack mentions and markup collapsed away. */
const collapseSlackText = (text: string | undefined): string =>
  (text ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** A headline from the thread's question. */
const toSlackThreadTitle = (text: string | undefined): string => {
  const collapsed = collapseSlackText(text);
  if (!collapsed) {
    return DEFAULT_SLACK_THREAD_TITLE;
  }
  return collapsed.length > MAX_SLACK_THREAD_TITLE_LENGTH
    ? `${collapsed.slice(0, MAX_SLACK_THREAD_TITLE_LENGTH - 1).trimEnd()}…`
    : collapsed;
};

const MAX_SLACK_SUBJECT_SUMMARY_LENGTH = MAX_EVIDENCE_TEXT_LENGTH;

/** The subject an investigation's lifecycle events are attributed to. */
export interface LifecycleSubject {
  subject: Pick<InvestigationSubject, 'type' | 'id'>;
  triggerType: InvestigationTriggerType;
  /** When the subject joined the investigation. */
  startedAt: string;
}

const toSubject = ({
  subjectType,
  subjectId,
  subjectSummary,
}: {
  subjectType: InvestigationSubjectType;
  subjectId: string;
  subjectSummary?: string;
}): InvestigationSubject => {
  if (subjectSummary) {
    return { type: subjectType, id: subjectId, summary: subjectSummary };
  }
  return { type: subjectType, id: subjectId };
};

/**
 * Stored attributes each {@link ListInvestigationItem} property needs from `find`. A new list
 * property is a compile error until it is mapped here; `investigation_id` is the SO id and needs
 * none. Flattened values are what `list()` passes as `fields`.
 */
const LIST_INVESTIGATION_ITEM_FIELDS = {
  investigation_id: [],
  title: ['title'],
  status: ['status'],
  created_at: ['created_at'],
  started_at: ['started_at'],
  completed_at: ['completed_at'],
  severity: ['severity'],
  concurrency_key: ['concurrency_key'],
  executed_by: ['executed_by'],
  subject: ['subject_type', 'subject_id', 'subject_summary'],
  summary: ['summary'],
  impact: ['impact'],
} as const satisfies Record<
  keyof ListInvestigationItem,
  readonly (keyof InvestigationAttributes)[]
>;

const LIST_INVESTIGATION_ATTRIBUTE_FIELDS = Object.values(LIST_INVESTIGATION_ITEM_FIELDS).flat();

type ListInvestigationRecord = ProjectedInvestigationRecord<
  (typeof LIST_INVESTIGATION_ITEM_FIELDS)[keyof ListInvestigationItem][number]
>;

const toListInvestigationItem = (record: ListInvestigationRecord): ListInvestigationItem => ({
  investigation_id: record.id,
  title: record.title,
  status: record.status,
  created_at: record.created_at,
  started_at: record.started_at,
  completed_at: record.completed_at ?? undefined,
  severity: record.severity,
  concurrency_key: record.concurrency_key,
  executed_by: record.executed_by,
  subject: toSubject({
    subjectType: record.subject_type,
    subjectId: record.subject_id,
    subjectSummary: record.subject_summary,
  }),
  summary: record.summary,
  impact: record.impact,
});

const toInvestigationResponse = (record: InvestigationRecord): GetInvestigationResponse => {
  const recommendations = investigationStateSchema.shape.recommendations.safeParse(
    record.recommendations
  );

  return {
    ...toListInvestigationItem(record),
    trigger_type: record.trigger_type,
    error: record.error ?? undefined,
    summary: record.summary,
    conclusion: record.conclusion,
    hypotheses: record.hypotheses,
    recommendations: recommendations.success ? recommendations.data : undefined,
    conversation_id: record.conversation_id,
    impact: record.impact,
  };
};

export interface NightshiftInvestigationsClientDeps {
  request: KibanaRequest;
  workflowsManagement?: WorkflowsServerPluginSetup;
  spaces?: SpacesPluginStart;
  logger: Logger;
  /**
   * Explicit override for contexts where the request cannot carry space info (e.g. workflow step
   * definitions using getFakeRequest). See https://github.com/elastic/kibana/issues/284786.
   */
  spaceIdOverride?: string;
  agentBuilder?: AgentBuilderPluginStart;
  /** Stores investigations: subjects, claims, and the open-investigation lookup. */
  agenticInvestigations?: AgenticInvestigationsPluginStart;
  /** Passed through to `agents.ensure` so a pre-installed agent is hidden while unavailable. */
  agentAvailability: AgentAvailabilityConfig;
  investigationQuotaCallback?: InvestigationQuotaCallback;
  investigationRepository: InvestigationRepository;
  inference?: InferenceServerStart;
  savedObjects?: CoreStart['savedObjects'];
  uiSettings?: CoreStart['uiSettings'];
  isAvailable: (connectorId?: string) => Promise<boolean>;
  isInfrastructureAvailable: () => Promise<boolean>;
}

export class NightshiftInvestigationsClient {
  private readonly request: KibanaRequest;
  private readonly workflowsManagement: WorkflowsServerPluginSetup | undefined;
  private readonly spaces: SpacesPluginStart | undefined;
  private readonly logger: Logger;
  private readonly spaceIdOverride?: string;
  private readonly agentBuilder?: AgentBuilderPluginStart;
  private readonly agenticInvestigations?: AgenticInvestigationsPluginStart;
  private readonly agentAvailability: AgentAvailabilityConfig;
  private readonly investigationQuotaCallback?: InvestigationQuotaCallback;
  private readonly investigationRepository: InvestigationRepository;
  private readonly inference?: InferenceServerStart;
  private readonly savedObjects?: CoreStart['savedObjects'];
  private readonly uiSettings?: CoreStart['uiSettings'];
  private readonly checkAvailability: (connectorId?: string) => Promise<boolean>;
  private readonly checkInfrastructureAvailability: () => Promise<boolean>;

  constructor(deps: NightshiftInvestigationsClientDeps) {
    this.request = deps.request;
    this.workflowsManagement = deps.workflowsManagement;
    this.spaces = deps.spaces;
    this.logger = deps.logger;
    this.spaceIdOverride = deps.spaceIdOverride;
    this.agentBuilder = deps.agentBuilder;
    this.agenticInvestigations = deps.agenticInvestigations;
    this.agentAvailability = deps.agentAvailability;
    this.investigationQuotaCallback = deps.investigationQuotaCallback;
    this.investigationRepository = deps.investigationRepository;
    this.inference = deps.inference;
    this.savedObjects = deps.savedObjects;
    this.uiSettings = deps.uiSettings;
    this.checkAvailability = deps.isAvailable;
    this.checkInfrastructureAvailability = deps.isInfrastructureAvailable;
  }

  public isAvailable = (connectorId?: string): Promise<boolean> =>
    this.checkAvailability(connectorId);

  private getSpaceId(): string {
    return (
      this.spaceIdOverride ??
      this.spaces?.spacesService.getSpaceId(this.request) ??
      DEFAULT_SPACE_ID
    );
  }

  /**
   * Validates the context against the contract for its subject type and composes the brief the
   * agent will read. Done here and not only in the route schema, because the workflow step
   * definition and the plugin start contract both reach `start` without passing through route
   * validation. Each branch parses with its own schema, so the alert brief is composed from a
   * value the schema has already vouched for rather than from a re-checked `unknown`.
   */
  private prepareAgentInput(
    subject: InvestigationSubject,
    message: string | undefined,
    context: InvestigationContext | AlertInvestigationContext
  ): { message: string; context: Record<string, unknown>; alerts: AlertSnapshot[] } {
    if (subject.type === 'alert') {
      const parsed = alertInvestigationContextSchema.safeParse(context);
      if (!parsed.success) {
        throw new InvalidInvestigationContextError(subject.type, parsed.error);
      }
      // An alert investigation always gets the brief composed from its alert data — that is what
      // the alert context exists for. Every other subject keeps the caller-supplied message.
      return {
        message: buildInvestigationMessage(parsed.data),
        context: parsed.data,
        alerts: parsed.data.alerts,
      };
    }

    const parsed = freeFormContextSchema.safeParse(context);
    if (!parsed.success) {
      throw new InvalidInvestigationContextError(subject.type, parsed.error);
    }
    return {
      message: message ?? `Investigation requested for ${subject.type} ${subject.id}`,
      context: parsed.data,
      alerts: [],
    };
  }

  async start({
    subject,
    title,
    trigger_type,
    message,
    stream_names,
    connector_id,
    context = {},
  }: StartInvestigationRequest): Promise<StartInvestigationResponse> {
    if (!(await this.checkInfrastructureAvailability())) {
      throw new InvestigationUnavailableError('Investigations are not available');
    }
    const { workflowsManagement, agentBuilder, agenticInvestigations } = this.requireWriteDeps();
    if (!this.inference || !this.savedObjects || !this.uiSettings) {
      throw new InvestigationUnavailableError('Investigations are not available');
    }

    const resolvedConnectorId = await resolveNightshiftModelForRequest({
      request: this.request,
      inference: this.inference,
      savedObjects: this.savedObjects,
      uiSettings: this.uiSettings,
      step: 'investigation',
      requestedId: connector_id,
    });

    const prepared = this.prepareAgentInput(subject, message, context);
    const resolvedSubject = withDerivedSubjectSummary(subject, prepared.message);

    const spaceId = this.getSpaceId();
    this.warnOnSpaceMismatch(spaceId);

    const workflowId = NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID;
    const workflow = await workflowsManagement.management.getWorkflow(
      workflowId,
      spaceId,
      this.request
    );

    if (!workflow?.definition) {
      this.logger.error(
        `Investigation workflow "${workflowId}" is not installed in space "${spaceId}"`
      );
      throw new InvestigationUnavailableError('Investigations are not configured in this space');
    }

    const { alerts } = prepared;
    const newInvestigationId = uuidv4();
    const subjects = toStartSubjects({
      subject: resolvedSubject,
      alerts,
      triggerType: trigger_type,
      investigationId: newInvestigationId,
    });

    const conversations = await agentBuilder.conversations.getScopedClient({
      request: this.request,
    });
    const { id: investigationId, recorded } = await this.resolveInvestigation({
      conversations,
      agenticInvestigations,
      subjects,
      newInvestigationId,
      // Only a start that opens a new investigation counts against the daily automatic quota:
      // a follow-up adds a round to an investigation that was already paid for.
      assertCanOpenNew: () => this.assertQuotaForNewInvestigation(trigger_type),
    });
    const isFollowUp = investigationId !== newInvestigationId;

    // The `nightshift.ensureInvestigationAgent` workflow step is the general guarantee that the
    // agent exists wherever an investigation runs. This narrower install stays because the run
    // below executes the *stored* workflow definition, which predates that step until the managed
    // install has upgraded it — and that install is fire-and-forget. Deliberately without the
    // step's visibility retry: the workflow owns that, and this request path should not pay for it.
    await installInvestigationAgent({
      agentBuilder,
      spaceId,
      availability: this.agentAvailability,
    });

    const newSubjects = withoutRecordedSubjects(subjects, recorded);
    const newAlertIds = new Set(newSubjects.map(({ id }) => id));

    const inputs = {
      message: isFollowUp
        ? buildFollowUpMessage({
            subject: resolvedSubject,
            message: prepared.message,
            alerts,
            newAlerts: alerts.filter(({ id }) => newAlertIds.has(id)),
          })
        : prepared.message,
      // Kept as a workflow input for callers that read it off the run. Agent Builder titles the
      // investigation from the first round instead.
      ...(title ? { title } : {}),
      stream_names: stream_names ?? [],
      ...(connector_id?.trim() ? { connector_id: resolvedConnectorId } : {}),
      investigation_id: investigationId,
      subjects: newSubjects,
      context: {
        ...prepared.context,
        source: resolvedSubject.type,
        [`${resolvedSubject.type}_id`]: resolvedSubject.id,
        trigger_type,
        ...(resolvedSubject.summary ? { summary: resolvedSubject.summary } : {}),
      },
    };

    const executionId = await workflowsManagement.management.runWorkflow(
      { ...workflow, definition: workflow.definition },
      spaceId,
      inputs,
      this.request,
      'nightshift-investigations'
    );

    this.logger.info(
      `${isFollowUp ? 'Continued' : 'Started'} investigation "${investigationId}" for ${
        subject.type
      }/${subject.id}, execution_id=${executionId}`
    );

    return { investigation_id: investigationId };
  }

  /** Charges the daily automatic quota for a start that opens a new investigation. */
  private async assertQuotaForNewInvestigation(
    triggerType: StartInvestigationRequest['trigger_type']
  ): Promise<void> {
    switch (triggerType) {
      case 'manual':
        return;
      case 'automatic': {
        const { allowed } = await evaluateInvestigationQuota({
          callback: this.investigationQuotaCallback,
          logger: this.logger,
        });
        if (!allowed) {
          throw new InvestigationQuotaDeniedError();
        }
        return;
      }
      default:
        assertNever(triggerType);
    }
  }

  /**
   * The investigation a start lands on. Any overlap with an open investigation the caller can
   * write continues the most recently updated one; otherwise the subjects are claimed for a new
   * investigation, so that of two concurrent starts for one subject the second continues the
   * first. Closed investigations never match.
   *
   * Only the conversation owner can record subjects or reopen an investigation, which the
   * workflow does as the identity it runs as (the caller's). An investigation the caller does not
   * own is therefore treated as no match and the start opens a new investigation; a claim held by
   * such an investigation does not block it. Deployments run starts under one service identity
   * so this does not happen there.
   */
  private async resolveInvestigation({
    conversations,
    agenticInvestigations,
    subjects,
    newInvestigationId,
    assertCanOpenNew,
  }: {
    conversations: ConversationPublicClient;
    agenticInvestigations: AgenticInvestigationsPluginStart;
    subjects: WorkflowSubjectInput[];
    newInvestigationId: string;
    /** Throws when this start may not open a new investigation. Runs before any claim. */
    assertCanOpenNew: () => Promise<void>;
  }): Promise<{ id: string; recorded: StoredInvestigationSubject[] }> {
    const newInvestigation = { id: newInvestigationId, recorded: [] };
    const keys = toSubjectKeys(subjects, newInvestigationId);
    if (keys.length === 0) {
      await assertCanOpenNew();
      return newInvestigation;
    }

    const subjectsClient = agenticInvestigations.getSubjectsClient(this.request);
    // An investigation holds at most MAX_SUBJECTS_PER_CONVERSATION subjects. Continuing a full one
    // would fail its run on recording the subjects, and every later overlapping start would land
    // on it again, so a full investigation is treated as no match.
    const withRoom = async (
      id: string
    ): Promise<{ id: string; recorded: StoredInvestigationSubject[] } | undefined> => {
      const recorded = await subjectsClient.listByConversationIds([id]);
      if (
        recorded.length + withoutRecordedSubjects(subjects, recorded).length >
        MAX_SUBJECTS_PER_CONVERSATION
      ) {
        this.logger.warn(
          `Investigation "${id}" shares a subject but has no room for more subjects; not continuing it`
        );
        return undefined;
      }
      return { id, recorded };
    };

    const open = await agenticInvestigations
      .getInvestigationsClient(this.request)
      .findOpenBySubjects(keys);
    const candidates = await findInvestigationConversations(
      conversations,
      open.map(({ id }) => id)
    );
    const owned = candidates.filter(({ isOwner, status }) => isOwner && status === 'open');
    for (const candidate of owned) {
      const target = await withRoom(candidate.id);
      if (target) {
        return target;
      }
    }
    if (candidates.length > owned.length) {
      this.logger.warn(
        `Open investigations [${candidates
          .filter((candidate) => !owned.includes(candidate))
          .map(({ id }) => id)
          .join(', ')}] share a subject but are owned by another identity; starting a new one`
      );
    }

    // Charged before the claim, so a denied start claims nothing. A start that then loses the
    // claim to a concurrent one becomes a follow-up but stays charged; the quota callback has no
    // refund, and the race needs two starts for the same new subject within moments.
    await assertCanOpenNew();
    const claim = await subjectsClient.claimSubjects({
      conversationId: newInvestigationId,
      subjects: keys,
      isHolderOpen: async (conversationId) => {
        const [holder] = await findInvestigationConversations(conversations, [conversationId]);
        return holder?.status === 'open';
      },
    });
    if (claim.claimed) {
      return newInvestigation;
    }

    // The holder may not have its conversation yet: a concurrent start claimed the subjects and
    // its workflow creates the conversation. Continuing it then is right, since that workflow
    // runs before this one on the investigation's queue.
    const [holder] = await findInvestigationConversations(conversations, [claim.heldBy]);
    if (!holder) {
      return { id: claim.heldBy, recorded: [] };
    }
    if (holder.isOwner && holder.status === 'open') {
      return (await withRoom(holder.id)) ?? newInvestigation;
    }
    this.logger.warn(
      `Investigation "${claim.heldBy}" holds a subject of this start but is closed or owned by another identity; starting a new one`
    );
    return newInvestigation;
  }

  /**
   * Gets or creates the investigation conversation for a run of the investigation workflow and
   * records the run's subjects on it. Called by the workflow's `_ensure` step, so every write to
   * the conversation happens as the identity the workflow runs as. The conversation id is the
   * investigation id: the `investigation_id` the run was started with, or, for a run started
   * without one, the run's own execution id. A run continuing an investigation that was closed
   * reopens it. Resolves to the conversation id, which the workflow's agent step continues.
   *
   * The run must be a live run of the investigation workflow that names this investigation, so a
   * caller cannot create or reopen an investigation without a run to work on it.
   */
  async ensureOrCreate(investigationId: string, executionId = investigationId): Promise<string> {
    const { workflowsManagement, agentBuilder, agenticInvestigations } = this.requireWriteDeps();

    const execution = await workflowsManagement.management.getWorkflowExecution(
      executionId,
      this.getSpaceId(),
      { includeOutput: false, request: this.request }
    );
    const inputs =
      isPlainObject(execution?.context) && isPlainObject(execution?.context.inputs)
        ? execution?.context.inputs
        : undefined;

    if (
      !execution ||
      !isInvestigationWorkflowExecution(execution) ||
      TerminalExecutionStatuses.includes(execution.status) ||
      // The investigation the run works on: its `investigation_id` input, or itself without one.
      (asString(inputs?.investigation_id) ?? executionId) !== investigationId
    ) {
      throw new InvestigationNotFoundError(investigationId);
    }

    // Agent Builder titles the conversation on the run's first round; the run's `title` input is
    // not stored.
    const conversations = await agentBuilder.conversations.getScopedClient({
      request: this.request,
    });
    const conversation = await getOrCreateInvestigationConversation({
      conversations,
      id: investigationId,
    });

    if (!conversation.isOwner) {
      // The agent can still work in a public conversation, but subjects and metadata are
      // owner-only. Starts avoid this by never continuing an investigation they do not own.
      // TODO(ns-1619): record subjects and reopen once Agent Builder allows converse-access writes.
      this.logger.warn(
        `Run "${executionId}" does not own investigation "${investigationId}"; continuing without recording subjects or reopening it`
      );
      return conversation.id;
    }

    const subjects = recoverSubjectsFromInputs(inputs, investigationId);
    if (subjects.length > 0) {
      const subjectsClient = agenticInvestigations.getSubjectsClient(this.request);
      const recorded = conversation.created
        ? []
        : await subjectsClient.listByConversationIds([conversation.id]);
      const missing = withoutRecordedSubjects(subjects, recorded);
      // Starts never continue a full investigation, but a run started some other way may still
      // bring more subjects than fit. Record what fits rather than fail the run.
      const room = Math.max(MAX_SUBJECTS_PER_CONVERSATION - recorded.length, 0);
      if (missing.length > room) {
        this.logger.warn(
          `Investigation "${conversation.id}" has room for ${room} of ${missing.length} new subjects; recording the first ${room}`
        );
      }
      const recordable = missing.slice(0, room);
      if (recordable.length > 0) {
        await subjectsClient.upsertSubjects(conversation.id, recordable);
      }
    }

    if (conversation.status === 'closed') {
      await conversations.patchMetadata(conversation.id, { status: 'open' });
    }

    return conversation.id;
  }

  /**
   * The investigation for a Slack thread, found by the thread's conversation origin (the
   * `team:<T>/channel:<C>/thread:<ts>` key Agent Builder uses for Slack) and, when the origin
   * names some other conversation, by the thread's `slack_thread` subject. Without `create`, a
   * thread that has no investigation yet returns undefined. With `create`, the investigation is
   * created with that origin and the thread as its subject, as the identity that runs the Slack
   * workflow, which also runs the investigation workflow on it. `statusMessageTs` records the
   * thread's status message on the thread's subject. `event` records a delivered Slack event there
   * with the execution handling it; an event another execution already recorded comes back marked
   * `duplicate`, while the same execution asking again does not. `releaseEvent` removes this
   * execution's record of `event`, for a run that did not get to act on it. The Slack thread
   * workflow runs one call per thread at a time, so recording an event cannot race itself.
   */
  async findOrCreateSlackThread({
    workspace,
    channel,
    threadTs,
    text,
    create,
    statusMessageTs,
    event,
    releaseEvent,
  }: {
    workspace: string;
    channel: string;
    threadTs: string;
    text?: string;
    create: boolean;
    statusMessageTs?: string;
    event?: SlackThreadEvent;
    releaseEvent?: boolean;
  }): Promise<SlackThreadInvestigation | undefined> {
    const { agentBuilder, agenticInvestigations } = this.requireWriteDeps();
    const threadKey = toSlackThreadKey({ workspace, channel, threadTs });
    const subjectKey = { type: 'slack_thread' as const, id: threadKey };
    const activity: SlackThreadActivity = { statusMessageTs, event, releaseEvent };
    const conversations = await agentBuilder.conversations.getScopedClient({
      request: this.request,
    });
    const subjectsClient = agenticInvestigations.getSubjectsClient(this.request);
    const findThreadSubject = async (conversationId: string) =>
      (await subjectsClient.listByConversationIds([conversationId])).find(
        ({ subjectType, subjectId }) =>
          subjectType === subjectKey.type && subjectId === subjectKey.id
      );
    const isDuplicate = (recorded: SlackThreadSubject | undefined) =>
      isDuplicateSlackEvent(recorded, activity);

    const existing = await this.findSlackThreadInvestigation({
      conversations,
      agenticInvestigations,
      threadKey,
    });
    if (existing) {
      const threadSubject = await findThreadSubject(existing.id);
      const recorded = threadSubject?.slack;
      const response = {
        question: threadSubject?.summary,
        duplicate: isDuplicate(recorded),
      };
      const update = toSlackThreadUpdate(recorded, activity);
      if (!update) {
        return toSlackThreadInvestigation(existing, {
          ...response,
          statusMessageTs: recorded?.status_message_ts,
        });
      }
      if (!existing.isOwner) {
        this.logger.warn(
          `Cannot record the Slack status message or event on investigation "${existing.id}": it is owned by another identity`
        );
        return toSlackThreadInvestigation(existing, {
          ...response,
          statusMessageTs: recorded?.status_message_ts,
        });
      }
      await subjectsClient.upsertSubjects(existing.id, [
        { ...subjectKey, slack: { channel, thread_ts: threadTs, ...update } },
      ]);
      return toSlackThreadInvestigation(existing, {
        ...response,
        statusMessageTs: update.status_message_ts ?? recorded?.status_message_ts,
      });
    }

    if (!create) {
      return undefined;
    }
    if (!(await this.isAvailable())) {
      throw new InvestigationUnavailableError('Investigations are not available');
    }

    const spaceId = this.getSpaceId();
    await installInvestigationAgent({
      agentBuilder,
      spaceId,
      availability: this.agentAvailability,
    });

    // Of two concurrent creates for one thread, the second continues the first.
    const newInvestigationId = uuidv4();
    const claim = await subjectsClient.claimSubjects({
      conversationId: newInvestigationId,
      subjects: [subjectKey],
      isHolderOpen: async (conversationId) => {
        const [holder] = await findInvestigationConversations(conversations, [conversationId]);
        return holder?.status === 'open';
      },
    });
    const investigationId = claim.claimed ? newInvestigationId : claim.heldBy;

    const conversation = await getOrCreateInvestigationConversation({
      conversations,
      id: investigationId,
      origin: { external_conversation_id: threadKey },
    });
    // The first create of the thread records it; a create that continues another reads it back.
    const threadSubject = conversation.created
      ? undefined
      : await findThreadSubject(conversation.id);
    const recorded = threadSubject?.slack;
    const update = toSlackThreadUpdate(recorded, activity);
    if (conversation.isOwner && (!threadSubject || update)) {
      const summary = collapseSlackText(text).slice(0, MAX_SLACK_SUBJECT_SUMMARY_LENGTH);
      await subjectsClient.upsertSubjects(conversation.id, [
        {
          ...subjectKey,
          ...(!threadSubject && {
            triggerType: 'manual' as const,
            ...(summary ? { summary } : {}),
          }),
          slack: { channel, thread_ts: threadTs, ...update },
        },
      ]);
    }
    return toSlackThreadInvestigation(conversation, {
      statusMessageTs: update?.status_message_ts ?? recorded?.status_message_ts,
      question: threadSubject?.summary ?? text,
      duplicate: isDuplicate(recorded),
    });
  }

  private async findSlackThreadInvestigation({
    conversations,
    agenticInvestigations,
    threadKey,
  }: {
    conversations: ConversationPublicClient;
    agenticInvestigations: AgenticInvestigationsPluginStart;
    threadKey: string;
  }): Promise<InvestigationConversation | undefined> {
    const byOrigin = await conversations.getByOrigin({ external_conversation_id: threadKey });
    if (byOrigin?.template_id === INVESTIGATION_TEMPLATE_ID) {
      const [investigation] = await findInvestigationConversations(conversations, [byOrigin.id]);
      if (investigation) {
        return investigation;
      }
    }

    // The origin can belong to an Agent Builder chat about the same thread (a Slack mention
    // starts one), so the thread's subject is the fallback.
    const ids = await agenticInvestigations
      .getSubjectsClient(this.request)
      .findConversationIdsBySubjects([{ type: 'slack_thread', id: threadKey }]);
    const candidates = await findInvestigationConversations(conversations, ids);
    return candidates.find(({ status }) => status === 'open') ?? candidates[0];
  }

  /**
   * What lifecycle events attribute the investigation to: its first recorded subject, preferring
   * the subject types lifecycle triggers carry. A Slack thread is reported as a manual subject,
   * since that is what it is to the trigger's consumers. Undefined when it has no subject.
   */
  async getLifecycleSubject(investigationId: string): Promise<LifecycleSubject | undefined> {
    const { agenticInvestigations } = this.requireWriteDeps();
    const subjects = await agenticInvestigations
      .getSubjectsClient(this.request)
      .listByConversationIds([investigationId]);
    const [first] = [...subjects].sort(
      (left, right) =>
        Number(left.subjectType === 'slack_thread') -
          Number(right.subjectType === 'slack_thread') ||
        left.createdAt.localeCompare(right.createdAt)
    );
    if (!first) {
      return undefined;
    }
    return {
      subject: {
        type: first.subjectType === 'slack_thread' ? 'manual' : first.subjectType,
        id: first.subjectId,
      },
      triggerType: first.triggerType ?? DEFAULT_INVESTIGATION_TRIGGER_TYPE,
      startedAt: first.createdAt,
    };
  }

  /**
   * The workflow runs in `spaceId`, but Agent Builder and agentic investigations take the space
   * from the request. A step's fake request carries the workflow's space, so the two agree; if a
   * request ever lacks it, matching and claims would happen in another space than the run.
   */
  private warnOnSpaceMismatch(spaceId: string): void {
    const requestSpaceId = this.spaces?.spacesService.getSpaceId(this.request);
    if (requestSpaceId !== undefined && requestSpaceId !== spaceId) {
      this.logger.warn(
        `Starting an investigation in space "${spaceId}" from a request scoped to space "${requestSpaceId}"; subjects are matched in the request's space`
      );
    }
  }

  private requireWriteDeps(): {
    workflowsManagement: WorkflowsServerPluginSetup;
    agentBuilder: AgentBuilderPluginStart;
    agenticInvestigations: AgenticInvestigationsPluginStart;
  } {
    if (!this.workflowsManagement) {
      throw new InvestigationUnavailableError('workflowsManagement is not available');
    }
    if (!this.agentBuilder) {
      throw new InvestigationUnavailableError('agentBuilder is not available');
    }
    if (!this.agenticInvestigations) {
      throw new InvestigationUnavailableError('agenticInvestigations is not available');
    }
    return {
      workflowsManagement: this.workflowsManagement,
      agentBuilder: this.agentBuilder,
      agenticInvestigations: this.agenticInvestigations,
    };
  }

  /**
   * Writes the legacy saved-object record behind PATCH /internal/nightshift/investigations/{id}.
   * Nothing in the investigation write path calls it anymore: investigations are conversations.
   * TODO(ns-1619 s6): remove with the saved object type.
   */
  async update(investigationId: string, state: UpdateInvestigationRequest): Promise<void> {
    const existing = await this.investigationRepository.get(investigationId);
    if (!existing) {
      throw new InvestigationNotFoundError(investigationId);
    }

    const { status, error, ...output } = state;

    if (isTerminalStatus(existing.status)) {
      if (status === existing.status) {
        return;
      }
      throw InvestigationConflictError.settled(investigationId, existing.status);
    }

    if (status === 'failed' && error) {
      this.logger.warn(`Investigation "${investigationId}" failed: ${error}`);
    }

    const patch: InvestigationPatch = {
      status,
      ...(isTerminalStatus(status) && { completed_at: new Date().toISOString() }),
      ...(status === 'failed' && { error: error ?? FALLBACK_INVESTIGATION_ERROR }),
      ...output,
    };

    try {
      await this.investigationRepository.update({
        id: investigationId,
        patch,
        version: existing.version,
      });
    } catch (err) {
      if (err instanceof InvestigationStaleWriteError) {
        throw InvestigationConflictError.concurrentlyModified(investigationId);
      }
      throw err;
    }
  }

  /**
   * Returns the stored investigation. `running` is not checked against the workflow engine, so it
   * can linger after edge cases where no persist step ran: user cancel, cancel-in-progress that
   * ensureOrCreate() did not see, timeout, or a worker dying mid-run. Complete/fail still go
   * through PATCH; a superseded run is cancelled in ensureOrCreate().
   */
  async get(investigationId: string): Promise<GetInvestigationResponse> {
    const record = await this.investigationRepository.get(investigationId);

    if (!record) {
      throw new InvestigationNotFoundError(investigationId);
    }

    return toInvestigationResponse(record);
  }

  async list({
    statuses,
    severities,
    subject_types,
    query,
    concurrency_key,
    created_after,
    created_before,
    started_after,
    started_before,
    completed_after,
    completed_before,
    sort_field,
    sort_order,
    page = 1,
    size = 20,
  }: ListInvestigationsRequest = {}): Promise<ListInvestigationsResponse> {
    const result = await this.investigationRepository.find({
      statuses,
      severities,
      subjectTypes: subject_types,
      query,
      concurrencyKey: concurrency_key,
      createdAfter: created_after,
      createdBefore: created_before,
      startedAfter: started_after,
      startedBefore: started_before,
      completedAfter: completed_after,
      completedBefore: completed_before,
      sortField: sort_field,
      sortOrder: sort_order,
      page,
      perPage: size,
      fields: [...LIST_INVESTIGATION_ATTRIBUTE_FIELDS],
    });

    // Stored `running` is not reconciled with the engine — same edge cases as get().
    return {
      results: result.results.map((record) => toListInvestigationItem(record)),
      page: result.page,
      size: result.size,
      total: result.total,
    };
  }
}
