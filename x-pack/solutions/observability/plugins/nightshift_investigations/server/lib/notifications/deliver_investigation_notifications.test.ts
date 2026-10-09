/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type {
  GetInvestigationResponse,
  InvestigationNotificationDestination,
} from '../../../common';
import type { NotificationExecution } from './notification_delivery';
import type { NotificationPhase } from './notification_routing';
import { deliverInvestigationNotifications } from './deliver_investigation_notifications';
import { createRoutingTestContext } from './notification_routing.mock';

const destination = {
  type: 'slack',
  connector_id: 'saved-slack',
  params: { channel: '#alerts' },
  automation_id: 'automation-1',
  automation_name: 'CPU alerts',
};
const investigation: GetInvestigationResponse = {
  investigation_id: 'inv-1',
  title: 'CPU saturation',
  status: 'running',
  subject: { type: 'manual', id: 'manual' },
  created_at: '2026-10-07T00:00:00Z',
  summary: 'CPU was saturated',
  recommendations: [{ title: 'Scale the service', confidence: 0.9 }],
};
const setup = (spaceId = 'default') => {
  const context = createRoutingTestContext(spaceId);
  const controller = new AbortController();
  const execute = jest.fn(async (_execution: NotificationExecution) => ({
    actionId: 'saved-slack',
    status: 'ok' as const,
    data: { ts: '1.000001', channel: 'C123' },
  }));
  const getExecute = jest.fn(async () => execute);
  const logger = loggerMock.create();
  const send = (
    phase: NotificationPhase,
    executionId = 'exec-1',
    destinations: InvestigationNotificationDestination[] = [destination]
  ) =>
    deliverInvestigationNotifications({
      investigation,
      executionId,
      workflowId: 'system-nightshift-investigation',
      phase,
      notificationDestinations: destinations,
      reason: 'Agent failed',
      investigationUrl: 'https://kibana.example/app/nightshift',
      routingClient: context.client,
      getExecute,
      signal: controller.signal,
      logger,
    });
  return { ...context, controller, execute, getExecute, logger, send };
};

