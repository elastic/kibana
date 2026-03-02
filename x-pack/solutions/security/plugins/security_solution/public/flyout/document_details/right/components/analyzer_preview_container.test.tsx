/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import React from 'react';
import { DocumentDetailsContext } from '../../shared/context';
import { mockContextValue } from '../../shared/mocks/mock_context';
import { AnalyzerPreviewContainer } from './analyzer_preview_container';
import { useIsInvestigateInResolverActionEnabled } from '../../../../detections/components/alerts_table/timeline_actions/investigate_in_resolver';
import { ANALYZER_PREVIEW_LOADING_TEST_ID, ANALYZER_PREVIEW_TEST_ID } from './test_ids';
import {
  EXPANDABLE_PANEL_CONTENT_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID,
  EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID,
} from '../../../shared/components/test_ids';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useDataView } from '../../../../data_view_manager/hooks/use_data_view';
import { useSourcererDataView } from '../../../../sourcerer/containers';
import { useSelectedPatterns } from '../../../../data_view_manager/hooks/use_selected_patterns';
import { DataViewManagerScopeName } from '../../../../data_view_manager/constants';

jest.mock(
  '../../../../detections/components/alerts_table/timeline_actions/investigate_in_resolver'
);
jest.mock('../../../../common/hooks/use_experimental_features');
jest.mock('../../../../data_view_manager/hooks/use_data_view');
jest.mock('../../../../sourcerer/containers');
jest.mock('../../../../data_view_manager/hooks/use_selected_patterns');
jest.mock('../../../../data_view_manager/constants', () => {
  const actual = jest.requireActual('../../../../data_view_manager/constants');
  return {
    ...actual,
    PageScope: {
      analyzer: 'analyzer',
    },
  };
});

const mockAnalyzerPreview = jest.fn((props: unknown) => (
  <div data-test-subj="analyzerPreviewStub" />
));
jest.mock('./analyzer_preview', () => ({
  AnalyzerPreview: (props: unknown) => mockAnalyzerPreview(props),
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

const NO_ANALYZER_MESSAGE =
  'You can only visualize events triggered by hosts configured with the Elastic Defend integration or any sysmon data from winlogbeat. Refer to Visual event analyzer(external, opens in a new tab or window) for more information.';

const renderAnalyzerPreview = (context = mockContextValue) =>
  render(
    <TestProviders>
      <DocumentDetailsContext.Provider value={context}>
        <AnalyzerPreviewContainer />
      </DocumentDetailsContext.Provider>
    </TestProviders>
  );

const setExperimentalFeatureFlags = ({
  newExpandableFlyoutNavigationDisabled,
  newDataViewPickerEnabled,
}: {
  newExpandableFlyoutNavigationDisabled: boolean;
  newDataViewPickerEnabled: boolean;
}) => {
  (useIsExperimentalFeatureEnabled as jest.Mock).mockImplementation((featureName: string) => {
    if (featureName === 'newExpandableFlyoutNavigationDisabled') {
      return newExpandableFlyoutNavigationDisabled;
    }

    if (featureName === 'newDataViewPickerEnabled') {
      return newDataViewPickerEnabled;
    }

    return false;
  });
};

describe('AnalyzerPreviewContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useIsInvestigateInResolverActionEnabled as jest.Mock).mockReturnValue(true);
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
  });

  describe('when newExpandableFlyoutNavigationDisabled is true', () => {
    beforeEach(() => {
      setExperimentalFeatureFlags({
        newExpandableFlyoutNavigationDisabled: true,
        newDataViewPickerEnabled: true,
      });
    });

    it('should render component and link in header', () => {
      const { getByTestId } = renderAnalyzerPreview();

      expect(
        getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(ANALYZER_PREVIEW_TEST_ID))
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId(EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID(ANALYZER_PREVIEW_TEST_ID))
      ).not.toBeInTheDocument();
      expect(
        screen.getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID(ANALYZER_PREVIEW_TEST_ID))
      ).toBeInTheDocument();
      expect(
        screen.getByTestId(EXPANDABLE_PANEL_CONTENT_TEST_ID(ANALYZER_PREVIEW_TEST_ID))
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId(EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID(ANALYZER_PREVIEW_TEST_ID))
      ).not.toBeInTheDocument();
      expect(
        screen.getByTestId(EXPANDABLE_PANEL_CONTENT_TEST_ID(ANALYZER_PREVIEW_TEST_ID))
      ).not.toHaveTextContent(NO_ANALYZER_MESSAGE);
      expect(mockAnalyzerPreview).toHaveBeenCalledWith(
        expect.objectContaining({ dataViewIndices: ['experimental-analyzer-pattern'] })
      );
    });

    it('should render error message and text in header', () => {
      (useIsInvestigateInResolverActionEnabled as jest.Mock).mockReturnValue(false);

      const { getByTestId } = renderAnalyzerPreview();
      expect(
        getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID(ANALYZER_PREVIEW_TEST_ID))
      ).toBeInTheDocument();
      expect(
        getByTestId(EXPANDABLE_PANEL_CONTENT_TEST_ID(ANALYZER_PREVIEW_TEST_ID))
      ).toHaveTextContent(NO_ANALYZER_MESSAGE);
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

    it('should disable link when in preview mode', () => {
      const { queryByTestId } = renderAnalyzerPreview({
        ...mockContextValue,
        isPreviewMode: true,
      });
      expect(
        queryByTestId(EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(ANALYZER_PREVIEW_TEST_ID))
      ).not.toBeInTheDocument();
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
  });

  describe('when newExpandableFlyoutNavigationDisabled is false', () => {
    beforeEach(() => {
      setExperimentalFeatureFlags({
        newExpandableFlyoutNavigationDisabled: false,
        newDataViewPickerEnabled: false,
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

    it('should render AnalyzerPreview with sourcerer patterns when new picker is disabled', () => {
      renderAnalyzerPreview();

      expect(mockAnalyzerPreview).toHaveBeenCalledWith(
        expect.objectContaining({ dataViewIndices: ['old-analyzer-pattern'] })
      );
    });
  });

  it('should use the analyzer page scope hooks', () => {
    setExperimentalFeatureFlags({
      newExpandableFlyoutNavigationDisabled: false,
      newDataViewPickerEnabled: true,
    });

    renderAnalyzerPreview();

    expect(useSourcererDataView).toHaveBeenCalledWith(DataViewManagerScopeName.analyzer);
    expect(useSelectedPatterns).toHaveBeenCalledWith(DataViewManagerScopeName.analyzer);
    expect(useDataView).toHaveBeenCalledWith(DataViewManagerScopeName.analyzer);
  });
});
