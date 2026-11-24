/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { SlackDeliveryStatus } from './slack_delivery_status';

it('refreshes an open run after its start notification has been delivered', async () => {
  jest.useFakeTimers();
  const queryClient = new QueryClient();
  try {
    const destination = {
      id: 'slack-ops',
      channel: '#ops',
      attemptedAt: '2026-11-24T10:00:00.000Z',
    };
    const fetch = jest
      .fn()
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
            investigationsClient={{ fetch } as never}
            investigationId="investigation"
            executionId="bound-execution"
            settingsHref="/app/nightshift/settings/general"
          />
        </QueryClientProvider>
      </I18nProvider>
    );
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
