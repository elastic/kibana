/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findOrCreateSlackThreadInvestigationRoute } from './find_or_create_slack_thread_investigation';

const { handler, params } =
  findOrCreateSlackThreadInvestigationRoute[
    'POST /internal/nightshift/investigations/_slack_thread'
  ];

const findOrCreateSlackThread = jest.fn();
const getInvestigationsClient = jest.fn().mockReturnValue({ findOrCreateSlackThread });

const BODY = { workspace: 'T1', channel: 'C1', thread_ts: '1700.0001', create: false };

beforeEach(() => jest.clearAllMocks());

it('requires the workspace, since channel ids repeat across workspaces', () => {
  const withoutWorkspace = { channel: 'C1', thread_ts: '1700.0001', create: false };
  expect(params?.safeParse({ body: withoutWorkspace }).success).toBe(false);
  expect(params?.safeParse({ body: { ...BODY, workspace: '' } }).success).toBe(false);
  expect(params?.safeParse({ body: BODY }).success).toBe(true);
});

it('passes the status message and the delivered event to the client', async () => {
  findOrCreateSlackThread.mockResolvedValue({
    investigation_id: 'inv-1',
    title: 'Checkout errors',
    duplicate: true,
  });

  await expect(
    handler({
      request: {},
      getInvestigationsClient,
      params: {
        body: {
          ...BODY,
          status_message_ts: '1700.0002',
          event_id: 'Ev1',
          execution_id: 'exec-1',
        },
      },
    } as never)
  ).resolves.toEqual({ investigation_id: 'inv-1', title: 'Checkout errors', duplicate: true });
  expect(findOrCreateSlackThread).toHaveBeenCalledWith({
    workspace: 'T1',
    channel: 'C1',
    threadTs: '1700.0001',
    text: undefined,
    create: false,
    statusMessageTs: '1700.0002',
    event: { eventId: 'Ev1', executionId: 'exec-1' },
  });
});

it('passes a release of the event to the client', async () => {
  findOrCreateSlackThread.mockResolvedValue({
    investigation_id: 'inv-1',
    title: 'Checkout errors',
  });

  await handler({
    request: {},
    getInvestigationsClient,
    params: {
      body: { ...BODY, event_id: 'Ev1', execution_id: 'exec-1', release_event: true },
    },
  } as never);

  expect(findOrCreateSlackThread).toHaveBeenCalledWith(
    expect.objectContaining({
      event: { eventId: 'Ev1', executionId: 'exec-1' },
      releaseEvent: true,
    })
  );
});

it('requires the execution with the event, and the event with a release', () => {
  expect(params?.safeParse({ body: { ...BODY, event_id: 'Ev1' } }).success).toBe(false);
  expect(params?.safeParse({ body: { ...BODY, execution_id: 'exec-1' } }).success).toBe(false);
  expect(params?.safeParse({ body: { ...BODY, release_event: true } }).success).toBe(false);
  expect(
    params?.safeParse({
      body: { ...BODY, event_id: 'Ev1', execution_id: 'exec-1', release_event: true },
    }).success
  ).toBe(true);
});

it.each([
  ['workspace', 129],
  ['channel', 257],
  ['thread_ts', 65],
  ['status_message_ts', 65],
  ['event_id', 257],
  ['execution_id', 257],
])('bounds %s so the thread key and the recorded event fit the thread subject', (field, length) => {
  const body =
    field === 'event_id' || field === 'execution_id'
      ? { ...BODY, event_id: 'Ev1', execution_id: 'exec-1' }
      : BODY;
  expect(params?.safeParse({ body }).success).toBe(true);
  expect(params?.safeParse({ body: { ...body, [field]: 'x'.repeat(length) } }).success).toBe(false);
});

it('returns an empty body for a thread without an investigation', async () => {
  findOrCreateSlackThread.mockResolvedValue(undefined);

  await expect(
    handler({ request: {}, getInvestigationsClient, params: { body: BODY } } as never)
  ).resolves.toEqual({});
});
