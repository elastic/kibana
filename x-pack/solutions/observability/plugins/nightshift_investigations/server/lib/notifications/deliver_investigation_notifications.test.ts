/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { InvestigationNotification, InvestigationNotificationOutcome } from '../../../common';
import {
  buildInvestigationUrl,
  deliverInvestigationNotifications,
} from './deliver_investigation_notifications';

const destination = (
  overrides: Partial<InvestigationNotification> = {}
): InvestigationNotification => ({
  type: 'slack',
  connector_id: 'elastic-apps-slack',
  channel: '#alerts',
  automation_id: 'auto-1',
  automation_name: 'Prod alerts',
  ...overrides,
});

const investigation = (
  notifications: InvestigationNotification[],
  status = 'completed' as const
) => ({
  investigation_id: 'inv-1',
  title: 'Checkout latency spike',
  status,
  severity: '60-high' as const,
  summary: 'Latency rose after a deploy.',
  notifications,
});

const ok = {
  status: 'ok' as const,
  actionId: 'elastic-apps-slack',
  data: { ok: true, ts: '1759190400.000100' },
};

describe('buildInvestigationUrl', () => {
  it('omits the space prefix for the default space', () => {
    expect(buildInvestigationUrl('https://kibana.example.com/', 'default', 'inv-1')).toBe(
      'https://kibana.example.com/app/nightshift?investigationId=inv-1'
    );
  });

  it('prefixes a non-default space and encodes the id', () => {
    expect(buildInvestigationUrl('https://kibana.example.com', 'team a', 'inv/1')).toBe(
      'https://kibana.example.com/s/team%20a/app/nightshift?investigationId=inv%2F1'
    );
  });
});

