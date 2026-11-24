/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { SlackDeliveryStatus } from './slack_delivery_status';

it('refreshes a sending notification and shows the connected channel name and settings link', async () => {
  jest.useFakeTimers();
  const queryClient = new QueryClient();
  try {
    const destination = {
      id: 'slack-ops',
      channel: 'C0OPS',
      attemptedAt: '2026-11-24T10:00:00.000Z',
    };
    const fetch = jest
      .fn()
      .mockResolvedValueOnce({
        deliveries: [{ ...destination, status: 'sending', phase: 'started' }],
      })
      .mockResolvedValueOnce({
        deliveries: [{ ...destination, status: 'sent', phase: 'started' }],
      })
      .mockResolvedValue({
        deliveries: [
          {
            ...destination,
            status: 'failed',
            phase: 'completed',
            reason: 'channel_not_connected',
          },
        ],
      });
    render(
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <SlackDeliveryStatus
            http={
              {
                get: jest.fn().mockResolvedValue({
                  bindings: [{ channel: 'C0OPS', displayName: 'ops' }],
                }),
              } as never
            }
            investigationsClient={{ fetch } as never}
            investigationId="investigation"
            executionId="bound-execution"
            settingsHref="/app/nightshift/settings/general"
          />
        </QueryClientProvider>
      </I18nProvider>
    );
    expect(await screen.findByText('Sending')).toBeInTheDocument();
    expect(await screen.findByText('#ops')).toBeInTheDocument();
    expect(screen.queryByText(/Slack delivery could not be confirmed/)).not.toBeInTheDocument();

    await act(async () => jest.advanceTimersByTime(5_000));

    expect(await screen.findByText('Delivered')).toBeInTheDocument();

    await act(async () => jest.advanceTimersByTime(30_000));

    expect(await screen.findByText('Failed')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Slack settings' })).toHaveAttribute(
      'href',
      '/app/nightshift/settings/general'
    );
  } finally {
    queryClient.clear();
    jest.useRealTimers();
  }
});

it('can refresh unavailable status and gives read-only users an actionable instruction', async () => {
  const queryClient = new QueryClient({ logger: { ...console, error: jest.fn() } });
  const fetch = jest
    .fn()
    .mockRejectedValueOnce(new Error('Internal server error'))
    .mockResolvedValue({
      deliveries: [
        {
          id: 'slack-ops',
          channel: 'C0OPS',
          attemptedAt: '2026-11-24T10:00:00.000Z',
          phase: 'completed',
          status: 'failed',
          reason: 'channel_not_connected',
        },
      ],
    });
  const get = jest.fn().mockResolvedValue({ bindings: [] });
  try {
    render(
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <SlackDeliveryStatus
            http={{ get } as never}
            investigationsClient={{ fetch } as never}
            investigationId="investigation"
          />
        </QueryClientProvider>
      </I18nProvider>
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Refresh status' }));

    expect(await screen.findByText(/Ask a Nightshift admin to connect this channel/)).toBeVisible();
    expect(screen.getByText('C0OPS')).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Open Slack settings' })).not.toBeInTheDocument();
  } finally {
    queryClient.clear();
  }
});
