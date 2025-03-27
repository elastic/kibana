/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import { DeleteConfirmModal } from './delete_confirm_modal';
import { createMockStore, mockGlobalState, TestProviders } from '../../common/mock';
import { ReqStatus } from '..';

jest.mock('../store/notes.slice', () => ({
  ...jest.requireActual('../store/notes.slice'),
  deleteNotes: jest.fn(),
  userClosedDeleteModal: jest.fn(),
}));

const mockDeleteNotes = jest.mocked(jest.requireMock('../store/notes.slice').deleteNotes);
const mockUserClosedDeleteModal = jest.mocked(
  jest.requireMock('../store/notes.slice').userClosedDeleteModal
);

describe('DeleteConfirmModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with correct number of notes', () => {
    const store = createMockStore({
      ...mockGlobalState,
      notes: {
        ...mockGlobalState.notes,
        pendingDeleteIds: ['1', '2'],
      },
    });

    const { getByText } = render(
      <TestProviders store={store}>
        <DeleteConfirmModal />
      </TestProviders>
    );

    expect(getByText(/Are you sure you want to delete 2 notes/)).toBeInTheDocument();
  });

  it('dispatches userClosedDeleteModal when cancel is clicked', () => {
    const store = createMockStore({
      ...mockGlobalState,
      notes: {
        ...mockGlobalState.notes,
        pendingDeleteIds: ['1'],
      },
    });

    const { getByTestId } = render(
      <TestProviders store={store}>
        <DeleteConfirmModal />
      </TestProviders>
    );

    fireEvent.click(getByTestId('confirmModalCancelButton'));
    expect(mockUserClosedDeleteModal).toHaveBeenCalled();
  });

  it('dispatches deleteNotes with correct ids and default refetch when confirm is clicked', () => {
    const store = createMockStore({
      ...mockGlobalState,
      notes: {
        ...mockGlobalState.notes,
        pendingDeleteIds: ['1', '2'],
      },
    });

    const { getByTestId } = render(
      <TestProviders store={store}>
        <DeleteConfirmModal />
      </TestProviders>
    );

    fireEvent.click(getByTestId('confirmModalConfirmButton'));
    expect(mockDeleteNotes).toHaveBeenCalledWith({ ids: ['1', '2'], refetch: true });
  });

  it('dispatches deleteNotes with refetch: false when specified', () => {
    const store = createMockStore({
      ...mockGlobalState,
      notes: {
        ...mockGlobalState.notes,
        pendingDeleteIds: ['1', '2'],
      },
    });

    const { getByTestId } = render(
      <TestProviders store={store}>
        <DeleteConfirmModal refetch={false} />
      </TestProviders>
    );

    fireEvent.click(getByTestId('confirmModalConfirmButton'));
    expect(mockDeleteNotes).toHaveBeenCalledWith({ ids: ['1', '2'], refetch: false });
  });

  it('shows loading state when delete is in progress', () => {
    const store = createMockStore({
      ...mockGlobalState,
      notes: {
        ...mockGlobalState.notes,
        status: {
          ...mockGlobalState.notes.status,
          deleteNotes: ReqStatus.Loading,
        },
        pendingDeleteIds: ['1'],
      },
    });

    const { getByTestId } = render(
      <TestProviders store={store}>
        <DeleteConfirmModal />
      </TestProviders>
    );

    const deleteButton = getByTestId('confirmModalConfirmButton');
    expect(deleteButton.closest('button')).toHaveAttribute('disabled');
  });
});
