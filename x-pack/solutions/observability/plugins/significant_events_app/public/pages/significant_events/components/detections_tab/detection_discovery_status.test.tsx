/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { DetectionDiscoveryStatus } from './detection_discovery_status';

const renderStatus = (
  detection: React.ComponentProps<typeof DetectionDiscoveryStatus>['detection']
) =>
  render(
    <I18nProvider>
      <DetectionDiscoveryStatus detection={detection} />
    </I18nProvider>
  );

describe('DetectionDiscoveryStatus', () => {
  it('shows Pending for an unprocessed detection', () => {
    renderStatus({ processed: false });

    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('shows Processed for a processed detection the classifier did not skip', () => {
    renderStatus({ processed: true });

    expect(screen.getByText('Processed')).toBeInTheDocument();
    expect(screen.queryByText('Skipped')).not.toBeInTheDocument();
  });

  it('shows Skipped instead of Processed, with the reason on hover', async () => {
    renderStatus({
      processed: true,
      skip: {
        reason: 'still_breaching',
        probe_has_rows: true,
        probe_window_minutes: 20,
        checked_at: '2026-10-19T09:56:14.743Z',
      },
    });

    expect(screen.getByText('Skipped')).toBeInTheDocument();
    expect(screen.queryByText('Processed')).not.toBeInTheDocument();

    await userEvent.hover(screen.getByTestId('significantEventsAppDetectionSkippedBadge'));

    expect(await screen.findByText(/The rule still matches \(last 20 min\)/)).toBeInTheDocument();
    expect(screen.getByText(/Checked/)).toBeInTheDocument();
  });
});
