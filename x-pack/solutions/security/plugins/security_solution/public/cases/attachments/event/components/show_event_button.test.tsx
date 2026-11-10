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
import { FLYOUT_ORIGIN } from '../../../../common/lib/telemetry';

const props = {
  id: 'action-id',
  eventId: 'event-id',
  index: 'event-index',
};

const mockReportEvent = jest.fn();

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
  });

  it('renders the show event button', () => {
    render(<ShowEventButton {...props} />);
    expect(screen.getByTestId('comment-action-show-event-action-id')).toBeInTheDocument();
  });

  it('opens the document flyout (from index)', () => {
    render(<ShowEventButton {...props} />);
    const button = screen.getByTestId('comment-action-show-event-action-id');
    fireEvent.click(button);

    expect(flyoutApi.openDocumentFlyoutFromIndex).toHaveBeenCalledWith({
      documentId: 'event-id',
      indexName: 'event-index',
      renderCellActions: casesCellActionRenderer,
      origin: FLYOUT_ORIGIN.CASE_ATTACHMENT,
      title: 'Event',
    });
    expect(mockReportEvent).toHaveBeenCalled();
    expect(navigateToCaseView).not.toHaveBeenCalled();
  });
});
