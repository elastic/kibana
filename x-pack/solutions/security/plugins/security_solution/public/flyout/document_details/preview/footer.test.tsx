/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { TestProviders } from '../../../common/mock';
import { DocumentDetailsRightPanelKey } from '../shared/constants/panel_keys';
import { mockFlyoutApi } from '../shared/mocks/mock_flyout_context';
import { mockContextValue } from '../shared/mocks/mock_context';
import { DocumentDetailsContext } from '../shared/context';
import { PreviewPanelFooter } from './footer';
import { PREVIEW_FOOTER_TEST_ID, PREVIEW_FOOTER_LINK_TEST_ID } from './test_ids';
import { FLYOUT_FOOTER_DROPDOWN_BUTTON_TEST_ID } from '../shared/components/test_ids';
import { createTelemetryServiceMock } from '../../../common/lib/telemetry/telemetry_service.mock';
import { useKibana } from '../../../common/lib/kibana';
import { useAlertExceptionActions } from '../../../detections/components/alerts_table/timeline_actions/use_add_exception_actions';
import { useInvestigateInTimeline } from '../../../detections/components/alerts_table/timeline_actions/use_investigate_in_timeline';
import { useAddToCaseActions } from '../../../detections/components/alerts_table/timeline_actions/use_add_to_case_actions';

jest.mock('@kbn/expandable-flyout');
jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');
  return {
    ...original,
    useLocation: jest.fn().mockReturnValue({ search: '' }),
  };
});

jest.mock('../../../common/lib/kibana');
jest.mock('../../../detections/components/alerts_table/timeline_actions/use_add_exception_actions');
jest.mock(
  '../../../detections/components/alerts_table/timeline_actions/use_investigate_in_timeline'
);
jest.mock('../../../detections/components/alerts_table/timeline_actions/use_add_to_case_actions');

const mockedTelemetry = createTelemetryServiceMock();

describe('<PreviewPanelFooter />', () => {
  beforeEach(() => {
    jest.mocked(useExpandableFlyoutApi).mockReturnValue(mockFlyoutApi);
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        osquery: { isOsqueryAvailable: jest.fn() },
        telemetry: mockedTelemetry,
        cases: { hooks: { useIsAddToCaseOpen: jest.fn().mockReturnValue(false) } },
      },
    });
    (useAlertExceptionActions as jest.Mock).mockReturnValue({ exceptionActionItems: [] });
    (useInvestigateInTimeline as jest.Mock).mockReturnValue({
      investigateInTimelineActionItems: [],
    });
    (useAddToCaseActions as jest.Mock).mockReturnValue({ addToCaseActionItems: [] });
  });

  it('should not render the take action dropdown if preview mode', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <DocumentDetailsContext.Provider value={{ ...mockContextValue, isRulePreview: true }}>
          <PreviewPanelFooter />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    );

    expect(queryByTestId(PREVIEW_FOOTER_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render footer for alert', () => {
    const { getByTestId } = render(
      <TestProviders>
        <DocumentDetailsContext.Provider value={mockContextValue}>
          <PreviewPanelFooter />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    );
    expect(getByTestId(PREVIEW_FOOTER_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(PREVIEW_FOOTER_LINK_TEST_ID)).toHaveTextContent('Show full alert details');
  });

  it('should render footer for event', () => {
    const { getByTestId } = render(
      <TestProviders>
        <DocumentDetailsContext.Provider
          value={{ ...mockContextValue, getFieldsData: () => 'event' }}
        >
          <PreviewPanelFooter />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    );
    expect(getByTestId(PREVIEW_FOOTER_LINK_TEST_ID)).toHaveTextContent('Show full event details');
  });

  it('should render the take action button', () => {
    (useInvestigateInTimeline as jest.Mock).mockReturnValue({
      investigateInTimelineActionItems: [{ name: 'test', onClick: jest.fn() }],
    });
    const { getByTestId } = render(
      <TestProviders>
        <DocumentDetailsContext.Provider value={mockContextValue}>
          <PreviewPanelFooter />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    );
    expect(getByTestId(FLYOUT_FOOTER_DROPDOWN_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should open document details flyout when clicked', () => {
    const { getByTestId } = render(
      <TestProviders>
        <DocumentDetailsContext.Provider value={mockContextValue}>
          <PreviewPanelFooter />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    );

    getByTestId(PREVIEW_FOOTER_LINK_TEST_ID).click();
    expect(mockFlyoutApi.openFlyout).toHaveBeenCalledWith({
      right: {
        id: DocumentDetailsRightPanelKey,
        params: {
          id: mockContextValue.eventId,
          indexName: mockContextValue.indexName,
          scopeId: mockContextValue.scopeId,
        },
      },
    });
  });
});
