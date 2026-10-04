/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EngineStatus } from '.';
import { TestProviders } from '@kbn/timelines-plugin/public/mock';
import { EntityType } from '../../../../../../common/entity_analytics/types';

const mockUseEntityStore = jest.fn();
const mockInstallMutate = jest.fn();
jest.mock('../../hooks/use_entity_store', () => ({
  useEntityStoreStatus: () => mockUseEntityStore(),
  useInstallEntityStoreMutation: () => ({
    mutate: mockInstallMutate,
    isLoading: false,
  }),
  useEnableHistorySnapshotMutation: () => ({
    mutate: jest.fn(),
    isLoading: false,
    error: null,
  }),
  useDisableHistorySnapshotMutation: () => ({
    mutate: jest.fn(),
    isLoading: false,
    error: null,
  }),
}));

const mockDownloadBlob = jest.fn();
jest.mock('../../../../../common/utils/download_blob', () => ({
  downloadBlob: () => mockDownloadBlob(),
}));

describe('EngineStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading spinner when data is loading', () => {
    mockUseEntityStore.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    render(<EngineStatus />, {
      wrapper: TestProviders,
    });

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders error state when there is an error', () => {
    mockUseEntityStore.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Error'),
    });

    render(<EngineStatus />, {
      wrapper: TestProviders,
    });

    expect(screen.getByText('There was an error loading the engine status')).toBeInTheDocument();
  });

  it('renders "No engines found" message when there are no engines', () => {
    mockUseEntityStore.mockReturnValue({
      data: { engines: [] },
      isLoading: false,
      error: null,
    });

    render(<EngineStatus />, {
      wrapper: TestProviders,
    });

    expect(screen.getByText('No engines found')).toBeInTheDocument();
  });

  it('renders engine components when data is available', () => {
    const mockData = {
      engines: [
        {
          type: EntityType.user,
          components: [{ id: 'entity_engine_id', installed: true, resource: 'entity_engine' }],
        },
      ],
    };
    mockUseEntityStore.mockReturnValue({ data: mockData, isLoading: false, error: null });

    render(<EngineStatus />, {
      wrapper: TestProviders,
    });

    expect(screen.getByText('User Store')).toBeInTheDocument();
    expect(screen.getByText('Download status')).toBeInTheDocument();
    expect(screen.queryByTestId('history-snapshot-status')).not.toBeInTheDocument();
  });

  it('renders the history snapshot section when snapshot status is available', () => {
    const mockData = {
      engines: [
        {
          type: EntityType.user,
          components: [{ id: 'entity_engine_id', installed: true, resource: 'entity_engine' }],
        },
      ],
      historySnapshot: {
        status: 'started',
        frequency: '24h',
        retentionDays: 60,
        components: [
          {
            id: 'entity_store:v2:history_snapshot_task:default',
            installed: true,
            resource: 'task',
          },
        ],
      },
    };
    mockUseEntityStore.mockReturnValue({ data: mockData, isLoading: false, error: null });

    render(<EngineStatus />, {
      wrapper: TestProviders,
    });

    expect(screen.getByTestId('history-snapshot-status')).toBeInTheDocument();
    expect(screen.getByText('History Snapshot')).toBeInTheDocument();
    expect(screen.getByTestId('history-snapshot-switch')).toBeChecked();
  });

  it('calls downloadJson when download button is clicked', () => {
    const mockData = {
      engines: [
        {
          type: EntityType.user,
          components: [{ id: 'entity_engine_id', installed: true, resource: 'entity_engine' }],
        },
      ],
    };
    mockUseEntityStore.mockReturnValue({ data: mockData, isLoading: false, error: null });

    render(<EngineStatus />, {
      wrapper: TestProviders,
    });

    const downloadButton = screen.getByText('Download status');
    fireEvent.click(downloadButton);

    expect(mockDownloadBlob).toHaveBeenCalled();
  });
});
