/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import pRetry from 'p-retry';
import { v4 as uuidv4 } from 'uuid';
import { publicApiPath as AGENT_BUILDER_API_PATH } from '@kbn/agent-builder-plugin/common/constants';
import { AGENTIC_INVESTIGATIONS_API_VERSION } from '@kbn/agentic-investigations-plugin/common/constants';
import {
  ESCALATIONS_INTERNAL_URL,
  ESCALATION_LINK_URL,
  ESCALATION_SYNC_URL,
} from '@kbn/agentic-investigations-plugin/common/escalations/constants';
import type { SyncEscalationResponse } from '@kbn/agentic-investigations-plugin/common/escalations/escalation';
import { collectSummaryDiagnostics } from './summary_diagnostics';
import type { SummaryDiagnostics } from './summary_diagnostics';
import type { EscalationCase, EscalationTaskOutput, SeededEvent } from './types';

const PUBLIC_API_VERSION = '2023-10-31';

/** The managed workflow that writes the escalation `metadata.summary`. */
export const SUMMARY_WORKFLOW_ID = 'system-alertzero-investigation-summary';

const publicHeaders = { 'elastic-api-version': PUBLIC_API_VERSION } as const;
const internalHeaders = {
  'kbn-xsrf': 'escalation-grounding-eval',
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': AGENTIC_INVESTIGATIONS_API_VERSION,
} as const;

/** agent_builder's public converse route (`/api/agent_builder/converse`); there is no `/chat/converse`. */
export const CONVERSE_URL = `${AGENT_BUILDER_API_PATH}/converse`;

const escalationUrl = (template: string, escalationId: string): string =>
  template.replace('{id}', encodeURIComponent(escalationId));

/** `/s/<id>` prefix for a non-default space; the default space has no prefix. */
export const spacePath = (path: string, spaceId?: string): string =>
  spaceId && spaceId !== 'default' ? `/s/${encodeURIComponent(spaceId)}${path}` : path;

/** Wraps a fetch so every request targets `spaceId` (G20: space/identity parameterization). */
export const withSpace = (fetch: HttpHandler, spaceId?: string): HttpHandler =>
  spaceId && spaceId !== 'default'
    ? (((path: string, options?: unknown) =>
        (fetch as unknown as (p: string, o?: unknown) => Promise<unknown>)(
          spacePath(path, spaceId),
          options
        )) as unknown as HttpHandler)
    : fetch;

/** Thrown when the eval world cannot be built; the run must fail instead of scoring the harness. */
export class EscalationWorldSetupError extends Error {
  constructor(message: string, cause?: unknown) {
    super(cause instanceof Error ? `${message}: ${cause.message}` : message);
    this.name = 'EscalationWorldSetupError';
  }
}

const setupStep = async <T>(description: string, step: () => Promise<T>): Promise<T> => {
  try {
    return await step();
  } catch (error) {
    throw error instanceof EscalationWorldSetupError
      ? error
      : new EscalationWorldSetupError(description, error);
  }
};

const json = (body: unknown) => JSON.stringify(body);

const post = async <T>(fetch: HttpHandler, path: string, body: unknown): Promise<T> => {
  const [base, query] = path.split('?');
  return (await fetch(`${base}${query ? `?${query}` : ''}`, {
    method: 'POST',
    version: PUBLIC_API_VERSION,
    headers: publicHeaders,
    body: json(body),
  })) as T;
};

const postInternal = async <T>(fetch: HttpHandler, path: string, body: unknown): Promise<T> =>
  (await fetch(path, {
    method: 'POST',
    headers: internalHeaders,
    body: json(body),
  })) as T;

const del = async (fetch: HttpHandler, path: string): Promise<void> => {
  await fetch(path, {
    method: 'DELETE',
    version: PUBLIC_API_VERSION,
    headers: publicHeaders,
  });
};

const get = async <T>(fetch: HttpHandler, path: string): Promise<T> =>
  (await fetch(path, { method: 'GET', version: PUBLIC_API_VERSION, headers: publicHeaders })) as T;

interface ConversationResponse {
  id?: string;
  conversation_id?: string;
  user?: { id?: string };
}

interface ConversationGetResponse {
  id: string;
  metadata?: Record<string, unknown>;
}

// The create route rejects ids that are not UUIDs.
const newConversationId = (): string => uuidv4();

