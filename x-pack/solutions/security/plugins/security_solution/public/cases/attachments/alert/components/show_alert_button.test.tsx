/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ShowAlertButton } from './show_alert_button';
import { useCaseViewNavigation, useCaseViewParams } from '@kbn/cases-plugin/public';
import { useKibana } from '../../../../common/lib/kibana';
import { useFlyoutApi } from '../../../../flyout_v2/use_flyout_api';
import { createFlyoutApiMock } from '../../../../flyout_v2/use_flyout_api.mock';
import { casesCellActionRenderer } from '../../../../flyout_v2/shared/components/cell_actions';
import { useIsNewFlyoutEnabled } from '../../../../common/hooks/use_is_new_flyout_enabled';
import { SECURITY_FEATURE_ID } from '../../../../../common/constants';
import { FLYOUT_ORIGIN } from '../../../../common/lib/telemetry';

const props = {
  id: 'action-id',
  alertId: 'alert-id',
  index: 'alert-index',
};

const mockOpenFlyout = vi.fn();
const mockReportEvent = vi.fn();

vi.mock('@kbn/expandable-flyout', () => {
  const mocked = {
    useExpandableFlyoutApi: () => ({ openFlyout: mockOpenFlyout }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../common/lib/kibana');

vi.mock('@kbn/cases-plugin/public', () => {
  const mocked = {
    useCaseViewNavigation: vi.fn(),
    useCaseViewParams: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../flyout_v2/use_flyout_api');
vi.mock('../../../../common/hooks/use_is_new_flyout_enabled');

const useCaseViewParamsMock = useCaseViewParams as Mock;
const useCaseViewNavigationMock = useCaseViewNavigation as Mock;
const useKibanaMock = useKibana as Mock;

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
  const navigateToCaseView = vi.fn();
  let flyoutApi: ReturnType<typeof createFlyoutApiMock>;

  beforeEach(() => {
    vi.clearAllMocks();
    useCaseViewParamsMock.mockReturnValue({ detailName: 'case-id' });
    useCaseViewNavigationMock.mockReturnValue({ navigateToCaseView });
    flyoutApi = createFlyoutApiMock();
    vi.mocked(useFlyoutApi).mockReturnValue(flyoutApi);
    vi.mocked(useIsNewFlyoutEnabled).mockReturnValue(false);
    setKibanaServices(false);
  });

  it('renders the show alert button', () => {
    render(<ShowAlertButton {...props} />);
    expect(screen.getByTestId('comment-action-show-alert-action-id')).toBeInTheDocument();
  });

  it('opens the legacy expandable flyout when the new flyout is disabled (non-EASE)', () => {
    render(<ShowAlertButton {...props} />);
    fireEvent.click(screen.getByTestId('comment-action-show-alert-action-id'));

    expect(mockOpenFlyout).toHaveBeenCalledWith({
      right: {
        id: 'document-details-right',
        params: {
          id: 'alert-id',
          indexName: 'alert-index',
          scopeId: 'timeline-case',
        },
      },
    });
    expect(flyoutApi.openDocumentFlyoutFromIndex).not.toHaveBeenCalled();
    expect(mockReportEvent).toHaveBeenCalled();
    expect(navigateToCaseView).not.toHaveBeenCalled();
  });

  it('opens the new document flyout (from index) when the new flyout is enabled (non-EASE)', () => {
    vi.mocked(useIsNewFlyoutEnabled).mockReturnValue(true);

    render(<ShowAlertButton {...props} />);
    fireEvent.click(screen.getByTestId('comment-action-show-alert-action-id'));

    expect(flyoutApi.openDocumentFlyoutFromIndex).toHaveBeenCalledWith({
      documentId: 'alert-id',
      indexName: 'alert-index',
      renderCellActions: casesCellActionRenderer,
      origin: FLYOUT_ORIGIN.CASE_ATTACHMENT,
      title: 'Alert',
    });
    expect(mockOpenFlyout).not.toHaveBeenCalled();
    expect(mockReportEvent).toHaveBeenCalled();
    expect(navigateToCaseView).not.toHaveBeenCalled();
  });

  it('includes the rule name in the flyout history title when provided', () => {
    vi.mocked(useIsNewFlyoutEnabled).mockReturnValue(true);

    render(<ShowAlertButton {...props} ruleName="My Detection Rule" />);
    fireEvent.click(screen.getByTestId('comment-action-show-alert-action-id'));

    expect(flyoutApi.openDocumentFlyoutFromIndex).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Alert: My Detection Rule' })
    );
  });

  it('opens the legacy EASE flyout when the EASE capability is on, regardless of the new flyout flag', () => {
    setKibanaServices(true);
    vi.mocked(useIsNewFlyoutEnabled).mockReturnValue(true);

    render(<ShowAlertButton {...props} />);
    fireEvent.click(screen.getByTestId('comment-action-show-alert-action-id'));

    expect(mockOpenFlyout).toHaveBeenCalledWith({
      right: {
        id: 'ease-details',
        params: {
          id: 'alert-id',
          indexName: 'alert-index',
        },
      },
    });
    expect(flyoutApi.openDocumentFlyoutFromIndex).not.toHaveBeenCalled();
    // EASE path does not report the document flyout telemetry event
    expect(mockReportEvent).not.toHaveBeenCalled();
    expect(navigateToCaseView).not.toHaveBeenCalled();
  });

  it('navigates to the case view when there is no valid index', () => {
    render(<ShowAlertButton {...props} index="" />);
    fireEvent.click(screen.getByTestId('comment-action-show-alert-action-id'));

    expect(navigateToCaseView).toHaveBeenCalledWith({
      detailName: 'case-id',
      tabId: 'alerts',
    });
    expect(mockOpenFlyout).not.toHaveBeenCalled();
    expect(flyoutApi.openDocumentFlyoutFromIndex).not.toHaveBeenCalled();
  });
});
