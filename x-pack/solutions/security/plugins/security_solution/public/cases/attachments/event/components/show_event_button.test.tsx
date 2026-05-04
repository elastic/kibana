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
};

const mockOpenFlyout = jest.fn();
const mockReportEvent = jest.fn();

jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: () => ({ openFlyout: mockOpenFlyout }),
}));

jest.mock('../../../../common/lib/kibana', () => ({
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
  const navigateToCaseView = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useCaseViewParamsMock.mockReturnValue({ detailName: 'case-id' });
    useCaseViewNavigationMock.mockReturnValue({ navigateToCaseView });
  });

  it('renders the show event button', () => {
    render(<ShowEventButton {...props} />);
    expect(screen.getByTestId('comment-action-show-event-action-id')).toBeInTheDocument();
  });

  it('opens flyout directly when index is valid (events use hook, not cases routing)', () => {
    render(<ShowEventButton {...props} />);
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
    expect(navigateToCaseView).not.toHaveBeenCalled();
  });
});
