/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ShowAlertButton } from './show_alert_button';
import { useCaseViewNavigation, useCaseViewParams } from '@kbn/cases-plugin/public';
import { useKibana } from '../../../../common/lib/kibana';
import { useFlyoutApi } from '../../../../flyout_v2/use_flyout_api';
import { createFlyoutApiMock } from '../../../../flyout_v2/use_flyout_api.mock';
import { casesCellActionRenderer } from '../../../../flyout_v2/shared/components/cell_actions';
import { SECURITY_FEATURE_ID } from '../../../../../common/constants';
import { FLYOUT_ORIGIN } from '../../../../common/lib/telemetry';

const props = {
  id: 'action-id',
  alertId: 'alert-id',
  index: 'alert-index',
};

const mockReportEvent = jest.fn();

jest.mock('../../../../common/lib/kibana');

jest.mock('@kbn/cases-plugin/public', () => ({
  useCaseViewNavigation: jest.fn(),
  useCaseViewParams: jest.fn(),
}));

jest.mock('../../../../flyout_v2/use_flyout_api');
jest.mock('../../../../detections/components/alert_summary/flyout/ease_flyout', () => ({
  EaseFlyout: ({ documentId, onClose }: { documentId: string; onClose: () => void }) => (
    <button type="button" data-test-subj="mockEaseFlyout" onClick={onClose}>
      {documentId}
    </button>
  ),
}));

const useCaseViewParamsMock = useCaseViewParams as jest.Mock;
const useCaseViewNavigationMock = useCaseViewNavigation as jest.Mock;
const useKibanaMock = useKibana as jest.Mock;

const setKibanaServices = (ease: boolean) => {
  useKibanaMock.mockReturnValue({
    services: {
      telemetry: { reportEvent: mockReportEvent },
      application: {
        capabilities: {
          [SECURITY_FEATURE_ID]: { configurations: ease },
        },
      },
    },
  });
};

describe('ShowAlertButton', () => {
  const navigateToCaseView = jest.fn();
  let flyoutApi: ReturnType<typeof createFlyoutApiMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    useCaseViewParamsMock.mockReturnValue({ detailName: 'case-id' });
    useCaseViewNavigationMock.mockReturnValue({ navigateToCaseView });
    flyoutApi = createFlyoutApiMock();
    jest.mocked(useFlyoutApi).mockReturnValue(flyoutApi);
    setKibanaServices(false);
  });

  it('renders the show alert button', () => {
    render(<ShowAlertButton {...props} />);
    expect(screen.getByTestId('comment-action-show-alert-action-id')).toBeInTheDocument();
  });

  it('opens the document flyout (from index) when the EASE capability is off', () => {
    render(<ShowAlertButton {...props} />);
    fireEvent.click(screen.getByTestId('comment-action-show-alert-action-id'));

    expect(flyoutApi.openDocumentFlyoutFromIndex).toHaveBeenCalledWith({
      documentId: 'alert-id',
      indexName: 'alert-index',
      renderCellActions: casesCellActionRenderer,
      origin: FLYOUT_ORIGIN.CASE_ATTACHMENT,
      title: 'Alert',
    });
    expect(mockReportEvent).toHaveBeenCalled();
    expect(navigateToCaseView).not.toHaveBeenCalled();
  });

  it('includes the rule name in the flyout history title when provided', () => {
    render(<ShowAlertButton {...props} ruleName="My Detection Rule" />);
    fireEvent.click(screen.getByTestId('comment-action-show-alert-action-id'));

    expect(flyoutApi.openDocumentFlyoutFromIndex).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Alert: My Detection Rule' })
    );
  });

  it('opens the EASE flyout when the EASE capability is on', () => {
    setKibanaServices(true);

    render(<ShowAlertButton {...props} />);
    expect(screen.queryByTestId('mockEaseFlyout')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('comment-action-show-alert-action-id'));

    expect(screen.getByTestId('mockEaseFlyout')).toHaveTextContent('alert-id');
    expect(flyoutApi.openDocumentFlyoutFromIndex).not.toHaveBeenCalled();
    // EASE path does not report the document flyout telemetry event
    expect(mockReportEvent).not.toHaveBeenCalled();
    expect(navigateToCaseView).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('mockEaseFlyout'));

    expect(screen.queryByTestId('mockEaseFlyout')).not.toBeInTheDocument();
  });

  it('navigates to the case view when there is no valid index', () => {
    render(<ShowAlertButton {...props} index="" />);
    fireEvent.click(screen.getByTestId('comment-action-show-alert-action-id'));

    expect(navigateToCaseView).toHaveBeenCalledWith({
      detailName: 'case-id',
      tabId: 'alerts',
    });
    expect(flyoutApi.openDocumentFlyoutFromIndex).not.toHaveBeenCalled();
  });
});
