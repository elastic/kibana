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
import {
  ESCALATION_LINK_URL,
  ESCALATION_SYNC_URL,
} from '@kbn/agentic-investigations-plugin/common/escalations/constants';
import { escalationCases } from './dataset';
import {
  EscalationWorldSetupError,
  runEscalationCase,
  spacePath,
  withSpace,
} from './escalation_world';
import { chatKeyMentionRecall } from './evaluators';

const c = escalationCases[0];
const SYNC_PATH = ESCALATION_SYNC_URL.replace('{id}', 'esc-1');
const LINK_PATH = ESCALATION_LINK_URL.replace('{id}', 'esc-1');
const CONVERSATIONS_PATH = '/api/agent_builder/conversations';
const CONVERSE_PATH = '/api/agent_builder/chat/converse';
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
    if (
      options.method === 'POST' &&
      /\/conversations\/[^/]+\/(_add_events|attachments)$/.test(path)
    ) {
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
    expect(kibana.calls.some((call) => call.path === SYNC_PATH)).toBe(true);
    expect(kibana.calls.every((call) => !call.path.endsWith('/_sync'))).toBe(true);
    // the escalation is created with an assignee (required by the create route)
    expect(kibana.calls.find((call) => call.path === ESCALATIONS_PATH)?.body).toMatchObject({
      assignees: ['profile-uid'],
    });
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
