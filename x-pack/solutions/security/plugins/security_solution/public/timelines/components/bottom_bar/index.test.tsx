/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../common/mock/test_providers';
import { timelineActions } from '../../store';
import { TimelineBottomBar } from '.';
import { TimelineId } from '../../../../common/types';

jest.mock('react-redux', () => {
  const origin = jest.requireActual('react-redux');
  return {
    ...origin,
    useDispatch: jest.fn().mockReturnValue(jest.fn()),
  };
});

const mockRef = {
  current: null,
};

describe('TimelineBottomBar', () => {
  test('should render all components for bottom bar', () => {
    const { getByTestId } = render(
      <TestProviders>
        <TimelineBottomBar show={false} timelineId={TimelineId.test} openToggleRef={mockRef} />
      </TestProviders>
    );

    expect(getByTestId('timeline-bottom-bar')).toBeInTheDocument();
    expect(getByTestId('timeline-event-count-badge')).toBeInTheDocument();
    expect(getByTestId('timeline-save-status')).toBeInTheDocument();
    expect(getByTestId('timeline-favorite-empty-star')).toBeInTheDocument();
    expect(getByTestId('timeline-favorite-empty-star')).toHaveProperty('id', '');
  });

  test('should not render the event count badge if timeline is open', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <TimelineBottomBar show={true} timelineId={TimelineId.test} openToggleRef={mockRef} />
      </TestProviders>
    );

    expect(queryByTestId('timeline-event-count-badge')).not.toBeInTheDocument();
  });

  test('should dispatch show action when clicking on the title', () => {
    const spy = jest.spyOn(timelineActions, 'showTimeline');

    const { getByTestId } = render(
      <TestProviders>
        <TimelineBottomBar show={true} timelineId={TimelineId.test} openToggleRef={mockRef} />
      </TestProviders>
    );

    getByTestId('timeline-bottom-bar-title-button').click();

    expect(spy).toHaveBeenCalledWith({
      id: TimelineId.test,
      show: true,
    });
  });
});
