/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateIndexModal } from './create_index_modal';
import { TestProviders } from '../../../../common/mock';

const mockCreatePrivMonImportIndex = jest.fn().mockResolvedValue({});
jest.mock('../../../api/api', () => ({
  useEntityAnalyticsRoutes: () => ({
    createPrivMonImportIndex: mockCreatePrivMonImportIndex,
  }),
}));

const onCloseMock = jest.fn();
const onCreateMock = jest.fn();

describe('CreateIndexModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal with form fields and buttons', () => {
    render(<CreateIndexModal onClose={onCloseMock} onCreate={onCreateMock} />, {
      wrapper: TestProviders,
    });

    expect(screen.getByTestId('createIndexModalIndexName')).toBeInTheDocument();
    expect(screen.getByTestId('createIndexModalIndexMode')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByTestId('createIndexModalCreateButton')).toBeInTheDocument();
  });

  it('disables create button when index name is empty', () => {
    render(<CreateIndexModal onClose={onCloseMock} onCreate={onCreateMock} />, {
      wrapper: TestProviders,
    });

    const createButton = screen.getByTestId('createIndexModalCreateButton');
    expect(createButton).toBeDisabled();
  });

  it('enables create button when index name is not empty', () => {
    render(<CreateIndexModal onClose={onCloseMock} onCreate={onCreateMock} />, {
      wrapper: TestProviders,
    });

    const input = screen.getByTestId('createIndexModalIndexName');
    fireEvent.change(input, { target: { value: 'my-index' } });

    const createButton = screen.getByTestId('createIndexModalCreateButton');
    expect(createButton).not.toBeDisabled();
  });

  it('calls onClose when cancel button is clicked', () => {
    render(<CreateIndexModal onClose={onCloseMock} onCreate={onCreateMock} />, {
      wrapper: TestProviders,
    });

    fireEvent.click(screen.getByText('Cancel'));
    expect(onCloseMock).toHaveBeenCalled();
  });

  it('calls onCreate and createPrivMonImportIndex with trimmed index name', async () => {
    render(<CreateIndexModal onClose={onCloseMock} onCreate={onCreateMock} />, {
      wrapper: TestProviders,
    });

    const input = screen.getByTestId('createIndexModalIndexName');
    fireEvent.change(input, { target: { value: '  my-index  ' } });

    const createButton = screen.getByTestId('createIndexModalCreateButton');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockCreatePrivMonImportIndex).toHaveBeenCalledWith({
        name: 'my-index',
        mode: 'standard',
      });
      expect(onCreateMock).toHaveBeenCalledWith('my-index');
    });
  });

  it('shows error callout if createPrivMonImportIndex throws', async () => {
    const errorMsg = 'Something went wrong';
    mockCreatePrivMonImportIndex.mockRejectedValue({
      body: { message: errorMsg },
    });

    render(<CreateIndexModal onClose={onCloseMock} onCreate={onCreateMock} />, {
      wrapper: TestProviders,
    });

    const input = screen.getByTestId('createIndexModalIndexName');
    fireEvent.change(input, { target: { value: 'index' } });

    const createButton = screen.getByTestId('createIndexModalCreateButton');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText(`Error creating index: ${errorMsg}`)).toBeInTheDocument();
    });
    expect(onCreateMock).not.toHaveBeenCalled();
  });

  it('changes index mode when select is changed', () => {
    render(<CreateIndexModal onClose={onCloseMock} onCreate={onCreateMock} />, {
      wrapper: TestProviders,
    });

    const select = screen.getByTestId('createIndexModalIndexMode');
    fireEvent.change(select, { target: { value: 'lookup' } });
    expect((select as HTMLSelectElement).value).toBe('lookup');
  });
});
