/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import React from 'react';
import { DocumentDetailsContext } from '../../shared/context';
import { mockContextValue } from '../../shared/mocks/mock_context';
import { AnalyzerPreviewContainer } from './analyzer_preview_container';
import { useIsInvestigateInResolverActionEnabled } from '../../../../detections/components/alerts_table/timeline_actions/investigate_in_resolver';
import { ANALYZER_PREVIEW_TEST_ID } from './test_ids';
import { useAlertPrevalenceFromProcessTree } from '../../shared/hooks/use_alert_prevalence_from_process_tree';
import * as mock from '../mocks/mock_analyzer_data';
import { EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID } from '../../../shared/components/test_ids';
import { useInvestigateInTimeline } from '../../../../detections/components/alerts_table/timeline_actions/use_investigate_in_timeline';

jest.mock(
  '../../../../detections/components/alerts_table/timeline_actions/investigate_in_resolver'
);
jest.mock('../../shared/hooks/use_alert_prevalence_from_process_tree');
jest.mock(
  '../../../../detections/components/alerts_table/timeline_actions/use_investigate_in_timeline'
);

const mockNavigateToAnalyzer = jest.fn();
jest.mock('../../shared/hooks/use_navigate_to_analyzer', () => {
  return { useNavigateToAnalyzer: () => ({ navigateToAnalyzer: mockNavigateToAnalyzer }) };
});

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useLocation: jest.fn().mockReturnValue({ pathname: '' }) };
});
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');

  return {
    ...original,
    useDispatch: () => jest.fn(),
  };
});

const renderAnalyzerPreview = (context = mockContextValue) =>
  render(
    <TestProviders>
      <DocumentDetailsContext.Provider value={context}>
        <AnalyzerPreviewContainer />
      </DocumentDetailsContext.Provider>
    </TestProviders>
  );

describe('AnalyzerPreviewContainer', () => {
  beforeEach(() => {
    (useIsInvestigateInResolverActionEnabled as jest.Mock).mockReturnValue(true);
    (useAlertPrevalenceFromProcessTree as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      alertIds: ['alertid'],
      statsNodes: mock.mockStatsNodes,
    });
    (useInvestigateInTimeline as jest.Mock).mockReturnValue({
      investigateInTimelineAlertClick: jest.fn(),
    });
  });
  it('should open left flyout visualization tab when clicking on title', () => {
    const { getByTestId } = renderAnalyzerPreview();

    getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(ANALYZER_PREVIEW_TEST_ID)).click();
    expect(mockNavigateToAnalyzer).toHaveBeenCalled();
  });

  it('should disable link when in rule preview', () => {
    const { queryByTestId } = renderAnalyzerPreview({
      ...mockContextValue,
      isRulePreview: true,
    });
    expect(
      queryByTestId(EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(ANALYZER_PREVIEW_TEST_ID))
    ).not.toBeInTheDocument();
  });

  it('should render link when in preview mode', () => {
    const { getByTestId } = renderAnalyzerPreview({ ...mockContextValue, isPreviewMode: true });

    getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(ANALYZER_PREVIEW_TEST_ID)).click();
    expect(mockNavigateToAnalyzer).toHaveBeenCalled();
  });
});
