/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type {
  InvestigationNotification,
  InvestigationNotificationDestination,
  InvestigationNotificationOutcome,
} from '../../../common';
import { InvalidNotificationDestinationError } from '../../client/errors';
import { deliverInvestigationNotifications } from './deliver_investigation_notifications';

const destination = (
  overrides: Partial<InvestigationNotificationDestination> = {}
): InvestigationNotificationDestination => ({
  type: 'slack',
  connector_id: 'elastic-apps-slack',
  params: { channel: '#alerts' },
  automation_id: 'auto-1',
  automation_name: 'Prod alerts',
  ...overrides,
});

const investigation = (
  notificationDestinations: InvestigationNotificationDestination[],
  status = 'completed' as const
) => ({
  investigation_id: 'inv-1',
  title: 'Checkout latency spike',
  status,
  severity: '60-high' as const,
  summary: 'Latency rose after a deploy.',
  notificationDestinations,
  notifications: [] as InvestigationNotification[],
});

const ok = {
  status: 'ok' as const,
  actionId: 'elastic-apps-slack',
  data: { ok: true, ts: '1759190400.000100' },
};

describe('deliverInvestigationNotifications', () => {
  const logger = loggerMock.create();
  const setup = (
    notificationDestinations: InvestigationNotificationDestination[] = [destination()]
  ) => {
    const record = investigation(structuredClone(notificationDestinations));
    const client = {
      get: jest.fn().mockImplementation(async () => record),
      claimNotificationDestination: jest
        .fn()
        .mockImplementation(async (_id: string, index: number, attemptId: string) => {
          if (record.notifications.some(({ destination_index }) => destination_index === index))
            return undefined;
          const claim = {
            destination_index: index,
            status: 'unconfirmed' as const,
            attempt_id: attemptId,
            attempted_at: new Date().toISOString(),
          };
          record.notifications.push(claim);
          return claim;
        }),
      recordNotificationOutcome: jest
        .fn()
        .mockImplementation(
          async (
            _id: string,
            destinationIndex: number,
            attemptId: string,
            outcome: InvestigationNotificationOutcome
          ) => {
            const notificationIndex = record.notifications.findIndex(
              ({ destination_index, attempt_id }) =>
                destination_index === destinationIndex && attempt_id === attemptId
            );
            record.notifications[notificationIndex] = {
              ...record.notifications[notificationIndex],
              ...outcome,
            };
          }
        ),
    };
    const execute = jest.fn().mockResolvedValue(ok);
    const getExecute = jest.fn().mockResolvedValue(execute);
    const controller = new AbortController();
    const deliver = () =>
      deliverInvestigationNotifications({
        investigation: record,
        investigationUrl: 'https://kibana.example.com/s/ops/app/r?l=investigation',
        getExecute,
        client: client as never,
        signal: controller.signal,
        logger,
      });
    return { record, client, execute, getExecute, controller, deliver };
  };

  beforeEach(() => jest.clearAllMocks());

  it.each([
    destination({ type: 'unsupported', params: {} }),
    destination({ params: {} }),
    destination({ params: { channel: '' } }),
    destination({ params: { channel: '#alerts', status: 'sent' } }),
  ])(
    'rejects invalid destination params before any claim or post (%j)',
    async (notificationDestination) => {
      const { record, client, execute, deliver } = setup([notificationDestination]);
      await expect(deliver()).rejects.toThrow(InvalidNotificationDestinationError);
      expect(client.claimNotificationDestination).not.toHaveBeenCalled();
      expect(execute).not.toHaveBeenCalled();
      expect(record.notifications).toEqual([]);
    }
  );

  it('claims before posting, passes cancellation, and persists each result immediately', async () => {
    const { record, client, execute, controller, deliver } = setup([
      destination(),
      destination({ params: { channel: '#oncall', thread_ts: '1.1' } }),
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
        text: expect.stringContaining('https://kibana.example.com/s/ops/app/r?l=investigation'),
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

  it('sends an unattempted destination when another destination was attempted first', async () => {
    const { record, execute, deliver } = setup([
      destination(),
      destination({ params: { channel: '#oncall' } }),
    ]);
    const priorAttempt: InvestigationNotification = {
      destination_index: 1,
      status: 'unconfirmed',
      attempt_id: 'prior-attempt',
      attempted_at: '2026-10-02T00:00:00.000Z',
    };
    record.notifications.push(priorAttempt);

    await expect(deliver()).resolves.toEqual({ sent: 1, failed: 0, unconfirmed: 1 });
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute.mock.calls[0][0].params.subActionParams.channel).toBe('#alerts');
    expect(record.notifications).toEqual([
      priorAttempt,
      expect.objectContaining({ destination_index: 0, status: 'sent', message_ts: ok.data.ts }),
    ]);
  });

  it('counts existing and new unconfirmed attempts without re-reading the investigation', async () => {
    const { record, client, execute, getExecute, deliver } = setup([
      destination(),
      destination(),
      destination(),
    ]);
    record.notifications = [
      {
        destination_index: 0,
        status: 'unconfirmed',
        attempt_id: 'prior-attempt',
        attempted_at: '2026-10-02T00:00:00.000Z',
      },
    ];
    execute.mockResolvedValueOnce({ ...ok, data: {} });

    await expect(deliver()).resolves.toEqual({ sent: 1, failed: 0, unconfirmed: 2 });
    expect(client.get).not.toHaveBeenCalled();
    expect(getExecute).toHaveBeenCalledTimes(1);
    expect(getExecute.mock.invocationCallOrder[0]).toBeLessThan(
      client.claimNotificationDestination.mock.invocationCallOrder[0]
    );
  });

  it('stops before claiming if cancelled during Actions setup', async () => {
    const { controller, client, execute, getExecute, deliver } = setup();
    getExecute.mockImplementation(async () => {
      controller.abort();
      return execute;
    });

    await expect(deliver()).resolves.toEqual({ sent: 0, failed: 0, unconfirmed: 0 });
    expect(client.claimNotificationDestination).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
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
      expect(record.notifications[0].error).toContain('message ID');
    }
  );

  it('keeps exceptions unconfirmed with bounded diagnostics', async () => {
    const { record, execute, deliver } = setup();
    execute.mockRejectedValue(new Error('x'.repeat(20000)));
    await expect(deliver()).resolves.toEqual({ sent: 0, failed: 0, unconfirmed: 1 });
    expect(record.notifications[0].error).toHaveLength(10000);
  });

  it('never replays sent, failed, or unconfirmed attempts and leaves destinations unchanged', async () => {
    const notificationDestinations = [destination(), destination(), destination()];
    const { record, client, execute, deliver } = setup(notificationDestinations);
    record.notifications = (['sent', 'failed', 'unconfirmed'] as const).map(
      (status, destination_index) => ({
        status,
        destination_index,
        attempt_id: `attempt-${destination_index}`,
        attempted_at: '2026-10-02T00:00:00.000Z',
      })
    );
    const originalNotifications = structuredClone(record.notifications);
    await expect(deliver()).resolves.toEqual({ sent: 0, failed: 0, unconfirmed: 1 });
    expect(client.claimNotificationDestination).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
    expect(record.notifications).toEqual(originalNotifications);
    expect(record.notificationDestinations).toEqual(notificationDestinations);
  });

  it('retains a crash-after-claim marker and skips it on replay', async () => {
    const { client, execute, deliver } = setup();
    await client.claimNotificationDestination('inv-1', 0, 'crashed-attempt');
    await expect(deliver()).resolves.toEqual({ sent: 0, failed: 0, unconfirmed: 1 });
    expect(execute).not.toHaveBeenCalled();
  });

  it('stops after successful post/result-write failure and skips that attempt on replay', async () => {
    const { record, client, execute, deliver } = setup([
      destination(),
      destination({ params: { channel: '#oncall' } }),
    ]);
    client.recordNotificationOutcome.mockRejectedValueOnce(new Error('storage unavailable'));
    await expect(deliver()).rejects.toThrow('storage unavailable');
    expect(execute).toHaveBeenCalledTimes(1);
    expect(record.notifications[0].status).toBe('unconfirmed');
    expect(record.notifications).toHaveLength(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(record.notifications[0].attempt_id ?? '')
    );
    await expect(deliver()).resolves.toEqual({ sent: 1, failed: 0, unconfirmed: 1 });
    expect(execute).toHaveBeenCalledTimes(2);
    expect(execute.mock.calls[1][0].params.subActionParams.channel).toBe('#oncall');
  });

  it('stops before posting when claim persistence fails', async () => {
    const { client, execute, deliver } = setup([destination(), destination()]);
    client.claimNotificationDestination.mockRejectedValueOnce(new Error('storage unavailable'));
    await expect(deliver()).rejects.toThrow('storage unavailable');
    expect(execute).not.toHaveBeenCalled();
    expect(client.claimNotificationDestination).toHaveBeenCalledTimes(1);
  });

  it('skips a persisted claim while its connector execution is still in progress', async () => {
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
    expect(client.claimNotificationDestination).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });

  it('records cancellation after a claim without invoking the connector', async () => {
    const { controller, client, record, execute, deliver } = setup();
    const claim =
      client.claimNotificationDestination.getMockImplementation() ??
      (() => Promise.resolve(undefined));
    client.claimNotificationDestination.mockImplementation(async (...args) => {
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
    expect(record.notifications).toHaveLength(1);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('returns early for a running investigation', async () => {
    const { record, client, execute, getExecute, controller } = setup();
    await expect(
      deliverInvestigationNotifications({
        investigation: { ...record, status: 'running' },
        investigationUrl: '',
        getExecute,
        client: client as never,
        signal: controller.signal,
        logger,
      })
    ).resolves.toEqual({ sent: 0, failed: 0, unconfirmed: 0 });
    expect(client.get).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });
});
