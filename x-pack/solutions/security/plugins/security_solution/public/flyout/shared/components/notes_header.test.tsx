/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { createMockStore, mockGlobalState, TestProviders } from '../../../common/mock';
import { FETCH_NOTES_ERROR, NotesHeader } from './notes_header';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { getEmptyValue } from '../../../common/components/empty_value';
import { ReqStatus } from '../../../notes';
import type { Note } from '../../../../common/api/timeline';

jest.mock('../../../common/components/user_privileges');

const mockOnOpenNotesTab = jest.fn();
const mockAddError = jest.fn();

jest.mock('../../../common/hooks/use_app_toasts', () => ({
  useAppToasts: () => ({
    addError: mockAddError,
  }),
}));

const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');
  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});

const testIds = {
  title: 'notesHeaderTitle',
  addNoteButton: 'notesHeaderAddNoteButton',
  viewNotesButton: 'notesHeaderViewNotesButton',
  addNoteIconButton: 'notesHeaderAddNoteIconButton',
  count: 'notesHeaderCount',
  loading: 'notesHeaderLoading',
};

const defaultProps = {
  documentId: 'doc-1',
  onOpenNotesTab: mockOnOpenNotesTab,
  testIds,
};

const renderNotesHeader = (
  props: Partial<Parameters<typeof NotesHeader>[0]> = {},
  storeState?: Parameters<typeof createMockStore>[0]
) => {
  const store = storeState ? createMockStore(storeState) : createMockStore(mockGlobalState);
  return render(
    <TestProviders store={store}>
      <NotesHeader {...defaultProps} {...props} />
    </TestProviders>
  );
};

describe('NotesHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useUserPrivileges as jest.Mock).mockReturnValue({
      notesPrivileges: { crud: true, read: true },
    });
  });

  it('renders the Notes title', () => {
    const { getByTestId } = renderNotesHeader();
    expect(getByTestId(testIds.title)).toBeInTheDocument();
    expect(getByTestId(testIds.title)).toHaveTextContent('Notes');
  });

  it('dispatches fetch when not disabled and user can read', () => {
    renderNotesHeader();
    expect(mockDispatch).toHaveBeenCalled();
  });

  it('shows loading spinner when fetch status is Loading', () => {
    const storeState = {
      ...mockGlobalState,
      notes: {
        ...mockGlobalState.notes,
        status: {
          ...mockGlobalState.notes.status,
          fetchNotesByDocumentIds: ReqStatus.Loading,
        },
      },
    };
    const { getByTestId } = renderNotesHeader({}, storeState);
    expect(getByTestId(testIds.loading)).toBeInTheDocument();
  });

  it('shows Add note button when no notes and user has crud', () => {
    const { getByTestId } = renderNotesHeader();
    const button = getByTestId(testIds.addNoteButton);
    expect(button).toBeInTheDocument();
    button.click();
    expect(mockOnOpenNotesTab).toHaveBeenCalled();
  });

  it('shows count and add icon when notes exist', () => {
    const createMockNote = (noteId: string): Note => ({
      eventId: 'doc-1',
      noteId,
      note: 'note-1',
      timelineId: 'timeline-1',
      created: 1663882629000,
      createdBy: 'elastic',
      updated: 1663882629000,
      updatedBy: 'elastic',
      version: 'version',
    });
    const storeState = {
      ...mockGlobalState,
      notes: {
        ...mockGlobalState.notes,
        entities: { 'note-1': createMockNote('note-1') },
        ids: ['note-1'],
      },
    };
    const { getByTestId } = renderNotesHeader({ documentId: 'doc-1' }, storeState);
    expect(getByTestId(testIds.count)).toBeInTheDocument();
    expect(getByTestId(testIds.count)).toHaveTextContent('1');
    const iconButton = getByTestId(testIds.addNoteIconButton);
    iconButton.click();
    expect(mockOnOpenNotesTab).toHaveBeenCalled();
  });

  it('shows dash when disabled and does not dispatch fetch', () => {
    const { getByText, queryByTestId } = renderNotesHeader({ disabled: true });
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(queryByTestId(testIds.addNoteButton)).not.toBeInTheDocument();
    expect(queryByTestId(testIds.count)).not.toBeInTheDocument();
    expect(getByText(getEmptyValue())).toBeInTheDocument();
  });

  it('shows error toast when fetch fails', () => {
    const storeState = {
      ...mockGlobalState,
      notes: {
        ...mockGlobalState.notes,
        status: {
          ...mockGlobalState.notes.status,
          fetchNotesByDocumentIds: ReqStatus.Failed,
        },
        error: {
          ...mockGlobalState.notes.error,
          fetchNotesByDocumentIds: { type: 'http' as const, status: 500 },
        },
      },
    };
    renderNotesHeader({}, storeState);
    expect(mockAddError).toHaveBeenCalledWith(null, {
      title: FETCH_NOTES_ERROR,
    });
  });

  it('shows dash when user cannot read notes', () => {
    (useUserPrivileges as jest.Mock).mockReturnValue({
      notesPrivileges: { crud: false, read: false },
    });
    const { getByText, queryByTestId } = renderNotesHeader();
    expect(queryByTestId(testIds.addNoteButton)).not.toBeInTheDocument();
    expect(getByText(getEmptyValue())).toBeInTheDocument();
  });

  it('shows View notes button when user has read but not crud and notes exist', () => {
    (useUserPrivileges as jest.Mock).mockReturnValue({
      notesPrivileges: { crud: false, read: true },
    });
    const createMockNote = (noteId: string): Note => ({
      eventId: 'doc-1',
      noteId,
      note: 'note-1',
      timelineId: 'timeline-1',
      created: 1663882629000,
      createdBy: 'elastic',
      updated: 1663882629000,
      updatedBy: 'elastic',
      version: 'version',
    });
    const storeState = {
      ...mockGlobalState,
      notes: {
        ...mockGlobalState.notes,
        entities: { 'note-1': createMockNote('note-1') },
        ids: ['note-1'],
      },
    };
    const { getByTestId } = renderNotesHeader({ documentId: 'doc-1' }, storeState);
    const viewButton = getByTestId(testIds.viewNotesButton);
    expect(viewButton).toBeInTheDocument();
    viewButton.click();
    expect(mockOnOpenNotesTab).toHaveBeenCalled();
  });
});
