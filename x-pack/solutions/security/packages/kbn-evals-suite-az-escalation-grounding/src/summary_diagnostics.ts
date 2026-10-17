/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';

const PUBLIC_API_VERSION = '2023-10-31';

/** The managed workflow keys concurrency as `{{ workflow.id }}:{{ event.conversationId }}`. */
export const summaryConcurrencyKey = (workflowId: string, escalationId: string): string =>
  `${workflowId}:${escalationId}`;

export interface AttachmentAddedMark {
  eventId?: string;
  attachmentId?: string;
  createdAt: string;
}

export interface SummaryRunMark {
  id: string;
  status: string;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
}

/**
 * Timing evidence for one escalation, so a summary that covers only part of the synced
 * attachments can be attributed to the product (the workflow never re-ran after the last
 * attachment landed) or to the harness (a later run existed but the first summary was scored).
 */
export interface SummaryDiagnostics {
  /** Harness clock, ISO. */
  syncCompletedAt: string;
  summaryObservedAt: string;
  attachmentsAdded: AttachmentAddedMark[];
  lastAttachmentAddedAt?: string;
  summaryRuns: SummaryRunMark[];
  /** Runs by status, e.g. `{ completed: 3, skipped: 2 }`; `skipped` means the backlog was full. */
  summaryRunStatuses: Record<string, number>;
  /**
   * Completed runs that started at or after the last attachment was added. Zero means every
   * summary was read from a snapshot that predates the final attachment (product side).
   */
  completedRunsStartedAfterLastAttachment: number;
  /** Runs still pending, queued or running when diagnostics were taken. */
  unfinishedRuns: number;
  errors: string[];
}

interface ConversationWithEvents {
  events?: Array<{
    id?: string;
    type?: string;
    created_at?: string;
    data?: { attachment_id?: string };
  }>;
}

interface ExecutionList {
  results?: Array<{
    id: string;
    status: string;
    startedAt?: string | null;
    finishedAt?: string | null;
    error?: { message?: string } | null;
  }>;
}

const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled', 'timed_out', 'skipped']);

const get = async <T>(fetch: HttpHandler, path: string): Promise<T> =>
  (await fetch(path, {
    method: 'GET',
    version: PUBLIC_API_VERSION,
    headers: { 'elastic-api-version': PUBLIC_API_VERSION },
  })) as T;

const isoOrUndefined = (value: string | null | undefined): string | undefined =>
  value ? value : undefined;

/**
 * Reads attachment-added timestamps from the escalation timeline and the summary workflow's
 * executions for this escalation. Never throws: a diagnostics failure must not change a run.
 */
export const collectSummaryDiagnostics = async ({
  fetch,
  escalationId,
  workflowId,
  syncCompletedAt,
  summaryObservedAt,
}: {
  fetch: HttpHandler;
  escalationId: string;
  workflowId: string;
  syncCompletedAt: string;
  summaryObservedAt: string;
}): Promise<SummaryDiagnostics> => {
  const errors: string[] = [];
  let attachmentsAdded: AttachmentAddedMark[] = [];
  let summaryRuns: SummaryRunMark[] = [];

  try {
    const conversation = await get<ConversationWithEvents>(
      fetch,
      `/api/agent_builder/conversations/${encodeURIComponent(escalationId)}`
    );
    attachmentsAdded = (conversation.events ?? [])
      .filter((event) => event.type === 'attachment_added' && typeof event.created_at === 'string')
      .map((event) => ({
        eventId: event.id,
        attachmentId: event.data?.attachment_id,
        createdAt: event.created_at as string,
      }))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  } catch (error) {
    errors.push(`read escalation events: ${(error as Error).message}`);
  }

  try {
    const query = new URLSearchParams({
      concurrencyGroupKey: summaryConcurrencyKey(workflowId, escalationId),
      omitStepRuns: 'true',
      size: '100',
      sortField: 'createdAt',
      sortOrder: 'asc',
    });
    const list = await get<ExecutionList>(
      fetch,
      `/api/workflows/workflow/${encodeURIComponent(workflowId)}/executions?${query.toString()}`
    );
    summaryRuns = (list.results ?? []).map((run) => ({
      id: run.id,
      status: run.status,
      startedAt: isoOrUndefined(run.startedAt),
      finishedAt: isoOrUndefined(run.finishedAt),
      ...(run.error?.message ? { error: run.error.message } : {}),
    }));
  } catch (error) {
    errors.push(`read summary workflow executions: ${(error as Error).message}`);
  }

  const lastAttachmentAddedAt = attachmentsAdded[attachmentsAdded.length - 1]?.createdAt;
  const summaryRunStatuses: Record<string, number> = {};
  for (const run of summaryRuns) {
    summaryRunStatuses[run.status] = (summaryRunStatuses[run.status] ?? 0) + 1;
  }

  return {
    syncCompletedAt,
    summaryObservedAt,
    attachmentsAdded,
    ...(lastAttachmentAddedAt ? { lastAttachmentAddedAt } : {}),
    summaryRuns,
    summaryRunStatuses,
    completedRunsStartedAfterLastAttachment: lastAttachmentAddedAt
      ? summaryRuns.filter(
          (run) =>
            run.status === 'completed' &&
            run.startedAt !== undefined &&
            Date.parse(run.startedAt) >= Date.parse(lastAttachmentAddedAt)
        ).length
      : 0,
    unfinishedRuns: summaryRuns.filter((run) => !TERMINAL_STATUSES.has(run.status)).length,
    errors,
  };
};
