/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { useHuntLibraryDetail } from '../../hooks/use_hunt_library_api';
import { HuntDetailFlyout } from './hunt_detail_flyout';
import { available, makeDetail, unavailable } from './test_fixtures';

jest.mock('../../hooks/use_hunt_library_api');
jest.mock('./hunt_history_section', () => ({
  HuntHistorySection: () => <div data-test-subj="alertZeroHuntFlyoutHistory" />,
}));
jest.mock('./run_in_discover_button', () => ({
  RunInDiscoverButton: () => <button data-test-subj="alertZeroHuntRunInDiscover" />,
}));

const mockDetail = (state: Record<string, unknown>) =>
  jest.mocked(useHuntLibraryDetail).mockReturnValue(state as never);

describe('HuntDetailFlyout', () => {
  it('shows the definition, guidance, data and source', () => {
    mockDetail({ data: makeDetail(), isLoading: false, isError: false });
    render(<HuntDetailFlyout huntId="rare_lsass_process_access" onClose={jest.fn()} />);

    expect(screen.getByRole('heading', { name: 'Rare LSASS Process Access' })).toBeInTheDocument();
    expect(screen.getByTestId('alertZeroHuntFlyoutHypothesis')).toHaveTextContent('LSASS');
    expect(screen.getByTestId('alertZeroHuntRunInDiscover')).toBeInTheDocument();
    expect(screen.getByTestId('alertZeroHuntFlyoutNotes')).toHaveTextContent('Pivot on');
    expect(screen.getByTestId('alertZeroHuntFlyoutFalsePositives')).toHaveTextContent('Backup');
    expect(screen.getByTestId('alertZeroHuntFlyoutPivots')).toHaveTextContent('parent process');
    expect(screen.getByTestId('alertZeroHuntFlyoutIndices')).toHaveTextContent(
      'logs-endpoint.events.api*'
    );
    expect(
      screen.getByText(/hunting\/windows\/queries\/x\.toml at revision abc123/)
    ).toBeInTheDocument();
  });

  it('shows caller and worker availability separately, and every failing check', () => {
    mockDetail({
      data: makeDetail({
        callerAvailability: available(),
        workerAvailability: unavailable(
          [
            { reason: 'unavailable_scope', details: ['logs-endpoint.events.api*'] },
            {
              reason: 'unavailable_mapping',
              details: ['missing:host.id', 'conflict:event.category'],
            },
          ],
          'worker'
        ),
      }),
      isLoading: false,
      isError: false,
    });
    render(<HuntDetailFlyout huntId="rare_lsass_process_access" onClose={jest.fn()} />);

    expect(screen.getByTestId('alertZeroHuntFlyoutCallerAvailabilityBadge')).toHaveTextContent(
      'Available'
    );
    expect(screen.getByTestId('alertZeroHuntFlyoutWorkerAvailabilityBadge')).toHaveTextContent(
      'Outside your data scope'
    );
    expect(
      screen.getByTestId('alertZeroHuntFlyoutWorkerAvailability-unavailable_scope')
    ).toHaveTextContent('logs-endpoint.events.api*');
    const mapping = screen.getByTestId('alertZeroHuntFlyoutWorkerAvailability-unavailable_mapping');
    expect(mapping).toHaveTextContent('Missing field host.id');
    expect(mapping).toHaveTextContent('Field event.category has conflicting types across indices');
  });

  it('explains an unreadable worker role in words', () => {
    mockDetail({
      data: makeDetail({
        workerAvailability: unavailable(
          [{ reason: 'unavailable_scope', details: ['worker_role_unreadable'] }],
          'worker'
        ),
      }),
      isLoading: false,
      isError: false,
    });
    render(<HuntDetailFlyout huntId="rare_lsass_process_access" onClose={jest.fn()} />);

    expect(
      screen.getByTestId('alertZeroHuntFlyoutWorkerAvailability-unavailable_scope')
    ).toHaveTextContent('The worker role could not be read.');
  });

  it('shows an error with a retry when the hunt cannot be loaded', () => {
    const refetch = jest.fn();
    mockDetail({ data: undefined, isLoading: false, isError: true, refetch });
    render(<HuntDetailFlyout huntId="x" onClose={jest.fn()} />);

    fireEvent.click(screen.getByTestId('alertZeroHuntFlyoutRetry'));
    expect(refetch).toHaveBeenCalled();
  });

  it('shows a spinner while loading', () => {
    mockDetail({ data: undefined, isLoading: true, isError: false });
    render(<HuntDetailFlyout huntId="x" onClose={jest.fn()} />);

    expect(screen.getByLabelText('Loading hunt…')).toBeInTheDocument();
  });
});
