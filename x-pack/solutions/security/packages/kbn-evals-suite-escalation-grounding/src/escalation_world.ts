/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under the
 * Elastic License 2.0. Use of this file is governed by the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import pRetry from 'p-retry';
import type { EscalationCase, EscalationTaskOutput } from './types';

const PUBLIC_API_VERSION = '2023-10-31';
const AGENTIC_API_VERSION = '2026-10-01';

const publicHeaders = { 'elastic-api-version': PUBLIC_API_VERSION } as const;
const internalHeaders = {
  'kbn-xsrf': 'escalation-grounding-eval',
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': AGENTIC_API_VERSION,
} as const;

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
  conversation_id?: string;
  user?: { id?: string };
}

interface ConversationGetResponse {
  id: string;
  metadata?: Record<string, unknown>;
}

const newConversationId = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;

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

/**
 * Polls the escalation conversation until `metadata.summary` appears (or the
 * attempt budget is exhausted). Returns the summary, or undefined if the
 * summarize workflow never produced one.
 */
export const waitForSummary = async (
  fetch: HttpHandler,
  escalationId: string,
  { timeoutMs = 5 * 60_000, intervalMs = 10_000 }: { timeoutMs?: number; intervalMs?: number } = {}
): Promise<string | undefined> => {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const conversation = await get<ConversationGetResponse>(
      fetch,
      `/api/agent_builder/conversations/${encodeURIComponent(escalationId)}`
    );
    const summary = conversation.metadata?.summary;
    if (typeof summary === 'string' && summary.trim().length > 0) {
      return summary;
    }
    if (Date.now() >= deadline) {
      return undefined;
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
  fetch,
  log,
  c,
  agentId,
  connectorId,
  mutation,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
  c: EscalationCase;
  agentId: string;
  connectorId: string;
  mutation?: { dropInvestigation?: number };
}): Promise<RunEscalationCaseResult> => {
  const drop = mutation?.dropInvestigation;
  const investigationIds: string[] = [];

  try {
    // 1. Create the investigations and plant their timelines.
    for (const investigation of c.investigations) {
      const created = await pRetry(
        () =>
          createConversation(fetch, {
            title: `${investigation.title} [${c.id}]`,
            templateId: 'investigation',
            metadata: { status: 'open' },
          }),
        { retries: 3, minTimeout: 2_000 }
      );
      if (!created.conversation_id) {
        throw new Error(`Investigation creation returned no id for ${investigation.id}`);
      }
      await addEvents(fetch, created.conversation_id, investigation.events);
      investigationIds.push(created.conversation_id);
    }

    // The escalation is opened FROM the first investigation (required by the
    // create route); the creator id doubles as the assignee. For the mutation,
    // the dropped investigation is never linked (when it is the first, the
    // escalation opens from the next one instead).
    const linkedIndices = c.investigations
      .map((_, index) => index)
      .filter((index) => index !== drop);
    const anchorIndex = linkedIndices[0];
    const anchorId = investigationIds[anchorIndex];

    const escalation = await postInternal<{ id?: string; conversation_id?: string }>(
      fetch,
      '/internal/investigations/escalations',
      {
        linked_investigation_id: anchorId,
        title: `Escalation ${c.id}`,
        visibility: 'public',
      }
    );
    const esclId = escalation.conversation_id ?? escalation.id;
    if (!esclId) {
      throw new Error(`Escalation creation returned no id for ${c.id}`);
    }

    // 2. Link the remaining investigations and sync attachments.
    for (const index of linkedIndices.slice(1)) {
      await postInternal(
        fetch,
        `/internal/investigations/escalations/${encodeURIComponent(esclId)}/_link`,
        { linked_investigations: [investigationIds[index]] }
      );
    }
    await postInternal(
      fetch,
      `/internal/investigations/escalations/${encodeURIComponent(esclId)}/_sync`,
      {}
    ).catch((error: Error) => log.warning(`sync failed for ${c.id}: ${error.message}`));

    // 3. Wait for the summarize workflow to write metadata.summary.
    const summary = await waitForSummary(fetch, esclId);

    // 4. Ask the escalation-context chat every question.
    const answers: Record<string, string | undefined> = {};
    for (const q of c.questions) {
      // The mutation drops an investigation; questions whose facts live only
      // there are still asked (the interesting failure mode) unless the caller
      // prunes them itself.
      try {
        const response = await post<ConverseResponse>(fetch, '/api/agent_builder/chat/converse', {
          input: q.question,
          conversation_id: esclId,
          agent_id: agentId,
          connector_id: connectorId,
        });
        answers[q.id] = response.response?.message ?? undefined;
      } catch (error) {
        log.warning(`converse failed for ${c.id}/${q.id}: ${(error as Error).message}`);
        answers[q.id] = undefined;
      }
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
