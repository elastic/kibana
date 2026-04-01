/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { buildDataTableRecord, type EsHitRecord } from '@kbn/discover-utils';
import { createMockStore, mockGlobalState, TestProviders } from '../../common/mock';
import { FETCH_NOTES_ERROR, NO_NOTES, NotesDetails } from '.';
import { useUserPrivileges } from '../../common/components/user_privileges';
import {
  ADD_NOTE_BUTTON_TEST_ID,
  NOTES_LOADING_TEST_ID,
  OPEN_TIMELINE_BUTTON_TEST_ID,
} from '../../notes/components/test_ids';
import {
  ATTACH_TO_TIMELINE_CALLOUT_TEST_ID,
  ATTACH_TO_TIMELINE_CHECKBOX_TEST_ID,
} from './components/test_ids';
import { ReqStatus } from '../../notes';
import { useTimelineConfig } from './hooks/use_timeline_config';
import { useIsInSecurityApp } from '../../common/hooks/is_in_security_app';

jest.mock('./hooks/use_timeline_config');
jest.mock('../../common/hooks/is_in_security_app');
const useIsInSecurityAppMock = useIsInSecurityApp as jest.Mock;

jest.mock('../../common/components/user_privileges');
const useUserPrivilegesMock = useUserPrivileges as jest.Mock;

