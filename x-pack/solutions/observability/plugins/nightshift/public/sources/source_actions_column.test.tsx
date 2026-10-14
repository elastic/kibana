/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import { SignificantEventsWorkflowStatus } from '@kbn/significant-events-schema';
import { SourceActionsColumn } from './source_actions_column';

const SOURCE: NightshiftSource = {
  id: 'source-1',
  title: 'Nginx errors',
  tags: [],
  esql: 'FROM logs-nginx-*',
  type: 'logs',
  slug: 'nginx-errors',
  view_name: '$.nightshift.sources.default.nginx-errors',
  enabled: true,
  created_by: 'marco',
  created_at: '2026-09-01T00:00:00.000Z',
  updated_at: '2026-09-01T00:00:00.000Z',
  esql_updated_at: '2026-09-01T00:00:00.000Z',
};

const renderActions = (
  overrides: Partial<React.ComponentProps<typeof SourceActionsColumn>> = {}
) => {
  const props = {
    source: SOURCE,
    blocksActivity: false,
    isOnboardPending: false,
    onboardTooltip: 'Onboard source',
    onOnboard: jest.fn(),
    onStopOnboarding: jest.fn(),
    onDelete: jest.fn(),
    ...overrides,
  };
  const view = render(<SourceActionsColumn {...props} />);
  return { ...view, props };
};

describe('SourceActionsColumn', () => {
  it('disables onboard while a schedule is pending', () => {
    renderActions({ isOnboardPending: true });

    expect(screen.getByTestId('significantEventsAppSourcesTableOnboardButton')).toBeDisabled();
  });

  it('disables stop from the click and brings it back when cancel fails', async () => {
    let rejectCancel: (error: Error) => void = () => undefined;
    const onStopOnboarding = jest.fn(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectCancel = reject;
        })
    );
    renderActions({
      onboardingStatus: SignificantEventsWorkflowStatus.InProgress,
      onStopOnboarding,
    });

    const stopButton = screen.getByTestId('significantEventsAppSourcesTableStopButton');
    fireEvent.click(stopButton);

    expect(onStopOnboarding).toHaveBeenCalledTimes(1);
    expect(stopButton).toBeDisabled();

    rejectCancel(new Error('cancel failed'));

    await waitFor(() => {
      expect(stopButton).toBeEnabled();
    });
  });

  it('keeps stop disabled after a successful cancel until the run leaves in progress', async () => {
    const onStopOnboarding = jest.fn().mockResolvedValue(undefined);
    const { rerender, props } = renderActions({
      onboardingStatus: SignificantEventsWorkflowStatus.InProgress,
      onStopOnboarding,
    });

    fireEvent.click(screen.getByTestId('significantEventsAppSourcesTableStopButton'));

    await waitFor(() => {
      expect(onStopOnboarding).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByTestId('significantEventsAppSourcesTableStopButton')).toBeDisabled();

    rerender(
      <SourceActionsColumn {...props} onboardingStatus={SignificantEventsWorkflowStatus.Canceled} />
    );

    expect(
      screen.queryByTestId('significantEventsAppSourcesTableStopButton')
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('significantEventsAppSourcesTableOnboardButton')).toBeEnabled();

    rerender(
      <SourceActionsColumn
        {...props}
        onboardingStatus={SignificantEventsWorkflowStatus.InProgress}
      />
    );

    expect(screen.getByTestId('significantEventsAppSourcesTableStopButton')).toBeEnabled();
  });
});
