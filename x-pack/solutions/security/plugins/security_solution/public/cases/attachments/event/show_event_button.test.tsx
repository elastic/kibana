/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ShowEventButton } from './show_event_button';
import { useCaseViewNavigation, useCaseViewParams } from '@kbn/cases-plugin/public';

const props = {
  id: 'action-id',
  eventId: 'event-id',
  index: 'event-index',
  onShowEventDetails: jest.fn(),
};

const mockOpenFlyout = jest.fn();
const mockReportEvent = jest.fn();

jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: () => ({ openFlyout: mockOpenFlyout }),
}));

jest.mock('../../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: { telemetry: { reportEvent: mockReportEvent } },
  }),
}));

jest.mock('@kbn/cases-plugin/public', () => ({
  useCaseViewNavigation: jest.fn(),
  useCaseViewParams: jest.fn(),
}));

const useCaseViewParamsMock = useCaseViewParams as jest.Mock;
const useCaseViewNavigationMock = useCaseViewNavigation as jest.Mock;

describe('ShowEventButton', () => {
  const onShowEventDetails = jest.fn();
  const navigateToCaseView = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useCaseViewParamsMock.mockReturnValue({ detailName: 'case-id' });
    useCaseViewNavigationMock.mockReturnValue({ navigateToCaseView });
  });

  it('renders the show event button', () => {
    render(<ShowEventButton {...props} onShowEventDetails={onShowEventDetails} />);
    expect(screen.getByTestId('comment-action-show-event-action-id')).toBeInTheDocument();
  });

  it('opens flyout directly when index is valid (events use hook, not cases routing)', () => {
    render(<ShowEventButton {...props} onShowEventDetails={onShowEventDetails} />);
    const button = screen.getByTestId('comment-action-show-event-action-id');
    fireEvent.click(button);
    expect(mockOpenFlyout).toHaveBeenCalledWith({
      right: {
        id: 'document-details-right',
        params: {
          id: 'event-id',
          indexName: 'event-index',
          scopeId: 'timeline-case',
        },
      },
    });
    expect(mockReportEvent).toHaveBeenCalled();
    expect(onShowEventDetails).not.toHaveBeenCalled();
    expect(navigateToCaseView).not.toHaveBeenCalled();
  });

  it('calls navigateToCaseView when index is empty and onShowEventDetails is undefined', () => {
    render(<ShowEventButton {...{ ...props, index: '', onShowEventDetails: undefined }} />);
    const button = screen.getByTestId('comment-action-show-event-action-id');
    fireEvent.click(button);
    expect(navigateToCaseView).toHaveBeenCalledWith({ detailName: 'case-id', tabId: 'events' });
    expect(mockOpenFlyout).not.toHaveBeenCalled();
  });

  it('calls onShowEventDetails when index is empty and it is defined (fallback)', () => {
    render(
      <ShowEventButton {...{ ...props, index: '' }} onShowEventDetails={onShowEventDetails} />
    );
    const button = screen.getByTestId('comment-action-show-event-action-id');
    fireEvent.click(button);
    expect(onShowEventDetails).toHaveBeenCalledWith('event-id', '');
    expect(navigateToCaseView).not.toHaveBeenCalled();
  });
});