const mockAddError = jest.fn();
jest.mock('../../common/hooks/use_app_toasts', () => ({
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

const mockTimelineConfig = {
  timelineSavedObjectId: 'savedObjectId',
  isTimelineSaved: true,
  onNoteAddInTimeline: jest.fn(),
  attachToTimeline: true,
  setAttachToTimeline: jest.fn(),
  attachToTimelineElement: (
    <div data-test-subj="attach-to-timeline-callout">
      <input data-test-subj="attach-to-timeline-checkbox" type="checkbox" />
    </div>
  ),
};

const mockStore = createMockStore(mockGlobalState);
const mockHit = buildDataTableRecord({ _index: 'test', _id: 'test-id' } as EsHitRecord);

const renderNotesDetails = (isTimelineFlyout = true) =>
  render(
    <TestProviders store={mockStore}>
      <NotesDetails hit={mockHit} isTimelineFlyout={isTimelineFlyout} />
    </TestProviders>
  );

describe('NotesDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useUserPrivilegesMock.mockReturnValue({
      notesPrivileges: { crud: true },
      timelinePrivileges: { crud: true },
      rulesPrivileges: {
        rules: {
          read: true,
        },
      },
    });
    (useTimelineConfig as jest.Mock).mockReturnValue(mockTimelineConfig);
    useIsInSecurityAppMock.mockReturnValue(false);
  });

  it('should fetch notes for the document id', () => {
    renderNotesDetails();
    expect(mockDispatch).toHaveBeenCalled();
  });

  it('should render loading spinner if notes are being fetched', () => {
    const store = createMockStore({
      ...mockGlobalState,
      notes: {
        ...mockGlobalState.notes,
        status: {
          ...mockGlobalState.notes.status,
          fetchNotesByDocumentIds: ReqStatus.Loading,
        },
      },
    });

    const { getByTestId } = render(
      <TestProviders store={store}>
        <NotesDetails hit={mockHit} isTimelineFlyout={true} />
      </TestProviders>
    );

    expect(getByTestId(NOTES_LOADING_TEST_ID)).toBeInTheDocument();
  });

  it('should render no data message for alerts if no notes are present', () => {
    const store = createMockStore({
      ...mockGlobalState,
      notes: {
        ...mockGlobalState.notes,
        status: {
          ...mockGlobalState.notes.status,
          fetchNotesByDocumentIds: ReqStatus.Succeeded,
        },
      },
    });

    const alertHit = buildDataTableRecord({
      _index: 'test',
      _id: 'test-id',
      fields: {
        'kibana.alert.rule.uuid': ['rule-uuid'],
      },
    } as EsHitRecord);

    const { getByText } = render(
      <TestProviders store={store}>
        <NotesDetails hit={alertHit} isTimelineFlyout={true} />
      </TestProviders>
    );

    expect(getByText(NO_NOTES('alert'))).toBeInTheDocument();
  });

  it('should render no data message for events if no notes are present', () => {
    const store = createMockStore({
      ...mockGlobalState,
      notes: {
        ...mockGlobalState.notes,
        status: {
          ...mockGlobalState.notes.status,
          fetchNotesByDocumentIds: ReqStatus.Succeeded,
        },
      },
    });

    const { getByText } = render(
      <TestProviders store={store}>
        <NotesDetails hit={mockHit} isTimelineFlyout={true} />
      </TestProviders>
    );

    expect(getByText(NO_NOTES('event'))).toBeInTheDocument();
  });

  it('should render error toast if fetching notes fails', () => {
    const store = createMockStore({
      ...mockGlobalState,
      notes: {
        ...mockGlobalState.notes,
        status: {
          ...mockGlobalState.notes.status,
          fetchNotesByDocumentIds: ReqStatus.Failed,
        },
        error: {
          ...mockGlobalState.notes.error,
          fetchNotesByDocumentIds: { type: 'http', status: 500 },
        },
      },
    });

    render(
      <TestProviders store={store}>
        <NotesDetails hit={mockHit} isTimelineFlyout={true} />
      </TestProviders>
    );

    expect(mockAddError).toHaveBeenCalledWith(null, {
      title: FETCH_NOTES_ERROR,
    });
  });

  it('should not render the add note section for users without crud privileges', () => {
    useUserPrivilegesMock.mockReturnValue({
      notesPrivileges: { crud: false },
      timelinePrivileges: { crud: false },
      rulesPrivileges: {
        rules: {
          read: true,
        },
      },
    });

    const { queryByTestId } = renderNotesDetails();

    expect(queryByTestId(ADD_NOTE_BUTTON_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(ATTACH_TO_TIMELINE_CALLOUT_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(ATTACH_TO_TIMELINE_CHECKBOX_TEST_ID)).not.toBeInTheDocument();
  });

  it('should not render the callout and attach to timeline checkbox if not timeline flyout', () => {
    (useTimelineConfig as jest.Mock).mockReturnValue(undefined);

    const { getByTestId, queryByTestId } = renderNotesDetails();

    expect(getByTestId(ADD_NOTE_BUTTON_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(ATTACH_TO_TIMELINE_CALLOUT_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(ATTACH_TO_TIMELINE_CHECKBOX_TEST_ID)).not.toBeInTheDocument();
  });
});

describe('NotesDetails hideTimelineIcon prop', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useUserPrivilegesMock.mockReturnValue({
      notesPrivileges: { crud: true, read: true },
      timelinePrivileges: { crud: true, read: true },
    });
    (useTimelineConfig as jest.Mock).mockReturnValue(undefined);
  });

  const getNotesStoreWithTimelineNote = () =>
    createMockStore({
      ...mockGlobalState,
      notes: {
        ...mockGlobalState.notes,
        entities: {
          'note-1': {
            eventId: 'test-id',
            noteId: 'note-1',
            note: 'note-1',
            timelineId: 'timeline-1',
            created: 1663882629000,
            createdBy: 'elastic',
            updated: 1663882629000,
            updatedBy: 'elastic',
            version: 'version',
          },
        },
        ids: ['note-1'],
        status: {
          ...mockGlobalState.notes.status,
          fetchNotesByDocumentIds: ReqStatus.Succeeded,
        },
      },
    });

  it('should show timeline icon when in security app', () => {
    useIsInSecurityAppMock.mockReturnValue(true);

    const { getByTestId } = render(
      <TestProviders store={getNotesStoreWithTimelineNote()}>
        <NotesDetails hit={mockHit} isTimelineFlyout={false} />
      </TestProviders>
    );

    expect(getByTestId(`${OPEN_TIMELINE_BUTTON_TEST_ID}-0`)).toBeInTheDocument();
  });

  it('should hide timeline icon when not in security app', () => {
    useIsInSecurityAppMock.mockReturnValue(false);

    const { queryByTestId } = render(
      <TestProviders store={getNotesStoreWithTimelineNote()}>
        <NotesDetails hit={mockHit} isTimelineFlyout={false} />
      </TestProviders>
    );

    expect(queryByTestId(`${OPEN_TIMELINE_BUTTON_TEST_ID}-0`)).not.toBeInTheDocument();
  });
});
