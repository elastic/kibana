/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { GetEntityStoreStatusResponse } from '@kbn/entity-store/common';
import { TestProviders } from '../../../../../../common/mock';
import { HistorySnapshotStatus } from './history_snapshot_status';

const enableMutate = jest.fn();
const disableMutate = jest.fn();

jest.mock('../../../hooks/use_entity_store', () => ({
  useEnableHistorySnapshotMutation: () => ({
    mutate: enableMutate,
    isLoading: false,
    error: null,
  }),
  useDisableHistorySnapshotMutation: () => ({
    mutate: disableMutate,
    isLoading: false,
    error: null,
  }),
}));

const mockGetUrlForApp = jest.fn(() => 'mockedUrl');

jest.mock('../../../../../../common/lib/kibana', () => ({
  useKibana: jest.fn().mockReturnValue({
    services: {
      application: {
        getUrlForApp: () => mockGetUrlForApp(),
        navigateToApp: jest.fn(),
      },
    },
  }),
  useToasts: () => ({
    addError: jest.fn(),
    addSuccess: jest.fn(),
    addWarning: jest.fn(),
    addInfo: jest.fn(),
    remove: jest.fn(),
  }),
}));

type HistorySnapshot = NonNullable<GetEntityStoreStatusResponse['historySnapshot']>;

const startedSnapshot: HistorySnapshot = {
  status: 'started',
  frequency: '24h',
  retentionDays: 60,
  components: [
    {
      id: 'entities_v2_history_default_index_template',
      installed: true,
      resource: 'index_template',
    },
    {
      id: '.entities.v2.history.default.2026-10-01-14',
      installed: true,
      resource: 'index',
    },
    {
      id: 'entity_store:v2:history_snapshot_task:default',
      installed: true,
      resource: 'task',
    },
  ],
};

describe('HistorySnapshotStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders snapshot resources and an enabled toggle', () => {
    render(<HistorySnapshotStatus historySnapshot={startedSnapshot} />, { wrapper: TestProviders });

    expect(screen.getByText('History Snapshot')).toBeInTheDocument();
    expect(screen.getByText('Index Template')).toBeInTheDocument();
    expect(screen.getByText('Index')).toBeInTheDocument();
    expect(screen.getByText('Task')).toBeInTheDocument();
    expect(screen.getByTestId('history-snapshot-switch')).toBeChecked();
  });

  it('disables the snapshot task when the toggle is turned off', () => {
    render(<HistorySnapshotStatus historySnapshot={startedSnapshot} />, { wrapper: TestProviders });

    fireEvent.click(screen.getByTestId('history-snapshot-switch'));

    expect(disableMutate).toHaveBeenCalledTimes(1);
    expect(enableMutate).not.toHaveBeenCalled();
  });

  it('enables the snapshot task when the toggle is turned on', () => {
    render(<HistorySnapshotStatus historySnapshot={{ ...startedSnapshot, status: 'stopped' }} />, {
      wrapper: TestProviders,
    });

    expect(screen.getByTestId('history-snapshot-switch')).not.toBeChecked();

    fireEvent.click(screen.getByTestId('history-snapshot-switch'));

    expect(enableMutate).toHaveBeenCalledTimes(1);
    expect(disableMutate).not.toHaveBeenCalled();
  });

  it('shows the last snapshot error on the task row', () => {
    render(
      <HistorySnapshotStatus
        historySnapshot={{
          ...startedSnapshot,
          lastError: { message: 'reindex failed' },
        }}
      />,
      { wrapper: TestProviders }
    );

    fireEvent.click(screen.getByLabelText('Expand'));

    expect(screen.getByText('Last error')).toBeInTheDocument();
    expect(screen.getByText('reindex failed')).toBeInTheDocument();
  });
});
