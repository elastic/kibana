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

it('requires the execution handling an event, and an event to release', () => {
  const parse = (body: object) => params?.safeParse({ body: { ...BODY, ...body } }).success;
  expect(parse({ event_id: 'Ev1' })).toBe(false);
  expect(parse({ execution_id: 'exec-1' })).toBe(false);
  expect(parse({ release_event: true })).toBe(false);
  expect(parse({ event_id: 'Ev1', execution_id: 'exec-1' })).toBe(true);
  expect(parse({ event_id: 'Ev1', execution_id: 'exec-1', release_event: true })).toBe(true);
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
        body: { ...BODY, status_message_ts: '1700.0002', event_id: 'Ev1', execution_id: 'exec-1' },
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

it('returns an empty body for a thread without an investigation', async () => {
  findOrCreateSlackThread.mockResolvedValue(undefined);

  await expect(
    handler({ request: {}, getInvestigationsClient, params: { body: BODY } } as never)
  ).resolves.toEqual({});
});
