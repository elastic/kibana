/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useDispatch } from 'react-redux-v7';
import { TestProviders } from '../../../../common/mock';
import { SuperTimelineModalHeader } from './super_timeline_modal_header';
import { useCreateTimeline } from '../../../hooks/use_create_timeline';
import { useInspect } from '../../../../common/components/inspect/use_inspect';
import { useIsInspectDisabled } from './use_is_inspect_disabled';
import { timelineActions } from '../../../store';
import { TimelineTypeEnum } from '../../../../../common/api/timeline';
import * as i18n from '../translations';

jest.mock('../../../hooks/use_create_timeline');
jest.mock('../../../../common/components/inspect/use_inspect');
jest.mock('./use_is_inspect_disabled');

const mockGetState = jest.fn().mockReturnValue({});
jest.mock('react-redux-v7', () => {
  const actual = jest.requireActual('react-redux-v7');
  return {
    ...actual,
    useDispatch: jest.fn(),
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

const timelineId = 'timeline-1';
const mockRef = { current: null };

const renderComponent = () =>
  render(
    <TestProviders>
      <SuperTimelineModalHeader timelineId={timelineId} openToggleRef={mockRef} />
    </TestProviders>
  );

describe('SuperTimelineModalHeader', () => {
  beforeEach(() => {
    mockGetState.mockReturnValue({ isSuperTimeline: true, timelineType: TimelineTypeEnum.default });
    (useDispatch as jest.Mock).mockReturnValue(jest.fn());
    (useCreateTimeline as jest.Mock).mockReturnValue(jest.fn());
    (useInspect as jest.Mock).mockReturnValue(jest.fn());
    (useIsInspectDisabled as jest.Mock).mockReturnValue(false);
  });

  it('shows the read-only badge and title', () => {
    renderComponent();

    expect(screen.getByTestId('timeline-modal-super-timeline-badge')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-modal-header-title')).toBeInTheDocument();
  });

  it('does not show Save, Attach to Case, or Favorites buttons', () => {
    renderComponent();

    expect(screen.queryByTestId('timeline-modal-save-timeline')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('timeline-modal-attach-to-case-dropdown-button')
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('timeline-favorite-empty-star')).not.toBeInTheDocument();
  });

  it('still shows New, Open, Inspect, and Close buttons', () => {
    renderComponent();

    expect(screen.getByTestId('timeline-modal-new-timeline-dropdown-button')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-modal-open-timeline-button')).toBeInTheDocument();
    expect(screen.getByTestId('inspect-empty-button')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-modal-header-close-button')).toBeInTheDocument();
  });

  it('close button has correct aria-label for a default timeline', () => {
    renderComponent();

    expect(screen.getByTestId('timeline-modal-header-close-button')).toHaveAttribute(
      'aria-label',
      i18n.CLOSE_TIMELINE_OR_TEMPLATE(true)
    );
  });

  it('dispatches showTimeline(false) when close button is clicked', async () => {
    const mockDispatch = jest.fn();
    (useDispatch as jest.Mock).mockReturnValue(mockDispatch);
    const spy = jest.spyOn(timelineActions, 'showTimeline');

    renderComponent();
    await userEvent.click(screen.getByTestId('timeline-modal-header-close-button'));

    expect(spy).toHaveBeenCalledWith({ id: timelineId, show: false });
    expect(mockDispatch).toHaveBeenCalled();
  });
});
