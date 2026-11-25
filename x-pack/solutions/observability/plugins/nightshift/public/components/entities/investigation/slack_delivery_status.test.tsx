/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { RELAY_APP_BINDINGS_QUERY_KEY } from '../../../data/relay_apps/use_relay_app_bindings';
import { SlackDeliveryStatus } from './slack_delivery_status';

it('keeps channel names across delivery states and updates the guidance after reconnecting', async () => {
  jest.useFakeTimers();
  const queryClient = new QueryClient();
  try {
    const destination = {
      id: 'slack-ops',
      channel: 'C0OPS',
      attemptedAt: '2026-11-24T10:00:00.000Z',
    };
    const review = { ...destination, id: 'slack-review', channel: 'C08REVIEW01' };
    const fetch = jest
      .fn()
      .mockResolvedValueOnce({ deliveries: [] })
      .mockResolvedValueOnce({
        deliveries: [
          { ...destination, status: 'sending', phase: 'started' },
          { ...review, status: 'sending', phase: 'started' },
        ],
      })
      .mockResolvedValueOnce({
        deliveries: [
          { ...destination, status: 'sent', phase: 'started' },
          { ...review, status: 'failed', phase: 'completed', reason: 'thread_missing' },
        ],
      })
      .mockResolvedValue({
        deliveries: [
          { ...destination, status: 'sent', phase: 'completed' },
          {
            ...review,
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
                get: jest.fn((path: string) =>
                  Promise.resolve(
                    path.endsWith('/bindings')
                      ? { bindings: [{ channel: 'C0OPS', displayName: 'ops' }] }
                      : { channels: [{ channel: review.channel, displayName: 'review' }] }
                  )
                ),
              } as never
            }
            investigationsClient={{ fetch } as never}
            investigationId="investigation"
            executionId="bound-execution"
            firstReceiptPollUntil={Date.now() + 30_000}
            settingsHref="/app/nightshift/settings/general"
          />
        </QueryClientProvider>
      </I18nProvider>
    );
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
    expect(screen.queryByTestId('nightshiftSlackDeliveryStatus')).not.toBeInTheDocument();

    await act(async () => jest.advanceTimersByTime(5_000));

    expect(await screen.findAllByText('Sending')).toHaveLength(2);
    expect(await screen.findByText('#ops')).toBeInTheDocument();
    expect(await screen.findByText('#review')).toBeInTheDocument();
    expect(screen.queryByText(/Slack delivery could not be confirmed/)).not.toBeInTheDocument();

    await act(async () => jest.advanceTimersByTime(5_000));

    expect(await screen.findByText('Delivered')).toBeInTheDocument();
    expect(screen.getByText('#review')).toBeVisible();

    await act(async () => jest.advanceTimersByTime(30_000));

    expect(await screen.findByText('Failed')).toBeInTheDocument();
    expect(await screen.findByText('#review')).toBeVisible();
    expect(await screen.findByRole('link', { name: 'Open Slack settings' })).toHaveAttribute(
      'href',
      '/app/nightshift/settings/general'
    );

    act(() => {
      queryClient.setQueryData([...RELAY_APP_BINDINGS_QUERY_KEY, 'all'], {
        bindings: [
          { channel: 'C0OPS', displayName: 'ops' },
          { channel: review.channel, displayName: 'review' },
        ],
        isComplete: true,
      });
    });

    expect(
      await screen.findByText('This channel was not connected when delivery was attempted.')
    ).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Open Slack settings' })).not.toBeInTheDocument();
  } finally {
    queryClient.clear();
    jest.useRealTimers();
  }
});

it.each(['an HTTP error', 'an invalid response'])(
  'can refresh from %s and gives read-only users an actionable instruction',
  async (failure) => {
    const queryClient = new QueryClient({ logger: { ...console, error: jest.fn() } });
    const fetch = jest.fn();
    if (failure === 'an HTTP error') {
      fetch.mockRejectedValueOnce(
        Object.assign(new Error('Internal connector details'), {
          request: {},
          response: { status: 500 },
        })
      );
    } else {
      fetch.mockResolvedValueOnce({});
    }
    fetch.mockResolvedValue({
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

      const refresh = await screen.findByRole('button', { name: 'Refresh status' });
      if (failure === 'an HTTP error') {
        expect(screen.getByText('Slack delivery status is unavailable (HTTP 500).')).toBeVisible();
        expect(screen.queryByText('Internal connector details')).not.toBeInTheDocument();
      }
      fireEvent.click(refresh);

      expect(
        await screen.findByText(/Ask a nightshift admin to connect this channel/)
      ).toBeVisible();
      expect(screen.getByText('C0OPS')).toBeVisible();
      expect(screen.queryByRole('link', { name: 'Open Slack settings' })).not.toBeInTheDocument();
      expect(get).toHaveBeenCalledTimes(1);
      expect(get.mock.calls[0][0]).toMatch(/\/bindings$/);
    } finally {
      queryClient.clear();
    }
  }
);
