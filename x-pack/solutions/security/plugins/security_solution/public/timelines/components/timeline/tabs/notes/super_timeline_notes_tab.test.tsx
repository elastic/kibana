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
import { NOTES_LOADING_TEST_ID } from '../../../../../notes/components/test_ids';
import { SuperTimelineNotesTab } from './super_timeline_notes_tab';
import { useNotesTabData } from './use_notes_tab_data';

jest.mock('./use_notes_tab_data');

jest.mock('../../../super_timeline/super_timeline_notes', () => ({
  SuperTimelineNotes: () => <div data-test-subj="mock-super-timeline-notes" />,
}));

const mockUseNotesTabData = useNotesTabData as jest.MockedFunction<typeof useNotesTabData>;

const defaultHookData = {
  timeline: {} as never,
  isSuperTimeline: true,
  notes: [],
  fetchStatus: ReqStatus.Idle,
  savedObjectId: '',
  isTimelineSaved: false,
  superTimelineSourceIds: [],
  superTimelineSourceTitles: [],
  superTimelineDescriptions: [],
};

describe('SuperTimelineNotesTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNotesTabData.mockReturnValue(defaultHookData);
  });

  it('renders EuiEmptyPrompt when fetchStatus is Succeeded and no notes or descriptions', () => {
    mockUseNotesTabData.mockReturnValue({
      ...defaultHookData,
      fetchStatus: ReqStatus.Succeeded,
      notes: [],
      superTimelineDescriptions: [],
    });

    const { getByTestId } = render(
      <TestProviders>
        <SuperTimelineNotesTab timelineId="test-timeline" />
      </TestProviders>
    );

    expect(getByTestId('super-timeline-no-notes')).toBeInTheDocument();
  });

  it('renders loading spinner when fetchStatus is Loading', () => {
    mockUseNotesTabData.mockReturnValue({
      ...defaultHookData,
      fetchStatus: ReqStatus.Loading,
      notes: [],
      superTimelineDescriptions: [],
    });

    const { getByTestId } = render(
      <TestProviders>
        <SuperTimelineNotesTab timelineId="test-timeline" />
      </TestProviders>
    );

    expect(getByTestId(NOTES_LOADING_TEST_ID)).toBeInTheDocument();
  });

  it('renders error callout when fetchStatus is Failed', () => {
    mockUseNotesTabData.mockReturnValue({
      ...defaultHookData,
      fetchStatus: ReqStatus.Failed,
      notes: [],
      superTimelineDescriptions: [],
    });

    const { getByTestId } = render(
      <TestProviders>
        <SuperTimelineNotesTab timelineId="test-timeline" />
      </TestProviders>
    );

    expect(getByTestId('super-timeline-notes-error')).toBeInTheDocument();
  });

  it('renders SuperTimelineNotes when fetchStatus is Succeeded and notes exist', () => {
    mockUseNotesTabData.mockReturnValue({
      ...defaultHookData,
      fetchStatus: ReqStatus.Succeeded,
      notes: [
        {
          noteId: 'note-1',
          note: 'Test note',
          timelineId: 'tl-source-1',
          created: 0,
          createdBy: 'elastic',
          updated: 0,
          updatedBy: 'elastic',
          version: 'v1',
        },
      ],
      superTimelineSourceIds: ['tl-source-1'],
    });

    const { getByTestId } = render(
      <TestProviders>
        <SuperTimelineNotesTab timelineId="test-timeline" />
      </TestProviders>
    );

    expect(getByTestId('mock-super-timeline-notes')).toBeInTheDocument();
  });
});
