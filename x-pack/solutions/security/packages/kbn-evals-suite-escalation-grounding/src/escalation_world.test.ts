/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import { isBuiltInConversationEventType } from '@kbn/agent-builder-common';
import {
  ESCALATION_LINK_URL,
  ESCALATION_SYNC_URL,
} from '@kbn/agentic-investigations-plugin/common/escalations/constants';
import { escalationCases } from './dataset';
import {
  CONVERSE_URL,
  EscalationWorldSetupError,
  runEscalationCase,
  spacePath,
  waitForSettledSummary,
  withSpace,
} from './escalation_world';
import { chatKeyMentionRecall } from './evaluators';

const c = escalationCases[0];
const SYNC_PATH = ESCALATION_SYNC_URL.replace('{id}', 'esc-1');
const LINK_PATH = ESCALATION_LINK_URL.replace('{id}', 'esc-1');
const CONVERSATIONS_PATH = '/api/agent_builder/conversations';
// Literal on purpose: the fake pins the real route independently of the constant under test.
const CONVERSE_PATH = '/api/agent_builder/converse';
const ESCALATIONS_PATH = '/internal/investigations/escalations';

const totalEvents = c.investigations.reduce((sum, inv) => sum + inv.events.length, 0);

interface Call {
  method: string;
  path: string;
  body?: unknown;
}

/** Simulates only the routes the real product exposes; every other route is a 404. */
const createFakeKibana = ({
  syncResponse = { copied: totalEvents, failed: 0 },
  converse = async () => ({ response: { message: 'ok' } }),
}: {
  syncResponse?: unknown;
  converse?: (body: { input: string }) => Promise<unknown>;
} = {}) => {
  const calls: Call[] = [];
  let investigations = 0;
  const fetch = (async (path: string, options: { method: string; body?: string }) => {
    const body = options.body ? JSON.parse(options.body) : undefined;
    calls.push({ method: options.method, path, body });
    if (options.method === 'POST' && path === CONVERSATIONS_PATH) {
      investigations += 1;
      return { id: body.conversation_id, user: { id: 'profile-uid' } };
    }
    if (options.method === 'POST' && /\/conversations\/[^/]+\/_add_events$/.test(path)) {
      // Mirrors the product's validateConversationEvents: built-in types are a 400.
      const builtIn = (body.events as Array<{ type: string }>).find(({ type }) =>
        isBuiltInConversationEventType(type)
      );
      if (builtIn) {
        throw new Error(
          `400 Bad Request: Conversation event type "${builtIn.type}" is internal and cannot be added directly`
        );
      }
      return {};
    }
    if (options.method === 'POST' && /\/conversations\/[^/]+\/attachments$/.test(path)) {
      return {};
    }
    if (options.method === 'POST' && path === ESCALATIONS_PATH) {
      return { id: 'esc-1' };
    }
    if (options.method === 'POST' && path === LINK_PATH) {
      return {};
    }
    if (options.method === 'POST' && path === SYNC_PATH) {
      return syncResponse;
    }
    if (options.method === 'GET' && path === `${CONVERSATIONS_PATH}/esc-1`) {
      return { id: 'esc-1', metadata: { summary: 'a summary' } };
    }
    if (
      options.method === 'GET' &&
      path.startsWith('/api/workflows/workflow/system-alertzero-investigation-summary/executions?')
    ) {
      return { results: [] };
    }
    if (options.method === 'POST' && path === CONVERSE_PATH) {
      return converse(body);
    }
    throw new Error(`404 Not Found: ${options.method} ${path}`);
  }) as unknown as HttpHandler;
  return { fetch, calls, investigationsCreated: () => investigations };
};

const log = { info: jest.fn(), warning: jest.fn() } as unknown as ToolingLog;

const run = (fetch: HttpHandler) =>
  runEscalationCase({ fetch, log, c, agentId: 'agent', connectorId: 'connector' });

