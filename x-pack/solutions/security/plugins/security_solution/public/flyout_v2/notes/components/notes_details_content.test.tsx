/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { buildDataTableRecord, type EsHitRecord } from '@kbn/discover-utils';
import { createMockStore, mockGlobalState, TestProviders } from '../../../common/mock';
import { FETCH_NOTES_ERROR, NO_NOTES, NotesDetailsContent } from './notes_details_content';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import {
  ADD_NOTE_BUTTON_TEST_ID,
  NOTES_LOADING_TEST_ID,
  OPEN_TIMELINE_BUTTON_TEST_ID,
} from '../../../notes/components/test_ids';
import { ReqStatus } from '../../../notes';
import type { State } from '../../../common/store';

jest.mock('../../../common/components/user_privileges');
const useUserPrivilegesMock = useUserPrivileges as jest.Mock;

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

const defaultHit = buildDataTableRecord({ _index: 'test', _id: 'doc-123' } as EsHitRecord);

const defaultProps = {
  hit: defaultHit,
  hideTimelineIcon: false,
};

const renderNotesDetailsContent = (
  props: Partial<Parameters<typeof NotesDetailsContent>[0]> = {},
  storeState?: State
) => {
  const store = storeState ? createMockStore(storeState) : createMockStore(mockGlobalState);
  return render(
    <TestProviders store={store}>
      <NotesDetailsContent {...defaultProps} {...props} />
    </TestProviders>
  );
};

const defaultUserPrivileges = {
  notesPrivileges: { crud: true, read: true },
  timelinePrivileges: { crud: true, read: true },
};

describe('NotesDetailsContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useUserPrivilegesMock.mockReturnValue(defaultUserPrivileges);
  });

  it('should fetch notes for the document id', () => {
    renderNotesDetailsContent();
    expect(mockDispatch).toHaveBeenCalled();
  });

  it('should render loading spinner when notes are being fetched', () => {
    const storeState: State = {
      ...mockGlobalState,
      notes: {
        ...mockGlobalState.notes,
        status: {
          ...mockGlobalState.notes.status,
          fetchNotesByDocumentIds: ReqStatus.Loading,
        },
      },
    };

    const { getByTestId } = renderNotesDetailsContent({}, storeState);

    expect(getByTestId(NOTES_LOADING_TEST_ID)).toBeInTheDocument();
  });

  it('should render no data message for alerts when no notes are present', () => {
    const storeState: State = {
      ...mockGlobalState,
      notes: {
        ...mockGlobalState.notes,
        status: {
          ...mockGlobalState.notes.status,
          fetchNotesByDocumentIds: ReqStatus.Succeeded,
        },
      },
    };

    const alertHit = buildDataTableRecord({
      _index: 'test',
      _id: 'doc-123',
      fields: { 'kibana.alert.rule.uuid': ['rule-uuid'] },
    } as EsHitRecord);

    const { getByText } = renderNotesDetailsContent({ hit: alertHit }, storeState);

    expect(getByText(NO_NOTES('alert'))).toBeInTheDocument();
  });

  it('should render no data message for events when no notes are present', () => {
    const storeState: State = {
      ...mockGlobalState,
      notes: {
        ...mockGlobalState.notes,
        status: {
          ...mockGlobalState.notes.status,
          fetchNotesByDocumentIds: ReqStatus.Succeeded,
        },
      },
    };

    const { getByText } = renderNotesDetailsContent({}, storeState);

    expect(getByText(NO_NOTES('event'))).toBeInTheDocument();
  });

  it('should render no data message for attacks when no notes are present', () => {
    const storeState: State = {
      ...mockGlobalState,
      notes: {
        ...mockGlobalState.notes,
        status: {
          ...mockGlobalState.notes.status,
          fetchNotesByDocumentIds: ReqStatus.Succeeded,
        },
      },
    };

    const attackHit = buildDataTableRecord({
      _index: 'test',
      _id: 'doc-123',
      fields: {
        'kibana.alert.rule.uuid': ['rule-uuid'],
        'kibana.alert.attack_discovery.alert_ids': ['alert-1'],
      },
    } as EsHitRecord);

    const { getByText } = renderNotesDetailsContent({ hit: attackHit }, storeState);

    expect(getByText(NO_NOTES('attack'))).toBeInTheDocument();
  });

  it('should render error toast when fetching notes fails', () => {
    const storeState: State = {
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
    };

    renderNotesDetailsContent({}, storeState);

    expect(mockAddError).toHaveBeenCalledWith(null, {
      title: FETCH_NOTES_ERROR,
    });
  });

  it('should not render add note section when user lacks crud privileges', () => {
    useUserPrivilegesMock.mockReturnValue({
      ...defaultUserPrivileges,
      notesPrivileges: { crud: false, read: true },
    });

    const storeState: State = {
      ...mockGlobalState,
      notes: {
        ...mockGlobalState.notes,
        status: {
          ...mockGlobalState.notes.status,
          fetchNotesByDocumentIds: ReqStatus.Succeeded,
        },
      },
    };

    const { queryByTestId } = renderNotesDetailsContent({}, storeState);

    expect(queryByTestId(ADD_NOTE_BUTTON_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render add note section when timelineConfig is not provided', () => {
    const storeState: State = {
      ...mockGlobalState,
      notes: {
        ...mockGlobalState.notes,
        status: {
          ...mockGlobalState.notes.status,
          fetchNotesByDocumentIds: ReqStatus.Succeeded,
        },
      },
    };

    const { getByTestId } = renderNotesDetailsContent({}, storeState);

    expect(getByTestId(ADD_NOTE_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should render attachToTimelineElement when timelineConfig is provided', () => {
    const storeState: State = {
      ...mockGlobalState,
      notes: {
        ...mockGlobalState.notes,
        status: {
          ...mockGlobalState.notes.status,
          fetchNotesByDocumentIds: ReqStatus.Succeeded,
        },
      },
    };

    const attachElement = <div data-test-subj="attach-to-timeline-element">{'Attach'}</div>;
    const timelineConfig = {
      timelineSavedObjectId: 'timeline-1',
      isTimelineSaved: true,
      onNoteAddInTimeline: jest.fn(),
      attachToTimeline: true,
      setAttachToTimeline: jest.fn(),
      attachToTimelineElement: attachElement,
    };

    const { getByTestId } = renderNotesDetailsContent({ timelineConfig }, storeState);

    expect(getByTestId('attach-to-timeline-element')).toBeInTheDocument();
  });
});

describe('NotesDetailsContent hideTimelineIcon prop', () => {
  const succeededStore: State = {
    ...mockGlobalState,
    notes: {
      ...mockGlobalState.notes,
      entities: {
        'note-1': {
          eventId: 'doc-123',
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
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useUserPrivilegesMock.mockReturnValue(defaultUserPrivileges);
  });

  it('should pass hideTimelineIcon=true to NotesList when prop is true', () => {
    const { queryByTestId } = renderNotesDetailsContent({ hideTimelineIcon: true }, succeededStore);

    expect(queryByTestId(`${OPEN_TIMELINE_BUTTON_TEST_ID}-0`)).not.toBeInTheDocument();
  });

  it('should pass hideTimelineIcon=false to NotesList when prop is false', () => {
    const { getByTestId } = renderNotesDetailsContent({ hideTimelineIcon: false }, succeededStore);

    expect(getByTestId(`${OPEN_TIMELINE_BUTTON_TEST_ID}-0`)).toBeInTheDocument();
  });
});
