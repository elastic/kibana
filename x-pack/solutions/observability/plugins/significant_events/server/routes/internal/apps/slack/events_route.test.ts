/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slackEventsRoute } from './events_route';

const endpoint = 'POST /internal/slack/events' as const;
const { handler, params } = slackEventsRoute[endpoint];
const admitSlackInput = jest
  .fn()
  .mockResolvedValue({ investigation_id: 'inv-1', execution_id: 'exec-1' });
const getBooleanValue = jest.fn().mockResolvedValue(true);
const fetch = jest.fn().mockResolvedValue({});
const checkPrivileges = jest.fn().mockResolvedValue({ hasAllRequested: true });

const server = {
  core: {
    featureFlags: { getBooleanValue },
    http: { selfClient: { asScoped: jest.fn().mockReturnValue({ fetch }) } },
  },
  security: {
    authz: {
      checkPrivilegesDynamicallyWithRequest: jest.fn().mockReturnValue(checkPrivileges),
      actions: { api: { get: (operation: string) => `api:${operation}` } },
    },
  },
  nightshiftInvestigations: {
    getInvestigationsClient: jest.fn().mockReturnValue({ admitSlackInput }),
  },
  relayClient: {
    getAgentBuilderCallbackUrl: jest.fn().mockReturnValue('https://relay.example/v1/events'),
  },
};

const event = {
  token: 'verification-token',
  team_id: 'T-1',
  api_app_id: 'A-1',
  type: 'event_callback' as const,
  event_id: 'Ev-1',
  event_time: 1_789_600_000,
  event: {
    type: 'app_mention',
    user: 'U-1',
    text: '<@UBOT> why did checkout fail?',
    channel: 'C-1',
    ts: '123.457',
    thread_ts: '123.456',
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  getBooleanValue.mockResolvedValue(true);
  checkPrivileges.mockResolvedValue({ hasAllRequested: true });
});

it('only requires Agent Builder read on the route, so read-only keys keep the Agent Builder path', () => {
  expect(slackEventsRoute[endpoint].security).toEqual({
    authz: { requiredPrivileges: ['agentBuilder:read'] },
  });
});

it('rejects a Nightshift admission from a key without Agent Builder write', async () => {
  checkPrivileges.mockResolvedValue({ hasAllRequested: false });
  const body = params.shape.body.parse(event);

  await expect(handler({ request: {}, params: { body }, server } as never)).rejects.toMatchObject({
    output: { statusCode: 403 },
  });
  expect(checkPrivileges).toHaveBeenCalledWith({ kibana: ['api:agentBuilder:write'] });
  expect(admitSlackInput).not.toHaveBeenCalled();
});

it('handles an unsupported event as a successful no-op', async () => {
  await expect(
    handler({
      request: {},
      params: {
        body: {
          ...event,
          event: { ...event.event, type: 'message', thread_ts: undefined },
        },
      },
      server,
    } as never)
  ).resolves.toEqual({});
  expect(admitSlackInput).not.toHaveBeenCalled();
});

it('admits an app mention without exposing its disposition to Relay', async () => {
  const body = params.shape.body.parse(event);
  await expect(handler({ request: {}, params: { body }, server } as never)).resolves.toEqual({});
  expect(admitSlackInput).toHaveBeenCalledWith({
    sourceKey: 'slack_thread:T-1:C-1:123.456',
    idempotencyKey: 'slack_message:T-1:C-1:123.457',
    message: 'why did checkout fail?',
    senderId: 'U-1',
    startIfMissing: true,
    replyTarget: {
      surface: 'slack',
      tenant_key: 'T-1',
      channel: 'C-1',
      thread_ts: '123.456',
    },
  });
});

it('admits a human thread reply only as a follow-up', async () => {
  const body = params.shape.body.parse({
    ...event,
    event_id: 'Ev-2',
    event: {
      ...event.event,
      type: 'message',
      text: 'Was the deploy involved?',
    },
  });

  await expect(handler({ request: {}, params: { body }, server } as never)).resolves.toEqual({});
  expect(admitSlackInput).toHaveBeenCalledWith(
    expect.objectContaining({
      idempotencyKey: 'slack_message:T-1:C-1:123.457',
      message: 'Was the deploy involved?',
      startIfMissing: false,
    })
  );
});

it('admits a threaded mention once, though Slack delivers it twice', async () => {
  // Slack reports a mention inside a thread as both `app_mention` and `message`, under two
  // different event ids. Keying on the message identifies them as one message.
  const asMention = params.shape.body.parse(event);
  const asMessage = params.shape.body.parse({
    ...event,
    event_id: 'Ev-2',
    event: { ...event.event, type: 'message' },
  });

  await handler({ request: {}, params: { body: asMention }, server } as never);
  await handler({ request: {}, params: { body: asMessage }, server } as never);

  const keys = admitSlackInput.mock.calls.map(([{ idempotencyKey }]) => idempotencyKey);
  expect(keys).toEqual(['slack_message:T-1:C-1:123.457', 'slack_message:T-1:C-1:123.457']);
});

it('ignores a message that carries no timestamp to key admission on', async () => {
  await expect(
    handler({
      request: {},
      params: { body: { ...event, event: { ...event.event, ts: undefined } } },
      server,
    } as never)
  ).resolves.toEqual({});
  expect(admitSlackInput).not.toHaveBeenCalled();
});

it('ignores bot and edited messages', async () => {
  for (const ignoredEvent of [
    { ...event.event, bot_id: 'B-1' },
    { ...event.event, subtype: 'message_changed' },
  ]) {
    await expect(
      handler({ request: {}, params: { body: { ...event, event: ignoredEvent } }, server } as never)
    ).resolves.toEqual({});
  }
  expect(admitSlackInput).not.toHaveBeenCalled();
});

it('uses the Kibana-controlled Agent Builder path when Nightshift is disabled', async () => {
  getBooleanValue.mockResolvedValue(false);
  const body = params.shape.body.parse(event);

  await expect(handler({ request: {}, params: { body }, server } as never)).resolves.toEqual({});

  expect(admitSlackInput).not.toHaveBeenCalled();
  expect(checkPrivileges).not.toHaveBeenCalled();
  expect(fetch).toHaveBeenCalledWith('/internal/agent_builder/converse/callback', {
    method: 'POST',
    version: '1',
    access: 'internal',
    body: {
      input: 'why did checkout fail?',
      agent_id: 'elastic-ai-agent',
      execution_idempotency_key: 'Ev-1',
      origin: {
        type: 'slack',
        external_conversation_id: 'slack:T-1:C-1:123.456',
        author: { id: 'U-1' },
      },
      callback: { url: 'https://relay.example/v1/events' },
      access_control: { access_mode: 'public' },
    },
  });
});
