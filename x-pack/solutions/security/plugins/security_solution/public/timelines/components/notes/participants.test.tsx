/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { Participants } from './participants';
import type { Note } from '../../../../common/api/timeline';
import {
  NOTE_AVATAR_WITH_NAME_TEST_ID,
  NOTES_PARTICIPANTS_TITLE_TEST_ID,
  TIMELINE_AVATAR_WITH_NAME_TEST_ID,
  TIMELINE_PARTICIPANT_TITLE_TEST_ID,
} from './test_ids';

const mockNote: Note = {
  eventId: '1',
  noteId: '1',
  note: 'note-1',
  timelineId: 'timeline-1',
  created: 1663882629000,
  createdBy: 'elastic',
  updated: 1663882629000,
  updatedBy: 'elastic',
  version: 'version',
};
const notes: Note[] = [
  mockNote,
  {
    ...mockNote,
    noteId: '2',
    updatedBy: 'elastic',
  },
  {
    ...mockNote,
    noteId: '3',
    updatedBy: 'another-elastic',
  },
];
const username = 'elastic';

describe('Participants', () => {
  it('should render the timeline username and the unique notes users', () => {
    const { getByTestId } = render(<Participants notes={notes} timelineCreatedBy={username} />);

    expect(getByTestId(TIMELINE_PARTICIPANT_TITLE_TEST_ID)).toBeInTheDocument();

    const timelineDescription = getByTestId(TIMELINE_AVATAR_WITH_NAME_TEST_ID);
    expect(timelineDescription).toBeInTheDocument();
    expect(timelineDescription).toHaveTextContent(username);

    expect(getByTestId(NOTES_PARTICIPANTS_TITLE_TEST_ID)).toBeInTheDocument();

    const firstNoteUser = getByTestId(`${NOTE_AVATAR_WITH_NAME_TEST_ID}-0`);
    expect(firstNoteUser).toBeInTheDocument();
    expect(firstNoteUser).toHaveTextContent(notes[0].updatedBy as string);

    const secondNoteUser = getByTestId(`${NOTE_AVATAR_WITH_NAME_TEST_ID}-1`);
    expect(secondNoteUser).toBeInTheDocument();
    expect(secondNoteUser).toHaveTextContent(notes[2].updatedBy as string);
  });

  it('should note render the timeline username if it is unavailable', () => {
    const { queryByTestId } = render(<Participants notes={notes} timelineCreatedBy={undefined} />);

    expect(queryByTestId(TIMELINE_PARTICIPANT_TITLE_TEST_ID)).not.toBeInTheDocument();
  });

  it('should note render any note usernames if no notes have been created', () => {
    const { queryByTestId } = render(<Participants notes={[]} timelineCreatedBy={username} />);

    expect(queryByTestId(`${NOTE_AVATAR_WITH_NAME_TEST_ID}-0`)).not.toBeInTheDocument();
  });
});