describe('runEscalationCase', () => {
  it('builds the world through the real routes and syncs with _sync_attachments', async () => {
    const kibana = createFakeKibana();
    const result = await run(kibana.fetch);

    expect(result.summary).toBe('a summary');
    // timing evidence rides along, scoped to this escalation's summary runs
    expect(result.summaryDiagnostics).toMatchObject({ summaryRuns: [], errors: [] });
    expect(kibana.calls.some((call) => call.path === SYNC_PATH)).toBe(true);
    expect(kibana.calls.every((call) => !call.path.endsWith('/_sync'))).toBe(true);
    // the escalation is created with an assignee (required by the create route)
    expect(kibana.calls.find((call) => call.path === ESCALATIONS_PATH)?.body).toMatchObject({
      assignees: ['profile-uid'],
    });
  });

  it('seeds only custom event types, which the real _add_events route accepts', async () => {
    const kibana = createFakeKibana();
    await run(kibana.fetch);

    const seeded = kibana.calls
      .filter((call) => call.path.endsWith('/_add_events'))
      .flatMap((call) => (call.body as { events: Array<{ type: string }> }).events);
    expect(seeded.length).toBe(totalEvents);
    expect(seeded.every(({ type }) => !isBuiltInConversationEventType(type))).toBe(true);
  });

  it('fails setup when a case would seed a built-in event type (400 from _add_events)', async () => {
    const kibana = createFakeKibana();
    const withBuiltIn = {
      ...c,
      investigations: c.investigations.map((inv, index) =>
        index === 0
          ? { ...inv, events: [{ type: 'user_message', data: { message: 'hi' } }, ...inv.events] }
          : inv
      ),
    } as unknown as typeof c;

    const error = await runEscalationCase({
      fetch: kibana.fetch,
      log,
      c: withBuiltIn,
      agentId: 'agent',
      connectorId: 'connector',
    }).catch((e) => e);

    expect(error).toBeInstanceOf(EscalationWorldSetupError);
    expect(error.message).toMatch(/seed timeline events.*internal and cannot be added directly/);
  });

  it('throws when the sync route does not exist (never scores a broken world)', async () => {
    const kibana = createFakeKibana();
    const fetch = ((path: string, options: { method: string }) =>
      path === SYNC_PATH
        ? Promise.reject(new Error('404 Not Found'))
        : (kibana.fetch as unknown as Function)(path, options)) as unknown as HttpHandler;

    await expect(run(fetch)).rejects.toThrow(EscalationWorldSetupError);
    await expect(run(fetch)).rejects.toThrow(/sync attachments/);
  });

  it('throws when the sync copies nothing', async () => {
    const kibana = createFakeKibana({ syncResponse: { copied: 0, failed: 0 } });
    await expect(run(kibana.fetch)).rejects.toThrow(/copied 0\//);
  });

  it('throws when the sync copies fewer attachments than were planted', async () => {
    const kibana = createFakeKibana({ syncResponse: { copied: totalEvents - 1, failed: 0 } });
    await expect(run(kibana.fetch)).rejects.toThrow(EscalationWorldSetupError);
  });

  it('throws when the sync reports failed copies', async () => {
    const kibana = createFakeKibana({ syncResponse: { copied: totalEvents, failed: 1 } });
    await expect(run(kibana.fetch)).rejects.toThrow(/failed 1/);
  });

  it('throws when the sync response carries no counts', async () => {
    const kibana = createFakeKibana({ syncResponse: {} });
    await expect(run(kibana.fetch)).rejects.toThrow(/no counts/);
  });

  it('throws when seeding fails instead of continuing', async () => {
    const kibana = createFakeKibana();
    const fetch = ((path: string, options: { method: string }) =>
      path.endsWith('/_add_events')
        ? Promise.reject(new Error('500 boom'))
        : (kibana.fetch as unknown as Function)(path, options)) as unknown as HttpHandler;

    await expect(run(fetch)).rejects.toThrow(/seed timeline events/);
  });

  it('records a failed converse round as a scored failure with the error', async () => {
    const failing = c.questions[0].question;
    const kibana = createFakeKibana({
      converse: async ({ input }) => {
        if (input === failing) {
          throw new Error('converse exploded');
        }
        return { response: { message: 'answer' } };
      },
    });

    const result = await run(kibana.fetch);

    expect(result.answers[c.questions[0].id]).toBeUndefined();
    expect(result.answerErrors).toEqual({ [c.questions[0].id]: 'converse exploded' });

    const scored = (await chatKeyMentionRecall.evaluate({
      input: {},
      output: result,
      expected: { c },
      metadata: null,
    })) as { score: number; label: string; metadata: { total: number } };
    // the failed question stays in the denominator
    expect(scored.metadata.total).toBe(c.questions.length);
    expect(scored.score).toBe(0);
  });
});

describe('converse route', () => {
  it('asks every question through the real agent_builder converse route', async () => {
    const kibana = createFakeKibana();
    await run(kibana.fetch);

    const converseCalls = kibana.calls.filter((call) => /converse$/.test(call.path));
    expect(converseCalls).toHaveLength(c.questions.length);
    expect(converseCalls.every((call) => call.path === CONVERSE_PATH)).toBe(true);
    expect(CONVERSE_URL).toBe(CONVERSE_PATH);
    expect(converseCalls[0].body).toMatchObject({
      conversation_id: 'esc-1',
      agent_id: 'agent',
      connector_id: 'connector',
    });
  });

  it('fails the run when every converse round fails (no silent all-zero green run)', async () => {
    const kibana = createFakeKibana({
      converse: async () => {
        throw new Error('503 Service Unavailable');
      },
    });

    const error = await run(kibana.fetch).catch((e) => e);

    expect(error).toBeInstanceOf(EscalationWorldSetupError);
    expect(error.message).toContain(`All ${c.questions.length} converse rounds failed`);
    expect(error.message).toContain('503 Service Unavailable');
  });

  it('throws when the converse route does not exist (the 404 that went green)', async () => {
    const kibana = createFakeKibana();
    const realFetch = kibana.fetch as unknown as (
      path: string,
      options: unknown
    ) => Promise<unknown>;
    const wrongRoute = ((path: string, options: unknown) =>
      realFetch(
        path.replace('/agent_builder/converse', '/agent_builder/chat/converse'),
        options
      )) as unknown as HttpHandler;

    await expect(run(wrongRoute)).rejects.toThrow(/converse rounds failed.*404 Not Found/);
  });
});

describe('mutation arm', () => {
  it('reports the dropped investigation so precision graders use the corpus the product saw', async () => {
    const last = c.investigations.length - 1;
    const droppedEvents = c.investigations[last].events.length;
    const kibana = createFakeKibana({
      syncResponse: { copied: totalEvents - droppedEvents, failed: 0 },
    });
    const result = await runEscalationCase({
      fetch: kibana.fetch,
      log,
      c,
      agentId: 'agent',
      connectorId: 'connector',
      mutation: { dropInvestigation: last },
    });
    expect(result.droppedInvestigation).toBe(last);
    const linked = kibana.calls.filter(
      (call) => call.method === 'POST' && call.path.includes('_link')
    ).length;
    expect(linked).toBe(c.investigations.length - 2);
  });

  it('leaves droppedInvestigation unset on the full arm', async () => {
    const result = await run(createFakeKibana().fetch);
    expect(result.droppedInvestigation).toBeUndefined();
  });
});

describe('space parameter (G20 hook)', () => {
  it('prefixes /s/<id> for a custom space and leaves the default space alone', () => {
    expect(spacePath('/api/x', 'sec')).toBe('/s/sec/api/x');
    expect(spacePath('/api/x', 'default')).toBe('/api/x');
    expect(spacePath('/api/x')).toBe('/api/x');
  });

  it('routes every request of a case through the space prefix', async () => {
    const seen: string[] = [];
    const kibana = createFakeKibana();
    const spaced = ((path: string, options: unknown) => {
      seen.push(path);
      return (kibana.fetch as unknown as Function)(path.replace(/^\/s\/sec/, ''), options);
    }) as unknown as HttpHandler;
    await runEscalationCase({
      fetch: spaced,
      log,
      c,
      agentId: 'agent',
      connectorId: 'connector',
      spaceId: 'sec',
    });
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every((path) => path.startsWith('/s/sec/'))).toBe(true);
  });

  it('withSpace is the identity for the default space', () => {
    const fetch = jest.fn() as unknown as HttpHandler;
    expect(withSpace(fetch)).toBe(fetch);
    expect(withSpace(fetch, 'default')).toBe(fetch);
  });
});

