/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NOTIFICATIONS_REQUESTER_ID } from '@kbn/actions-plugin/server';
import { sendRumReportEmailTest } from './send_rum_report_email';

describe('sendRumReportEmailTest', () => {
  it('sends a short markdown email with a PDF via the notifications requester', async () => {
    const execute = jest.fn().mockResolvedValue({ status: 'ok' });
    await sendRumReportEmailTest({
      actions: {
        getUnsecuredActionsClient: () => ({ execute }),
      } as never,
      connectorId: 'rum-mailpit',
      spaceId: 'default',
      to: ['ops@example.com'],
    });

    expect(execute).toHaveBeenCalledTimes(1);
    const [call] = execute.mock.calls;
    expect(call[0].requesterId).toBe(NOTIFICATIONS_REQUESTER_ID);
    expect(call[0].id).toBe('rum-mailpit');
    expect(call[0].params.to).toEqual(['ops@example.com']);
    expect(call[0].params.subject).toBe('UX report email test');
    expect(call[0].params.message).toContain('connector test');
    expect(call[0].params.attachments[0]).toEqual(
      expect.objectContaining({
        contentType: 'application/pdf',
        filename: 'ux-report-test.pdf',
        encoding: 'base64',
      })
    );
    expect(call[0].params.attachments[0].content.length).toBeGreaterThan(0);
  });

  it('throws when the connector returns an error', async () => {
    await expect(
      sendRumReportEmailTest({
        actions: {
          getUnsecuredActionsClient: () => ({
            execute: jest.fn().mockResolvedValue({ status: 'error', message: 'smtp down' }),
          }),
        } as never,
        connectorId: 'rum-mailpit',
        spaceId: 'default',
        to: ['ops@example.com'],
      })
    ).rejects.toThrow('smtp down');
  });
});
