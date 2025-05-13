/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EngineStatus } from '.';

import { TestProviders } from '@kbn/timelines-plugin/public/mock';
import { mockGlobalState } from '../../../../../common/mock';
import { EntityType } from '../../../../../../common/entity_analytics/types';

const mockUseEntityStore = jest.fn();
jest.mock('../../hooks/use_entity_store', () => ({
  useEntityStoreStatus: () => mockUseEntityStore(),
  useEnableEntityStoreMutation: () => ({
    mutate: jest.fn(),
    isLoading: false,
  }),
}));

const mockDownloadBlob = jest.fn();
jest.mock('../../../../../common/utils/download_blob', () => ({
  downloadBlob: () => mockDownloadBlob(),
}));

const mockedExperimentalFeatures = mockGlobalState.app.enableExperimental;
jest.mock('../../../../../common/hooks/use_experimental_features', () => ({
  useEnableExperimental: () => mockedExperimentalFeatures,
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

    render(<EngineStatus />, { wrapper: TestProviders });

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders error state when there is an error', () => {
    mockUseEntityStore.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Error'),
    });

    render(<EngineStatus />, { wrapper: TestProviders });

    expect(screen.getByText('There was an error loading the engine status')).toBeInTheDocument();
  });

  it('renders "No engines found" message when there are no engines', () => {
    mockUseEntityStore.mockReturnValue({
      data: { engines: [] },
      isLoading: false,
      error: null,
    });

    render(<EngineStatus />, { wrapper: TestProviders });

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

    render(<EngineStatus />, { wrapper: TestProviders });

    expect(screen.getByText('User Store')).toBeInTheDocument();
    expect(screen.getByText('Download status')).toBeInTheDocument();
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

    render(<EngineStatus />, { wrapper: TestProviders });

    const downloadButton = screen.getByText('Download status');
    fireEvent.click(downloadButton);

    expect(mockDownloadBlob).toHaveBeenCalled();
  });
});
