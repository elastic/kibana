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
import { ANALYZER_PREVIEW_LOADING_TEST_ID, ANALYZER_PREVIEW_TEST_ID } from './test_ids';
import { useDataView } from '../../../../data_view_manager/hooks/use_data_view';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useSourcererDataView } from '../../../../sourcerer/containers';
import { useSelectedPatterns } from '../../../../data_view_manager/hooks/use_selected_patterns';
import { PageScope } from '../../../../data_view_manager/constants';
import { EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID } from '../../../../flyout_v2/shared/components/test_ids';

jest.mock(
  '../../../../detections/components/alerts_table/timeline_actions/investigate_in_resolver'
);
jest.mock('../../../../data_view_manager/hooks/use_data_view');
jest.mock('../../../../common/hooks/use_experimental_features');
jest.mock('../../../../sourcerer/containers');
jest.mock('../../../../data_view_manager/hooks/use_selected_patterns');

const mockAnalyzerPreview = jest.fn((indices: string) => (
  <div data-test-subj="analyzerPreviewStub" />
));
jest.mock('./analyzer_preview', () => ({
  AnalyzerPreview: (indices: string) => mockAnalyzerPreview(indices),
}));

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
    jest.clearAllMocks();

    (useIsInvestigateInResolverActionEnabled as jest.Mock).mockReturnValue(true);
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
    (useSourcererDataView as jest.Mock).mockReturnValue({
      selectedPatterns: ['old-analyzer-pattern'],
    });
    (useSelectedPatterns as jest.Mock).mockReturnValue(['experimental-analyzer-pattern']);
    (useDataView as jest.Mock).mockReturnValue({
      status: 'ready',
      dataView: {
        hasMatchedIndices: () => true,
      },
    });

    mockNavigateToAnalyzer.mockClear();
    mockAnalyzerPreview.mockClear();
  });

  it('should render AnalyzerPreview with experimental patterns when the new picker is enabled', () => {
    renderAnalyzerPreview();

    expect(mockAnalyzerPreview).toHaveBeenCalledWith(
      expect.objectContaining({ dataViewIndices: ['experimental-analyzer-pattern'] })
    );
  });

  it('should render AnalyzerPreview with sourcerer patterns when the new picker is disabled', () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(false);

    renderAnalyzerPreview();
    expect(mockAnalyzerPreview).toHaveBeenCalledWith(
      expect.objectContaining({ dataViewIndices: ['old-analyzer-pattern'] })
    );
  });

  it('should show loading skeleton when the data view is loading', () => {
    (useDataView as jest.Mock).mockReturnValue({ status: 'loading' });

    const { getByTestId } = renderAnalyzerPreview();
    expect(getByTestId(ANALYZER_PREVIEW_LOADING_TEST_ID)).toBeInTheDocument();
    expect(mockAnalyzerPreview).not.toHaveBeenCalled();
  });

  it('should show loading skeleton when the data view is pristine', () => {
    (useDataView as jest.Mock).mockReturnValue({ status: 'pristine' });

    const { getByTestId } = renderAnalyzerPreview();
    expect(getByTestId(ANALYZER_PREVIEW_LOADING_TEST_ID)).toBeInTheDocument();
    expect(mockAnalyzerPreview).not.toHaveBeenCalled();
  });

  it('should show an error message when the data view is error', () => {
    (useDataView as jest.Mock).mockReturnValue({ status: 'error' });

    const { getByText } = renderAnalyzerPreview();
    expect(getByText('Unable to retrieve the data view for analyzer.')).toBeInTheDocument();
    expect(mockAnalyzerPreview).not.toHaveBeenCalled();
  });

  it('should show an error message when the data view has no matched indices', () => {
    (useDataView as jest.Mock).mockReturnValue({
      status: 'ready',
      dataView: { hasMatchedIndices: () => false },
    });

    const { getByText } = renderAnalyzerPreview();
    expect(getByText('Unable to retrieve the data view for analyzer.')).toBeInTheDocument();
    expect(mockAnalyzerPreview).not.toHaveBeenCalled();
  });

  it('should show no-data message when analyzer is not enabled', () => {
    (useIsInvestigateInResolverActionEnabled as jest.Mock).mockReturnValue(false);

    const { getByText, queryByTestId } = renderAnalyzerPreview();
    expect(queryByTestId(ANALYZER_PREVIEW_LOADING_TEST_ID)).not.toBeInTheDocument();
    expect(
      getByText(/You can only visualize events triggered by hosts configured/i)
    ).toBeInTheDocument();
    expect(mockAnalyzerPreview).not.toHaveBeenCalled();
  });

  it('should not render a title link when analyzer is not enabled', () => {
    (useIsInvestigateInResolverActionEnabled as jest.Mock).mockReturnValue(false);

    const { queryByTestId } = renderAnalyzerPreview();
    expect(
      queryByTestId(EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(ANALYZER_PREVIEW_TEST_ID))
    ).not.toBeInTheDocument();
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

  it('should use the analyzer page scope hooks', () => {
    renderAnalyzerPreview();

    expect(useSourcererDataView).toHaveBeenCalledWith(PageScope.analyzer);
    expect(useSelectedPatterns).toHaveBeenCalledWith(PageScope.analyzer);
    expect(useDataView).toHaveBeenCalledWith(PageScope.analyzer);
  });
});