/**
 * Timeline events never leave their investigation; only attachments are copied
 * into the escalation. Each planted event is therefore also attached as a text
 * attachment, which is what `_sync_attachments` carries over. The summary story
 * labels an attachment by its `description` (max 2048 chars on the create route),
 * so the full text goes there too.
 */
const ATTACHMENT_DESCRIPTION_MAX_LENGTH = 2048;

const eventToTextAttachment = (
  event: SeededEvent
): { type: 'text'; data: { content: string }; description: string } => {
  const content = event.data.text;
  return {
    type: 'text',
    data: { content: event.data.title ? `${event.data.title}\n${content}` : content },
    description: content.slice(0, ATTACHMENT_DESCRIPTION_MAX_LENGTH),
  };
};

/** A sync that copied nothing, or lost attachments, means the planted facts never reached the escalation. */
const assertSyncCopiedAll = (
  caseId: string,
  sync: Partial<SyncEscalationResponse>,
  expectedCopies: number
): void => {
  if (typeof sync.copied !== 'number' || typeof sync.failed !== 'number') {
    throw new EscalationWorldSetupError(
      `Attachment sync for ${caseId} returned no counts: ${JSON.stringify(sync)}`
    );
  }
  if (sync.failed > 0 || sync.copied === 0 || sync.copied < expectedCopies) {
    throw new EscalationWorldSetupError(
      `Attachment sync for ${caseId} copied ${sync.copied}/${expectedCopies} (failed ${sync.failed}); planted facts are not in the escalation`
    );
  }
};

const createConversation = async (
  fetch: HttpHandler,
  args: {
    title: string;
    templateId: 'investigation' | 'escalation';
    metadata?: Record<string, unknown>;
  }
): Promise<ConversationResponse> =>
  post<ConversationResponse>(fetch, '/api/agent_builder/conversations', {
    conversation_id: newConversationId(),
    title: args.title,
    template_id: args.templateId,
    access_control: { access_mode: 'public', entries: [] },
    ...(args.metadata ? { metadata: args.metadata } : {}),
  });

const addEvents = async (
  fetch: HttpHandler,
  conversationId: string,
  events: Array<{ type: string; data: Record<string, string> }>
): Promise<void> => {
  await post(
    fetch,
    `/api/agent_builder/conversations/${encodeURIComponent(conversationId)}/_add_events`,
    {
      events,
    }
  );
};

export interface RunEscalationCaseResult extends EscalationTaskOutput {
  raw?: unknown;
}

/** No summary run in flight, and a completed run started at or after the last `attachment_added`. */
const isSummarySettled = (diagnostics: SummaryDiagnostics): boolean =>
  diagnostics.unfinishedRuns === 0 &&
  (diagnostics.lastAttachmentAddedAt === undefined ||
    diagnostics.completedRunsStartedAfterLastAttachment >= 1);

export interface SettledSummary {
  summary: string;
  summaryDiagnostics: SummaryDiagnostics;
}

/**
 * Polls until `metadata.summary` is written AND the summary workflow has settled. The workflow is
 * serialized (max 1, backlog 1) and each run snapshots the conversation when it executes, so the
 * first non-empty summary can come from a run that predates the last synced investigation
 * (in the G19 live runs every summary miss had a run still in flight at read time). Scoring that
 * summary measures a timing race, not the product.
 *
 * Only the moment the summary is read changes; no grader is touched. If every run is terminal
 * but none started after the last attachment, the product never re-summarized: after `quietMs`
 * that summary is returned with the diagnostics attached, so a real product miss is still
 * scored. Runs still in flight at the timeout fail the run instead of scoring a partial summary.
 * If diagnostics cannot be read, the first non-empty summary is returned (legacy behaviour).
 */
