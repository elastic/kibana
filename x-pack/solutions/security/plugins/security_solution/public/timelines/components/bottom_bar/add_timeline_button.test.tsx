/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { AddTimelineButton } from './add_timeline_button';
import { useCreateTimeline } from '../../hooks/use_create_timeline';

jest.mock('../../hooks/use_create_timeline');

const timelineId = 'timelineId';
const renderAddTimelineButton = () => render(<AddTimelineButton timelineId={timelineId} />);

describe('AddTimelineButton', () => {
  it('should present 3 options in the popover when clicking on the plus button', () => {
    (useCreateTimeline as jest.Mock).mockReturnValue(jest.fn());

    const { getByTestId } = renderAddTimelineButton();

    const plusButton = getByTestId('timeline-bottom-bar-open-button');

    expect(plusButton).toBeInTheDocument();

    plusButton.click();

    expect(getByTestId('timeline-bottom-bar-create-new-timeline')).toBeInTheDocument();
    expect(getByTestId('timeline-bottom-bar-create-new-timeline')).toHaveTextContent(
      'Create new Timeline'
    );

    expect(getByTestId('timeline-bottom-bar-create-new-timeline-template')).toBeInTheDocument();
    expect(getByTestId('timeline-bottom-bar-create-new-timeline-template')).toHaveTextContent(
      'Create new Timeline template'
    );

    expect(getByTestId('timeline-bottom-bar-open-timeline')).toBeInTheDocument();
    expect(getByTestId('timeline-bottom-bar-open-timeline')).toHaveTextContent('Open Timeline…');
  });
});
