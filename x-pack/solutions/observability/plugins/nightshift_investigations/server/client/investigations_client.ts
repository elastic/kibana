/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v5 as uuidv5 } from 'uuid';
import type { CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { TerminalExecutionStatuses } from '@kbn/workflows';
import { NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { AgentAvailabilityConfig } from '@kbn/agent-builder-server/agents';
import { investigationStateSchema } from '@kbn/significant-events-schema';
import { assertNever } from '@kbn/std';
import { resolveNightshiftModelForRequest } from '@kbn/nightshift-ai';
import { installInvestigationAgent } from '../lib/install_investigation_agent';
import { isInvestigationWorkflowExecution } from '../lib/managed_workflows/is_investigation_workflow_execution';
import type { InvestigationQuotaCallback } from '../types';
import type {
  AlertInvestigationContext,
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
  DEFAULT_MANUAL_INVESTIGATION_SUBJECT_ID,
  freeFormContextSchema,
  INVESTIGATION_SUBJECT_TYPES,
  INVESTIGATION_TRIGGER_TYPES,
} from '../../common';
import type {
  InvestigationAttributes,
  InvestigationPatch,
  InvestigationRecord,
  InvestigationRepository,
  InvestigationThread,
  ProjectedInvestigationRecord,
} from '../storage';
import {
  InvestigationAlreadyExistsError,
  InvestigationStaleWriteError,
  MAX_THREAD_SEEN_EVENT_IDS,
} from '../storage';
import { buildInvestigationMessage } from './build_investigation_message';
import {
  InvestigationConflictError,
  InvestigationNotFoundError,
  InvestigationQuotaDeniedError,
  InvalidInvestigationContextError,
  InvestigationMetadataMissingError,
  InvestigationUnavailableError,
} from './errors';
import { evaluateInvestigationQuota } from './evaluate_investigation_quota';

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

const SUPERSEDED_STATUSES = [
  'pending',
  'running',
] as const satisfies ReadonlyArray<InvestigationStatus>;

const isSubjectType = (value: unknown): value is InvestigationSubjectType =>
  typeof value === 'string' && INVESTIGATION_SUBJECT_TYPES.some((type) => type === value);

const isTriggerType = (value: unknown): value is InvestigationTriggerType =>
  typeof value === 'string' && INVESTIGATION_TRIGGER_TYPES.some((type) => type === value);

/** Keeps a derived summary to one readable line, since it is rendered as a list headline. */
const MAX_DERIVED_SUBJECT_SUMMARY_LENGTH = 200;

/**
 * A manual investigation's subject id is the placeholder `manual`, so until the agent writes its
 * summary the UI would label the run "manual". The prompt is the only thing that describes the run
 * at this point, so it stands in as the subject summary; the agent's summary takes precedence once
 * the run completes.
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

/** Namespace for the ids derived from a Slack thread. Changing it orphans every thread's record. */
const SLACK_THREAD_ID_NAMESPACE = '6f1c3a52-8d4e-4b7a-9e21-3c5d7f0a9b64';

const MAX_SLACK_THREAD_TITLE_LENGTH = 80;
const DEFAULT_SLACK_THREAD_TITLE = 'Slack investigation';

/** A thread write that lost a race is retried this many times against the fresh record. */
const MAX_THREAD_WRITE_ATTEMPTS = 3;

/** Response of POST /internal/nightshift/investigations/_slack_thread. */
export interface SlackThreadInvestigation {
  investigation_id: string;
  title: string;
  status_message_ts?: string;
  /** The thread already handled this event, so the caller should not act on it again. */
  duplicate?: true;
}

const toSlackThreadInvestigation = (
  record: InvestigationRecord,
  duplicate: boolean
): SlackThreadInvestigation => ({
  investigation_id: record.id,
  title: record.title,
  status_message_ts: record.thread?.status_message_ts,
  ...(duplicate && { duplicate: true }),
});

/** The thread after it records `eventId` and `statusMessageTs`, or undefined when nothing changes. */
const nextThreadState = (
  thread: InvestigationThread,
  { statusMessageTs, eventId }: { statusMessageTs?: string; eventId?: string }
): InvestigationThread | undefined => {
  const seen = thread.seen_event_ids ?? [];
  const recordEvent = eventId !== undefined && !seen.includes(eventId);
  const recordStatusMessage =
    statusMessageTs !== undefined && statusMessageTs !== thread.status_message_ts;
  if (!recordEvent && !recordStatusMessage) {
    return undefined;
  }
  return {
    ...thread,
    ...(recordStatusMessage && { status_message_ts: statusMessageTs }),
    ...(recordEvent && {
      seen_event_ids: [...seen, eventId].slice(-MAX_THREAD_SEEN_EVENT_IDS),
    }),
  };
};

/** A headline from the opening message, with Slack mentions and markup collapsed away. */
const toSlackThreadTitle = (text: string | undefined): string => {
  const collapsed = (text ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!collapsed) {
    return DEFAULT_SLACK_THREAD_TITLE;
  }
  return collapsed.length > MAX_SLACK_THREAD_TITLE_LENGTH
    ? `${collapsed.slice(0, MAX_SLACK_THREAD_TITLE_LENGTH - 1).trimEnd()}…`
    : collapsed;
};

interface ExecutionInvestigationMetadata {
  subject?: InvestigationSubject;
  title?: string;
  triggerType: InvestigationTriggerType;
  concurrencyKey?: string;
}
/**
 * Context fields each subject type's id arrives under. The `satisfies` clause is what makes a
 * newly added {@link InvestigationSubjectType} a compile error rather than a run that silently
 * recovers no subject.
 */
const SUBJECT_ID_FIELDS = {
  significant_event: ['significant_event_id'],
  alert: ['alert_id'],
  manual: ['manual_id'],
} as const satisfies Record<InvestigationSubjectType, readonly string[]>;

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

const parseExecutionInvestigationMetadata = (
  executionContext: Record<string, unknown> | undefined
): ExecutionInvestigationMetadata => {
  const inputs =
    isPlainObject(executionContext) && isPlainObject(executionContext.inputs)
      ? executionContext.inputs
      : undefined;
  const rawConcurrencyKey = inputs?.concurrency_key;
  const concurrencyKey = typeof rawConcurrencyKey === 'string' ? rawConcurrencyKey : undefined;

  return {
    subject: recoverSubjectFromInput(inputs),
    // A required workflow input, so the engine has already rejected a run without one.
    title: asString(inputs?.title),
    triggerType: recoverTriggerTypeFromInput(inputs) ?? DEFAULT_INVESTIGATION_TRIGGER_TYPE,
    concurrencyKey,
  };
};

const toSubjectFields = (
  subject: InvestigationSubject
): Pick<InvestigationAttributes, 'subject_type' | 'subject_id' | 'subject_summary'> => ({
  subject_type: subject.type,
  subject_id: subject.id,
  ...(subject.summary ? { subject_summary: subject.summary } : {}),
});

/**
 * The investigation subject an execution's inputs describe, summary included, or undefined when
 * they describe none. Shared by `ensureOrCreate()` and the write path so they cannot disagree
 * about what a run is investigating.
 */
function recoverSubjectFromInput(
  input: Record<string, unknown> | undefined
): InvestigationSubject | undefined {
  const ctx = input?.context;
  if (!isPlainObject(ctx)) return undefined;

  const source = ctx.source;
  if (!isSubjectType(source)) return undefined;

  for (const field of SUBJECT_ID_FIELDS[source]) {
    const subjectId = asString(ctx[field]);
    if (subjectId) {
      return toSubject({ subjectType: source, subjectId, subjectSummary: asString(ctx.summary) });
    }
  }

  return undefined;
}

function recoverTriggerTypeFromInput(
  input: Record<string, unknown> | undefined
): InvestigationTriggerType | undefined {
  const ctx = input?.context;
  if (!isPlainObject(ctx)) return undefined;
  return isTriggerType(ctx.trigger_type) ? ctx.trigger_type : undefined;
}

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
  ): { message: string; context: Record<string, unknown> } {
    if (subject.type === 'alert') {
      const parsed = alertInvestigationContextSchema.safeParse(context);
      if (!parsed.success) {
        throw new InvalidInvestigationContextError(subject.type, parsed.error);
      }
      // An alert investigation always gets the brief composed from its alert data — that is what
      // the alert context exists for. Every other subject keeps the caller-supplied message.
      return { message: buildInvestigationMessage(parsed.data), context: parsed.data };
    }

    const parsed = freeFormContextSchema.safeParse(context);
    if (!parsed.success) {
      throw new InvalidInvestigationContextError(subject.type, parsed.error);
    }
    return {
      message: message ?? `Investigation requested for ${subject.type} ${subject.id}`,
      context: parsed.data,
    };
  }

  async start({
    subject,
    title,
    trigger_type,
    message,
    stream_names,
    connector_id,
    concurrency_key,
    context = {},
  }: StartInvestigationRequest): Promise<StartInvestigationResponse> {
    if (!(await this.checkInfrastructureAvailability())) {
      throw new InvestigationUnavailableError('Investigations are not available');
    }

    if (
      !this.workflowsManagement ||
      !this.agentBuilder ||
      !this.inference ||
      !this.savedObjects ||
      !this.uiSettings
    ) {
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

    const workflowId = NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID;
    const workflow = await this.workflowsManagement.management.getWorkflow(
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

    switch (trigger_type) {
      case 'manual':
        break;
      case 'automatic': {
        const { allowed } = await evaluateInvestigationQuota({
          callback: this.investigationQuotaCallback,
          logger: this.logger,
        });
        if (!allowed) {
          throw new InvestigationQuotaDeniedError();
        }
        break;
      }
      default:
        assertNever(trigger_type);
    }

    // The `nightshift.ensureInvestigationAgent` workflow step is the general guarantee that the
    // agent exists wherever an investigation runs. This narrower install stays because the run
    // below executes the *stored* workflow definition, which predates that step until the managed
    // install has upgraded it — and that install is fire-and-forget. Deliberately without the
    // step's visibility retry: the workflow owns that, and this request path should not pay for it.
    await installInvestigationAgent({
      agentBuilder: this.agentBuilder,
      spaceId,
      availability: this.agentAvailability,
    });

    const inputs = {
      message: prepared.message,
      title,
      stream_names: stream_names ?? [],
      ...(connector_id?.trim() ? { connector_id: resolvedConnectorId } : {}),
      ...(concurrency_key ? { concurrency_key } : {}),
      context: {
        ...prepared.context,
        source: resolvedSubject.type,
        [`${resolvedSubject.type}_id`]: resolvedSubject.id,
        trigger_type,
        ...(resolvedSubject.summary ? { summary: resolvedSubject.summary } : {}),
      },
    };

    const executionId = await this.workflowsManagement.management.runWorkflow(
      { ...workflow, definition: workflow.definition },
      spaceId,
      inputs,
      this.request,
      'nightshift-investigations'
    );

    this.logger.info(
      `Started investigation for ${subject.type}/${subject.id}, execution_id=${executionId}`
    );

    await this.create({
      investigationId: executionId,
      subject: resolvedSubject,
      title,
      triggerType: trigger_type,
      concurrencyKey: concurrency_key,
    }).catch((error) => {
      this.logger.warn(
        `Failed to eagerly persist investigation "${executionId}", deferring to the workflow's ensure step: ${error.message}`
      );
    });

    return { investigation_id: executionId };
  }

  /**
   * Creates a new investigation record as `pending`. Called from start() so the id is readable
   * immediately. The workflow's persist_investigation_started step later transitions the record
   * to `running` via ensureOrCreate().
   */
  async create({
    investigationId,
    subject,
    title,
    triggerType,
    concurrencyKey,
  }: {
    investigationId: string;
    subject: InvestigationSubject;
    title: string;
    triggerType: InvestigationTriggerType;
    concurrencyKey?: string;
  }): Promise<void> {
    if (concurrencyKey) {
      await this.cancelSupersededInvestigation({ concurrencyKey, investigationId });
    }

    await this.createIgnoringConflict({
      id: investigationId,
      attributes: {
        title,
        status: 'pending',
        ...toSubjectFields(subject),
        trigger_type: triggerType,
        concurrency_key: concurrencyKey,
        created_at: new Date().toISOString(),
      },
    });
  }

  /**
   * Ensures the investigation record exists and is running. Called by the workflow's
   * persist_investigation_started step. If a pending record exists (created by start()), transitions
   * it to running. If no record exists (workflow triggered without start()), creates one as running
   * from the execution document. Already-running records are left untouched. A settled record
   * (completed, failed, or cancelled) throws so the persist step fails the run rather than
   * continuing through the agent.
   *
   * Both write paths read the execution document, so `started_at` and `executed_by` mean the same
   * thing however the record came to exist: `start()` cannot know the id the engine assigns to the
   * run's executor, and stamping the transition with the wall clock would date the record to when
   * the persist step happened to run rather than to when the run began.
   *
   * A run whose execution is not the one the investigation is named after continues it instead,
   * and resolves to the conversation it resumes, so callers name only the investigation.
   */
  async ensureOrCreate(
    investigationId: string,
    executionId = investigationId
  ): Promise<string | undefined> {
    if (executionId !== investigationId) {
      return this.continueInvestigation(investigationId, executionId);
    }

    const existing = await this.investigationRepository.get(investigationId);
    if (existing && isTerminalStatus(existing.status)) {
      throw InvestigationConflictError.settled(investigationId, existing.status);
    }
    if (existing && existing.status !== 'pending') {
      return;
    }

    if (!this.workflowsManagement) {
      throw new InvestigationUnavailableError('workflowsManagement is not available');
    }

    const spaceId = this.getSpaceId();
    const execution = await this.workflowsManagement.management.getWorkflowExecution(
      investigationId,
      spaceId,
      { includeOutput: false, request: this.request }
    );

    if (!execution || !isInvestigationWorkflowExecution(execution)) {
      throw new InvestigationNotFoundError(investigationId);
    }

    const startedAt = execution.startedAt ?? new Date().toISOString();

    if (existing) {
      await this.transitionToRunning({
        investigationId,
        version: existing.version,
        startedAt,
        executedBy: execution.executedBy,
      });
      return;
    }

    const { subject, title, triggerType, concurrencyKey } = parseExecutionInvestigationMetadata(
      execution.context
    );

    if (!subject || !title) {
      throw new InvestigationMetadataMissingError(investigationId);
    }

    if (concurrencyKey) {
      await this.cancelSupersededInvestigation({ concurrencyKey, investigationId });
    }

    await this.createIgnoringConflict({
      id: investigationId,
      attributes: {
        title,
        status: 'running',
        ...toSubjectFields(subject),
        trigger_type: triggerType,
        concurrency_key: concurrencyKey,
        executed_by: execution.executedBy,
        created_at: startedAt,
        started_at: startedAt,
      },
    });
  }

  /**
   * Marks an existing investigation running for a run that continues it, such as a reply in its
   * Slack thread. Unlike a first run, a settled record is reopened. The run must be a live run of
   * the investigation workflow that names this investigation in its inputs, so a caller cannot
   * reopen an investigation without a run to settle it. The record then points at the run's
   * execution, which is what the reconciliation task settles it from. Resolves to the
   * investigation's conversation.
   */
  private async continueInvestigation(
    investigationId: string,
    executionId: string
  ): Promise<string | undefined> {
    const existing = await this.investigationRepository.get(investigationId);
    if (!existing) {
      throw new InvestigationNotFoundError(investigationId);
    }

    if (!this.workflowsManagement) {
      throw new InvestigationUnavailableError('workflowsManagement is not available');
    }

    const execution = await this.workflowsManagement.management.getWorkflowExecution(
      executionId,
      this.getSpaceId(),
      { includeOutput: false, request: this.request }
    );
    const context = execution?.context;
    const inputs =
      isPlainObject(context) && isPlainObject(context.inputs) ? context.inputs : undefined;

    if (
      !execution ||
      !isInvestigationWorkflowExecution(execution) ||
      TerminalExecutionStatuses.includes(execution.status) ||
      inputs?.investigation_id !== investigationId
    ) {
      throw new InvestigationNotFoundError(investigationId);
    }

    await this.transitionToRunning({
      investigationId,
      version: existing.version,
      startedAt: execution.startedAt ?? new Date().toISOString(),
      executedBy: execution.executedBy,
      executionId,
      reopen: isTerminalStatus(existing.status),
    });
    return existing.conversation_id;
  }

  /**
   * The investigation for a Slack thread. Its ids derive from the thread, so concurrent calls for
   * one thread agree on a single record and conversation. Without `create`, a thread that has no
   * investigation yet returns undefined. `statusMessageTs` records the thread's status message
   * whatever the investigation's status. `eventId` records a delivered event; an event the thread
   * already recorded comes back marked `duplicate`.
   */
  async findOrCreateSlackThread({
    workspace,
    channel,
    threadTs,
    text,
    create,
    statusMessageTs,
    eventId,
  }: {
    workspace: string;
    channel: string;
    threadTs: string;
    text?: string;
    create: boolean;
    statusMessageTs?: string;
    eventId?: string;
  }): Promise<SlackThreadInvestigation | undefined> {
    // Channel ids are only unique within a workspace.
    const threadKey = `${workspace}/${channel}/${threadTs}`;
    const investigationId = uuidv5(`investigation/${threadKey}`, SLACK_THREAD_ID_NAMESPACE);

    let record = await this.investigationRepository.get(investigationId);
    if (!record) {
      if (!create) {
        return undefined;
      }
      if (!(await this.isAvailable())) {
        throw new InvestigationUnavailableError('Investigations are not available');
      }

      const attributes: InvestigationAttributes = {
        title: toSlackThreadTitle(text),
        status: 'pending',
        // Like any manual run, a thread is defined by its prompt rather than an entity, so the
        // subject stays the placeholder the UI hides. The thread itself is identified by `thread`
        // and by the ids derived from it.
        ...toSubjectFields({ type: 'manual', id: DEFAULT_MANUAL_INVESTIGATION_SUBJECT_ID }),
        trigger_type: 'manual',
        created_at: new Date().toISOString(),
        // Conversations share one index across spaces, so a thread with an investigation in two
        // spaces needs a conversation in each.
        conversation_id: uuidv5(
          `conversation/${this.getSpaceId()}/${threadKey}`,
          SLACK_THREAD_ID_NAMESPACE
        ),
        // The event is recorded below, like on an existing record, so that of two concurrent
        // creates for one event exactly one is told it is new.
        thread: {
          surface: 'slack',
          workspace,
          channel,
          thread_ts: threadTs,
          ...(statusMessageTs && { status_message_ts: statusMessageTs }),
        },
      };
      await this.createIgnoringConflict({ id: investigationId, attributes });
      record = (await this.investigationRepository.get(investigationId)) ?? {
        id: investigationId,
        ...attributes,
      };
    }

    return this.recordSlackThreadActivity(record, { statusMessageTs, eventId });
  }

  private async recordSlackThreadActivity(
    record: InvestigationRecord,
    activity: { statusMessageTs?: string; eventId?: string }
  ): Promise<SlackThreadInvestigation> {
    let current = record;
    for (let attempt = 1; ; attempt++) {
      const duplicate =
        activity.eventId !== undefined &&
        (current.thread?.seen_event_ids ?? []).includes(activity.eventId);
      const thread = current.thread && nextThreadState(current.thread, activity);
      if (!thread) {
        return toSlackThreadInvestigation(current, duplicate);
      }

      try {
        await this.investigationRepository.update({
          id: current.id,
          patch: { thread },
          version: current.version,
        });
        return toSlackThreadInvestigation({ ...current, thread }, duplicate);
      } catch (error) {
        if (
          !(error instanceof InvestigationStaleWriteError) ||
          attempt >= MAX_THREAD_WRITE_ATTEMPTS
        ) {
          throw error;
        }
        const fresh = await this.investigationRepository.get(current.id);
        if (!fresh) {
          throw new InvestigationNotFoundError(current.id);
        }
        current = fresh;
      }
    }
  }

  /**
   * `reopen` clears the previous run's `completed_at` and `error`, so a reopened record does not
   * report an old completion while running or an old failure after it succeeds.
   */
  private async transitionToRunning({
    investigationId,
    version,
    startedAt,
    executedBy,
    executionId,
    reopen = false,
  }: {
    investigationId: string;
    version?: string;
    startedAt: string;
    executedBy?: string;
    executionId?: string;
    reopen?: boolean;
  }): Promise<void> {
    try {
      await this.investigationRepository.update({
        id: investigationId,
        patch: {
          status: 'running',
          started_at: startedAt,
          ...(executedBy && { executed_by: executedBy }),
          ...(executionId && { execution_id: executionId }),
          ...(reopen && { completed_at: null, error: null }),
        },
        version,
      });
    } catch (error) {
      if (error instanceof InvestigationStaleWriteError) {
        return;
      }
      throw error;
    }
  }

  private async createIgnoringConflict({
    id,
    attributes,
  }: {
    id: string;
    attributes: InvestigationAttributes;
  }): Promise<void> {
    try {
      await this.investigationRepository.create({ id, attributes });
    } catch (error) {
      if (error instanceof InvestigationAlreadyExistsError) {
        return;
      }
      throw error;
    }
  }

  /**
   * Cancels the in-flight investigation that `investigationId` supersedes, if there is one.
   *
   * `investigationId` is excluded rather than assumed absent: both callers run while the workflow's
   * `_ensure` step may be creating the very same record, so without the guard the newest match can
   * be the incoming investigation itself — cancelling a record whose execution is alive and which
   * nothing superseded. Two results are fetched because the excluded record can occupy the first.
   */
  private async cancelSupersededInvestigation({
    concurrencyKey,
    investigationId,
  }: {
    concurrencyKey: string;
    investigationId: string;
  }): Promise<void> {
    const { results } = await this.investigationRepository.find({
      concurrencyKey,
      statuses: [...SUPERSEDED_STATUSES],
      sortField: 'created_at',
      sortOrder: 'desc',
      perPage: 2,
    });
    const superseded = results.find(({ id }) => id !== investigationId);

    if (!superseded) {
      return;
    }

    try {
      await this.investigationRepository.update({
        id: superseded.id,
        patch: {
          status: 'cancelled',
          completed_at: new Date().toISOString(),
        },
        version: superseded.version,
      });
    } catch (error) {
      if (error instanceof InvestigationStaleWriteError) {
        this.logger.warn(
          `Skipped cancelling superseded investigation "${superseded.id}": it was concurrently modified`
        );
        return;
      }
      throw error;
    }
  }

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
