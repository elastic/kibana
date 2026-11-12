/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { SIGNIFICANT_EVENTS_ALERT_SOURCE } from '@kbn/significant-events-schema';
import type {
  InvestigationSubjectResponse,
  InvestigationSummary,
} from '@kbn/agentic-investigations-plugin/common';
import {
  ConversationRoundStatus,
  createConversationNotFoundError,
} from '@kbn/agent-builder-common';
import { HookLifecycle, type AfterExecutionHookContext } from '@kbn/agent-builder-server';
import { NIGHTSHIFT_INVESTIGATION_AGENT_ID } from '@kbn/nightshift-investigations-plugin/common';
import { registerAfterInvestigationHook } from './register_after_investigation_hook';

const logger = { warn: jest.fn(), debug: jest.fn() } as unknown as Logger;

type InvestigationOverrides = Omit<Partial<InvestigationSummary>, 'subjects'> & {
  subjects?: Array<Pick<InvestigationSubjectResponse, 'type' | 'id'>>;
};

const investigation = ({
  subjects = [
    { type: 'alert', id: 'episode-1' },
    { type: 'alert', id: 'episode-2' },
  ],
  ...overrides
}: InvestigationOverrides = {}) => ({
  id: 'inv-1',
  created_at: '2026-11-09T10:00:00.000Z',
  in_progress: false,
  metadata: { status: 'open', severity: 'high', verdict: 'the cause' },
  impact: { summary: 'the impact' },
  subjects: subjects.map(({ type, id }) => ({
    type,
    id,
    snapshot: { source: SIGNIFICANT_EVENTS_ALERT_SOURCE },
    created_at: '2026-11-09T10:00:00.000Z',
  })),
  ...overrides,
});
const unrecorded = () => investigation({ metadata: { status: 'open', severity: 'medium' } });

const roundContext = (
  overrides: Partial<Omit<AfterExecutionHookContext, 'round'>> & {
    round?: { status: ConversationRoundStatus };
  } = {}
) =>
  ({
    agentId: NIGHTSHIFT_INVESTIGATION_AGENT_ID,
    conversationId: 'inv-1',
    conversationAccess: 'write',
    round: { status: ConversationRoundStatus.completed },
    request: {},
    ...overrides,
  } as never);

const synced = () => ({
  status: 'available',
  outcomes: new Map([['event-1', { severity: 'high' }]]),
});
const unavailable = (reason: string) => ({ status: 'unavailable', reason });

const setup = ({ gets = [investigation()] as unknown[], outcome = synced() as unknown } = {}) => {
  const get = jest.fn();
  gets.forEach((result) =>
    result instanceof Error ? get.mockRejectedValueOnce(result) : get.mockResolvedValueOnce(result)
  );
  const syncEvents = jest.fn().mockResolvedValue(outcome);
  const eventClient = {
    findEventIdsByEpisodeIds: jest.fn().mockResolvedValue(
      new Map([
        ['episode-1', ['event-1']],
        ['episode-2', ['event-9']],
      ])
    ),
  };
  const register = jest.fn();
  registerAfterInvestigationHook({
    agentBuilder: { hooks: { register } } as never,
    getDeps: () => ({
      agenticInvestigations: { getInvestigationsClient: () => ({ get }) } as never,
      getEventClient: async () => eventClient as never,
      severitySync: { syncEvents } as never,
    }),
    logger,
  });
  const { handler } = register.mock.calls[0][0].hooks[HookLifecycle.afterExecution];
  return { handler, get, syncEvents, register };
};

const run = async (handler: (context: never) => Promise<void>, advanceMs = 0) => {
  const pending = handler(roundContext());
  await jest.advanceTimersByTimeAsync(advanceMs);
  await pending;
};

describe('registerAfterInvestigationHook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });
  afterEach(() => jest.useRealTimers());

  it('registers a non-blocking after-execution hook', () => {
    const { register } = setup();

    expect(register.mock.calls[0][0].hooks[HookLifecycle.afterExecution].mode).toBe('nonBlocking');
  });

  it("syncs the events of the investigation's episodes", async () => {
    const { handler, syncEvents } = setup();

    await run(handler);

    expect(syncEvents).toHaveBeenCalledTimes(1);
    expect(syncEvents).toHaveBeenCalledWith(
      expect.objectContaining({ eventIds: expect.arrayContaining(['event-1', 'event-9']) })
    );
  });

  it.each<
    [
      string,
      (
        | Partial<Pick<AfterExecutionHookContext, 'agentId' | 'conversationAccess'>>
        | { round: { status: ConversationRoundStatus } }
      )
    ]
  >([
    ['another agent', { agentId: 'some.other.agent' }],
    ['a round that is not completed', { round: { status: ConversationRoundStatus.inProgress } }],
    ['a read-only conversation', { conversationAccess: 'readOnly' }],
  ])('does nothing for %s', async (_name, overrides) => {
    const { handler, get } = setup();

    await handler(roundContext(overrides));

    expect(get).not.toHaveBeenCalled();
  });

  it.each([
    ['the final findings are not visible yet', unrecorded()],
    ['a transient read failure', new Error('temporary')],
  ])('retries after %s, then syncs', async (_name, first) => {
    const { handler, get, syncEvents } = setup({ gets: [first, investigation()] });

    await run(handler, 2_000);

    expect(get).toHaveBeenCalledTimes(2);
    expect(syncEvents).toHaveBeenCalledTimes(1);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('warns with the investigation id and the cause once attempts at 0 s, 2 s and 10 s run out', async () => {
    const failure = new Error('es is down');
    const { handler, get, syncEvents } = setup({ gets: [failure, failure, failure] });

    await run(handler, 12_000);

    expect(get).toHaveBeenCalledTimes(3);
    expect(syncEvents).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('inv-1'));
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('es is down'));
  });

  it('does not warn when the round recorded no findings', async () => {
    const { handler, syncEvents } = setup({ gets: [unrecorded(), unrecorded(), unrecorded()] });

    await run(handler, 12_000);

    expect(syncEvents).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it.each<[string, Error]>([
    [
      'a conversation that does not exist',
      createConversationNotFoundError({ conversationId: 'inv-1' }),
    ],
    [
      'a conversation that is not an investigation',
      Object.assign(new Error('not an investigation'), { name: 'WrongTemplateError' }),
    ],
    [
      'a caller that cannot read it',
      Object.assign(new Error('no access'), { name: 'InvestigationsForbiddenError' }),
    ],
  ])('stops quietly for %s, without retrying', async (_name, error) => {
    const { handler, get } = setup({ gets: [error] });

    await run(handler);

    expect(get).toHaveBeenCalledTimes(1);
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('inv-1'));
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it.each([
    ['timeout', 3],
    ['error', 3],
    ['not_installed', 1],
    ['forbidden', 1],
  ])('an unavailable %s is read %i time(s)', async (reason, reads) => {
    const { handler, get } = setup({
      gets: [investigation(), investigation(), investigation()],
      outcome: unavailable(reason),
    });

    await run(handler, 12_000);

    expect(get).toHaveBeenCalledTimes(reads);
  });
});
