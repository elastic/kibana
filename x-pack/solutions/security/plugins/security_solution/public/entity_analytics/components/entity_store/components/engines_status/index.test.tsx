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
const mockInstallEngineMutate = jest.fn();
jest.mock('../../hooks/use_entity_store', () => ({
  useEntityStoreStatus: () => mockUseEntityStore(),
  useInstallEntityEngineMutation: () => ({
    mutate: mockInstallEngineMutate,
    isLoading: false,
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
  });

  it('lists all built-in engines even when some are missing', () => {
    mockUseEntityStore.mockReturnValue({
      data: {
        engines: [
          {
            type: EntityType.user,
            components: [{ id: 'entity_engine_id', installed: true, resource: 'entity_engine' }],
          },
        ],
      },
      isLoading: false,
      error: null,
    });

    render(<EngineStatus />, {
      wrapper: TestProviders,
    });

    expect(screen.getByText('User Store')).toBeInTheDocument();
    expect(screen.getByText('Host Store')).toBeInTheDocument();
    expect(screen.getByText('Service Store')).toBeInTheDocument();
    expect(screen.getByText('Generic Store')).toBeInTheDocument();
    expect(screen.getAllByText('Install')).toHaveLength(3);
  });

  it('installs a missing engine by type from its row', () => {
    mockUseEntityStore.mockReturnValue({
      data: {
        engines: [
          {
            type: EntityType.user,
            components: [{ id: 'entity_engine_id', installed: true, resource: 'entity_engine' }],
          },
        ],
      },
      isLoading: false,
      error: null,
    });

    render(<EngineStatus />, {
      wrapper: TestProviders,
    });

    const serviceHeading = screen.getByText('Service Store').closest('h4');
    fireEvent.click(serviceHeading!.querySelector('button')!);

    expect(mockInstallEngineMutate).toHaveBeenCalledWith(EntityType.service);
    expect(mockInstallEngineMutate).toHaveBeenCalledTimes(1);
  });

  it('repairs only the selected existing engine', () => {
    mockUseEntityStore.mockReturnValue({
      data: {
        engines: [
          {
            type: EntityType.host,
            components: [{ id: 'entity_engine_id', installed: false, resource: 'entity_engine' }],
          },
          {
            type: EntityType.user,
            components: [{ id: 'entity_engine_id', installed: true, resource: 'entity_engine' }],
          },
        ],
      },
      isLoading: false,
      error: null,
    });

    render(<EngineStatus />, {
      wrapper: TestProviders,
    });

    fireEvent.click(screen.getByText('Reinstall'));

    expect(mockInstallEngineMutate).toHaveBeenCalledWith(EntityType.host);
    expect(mockInstallEngineMutate).toHaveBeenCalledTimes(1);
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
