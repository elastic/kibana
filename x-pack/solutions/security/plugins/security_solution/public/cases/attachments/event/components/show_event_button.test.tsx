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
import { useFlyoutApi } from '../../../../flyout_v2/use_flyout_api';
import { createFlyoutApiMock } from '../../../../flyout_v2/use_flyout_api.mock';
import { casesCellActionRenderer } from '../../../../flyout_v2/shared/components/cell_actions';
import { useIsNewFlyoutEnabled } from '../../../../common/hooks/use_is_new_flyout_enabled';

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

jest.mock('../../../../flyout_v2/use_flyout_api');
jest.mock('../../../../common/hooks/use_is_new_flyout_enabled');

const useCaseViewParamsMock = useCaseViewParams as jest.Mock;
const useCaseViewNavigationMock = useCaseViewNavigation as jest.Mock;

describe('ShowEventButton', () => {
  const navigateToCaseView = jest.fn();
  let flyoutApi: ReturnType<typeof createFlyoutApiMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    useCaseViewParamsMock.mockReturnValue({ detailName: 'case-id' });
    useCaseViewNavigationMock.mockReturnValue({ navigateToCaseView });
    flyoutApi = createFlyoutApiMock();
    jest.mocked(useFlyoutApi).mockReturnValue(flyoutApi);
    jest.mocked(useIsNewFlyoutEnabled).mockReturnValue(false);
  });

  it('renders the show event button', () => {
    render(<ShowEventButton {...props} />);
    expect(screen.getByTestId('comment-action-show-event-action-id')).toBeInTheDocument();
  });

  it('opens the legacy expandable flyout when the new flyout is disabled', () => {
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
    expect(flyoutApi.openDocumentFlyoutFromIndex).not.toHaveBeenCalled();
    expect(mockReportEvent).toHaveBeenCalled();
    expect(navigateToCaseView).not.toHaveBeenCalled();
  });

  it('opens the new document flyout (from index) when the new flyout is enabled', () => {
    jest.mocked(useIsNewFlyoutEnabled).mockReturnValue(true);

    render(<ShowEventButton {...props} />);
    const button = screen.getByTestId('comment-action-show-event-action-id');
    fireEvent.click(button);

    expect(flyoutApi.openDocumentFlyoutFromIndex).toHaveBeenCalledWith({
      documentId: 'event-id',
      indexName: 'event-index',
      renderCellActions: casesCellActionRenderer,
    });
    expect(mockOpenFlyout).not.toHaveBeenCalled();
    expect(mockReportEvent).toHaveBeenCalled();
    expect(navigateToCaseView).not.toHaveBeenCalled();
  });
});