describe('waitForSettledSummary', () => {
  const WORKFLOW = 'system-alertzero-investigation-summary';
  const opts = { timeoutMs: 60, intervalMs: 5, quietMs: 25 };
  const attached = (id: string, at: string) => ({
    id: `ev-${id}`,
    type: 'attachment_added',
    created_at: at,
    data: { attachment_id: id },
  });
  const summaryRun = (status: string, startedAt: string) => ({
    id: `run-${startedAt}`,
    status,
    startedAt,
    finishedAt: status === 'completed' ? startedAt : null,
  });

  /** Each call returns the next scripted state; the last one repeats. */
  const scripted = (
    states: Array<{ summary?: string; events?: unknown[]; runs?: unknown[] }>,
    { failExecutions = false }: { failExecutions?: boolean } = {}
  ) => {
    let index = 0;
    let current = states[0];
    return (async (path: string) => {
      if (path.startsWith('/api/workflows/workflow/')) {
        if (failExecutions) throw new Error('403 executions');
        return { results: current.runs ?? [] };
      }
      // The conversation is read twice per poll (events, then summary); advance after the second.
      const response = {
        id: 'esc-1',
        events: current.events ?? [],
        metadata: current.summary === undefined ? {} : { summary: current.summary },
      };
      if (path.startsWith(`${CONVERSATIONS_PATH}/`)) {
        reads += 1;
        if (reads % 2 === 0) {
          index = Math.min(index + 1, states.length - 1);
          current = states[index];
        }
      }
      return response;
    }) as unknown as HttpHandler;
  };
  let reads = 0;
  beforeEach(() => {
    reads = 0;
  });

  it('does not return a summary written by a run that predates the last attachment while a later run is in flight', async () => {
    const events = [
      attached('a1', '2026-10-09T13:50:00.000Z'),
      attached('a2', '2026-10-09T13:50:05.000Z'),
    ];
    const fetch = scripted([
      {
        summary: 'covers inv1 only',
        events,
        runs: [
          summaryRun('completed', '2026-10-09T13:50:01.000Z'),
          summaryRun('running', '2026-10-09T13:50:06.000Z'),
        ],
      },
      {
        summary: 'covers inv1 and inv2',
        events,
        runs: [
          summaryRun('completed', '2026-10-09T13:50:01.000Z'),
          summaryRun('completed', '2026-10-09T13:50:06.000Z'),
        ],
      },
    ]);

    const result = await waitForSettledSummary(fetch, 'esc-1', opts);

    expect(result.summary).toBe('covers inv1 and inv2');
    expect(result.summaryDiagnostics.completedRunsStartedAfterLastAttachment).toBe(1);
    expect(result.summaryDiagnostics.unfinishedRuns).toBe(0);
  });

  it('fails the run when a summary run is still in flight at the timeout', async () => {
    const events = [attached('a1', '2026-10-09T13:50:00.000Z')];
    const fetch = scripted([
      { summary: 'partial', events, runs: [summaryRun('queued', '2026-10-09T13:50:06.000Z')] },
    ]);

    const error = await waitForSettledSummary(fetch, 'esc-1', opts).catch((e) => e);

    expect(error).toBeInstanceOf(EscalationWorldSetupError);
    expect(error.message).toMatch(/did not settle/);
  });

  it('still scores a product miss: all runs terminal, none after the last attachment, after the quiet window', async () => {
    const events = [
      attached('a1', '2026-10-09T13:50:00.000Z'),
      attached('a2', '2026-10-09T13:50:05.000Z'),
    ];
    const fetch = scripted([
      { summary: 'stale', events, runs: [summaryRun('completed', '2026-10-09T13:50:01.000Z')] },
    ]);

    const result = await waitForSettledSummary(fetch, 'esc-1', opts);

    expect(result.summary).toBe('stale');
    expect(result.summaryDiagnostics.completedRunsStartedAfterLastAttachment).toBe(0);
    expect(result.summaryDiagnostics.unfinishedRuns).toBe(0);
  });

  it('returns the first non-empty summary when diagnostics cannot be read', async () => {
    const fetch = scripted([{ summary: 'done' }], { failExecutions: true });

    const result = await waitForSettledSummary(fetch, 'esc-1', opts);

    expect(result.summary).toBe('done');
    expect(result.summaryDiagnostics.errors).toHaveLength(1);
  });

  it('keeps waiting while there is no summary, then throws EscalationWorldSetupError', async () => {
    const error = await waitForSettledSummary(scripted([{ events: [] }]), 'esc-1', opts).catch(
      (e) => e
    );

    expect(error).toBeInstanceOf(EscalationWorldSetupError);
    expect(error.message).toMatch(/no metadata\.summary/);
  });

  it('treats a blank summary as missing', async () => {
    await expect(
      waitForSettledSummary(scripted([{ summary: '   ' }]), 'esc-1', opts)
    ).rejects.toBeInstanceOf(EscalationWorldSetupError);
  });

  it('queries the same workflow the diagnostics key on', async () => {
    const paths: string[] = [];
    const fetch = (async (path: string) => {
      paths.push(path);
      return path.startsWith('/api/workflows/')
        ? { results: [] }
        : { id: 'esc-1', events: [], metadata: { summary: 'x' } };
    }) as unknown as HttpHandler;

    await waitForSettledSummary(fetch, 'esc-1', opts);

    expect(paths.some((p) => p.includes(`/workflow/${WORKFLOW}/executions`))).toBe(true);
  });
});