describe('deliverInvestigationNotifications', () => {
  const logger = loggerMock.create();
  const setup = (notifications: InvestigationNotification[] = [destination()]) => {
    const record = investigation(structuredClone(notifications));
    const client = {
      get: jest.fn().mockImplementation(async () => record),
      claimNotification: jest
        .fn()
        .mockImplementation(async (_id: string, index: number, attemptId: string) => {
          const notification = record.notifications[index];
          if (notification.status !== undefined) return undefined;
          const claim = {
            ...notification,
            status: 'unconfirmed' as const,
            attempt_id: attemptId,
            attempted_at: new Date().toISOString(),
          };
          record.notifications[index] = claim;
          return claim;
        }),
      recordNotificationOutcome: jest
        .fn()
        .mockImplementation(
          async (
            _id: string,
            index: number,
            _attemptId: string,
            outcome: InvestigationNotificationOutcome
          ) => {
            record.notifications[index] = { ...record.notifications[index], ...outcome };
          }
        ),
    };
    const execute = jest.fn().mockResolvedValue(ok);
    const controller = new AbortController();
    const deliver = () =>
      deliverInvestigationNotifications({
        investigation: record,
        kibanaUrl: 'https://kibana.example.com',
        spaceId: 'ops',
        execute,
        client: client as never,
        signal: controller.signal,
        logger,
      });
    return { record, client, execute, controller, deliver };
  };

  beforeEach(() => jest.clearAllMocks());

  it('claims before posting, passes cancellation, and persists each result immediately', async () => {
    const { record, client, execute, controller, deliver } = setup([
      destination(),
      destination({ channel: '#oncall', thread_ts: '1.1' }),
    ]);
    execute.mockImplementation(async () => {
      const index = execute.mock.calls.length - 1;
      expect(record.notifications[index]).toEqual(
        expect.objectContaining({
          status: 'unconfirmed',
          attempt_id: expect.any(String),
          attempted_at: expect.any(String),
        })
      );
      if (index === 1) expect(record.notifications[0].status).toBe('sent');
      return ok;
    });
    await expect(deliver()).resolves.toEqual({ sent: 2, failed: 0, unconfirmed: 0 });
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        signal: controller.signal,
        params: expect.objectContaining({ subAction: 'sendMessage' }),
      })
    );
    expect(execute.mock.calls[1][0].params.subActionParams).toEqual(
      expect.objectContaining({
        channel: '#oncall',
        threadTs: '1.1',
        text: expect.stringContaining('/s/ops/app/nightshift'),
      })
    );
    expect(client.recordNotificationOutcome).toHaveBeenCalledWith(
      'inv-1',
      0,
      record.notifications[0].attempt_id,
      expect.objectContaining({
        status: 'sent',
        message_ts: ok.data.ts,
        sent_at: expect.any(String),
      })
    );
  });

  it('persists connector error responses as failed', async () => {
    const { record, execute, deliver } = setup();
    execute.mockResolvedValue({
      status: 'error',
      actionId: 'x',
      serviceMessage: 'channel unavailable',
    });
    await expect(deliver()).resolves.toEqual({ sent: 0, failed: 1, unconfirmed: 0 });
    expect(record.notifications[0]).toEqual(
      expect.objectContaining({ status: 'failed', error: 'channel unavailable' })
    );
  });

  it.each([undefined, '', ' ', 'x'.repeat(101)])(
    'keeps success without a valid timestamp unconfirmed (%s)',
    async (ts) => {
      const { record, execute, deliver } = setup();
      execute.mockResolvedValue({ ...ok, data: { ts } });
      await expect(deliver()).resolves.toEqual({ sent: 0, failed: 0, unconfirmed: 1 });
      expect(record.notifications[0].error).toContain('timestamp');
    }
  );

  it('keeps exceptions unconfirmed with bounded diagnostics', async () => {
    const { record, execute, deliver } = setup();
    execute.mockRejectedValue(new Error('x'.repeat(20000)));
    await expect(deliver()).resolves.toEqual({ sent: 0, failed: 0, unconfirmed: 1 });
    expect(record.notifications[0].error).toHaveLength(10000);
  });

  it('never replays sent, failed, or unconfirmed destinations', async () => {
    const notifications = ['sent', 'failed', 'unconfirmed'].map((status) =>
      destination({ status: status as InvestigationNotification['status'] })
    );
    const { record, client, execute, deliver } = setup(notifications);
    await expect(deliver()).resolves.toEqual({ sent: 0, failed: 0, unconfirmed: 1 });
    expect(client.claimNotification).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
    expect(record.notifications).toEqual(notifications);
  });

  it('retains a crash-after-claim marker and skips it on replay', async () => {
    const { client, execute, deliver } = setup();
    await client.claimNotification('inv-1', 0, 'crashed-attempt');
    await expect(deliver()).resolves.toEqual({ sent: 0, failed: 0, unconfirmed: 1 });
    expect(execute).not.toHaveBeenCalled();
  });

  it('stops after successful post/result-write failure and skips that attempt on replay', async () => {
    const { record, client, execute, deliver } = setup([
      destination(),
      destination({ channel: '#oncall' }),
    ]);
    client.recordNotificationOutcome.mockRejectedValueOnce(new Error('storage unavailable'));
    await expect(deliver()).rejects.toThrow('storage unavailable');
    expect(execute).toHaveBeenCalledTimes(1);
    expect(record.notifications[0].status).toBe('unconfirmed');
    expect(record.notifications[1].status).toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(record.notifications[0].attempt_id ?? '')
    );
    await expect(deliver()).resolves.toEqual({ sent: 1, failed: 0, unconfirmed: 1 });
    expect(execute).toHaveBeenCalledTimes(2);
    expect(execute.mock.calls[1][0].params.subActionParams.channel).toBe('#oncall');
  });

  it('stops before posting when claim persistence fails', async () => {
    const { client, execute, deliver } = setup([destination(), destination()]);
    client.claimNotification.mockRejectedValueOnce(new Error('storage unavailable'));
    await expect(deliver()).rejects.toThrow('storage unavailable');
    expect(execute).not.toHaveBeenCalled();
    expect(client.claimNotification).toHaveBeenCalledTimes(1);
  });

  it('concurrent deliveries post once and count unresolved claims', async () => {
    const { execute, deliver } = setup();
    let finish: (value: typeof ok) => void = () => {};
    execute.mockImplementation(
      () =>
        new Promise<typeof ok>((resolve) => {
          finish = resolve;
        })
    );
    const first = deliver();
    await Promise.resolve();
    await expect(deliver()).resolves.toEqual({ sent: 0, failed: 0, unconfirmed: 1 });
    finish(ok);
    await expect(first).resolves.toEqual({ sent: 1, failed: 0, unconfirmed: 0 });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('does not claim when already cancelled', async () => {
    const { controller, client, execute, deliver } = setup();
    controller.abort();
    await expect(deliver()).resolves.toEqual({ sent: 0, failed: 0, unconfirmed: 0 });
    expect(client.claimNotification).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });

  it('records cancellation after a claim without invoking the connector', async () => {
    const { controller, client, record, execute, deliver } = setup();
    const claim =
      client.claimNotification.getMockImplementation() ?? (() => Promise.resolve(undefined));
    client.claimNotification.mockImplementation(async (...args) => {
      const result = await claim(...args);
      controller.abort();
      return result;
    });
    await expect(deliver()).resolves.toEqual({ sent: 0, failed: 0, unconfirmed: 1 });
    expect(record.notifications[0].error).toContain('Cancelled before');
    expect(execute).not.toHaveBeenCalled();
  });

  it('keeps cancellation during execution unconfirmed and stops later destinations', async () => {
    const { controller, record, execute, deliver } = setup([destination(), destination()]);
    execute.mockImplementation(async () => {
      controller.abort();
      return ok;
    });
    await expect(deliver()).resolves.toEqual({ sent: 0, failed: 0, unconfirmed: 1 });
    expect(record.notifications[0].error).toContain('Cancelled during');
    expect(record.notifications[1].status).toBeUndefined();
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('returns early for a running investigation', async () => {
    const { record, client, execute, controller } = setup();
    await expect(
      deliverInvestigationNotifications({
        investigation: { ...record, status: 'running' },
        kibanaUrl: '',
        spaceId: 'ops',
        execute,
        client: client as never,
        signal: controller.signal,
        logger,
      })
    ).resolves.toEqual({ sent: 0, failed: 0, unconfirmed: 0 });
    expect(client.get).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });
});
