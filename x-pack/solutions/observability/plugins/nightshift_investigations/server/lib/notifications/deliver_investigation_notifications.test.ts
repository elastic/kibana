/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { InvestigationNotification } from '../../../common';
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
  const deliver = (
    notifications: InvestigationNotification[],
    execute: jest.Mock,
    status: 'completed' | 'failed' | 'cancelled' | 'running' = 'completed'
  ) =>
    deliverInvestigationNotifications({
      investigation: investigation(notifications, status as 'completed'),
      kibanaUrl: 'https://kibana.example.com',
      spaceId: 'default',
      execute,
      logger,
    });

  beforeEach(() => jest.clearAllMocks());

  it('posts to each pending destination and records the Slack message timestamp', async () => {
    const execute = jest.fn().mockResolvedValue(ok);

    const result = await deliver(
      [destination(), destination({ channel: '#oncall', thread_ts: '1759190000.000001' })],
      execute
    );

    expect(execute).toHaveBeenCalledTimes(2);
    expect(execute).toHaveBeenNthCalledWith(1, {
      actionId: 'elastic-apps-slack',
      params: {
        subAction: 'sendMessage',
        subActionParams: {
          channel: '#alerts',
          text: expect.stringContaining(
            '<https://kibana.example.com/app/nightshift?investigationId=inv-1|Open the investigation in Kibana>'
          ),
        },
      },
    });
    expect(execute.mock.calls[1][0].params.subActionParams).toEqual(
      expect.objectContaining({ channel: '#oncall', threadTs: '1759190000.000001' })
    );
    expect(result.sent).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.notifications[0]).toEqual(
      expect.objectContaining({ status: 'sent', message_ts: '1759190400.000100' })
    );
    expect(result.notifications[0].sent_at).toEqual(expect.any(String));
  });

  it('records a connector error result without throwing', async () => {
    const execute = jest.fn().mockResolvedValue({
      status: 'error',
      actionId: 'elastic-apps-slack',
      message: 'error posting slack message',
      serviceMessage: 'Channel #alerts is not connected to this deployment',
    });

    const result = await deliver([destination()], execute);

    expect(result).toEqual(
      expect.objectContaining({
        sent: 0,
        failed: 1,
        notifications: [
          expect.objectContaining({
            status: 'failed',
            error: 'Channel #alerts is not connected to this deployment',
          }),
        ],
      })
    );
    expect(result.notifications[0]).not.toHaveProperty('sent_at');
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('not connected'));
  });

  it('records a thrown error (missing connector, no privilege) as a failed delivery', async () => {
    const execute = jest.fn().mockRejectedValue(new Error('Saved object [action/x] not found'));

    const result = await deliver([destination({ connector_id: 'x' })], execute);

    expect(result.failed).toBe(1);
    expect(result.notifications[0]).toEqual(
      expect.objectContaining({ status: 'failed', error: 'Saved object [action/x] not found' })
    );
  });

  it('leaves already-sent destinations untouched so a re-run posts nothing twice', async () => {
    const execute = jest.fn().mockResolvedValue(ok);
    const sent = destination({
      status: 'sent',
      message_ts: '1.1',
      sent_at: '2026-09-30T00:00:00Z',
    });

    const result = await deliver([sent, destination({ channel: '#oncall' })], execute);

    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute.mock.calls[0][0].params.subActionParams.channel).toBe('#oncall');
    expect(result.notifications[0]).toEqual(sent);
    expect(result.sent).toBe(1);
  });

  it('retries a previously failed destination', async () => {
    const execute = jest.fn().mockResolvedValue(ok);

    const result = await deliver(
      [destination({ status: 'failed', error: 'rate limited' })],
      execute
    );

    expect(execute).toHaveBeenCalledTimes(1);
    expect(result.notifications[0]).toEqual(
      expect.objectContaining({ status: 'sent', message_ts: '1759190400.000100' })
    );
  });

  it('does nothing for an investigation that has not settled', async () => {
    const execute = jest.fn();

    const result = await deliver([destination()], execute, 'running');

    expect(execute).not.toHaveBeenCalled();
    expect(result).toEqual({ notifications: [destination()], sent: 0, failed: 0 });
  });

  it('posts the failure wording for a failed investigation', async () => {
    const execute = jest.fn().mockResolvedValue(ok);

    await deliver([destination()], execute, 'failed');

    expect(execute.mock.calls[0][0].params.subActionParams.text).toContain('Investigation failed');
  });
});
