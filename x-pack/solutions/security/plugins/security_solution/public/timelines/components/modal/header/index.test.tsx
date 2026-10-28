/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { TimelineModalHeader } from '.';
import { TestProviders } from '../../../../common/mock';

jest.mock('./super_timeline_modal_header', () => ({
  SuperTimelineModalHeader: () => <div data-test-subj="super-timeline-modal-header" />,
}));
jest.mock('./regular_timeline_modal_header', () => ({
  RegularTimelineModalHeader: () => <div data-test-subj="regular-timeline-modal-header" />,
}));

const mockRef = { current: null };

const mockGetState = jest.fn().mockReturnValue({});
jest.mock('react-redux-v7', () => {
  const actual = jest.requireActual('react-redux-v7');
  return {
    ...actual,
    useSelector: (selector: (s: unknown) => unknown) =>
      selector({
        timeline: {
          timelineById: {
            'timeline-1': mockGetState(),
          },
        },
        dataViewManager: { timeline: {} },
      }),
  };
});

describe('TimelineModalHeader', () => {
  beforeEach(() => {
    mockGetState.mockReturnValue({});
  });

  it('renders RegularTimelineModalHeader for a regular timeline', () => {
    render(
      <TestProviders>
        <TimelineModalHeader timelineId="timeline-1" openToggleRef={mockRef} />
      </TestProviders>
    );
    expect(screen.getByTestId('regular-timeline-modal-header')).toBeInTheDocument();
    expect(screen.queryByTestId('super-timeline-modal-header')).not.toBeInTheDocument();
  });

  it('renders SuperTimelineModalHeader when isSuperTimeline is true', () => {
    mockGetState.mockReturnValue({ isSuperTimeline: true });
    render(
      <TestProviders>
        <TimelineModalHeader timelineId="timeline-1" openToggleRef={mockRef} />
      </TestProviders>
    );
    expect(screen.getByTestId('super-timeline-modal-header')).toBeInTheDocument();
    expect(screen.queryByTestId('regular-timeline-modal-header')).not.toBeInTheDocument();
  });
});
