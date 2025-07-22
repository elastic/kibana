/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IndexSelectorModal } from './select_index_modal';
import { TestProviders } from '../../../../common/mock';

const mockUpdatePrivMonMonitoredIndices = jest.fn().mockImplementation(() => Promise.resolve({}));
const mockRegisterPrivMonMonitoredIndices = jest.fn().mockImplementation(() => Promise.resolve({}));
jest.mock('../../../api/api', () => ({
  useEntityAnalyticsRoutes: () => ({
    updatePrivMonMonitoredIndices: () => mockUpdatePrivMonMonitoredIndices(),
    registerPrivMonMonitoredIndices: () => mockRegisterPrivMonMonitoredIndices(),
  }),
}));

jest.mock('../../../../common/hooks/use_app_toasts', () => ({
  useAppToasts: () => ({
    addError: jest.fn(),
  }),
}));

const mockUseFetchPrivilegedUserIndices = jest.fn().mockReturnValue({
  data: ['index1', 'index2'],
  isFetching: false,
  error: null,
});

jest.mock('../hooks/use_fetch_privileged_user_indices', () => ({
  useFetchPrivilegedUserIndices: () => mockUseFetchPrivilegedUserIndices(),
}));

describe('IndexSelectorModal', () => {
  const onCloseMock = jest.fn();
  const onImportMock = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the modal when isOpen is true', () => {
    render(<IndexSelectorModal onClose={onCloseMock} onImport={onImportMock} />, {
      wrapper: TestProviders,
    });

    expect(screen.getByText('Select index')).toBeInTheDocument();
  });

  it('calls onClose when the cancel button is clicked', () => {
    render(<IndexSelectorModal onClose={onCloseMock} onImport={onImportMock} />, {
      wrapper: TestProviders,
    });

    fireEvent.click(screen.getByText('Cancel'));

    expect(onCloseMock).toHaveBeenCalled();
  });

  it('displays the indices in the combo box', () => {
    render(<IndexSelectorModal onClose={onCloseMock} onImport={onImportMock} />, {
      wrapper: TestProviders,
    });

    fireEvent.click(screen.getByPlaceholderText('Select index'));

    expect(screen.getByText('index1')).toBeInTheDocument();
    expect(screen.getByText('index2')).toBeInTheDocument();
  });

  it('shows an error callout when there is an error', () => {
    mockUseFetchPrivilegedUserIndices.mockReturnValue({
      data: undefined,
      isFetching: false,
      error: new Error('Test error'),
    });

    render(<IndexSelectorModal onClose={onCloseMock} onImport={onImportMock} />, {
      wrapper: TestProviders,
    });

    expect(screen.getByText('Error loading indices. Please try again later.')).toBeInTheDocument();
  });

  it('displays a loading state when fetching indices', () => {
    mockUseFetchPrivilegedUserIndices.mockReturnValue({
      data: null,
      isFetching: true,
      error: null,
    });

    render(<IndexSelectorModal onClose={onCloseMock} onImport={onImportMock} />, {
      wrapper: TestProviders,
    });

    expect(screen.queryByLabelText('Select index')).toBeInTheDocument();
  });

  it('pre-selects indices when editDataSource is provided', () => {
    render(
      <IndexSelectorModal
        onClose={onCloseMock}
        onImport={onImportMock}
        editDataSource={{ id: '123', indexPattern: 'index1,index2' }}
      />,
      { wrapper: TestProviders }
    );

    // The selected options should be visible in the combo box
    expect(screen.getByText('index1')).toBeInTheDocument();
    expect(screen.getByText('index2')).toBeInTheDocument();
  });

  it('calls updatePrivMonMonitoredIndices and onImport when editing and clicking add', async () => {
    render(
      <IndexSelectorModal
        onClose={onCloseMock}
        onImport={onImportMock}
        editDataSource={{ id: 'edit-id', indexPattern: 'index1' }}
      />,
      { wrapper: TestProviders }
    );

    // Add button should be enabled since index1 is preselected
    fireEvent.click(screen.getByText('Add privileged users'));

    waitFor(() => {
      expect(mockUpdatePrivMonMonitoredIndices).toHaveBeenCalledWith('edit-id', 'index1');
      expect(onImportMock).toHaveBeenCalledWith(0);
    });
  });
});
