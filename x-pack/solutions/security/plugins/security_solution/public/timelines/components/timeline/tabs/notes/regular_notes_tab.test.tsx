/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../../../common/mock';
import { ReqStatus } from '../../../../../notes';
import { TimelineStatusEnum } from '../../../../../../common/api/timeline';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import { RegularNotesTab } from './regular_notes_tab';
import { useNotesTabData } from './use_notes_tab_data';

jest.mock('./use_notes_tab_data');
jest.mock('../../../../../common/components/user_privileges');

jest.mock('../../../../../notes/components/notes_list', () => ({
  NotesList: () => <div data-test-subj="mock-notes-list" />,
}));

jest.mock('../../../../../notes/components/add_note', () => ({
  AddNote: ({ children }: { children?: React.ReactNode }) => (
    <div data-test-subj="mock-add-note">{children}</div>
  ),
}));

jest.mock('../../../notes/participants', () => ({
  Participants: () => <div data-test-subj="mock-participants" />,
}));

jest.mock('../../../notes/save_timeline', () => ({
  SaveTimelineCallout: () => <div data-test-subj="mock-save-timeline-callout" />,
}));

const mockUseNotesTabData = useNotesTabData as jest.MockedFunction<typeof useNotesTabData>;

const savedTimeline = {
  savedObjectId: 'so-1',
  status: TimelineStatusEnum.active,
  description: '',
  updatedBy: null,
  updated: null,
  createdBy: null,
} as never;

const defaultHookData = {
  timeline: savedTimeline,
  isSuperTimeline: false,
  notes: [],
  fetchStatus: ReqStatus.Succeeded,
  savedObjectId: 'so-1',
  isTimelineSaved: true,
  superTimelineSourceIds: [],
  superTimelineSourceTitles: [],
  superTimelineDescriptions: [],
};

describe('RegularNotesTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNotesTabData.mockReturnValue(defaultHookData);
    (useUserPrivileges as jest.Mock).mockReturnValue({
      notesPrivileges: { crud: true },
    });
  });

  it('renders no-notes message when saved + Succeeded + empty notes', () => {
    mockUseNotesTabData.mockReturnValue({
      ...defaultHookData,
      notes: [],
      fetchStatus: ReqStatus.Succeeded,
      isTimelineSaved: true,
    });

    const { getByText } = render(
      <TestProviders>
        <RegularNotesTab timelineId="test-timeline" />
      </TestProviders>
    );

    expect(getByText('No notes have been created for this Timeline.')).toBeInTheDocument();
  });

  it('renders NotesList when notes exist', () => {
    mockUseNotesTabData.mockReturnValue({
      ...defaultHookData,
      notes: [
        {
          noteId: 'note-1',
          note: 'Test',
          timelineId: 'so-1',
          created: 0,
          createdBy: 'u',
          updated: 0,
          updatedBy: 'u',
          version: 'v',
        },
      ],
      fetchStatus: ReqStatus.Succeeded,
    });

    const { getByTestId } = render(
      <TestProviders>
        <RegularNotesTab timelineId="test-timeline" />
      </TestProviders>
    );

    expect(getByTestId('mock-notes-list')).toBeInTheDocument();
  });

  it('renders AddNote when user has CRUD privileges', () => {
    (useUserPrivileges as jest.Mock).mockReturnValue({
      notesPrivileges: { crud: true },
    });

    const { getByTestId } = render(
      <TestProviders>
        <RegularNotesTab timelineId="test-timeline" />
      </TestProviders>
    );

    expect(getByTestId('mock-add-note')).toBeInTheDocument();
  });

  it('does NOT render AddNote when user lacks CRUD privileges', () => {
    (useUserPrivileges as jest.Mock).mockReturnValue({
      notesPrivileges: { crud: false },
    });

    const { queryByTestId } = render(
      <TestProviders>
        <RegularNotesTab timelineId="test-timeline" />
      </TestProviders>
    );

    expect(queryByTestId('mock-add-note')).not.toBeInTheDocument();
  });
});
