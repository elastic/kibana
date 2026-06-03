/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { createMockStore, mockGlobalState, TestProviders } from '../../../common/mock';
import { FETCH_NOTES_ERROR, Notes } from './notes';
import {
  NOTES_ADD_NOTE_BUTTON_TEST_ID,
  NOTES_ADD_NOTE_ICON_BUTTON_TEST_ID,
  NOTES_COUNT_TEST_ID,
  NOTES_LOADING_TEST_ID,
  NOTES_TITLE_TEST_ID,
  NOTES_VIEW_NOTES_BUTTON_TEST_ID,
} from './test_ids';
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

const defaultProps = {
  documentId: 'doc-1',
  onShowNotes: mockOnOpenNotesTab,
};

const renderNotes = (
  props: Partial<Parameters<typeof Notes>[0]> = {},
  storeState?: Parameters<typeof createMockStore>[0]
) => {
  const store = storeState ? createMockStore(storeState) : createMockStore(mockGlobalState);
  return render(
    <TestProviders store={store}>
      <Notes {...defaultProps} {...props} />
    </TestProviders>
  );
};

describe('Notes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useUserPrivileges as jest.Mock).mockReturnValue({
      notesPrivileges: { crud: true, read: true },
    });
  });

  it('renders the Notes title', () => {
    const { getByTestId } = renderNotes();
    expect(getByTestId(NOTES_TITLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(NOTES_TITLE_TEST_ID)).toHaveTextContent('Notes');
  });

  it('dispatches fetch when not disabled and user can read', () => {
    renderNotes();
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
    const { getByTestId } = renderNotes({}, storeState);
    expect(getByTestId(NOTES_LOADING_TEST_ID)).toBeInTheDocument();
  });

  it('shows Add note button when no notes and user has crud', () => {
    const { getByTestId } = renderNotes();
    const button = getByTestId(NOTES_ADD_NOTE_BUTTON_TEST_ID);
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
    const { getByTestId } = renderNotes({ documentId: 'doc-1' }, storeState);
    expect(getByTestId(NOTES_COUNT_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(NOTES_COUNT_TEST_ID)).toHaveTextContent('1');
    const iconButton = getByTestId(NOTES_ADD_NOTE_ICON_BUTTON_TEST_ID);
    iconButton.click();
    expect(mockOnOpenNotesTab).toHaveBeenCalled();
  });

  it('shows dash when disabled and does not dispatch fetch', () => {
    const { getByText, queryByTestId } = renderNotes({ disabled: true });
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(queryByTestId(NOTES_ADD_NOTE_BUTTON_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(NOTES_COUNT_TEST_ID)).not.toBeInTheDocument();
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
    renderNotes({}, storeState);
    expect(mockAddError).toHaveBeenCalledWith(null, {
      title: FETCH_NOTES_ERROR,
    });
  });

  it('shows dash when user cannot read notes', () => {
    (useUserPrivileges as jest.Mock).mockReturnValue({
      notesPrivileges: { crud: false, read: false },
    });
    const { getByText, queryByTestId } = renderNotes();
    expect(queryByTestId(NOTES_ADD_NOTE_BUTTON_TEST_ID)).not.toBeInTheDocument();
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
    const { getByTestId } = renderNotes({ documentId: 'doc-1' }, storeState);
    const viewButton = getByTestId(NOTES_VIEW_NOTES_BUTTON_TEST_ID);
    expect(viewButton).toBeInTheDocument();
    viewButton.click();
    expect(mockOnOpenNotesTab).toHaveBeenCalled();
  });
});