describe('investigation notification lifecycle', () => {
  it.each(['completed', 'failed'] as const)(
    'posts a started root and a %s reply',
    async (terminalPhase) => {
      const { send, execute, client } = setup();
      expect(await send('started')).toEqual({ sent: 1, failed: 0, unconfirmed: 0 });
      expect(execute.mock.calls[0][0]).toMatchObject({
        actionId: 'saved-slack',
        params: { subActionParams: { channel: '#alerts' } },
      });
      expect(execute.mock.calls[0][0].params.subActionParams).not.toHaveProperty('threadTs');
      expect(await send(terminalPhase)).toEqual({ sent: 1, failed: 0, unconfirmed: 0 });
      expect(execute.mock.calls[1][0]).toMatchObject({
        params: { subActionParams: { channel: 'C123', threadTs: '1.000001' } },
      });
      const routing = await client.get();
      expect(routing?.destinations[0].params).toEqual({ channel: '#alerts' });
      expect(routing?.destinations[0].thread).toEqual({ channel: 'C123', thread_ts: '1.000001' });
      expect(routing?.executions[0].terminal_phase).toBe(terminalPhase);
      expect(routing?.attempts).toHaveLength(2);
    }
  );

  it('later executions reuse the retained thread even without new destination inputs', async () => {
    const { send, execute } = setup();
    await send('started');
    await send('completed');
    await send('started', 'exec-2', []);
    await send('completed', 'exec-2', []);
    expect(execute).toHaveBeenCalledTimes(4);
    for (const [call] of execute.mock.calls.slice(1)) {
      expect(call.params).toMatchObject({
        subActionParams: { channel: 'C123', threadTs: '1.000001' },
      });
    }
  });

  it('preserves an explicitly supplied parent timestamp', async () => {
    const { send, execute, client } = setup();
    const input = { ...destination, params: { channel: '#alerts', thread_ts: '0.000001' } };
    await send('started', 'exec-1', [input]);
    await send('completed', 'exec-1', [input]);
    expect(execute.mock.calls[0][0].params).toMatchObject({
      subActionParams: { threadTs: '0.000001' },
    });
    expect(execute.mock.calls[1][0].params).toMatchObject({
      subActionParams: { threadTs: '0.000001' },
    });
    expect((await client.get())?.destinations[0].thread?.thread_ts).toBe('0.000001');
  });

  it('fans out lifecycle messages and isolates destination connector errors', async () => {
    const { send, execute, client } = setup('ops');
    const inputs = [
      destination,
      { ...destination, connector_id: 'elastic-apps-slack', params: { channel: '#oncall' } },
    ];
    execute.mockResolvedValueOnce({ status: 'error', message: 'not_in_channel' } as never);
    expect(await send('started', 'exec-1', inputs)).toEqual({ sent: 1, failed: 1, unconfirmed: 0 });
    expect(await send('completed', 'exec-1', inputs)).toEqual({
      sent: 1,
      failed: 1,
      unconfirmed: 0,
    });
    expect(execute).toHaveBeenCalledTimes(3);
    expect(execute.mock.calls[1][0].actionId).toBe('elastic-apps-slack');
    expect((await client.get())?.spaceId).toBe('ops');
  });

  it('replay returns persisted counts without invoking Actions again', async () => {
    const { send, execute, getExecute } = setup();
    await send('started');
    await send('completed');
    expect(await send('started')).toEqual({ sent: 1, failed: 0, unconfirmed: 0 });
    expect(await send('completed')).toEqual({ sent: 1, failed: 0, unconfirmed: 0 });
    expect(execute).toHaveBeenCalledTimes(2);
    expect(getExecute).toHaveBeenCalledTimes(2);
  });

  it('a crash after claim blocks recreation and records missing-thread failures', async () => {
    const { send, execute, client } = setup();
    const routing = await client.initialize('exec-1', 'system-nightshift-investigation', [
      destination,
    ]);
    await client.claim('exec-1', routing.destinations[0].id, 'started', 'crashed', true);
    expect(await send('started')).toEqual({ sent: 0, failed: 0, unconfirmed: 1 });
    expect(await send('completed')).toEqual({ sent: 0, failed: 1, unconfirmed: 0 });
    expect(await send('started', 'exec-2')).toEqual({ sent: 0, failed: 1, unconfirmed: 0 });
    expect(execute).not.toHaveBeenCalled();
    expect((await client.get())?.attempts[2].error).toContain('unconfirmed');
  });

  it.each([undefined, '', 'not-a-timestamp', '123', 'x'.repeat(101)])(
    'success without a valid timestamp stays unconfirmed (%s)',
    async (ts) => {
      const { send, execute, client } = setup();
      execute.mockResolvedValue({ status: 'ok', data: { ts, channel: 'C123' } } as never);
      expect(await send('started')).toEqual({ sent: 0, failed: 0, unconfirmed: 1 });
      await send('started', 'exec-2');
      expect(execute).toHaveBeenCalledTimes(1);
      expect((await client.get())?.destinations[0].thread).toBeUndefined();
    }
  );

  it('definitely failed root delivery may try again in a later execution', async () => {
    const { send, execute } = setup();
    execute.mockResolvedValueOnce({ status: 'error', message: 'not_in_channel' } as never);
    expect(await send('started')).toEqual({ sent: 0, failed: 1, unconfirmed: 0 });
    expect(await send('started')).toEqual({ sent: 0, failed: 1, unconfirmed: 0 });
    expect(await send('started', 'exec-2')).toEqual({ sent: 1, failed: 0, unconfirmed: 0 });
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it('connector exceptions remain unconfirmed with bounded diagnostics', async () => {
    const { send, execute, client } = setup();
    execute.mockRejectedValue(new Error('x'.repeat(20000)));
    expect(await send('started')).toEqual({ sent: 0, failed: 0, unconfirmed: 1 });
    expect((await client.get())?.attempts[0].error).toHaveLength(10000);
  });

  it('post success followed by failed result persistence leaves the claim and stops further posts', async () => {
    const { send, execute, client, update, logger } = setup();
    update
      .mockImplementationOnce(async () => {})
      .mockRejectedValueOnce(new Error('attachment unavailable'));
    const inputs = [destination, { ...destination, params: { channel: '#oncall' } }];
    await expect(send('started', 'exec-1', inputs)).rejects.toThrow('attachment unavailable');
    expect(execute).toHaveBeenCalledTimes(1);
    const routing = await client.get();
    expect(routing?.attempts[0].status).toBe('unconfirmed');
    expect(routing?.destinations[0].thread).toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('do not resend'));
    update.mockResolvedValue(undefined);
    expect(await send('started', 'exec-1', inputs)).toEqual({ sent: 1, failed: 0, unconfirmed: 1 });
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it('a failed claim persistence prevents connector invocation', async () => {
    const { send, execute, update } = setup();
    update.mockRejectedValueOnce(new Error('claim failed'));
    await expect(send('started')).rejects.toThrow('claim failed');
    expect(execute).not.toHaveBeenCalled();
  });

  it('records destination preparation failures and continues to other destinations', async () => {
    const { send, execute, client } = setup();
    const inputs = [{ ...destination, type: 'unsupported' }, destination];
    expect(await send('started', 'exec-1', inputs)).toEqual({
      sent: 1,
      failed: 1,
      unconfirmed: 0,
    });
    expect(execute).toHaveBeenCalledTimes(1);
    const routing = await client.get();
    expect(routing?.attempts.map(({ status }) => status)).toEqual(['failed', 'sent']);
    expect(routing?.attempts[0].error).toContain('Unsupported notification type');
  });

  it('Actions setup failure records each failure without posting', async () => {
    const { send, getExecute, execute, client } = setup();
    getExecute.mockRejectedValue(new Error('Actions unavailable'));
    const inputs = [destination, { ...destination, params: { channel: '#oncall' } }];
    expect(await send('started', 'exec-1', inputs)).toEqual({
      sent: 0,
      failed: 2,
      unconfirmed: 0,
    });
    expect(getExecute).toHaveBeenCalledTimes(1);
    expect(execute).not.toHaveBeenCalled();
    expect((await client.get())?.attempts.map(({ error }) => error)).toEqual([
      'Actions unavailable',
      'Actions unavailable',
    ]);
  });

  it('cancellation during Actions setup stops delivery before any claims', async () => {
    const { send, getExecute, controller, execute, client } = setup();
    getExecute.mockImplementationOnce(async () => {
      controller.abort();
      return execute;
    });
    expect(await send('started')).toEqual({ sent: 0, failed: 0, unconfirmed: 0 });
    const routing = await client.get();
    expect(routing?.executions).toHaveLength(1);
    expect(routing?.attempts).toEqual([]);
    expect(execute).not.toHaveBeenCalled();
  });

  it('cancellation before delivery leaves no claim or attachment', async () => {
    const { send, controller, execute, client } = setup();
    controller.abort();
    expect(await send('started')).toEqual({ sent: 0, failed: 0, unconfirmed: 0 });
    expect(await client.get()).toBeUndefined();
    expect(execute).not.toHaveBeenCalled();
  });

  it('cancellation after claiming skips the connector and remains unconfirmed', async () => {
    const { send, controller, execute, client } = setup();
    const claim = client.claim.bind(client);
    jest.spyOn(client, 'claim').mockImplementation(async (...args) => {
      const attempt = await claim(...args);
      controller.abort();
      return attempt;
    });
    expect(await send('started')).toEqual({ sent: 0, failed: 0, unconfirmed: 1 });
    expect(execute).not.toHaveBeenCalled();
  });

  it('cancellation during posting passes the signal and stops later destinations', async () => {
    const { send, controller, execute } = setup();
    execute.mockImplementation(async () => {
      controller.abort();
      return { actionId: 'saved-slack', status: 'ok', data: { ts: '1.2', channel: 'C123' } };
    });
    expect(
      await send('started', 'exec-1', [
        destination,
        { ...destination, params: { channel: '#oncall' } },
      ])
    ).toEqual({ sent: 0, failed: 0, unconfirmed: 1 });
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute.mock.calls[0][0].signal).toBe(controller.signal);
  });

  it('inactive attachments suppress lifecycle delivery', async () => {
    const { send, deactivate, execute } = setup();
    await send('started');
    deactivate();
    expect(await send('completed')).toEqual({ sent: 0, failed: 0, unconfirmed: 0 });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('terminal phases require initialization and cannot contradict an earlier phase', async () => {
    const { send, execute } = setup();
    await expect(send('completed')).rejects.toThrow('not initialized');
    await send('started');
    await send('completed');
    await expect(send('failed')).rejects.toThrow('different terminal phase');
    expect(execute).toHaveBeenCalledTimes(2);
  });
});
