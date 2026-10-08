/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { notificationRoutingSchema } from './notification_routing';
import { mergeNotificationDestinations } from './notification_routing_client';
import { createRoutingTestContext } from './notification_routing.mock';

const destination = {
  type: 'slack',
  connector_id: 'c',
  params: { channel: '#alerts', thread_ts: '1.2' },
  automation_id: 'a',
  automation_name: 'Alerts',
};

describe('notification routing attachments', () => {
  it('deduplicates canonical endpoints while retaining all automation associations', () => {
    const inputs = [
      destination,
      { ...destination, params: { thread_ts: '1.2', channel: '#alerts' }, automation_id: 'b' },
      { ...destination, automation_name: 'Updated' },
    ];
    const merged = mergeNotificationDestinations([], inputs);
    expect(merged).toHaveLength(1);
    expect(merged[0].automations.map(({ id }) => id)).toEqual(['a', 'b']);
    expect(merged[0].params).toEqual(destination.params);
    expect(mergeNotificationDestinations([], inputs.reverse())[0].id).toBe(merged[0].id);
  });

  it('counts anonymous endpoints once and enforces 20 retained associations', () => {
    const anonymous = { ...destination, automation_id: undefined };
    expect(mergeNotificationDestinations([], [anonymous, anonymous])[0].automations).toHaveLength(
      1
    );
    const inputs = Array.from({ length: 20 }, (_, index) => ({
      ...destination,
      automation_id: `a${index}`,
    }));
    const merged = mergeNotificationDestinations([], inputs);
    expect(merged[0].automations).toHaveLength(20);
    expect(() => mergeNotificationDestinations(merged, [anonymous])).toThrow(
      '20 notification associations'
    );
  });

  it('freezes participants on initialization and adds queued destinations only when their execution starts', async () => {
    const { client } = createRoutingTestContext();
    const first = await client.initialize('exec-1', 'workflow', [destination]);
    const next = { ...destination, params: { channel: '#oncall' } };
    const replay = await client.initialize('exec-1', 'workflow', [next]);
    expect(replay.destinations).toEqual(first.destinations);
    const second = await client.initialize('exec-2', 'workflow', [next]);
    expect(second.executions[0].destination_ids).toHaveLength(1);
    expect(second.executions[1].destination_ids).toHaveLength(2);
    expect(second.destinations).toHaveLength(2);
  });

  it('uses factory stale-write handling to preserve concurrent claims and unrelated attempts', async () => {
    const { client } = createRoutingTestContext();
    const routing = await client.initialize('exec-1', 'workflow', [
      destination,
      { ...destination, params: { channel: '#other' } },
    ]);
    const claims = await Promise.all(
      routing.destinations.map(({ id }, index) =>
        client.claim('exec-1', id, 'started', `attempt-${index}`, false)
      )
    );
    expect(claims.filter(Boolean)).toHaveLength(2);
    await Promise.all(
      claims.map((claim) =>
        client.record(claim?.attempt_id ?? '', { status: 'failed', error: 'connector failed' })
      )
    );
    expect((await client.get())?.attempts.map(({ status }) => status)).toEqual([
      'failed',
      'failed',
    ]);
  });

  it('only one concurrent caller owns a destination phase claim', async () => {
    const { client } = createRoutingTestContext();
    const routing = await client.initialize('exec-1', 'workflow', [destination]);
    const claims = await Promise.all(
      ['a', 'b'].map((id) =>
        client.claim('exec-1', routing.destinations[0].id, 'started', id, false)
      )
    );
    expect(claims.filter(Boolean)).toHaveLength(1);
    expect((await client.get())?.attempts).toHaveLength(1);
  });

  it('retains more than 20 executions and attempts', async () => {
    const { client } = createRoutingTestContext();
    for (let index = 0; index < 21; index++) {
      const routing = await client.initialize(`exec-${index}`, 'workflow', [destination]);
      await client.claim(
        `exec-${index}`,
        routing.destinations[0].id,
        'started',
        `attempt-${index}`,
        false
      );
    }
    const routing = await client.get();
    expect(routing?.attempts).toHaveLength(21);
    expect(routing?.executions).toHaveLength(21);
    expect(notificationRoutingSchema.safeParse(routing).success).toBe(true);
  });

  it('clears obsolete fields when finalizing and rejects unmatched attempt IDs', async () => {
    const { client } = createRoutingTestContext();
    const routing = await client.initialize('exec-1', 'workflow', [destination]);
    await client.claim('exec-1', routing.destinations[0].id, 'started', 'a', false);
    await client.record('a', { status: 'unconfirmed', error: 'uncertain' });
    await client.record('a', { status: 'sent', message_ts: '2.3', channel: 'C123' });
    expect((await client.get())?.attempts[0].error).toBeUndefined();
    await expect(client.record('other', { status: 'failed' })).rejects.toThrow('disappeared');
  });

  it('writes a hidden readonly attachment and only exposes a short agent summary', async () => {
    const { client, create, service } = createRoutingTestContext();
    await client.initialize('exec-1', 'workflow', [destination]);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ hidden: true, type: 'nightshift.notification_routing' })
    );
    const type = (
      await import('./notification_routing')
    ).notificationRoutingAttachment.createAttachmentType({
      getService: () => service,
      assertCanRead: async () => {},
      assertCanReadConversation: async () => {},
      logger: { warn: jest.fn() } as never,
    });
    expect(type.isReadonly).toBe(true);
    const document = await client.get();
    const formatted = await type.format({ data: document } as never, {} as never);
    const text = formatted.getRepresentation?.();
    expect(text).toEqual({
      type: 'text',
      value: 'The investigation workflow manages lifecycle notifications to 1 destination(s).',
    });
  });
});
