/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { OpenTimelineButtonIcon } from './open_timeline_button';
import type { Note } from '../../../common/api/timeline';
import { OPEN_TIMELINE_BUTTON_TEST_ID } from './test_ids';
import { useQueryTimelineById } from '../../timelines/components/open_timeline/helpers';

jest.mock('../../common/hooks/use_experimental_features');
jest.mock('../../timelines/components/open_timeline/helpers');

const note: Note = {
  eventId: '1',
  noteId: '1',
  note: 'note-1',
  timelineId: 'timelineId',
  created: 1663882629000,
  createdBy: 'elastic',
  updated: 1663882629000,
  updatedBy: 'elastic',
  version: 'version',
};
const index = 0;

describe('OpenTimelineButtonIcon', () => {
  it('should render the timeline icon', () => {
    const { getByTestId } = render(<OpenTimelineButtonIcon note={note} index={index} />);

    expect(getByTestId(`${OPEN_TIMELINE_BUTTON_TEST_ID}-${index}`)).toBeInTheDocument();
  });

  it('should call openTimeline with the correct values', () => {
    const openTimeline = jest.fn();
    (useQueryTimelineById as jest.Mock).mockReturnValue(openTimeline);

    const { getByTestId } = render(<OpenTimelineButtonIcon note={note} index={index} />);

    const button = getByTestId(`${OPEN_TIMELINE_BUTTON_TEST_ID}-${index}`);
    button.click();

    expect(openTimeline).toHaveBeenCalledWith({
      duplicate: false,
      onOpenTimeline: undefined,
      timelineId: note.timelineId,
      timelineType: undefined,
    });
  });
});
