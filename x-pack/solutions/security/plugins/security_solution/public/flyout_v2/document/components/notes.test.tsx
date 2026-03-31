/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import {
  NOTES_ADD_NOTE_BUTTON_TEST_ID,
  NOTES_COUNT_TEST_ID,
  NOTES_TITLE_TEST_ID,
} from './test_ids';
import { Notes } from './notes';
import { createMockStore, mockGlobalState, TestProviders } from '../../../common/mock';
import { useUserPrivileges } from '../../../common/components/user_privileges';

jest.mock('../../../common/components/user_privileges');

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

const createMockHit = (id: string = 'event-1'): DataTableRecord =>
  ({
    id,
    raw: { _id: id },
    flattened: { 'event.kind': 'signal' },
    isAnchor: false,
  } as DataTableRecord);

describe('<Notes />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useUserPrivileges as jest.Mock).mockReturnValue({
      notesPrivileges: { crud: true, read: true },
    });
  });

  it('renders add note button when navigation is available and no notes exist', () => {
    const onOpenNotesTab = jest.fn();

    const { getByTestId } = render(
      <TestProviders>
        <Notes hit={createMockHit()} onOpenNotesTab={onOpenNotesTab} />
      </TestProviders>
    );

    expect(mockDispatch).toHaveBeenCalled();
    expect(getByTestId(NOTES_TITLE_TEST_ID)).toBeInTheDocument();

    const addNoteButton = getByTestId(NOTES_ADD_NOTE_BUTTON_TEST_ID);
    expect(addNoteButton).toBeInTheDocument();

    addNoteButton.click();
    expect(onOpenNotesTab).toHaveBeenCalled();
  });

  it('renders only the notes count when navigation is unavailable', () => {
    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <Notes hit={createMockHit()} />
      </TestProviders>
    );

    expect(mockDispatch).toHaveBeenCalled();
    expect(getByTestId(NOTES_COUNT_TEST_ID)).toHaveTextContent('0');
    expect(queryByTestId(NOTES_ADD_NOTE_BUTTON_TEST_ID)).not.toBeInTheDocument();
  });

  it('renders the existing notes count in discover mode without action buttons', () => {
    const store = createMockStore({
      ...mockGlobalState,
      notes: {
        ...mockGlobalState.notes,
        entities: {
          1: {
            eventId: 'event-1',
            noteId: '1',
            note: 'note-1',
            timelineId: 'timeline-1',
            created: 1663882629000,
            createdBy: 'elastic',
            updated: 1663882629000,
            updatedBy: 'elastic',
            version: 'version',
          },
        },
        ids: ['1'],
      },
    });

    const { getByTestId, queryByTestId } = render(
      <TestProviders store={store}>
        <Notes hit={createMockHit()} />
      </TestProviders>
    );

    expect(getByTestId(NOTES_COUNT_TEST_ID)).toHaveTextContent('1');
    expect(queryByTestId(NOTES_ADD_NOTE_BUTTON_TEST_ID)).not.toBeInTheDocument();
  });
});
