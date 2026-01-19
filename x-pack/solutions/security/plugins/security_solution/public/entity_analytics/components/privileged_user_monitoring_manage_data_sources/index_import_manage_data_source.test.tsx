/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IndexImportManageDataSource } from './index_import_manage_data_source';
import { TestProviders } from '../../../common/mock';

const mockUseFetchMonitoredIndices = jest.fn().mockImplementation(() => ({
  data: { sources: [] },
  isFetching: false,
  refetch: jest.fn(),
}));

jest.mock('../privileged_user_monitoring_onboarding/hooks/use_fetch_monitored_indices', () => ({
  useFetchMonitoredIndices: () => mockUseFetchMonitoredIndices(),
}));

jest.mock('../../api/api', () => ({
  useEntityAnalyticsRoutes: () => ({
    updatePrivMonMonitoredIndices: jest.fn(),
    registerPrivMonMonitoredIndices: jest.fn(),
  }),
}));

describe('IndexImportManageDataSource', () => {
  const setAddDataSourceResult = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders indices header and info text', () => {
    render(<IndexImportManageDataSource setAddDataSourceResult={setAddDataSourceResult} />, {
      wrapper: TestProviders,
    });

    expect(screen.getByText(/Select one or more indices containing the/i)).toBeInTheDocument();
  });

  it('shows "No indices added" when there are no indices', () => {
    render(<IndexImportManageDataSource setAddDataSourceResult={setAddDataSourceResult} />, {
      wrapper: TestProviders,
    });
    expect(screen.getByText(/No indices added/i)).toBeInTheDocument();
  });

  it('shows loading spinner when isFetching is true', () => {
    mockUseFetchMonitoredIndices.mockImplementation(() => ({
      data: { sources: [] },
      isFetching: true,
      refetch: jest.fn(),
    }));

    render(<IndexImportManageDataSource setAddDataSourceResult={setAddDataSourceResult} />, {
      wrapper: TestProviders,
    });
    expect(screen.getByTestId('loading-indices-spinner')).toBeInTheDocument();
  });

  it('shows number of indices when indices exist', () => {
    mockUseFetchMonitoredIndices.mockImplementation(() => ({
      data: { sources: [{ indexPattern: 'foo,bar,baz' }] },
      isFetching: false,
      refetch: jest.fn(),
    }));

    render(<IndexImportManageDataSource setAddDataSourceResult={setAddDataSourceResult} />, {
      wrapper: TestProviders,
    });
    expect(screen.getByText(/3 indices added/i)).toBeInTheDocument();
  });

  it('opens and closes the index selector modal', () => {
    render(<IndexImportManageDataSource setAddDataSourceResult={setAddDataSourceResult} />, {
      wrapper: TestProviders,
    });
    fireEvent.click(screen.getByText(/Select index/i));
    expect(screen.getByTestId('index-selector-modal')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByTestId('index-selector-modal')).not.toBeInTheDocument();
  });

  it('calls setAddDataSourceResult and refetch on import', async () => {
    const refetch = jest.fn();

    mockUseFetchMonitoredIndices.mockImplementation(() => ({
      data: { sources: [{ indexPattern: 'foo,bar,baz' }] },
      isFetching: false,
      refetch,
    }));

    render(<IndexImportManageDataSource setAddDataSourceResult={setAddDataSourceResult} />, {
      wrapper: TestProviders,
    });
    fireEvent.click(screen.getByText(/Select index/i));
    fireEvent.click(screen.getByText('Update privileged users'));
    await waitFor(() => {
      expect(setAddDataSourceResult).toHaveBeenCalledWith({ successful: true, userCount: 0 });
      expect(refetch).toHaveBeenCalled();
    });
  });
});