export const waitForSettledSummary = async (
  fetch: HttpHandler,
  escalationId: string,
  {
    workflowId = SUMMARY_WORKFLOW_ID,
    syncCompletedAt = new Date().toISOString(),
    timeoutMs = 10 * 60_000,
    intervalMs = 10_000,
    quietMs = 60_000,
  }: {
    workflowId?: string;
    syncCompletedAt?: string;
    timeoutMs?: number;
    intervalMs?: number;
    quietMs?: number;
  } = {}
): Promise<SettledSummary> => {
  const deadline = Date.now() + timeoutMs;
  let quietSince: number | undefined;
  for (;;) {
    // Diagnostics before the summary read: no run can start without a new attachment, so a
    // settled snapshot stays settled and the summary read after it is at least as new.
    const summaryDiagnostics = await collectSummaryDiagnostics({
      fetch,
      escalationId,
      workflowId,
      syncCompletedAt,
      summaryObservedAt: new Date().toISOString(),
    });
    const conversation = await get<ConversationGetResponse>(
      fetch,
      `/api/agent_builder/conversations/${encodeURIComponent(escalationId)}`
    );
    const summary = conversation.metadata?.summary;
    const hasSummary = typeof summary === 'string' && summary.trim().length > 0;
    if (hasSummary) {
      if (summaryDiagnostics.errors.length > 0 || isSummarySettled(summaryDiagnostics)) {
        return { summary, summaryDiagnostics };
      }
      if (summaryDiagnostics.unfinishedRuns === 0) {
        quietSince = quietSince ?? Date.now();
        if (Date.now() - quietSince >= quietMs) {
          return { summary, summaryDiagnostics };
        }
      } else {
        quietSince = undefined;
      }
    }
    if (Date.now() >= deadline) {
      throw new EscalationWorldSetupError(
        hasSummary
          ? `Escalation ${escalationId} summary did not settle after ${timeoutMs}ms (${summaryDiagnostics.unfinishedRuns} summary run(s) in flight); refusing to score a possibly partial summary`
          : `Escalation ${escalationId} has no metadata.summary after ${timeoutMs}ms; is the investigation-summary workflow enabled?`
      );
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
};

interface ConverseResponse {
  response?: { message?: string };
  steps?: unknown[];
}

/**
 * Runs the whole case against a live Kibana: creates N investigations, plants
 * the timeline events, escalates from the first, links the rest, syncs, waits
 * for the summary, then asks the escalation-context chat each question.
 *
 * `mutation.dropInvestigation` omits one investigation from the escalation
 * (used by the mutation spec to prove recall must fall).
 */
export const runEscalationCase = async ({
  fetch: baseFetch,
  log,
  c,
  agentId,
  connectorId,
  mutation,
  spaceId,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
  c: EscalationCase;
  agentId: string;
  connectorId: string;
  mutation?: { dropInvestigation?: number };
  /** Kibana space the whole case runs in (`/s/<id>` prefix); default space when unset. */
  spaceId?: string;
}): Promise<RunEscalationCaseResult> => {
  const fetch = withSpace(baseFetch, spaceId);
  const drop = mutation?.dropInvestigation;
  const investigationIds: string[] = [];
  let assigneeId: string | undefined;

  try {
    // 1. Create the investigations and plant their timelines. Setup failures
    // throw: a broken world must fail the run, not get scored as a bad product.
    for (const investigation of c.investigations) {
      const created = await setupStep(`create investigation ${investigation.id} of ${c.id}`, () =>
        pRetry(
          () =>
            createConversation(fetch, {
              title: `${investigation.title} [${c.id}]`,
              templateId: 'investigation',
              metadata: { status: 'open' },
            }),
          { retries: 3, minTimeout: 2_000 }
        )
      );
      const investigationId = created.id ?? created.conversation_id;
      if (!investigationId) {
        throw new EscalationWorldSetupError(
          `Investigation creation returned no id for ${investigation.id} of ${c.id}`
        );
      }
      assigneeId = assigneeId ?? created.user?.id;
      await setupStep(`seed timeline events of ${investigation.id} of ${c.id}`, () =>
        addEvents(fetch, investigationId, investigation.events)
      );
      investigationIds.push(investigationId);
    }
    if (!assigneeId) {
      throw new EscalationWorldSetupError(
        `Investigation creation returned no user id for ${c.id}; the escalation needs an assignee`
      );
    }

    // The escalation is opened FROM the first investigation (required by the
    // create route). For the mutation, the dropped investigation is never
    // linked (when it is the first, the escalation opens from the next one).
    const linkedIndices = c.investigations
      .map((_, index) => index)
      .filter((index) => index !== drop);
    const anchorId = investigationIds[linkedIndices[0]];

    const escalation = await setupStep(`create escalation for ${c.id}`, () =>
      postInternal<{ id?: string }>(fetch, ESCALATIONS_INTERNAL_URL, {
        linked_investigation_id: anchorId,
        title: `Escalation ${c.id}`,
        visibility: 'public',
        assignees: [assigneeId],
      })
    );
    const esclId = escalation.id;
    if (!esclId) {
      throw new EscalationWorldSetupError(`Escalation creation returned no id for ${c.id}`);
    }

    // 2. Link the remaining investigations.
    for (const index of linkedIndices.slice(1)) {
      await setupStep(`link ${c.investigations[index].id} to escalation of ${c.id}`, () =>
        postInternal(fetch, escalationUrl(ESCALATION_LINK_URL, esclId), {
          linked_investigations: [investigationIds[index]],
        })
      );
    }

    // 3. Plant the facts as text attachments on the linked investigations AFTER
    // linking, so `_sync_attachments` (not the create/link auto-copy) is what
    // brings them into the escalation. Timeline events never leave their
    // investigation; attachments are what the escalation sees.
    let expectedCopies = 0;
    for (const index of linkedIndices) {
      const attachments = c.investigations[index].events.map(eventToTextAttachment);
      await setupStep(`attach facts of ${c.investigations[index].id} of ${c.id}`, async () => {
        for (const attachment of attachments) {
          await post(
            fetch,
            `/api/agent_builder/conversations/${encodeURIComponent(
              investigationIds[index]
            )}/attachments`,
            attachment
          );
        }
      });
      expectedCopies += attachments.length;
    }

    const sync = await setupStep(`sync attachments of escalation for ${c.id}`, () =>
      postInternal<SyncEscalationResponse>(fetch, escalationUrl(ESCALATION_SYNC_URL, esclId), {})
    );
    assertSyncCopiedAll(c.id, sync, expectedCopies);
    const syncCompletedAt = new Date().toISOString();

    // 4. Wait for the summarize workflow to write metadata.summary AND settle, so the scored
    // summary comes from a run that saw the last synced attachment. The diagnostics taken at
    // read time stay on the task output.
    const { summary, summaryDiagnostics } = await setupStep(`wait for the summary of ${c.id}`, () =>
      waitForSettledSummary(fetch, esclId, { syncCompletedAt })
    );
    log.info(`Summary diagnostics ${c.id}: ${JSON.stringify(summaryDiagnostics)}`);

    // 5. Ask the escalation-context chat every question. A failed round is a
    // scored failure (kept in the denominator, error recorded), never dropped.
    const answers: Record<string, string | undefined> = {};
    const answerErrors: Record<string, string> = {};
    for (const q of c.questions) {
      // The mutation drops an investigation; questions whose facts live only
      // there are still asked (the interesting failure mode) unless the caller
      // prunes them itself.
      try {
        const response = await post<ConverseResponse>(fetch, CONVERSE_URL, {
          input: q.question,
          conversation_id: esclId,
          agent_id: agentId,
          connector_id: connectorId,
        });
        answers[q.id] = response.response?.message ?? undefined;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log.warning(`converse failed for ${c.id}/${q.id}: ${message}`);
        answers[q.id] = undefined;
        answerErrors[q.id] = message;
      }
    }

    // Every round failing means the chat path itself is broken (wrong route,
    // dead connector), not that the product answered badly: fail the run
    // instead of reporting a green run full of silent zeros.
    const failedRounds = Object.keys(answerErrors);
    if (c.questions.length > 0 && failedRounds.length === c.questions.length) {
      throw new EscalationWorldSetupError(
        `All ${c.questions.length} converse rounds failed for ${c.id}; first error: ${
          answerErrors[failedRounds[0]]
        }`
      );
    }

    log.info(
      `Escalation case ${c.id}: summary ${summary ? 'present' : 'MISSING'}, ${
        Object.values(answers).filter(Boolean).length
      }/${c.questions.length} answers`
    );

    return {
      caseId: c.id,
      escalationId: esclId,
      investigationIds,
      summary,
      answers,
      answerErrors,
      summaryDiagnostics,
      ...(drop !== undefined ? { droppedInvestigation: drop } : {}),
    };
  } finally {
    // Conversations are left in place: the evals runner cleans the space.
    // Cleanup here would race retries.
  }
};

export const deleteConversations = async (fetch: HttpHandler, ids: string[]): Promise<void> => {
  for (const id of ids) {
    await del(fetch, `/api/agent_builder/conversations/${encodeURIComponent(id)}`).catch(() => {});
  }
};
