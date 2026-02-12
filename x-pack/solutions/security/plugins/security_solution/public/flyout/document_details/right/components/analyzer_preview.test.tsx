/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../../common/mock';
import { useAlertPrevalenceFromProcessTree } from '../../shared/hooks/use_alert_prevalence_from_process_tree';
import { mockContextValue } from '../../shared/mocks/mock_context';
import { mockDataFormattedForFieldBrowser } from '../../shared/mocks/mock_data_formatted_for_field_browser';
import { DocumentDetailsContext } from '../../shared/context';
import { AnalyzerPreview } from './analyzer_preview';
import { ANALYZER_PREVIEW_LOADING_TEST_ID, ANALYZER_PREVIEW_TEST_ID } from './test_ids';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useSelectedPatterns } from '../../../../data_view_manager/hooks/use_selected_patterns';
import type { DataView } from '@kbn/data-views-plugin/common';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_views/data_view.stub';
import { useDataView } from '../../../../data_view_manager/hooks/use_data_view';

import * as mock from '../mocks/mock_analyzer_data';

jest.mock('../../shared/hooks/use_alert_prevalence_from_process_tree', () => ({
  useAlertPrevalenceFromProcessTree: jest.fn(),
}));
const mockUseAlertPrevalenceFromProcessTree = useAlertPrevalenceFromProcessTree as jest.Mock;

jest.mock('../../../../data_view_manager/hooks/use_selected_patterns');
jest.mock('../../../../common/hooks/use_experimental_features');

const mockTreeValues = {
  loading: false,
  error: false,
  alertIds: ['alertid'],
  statsNodes: mock.mockStatsNodes,
};

const renderAnalyzerPreview = (contextValue: DocumentDetailsContext) =>
  render(
    <TestProviders>
      <DocumentDetailsContext.Provider value={contextValue}>
        <AnalyzerPreview />
      </DocumentDetailsContext.Provider>
    </TestProviders>
  );

const dataView: DataView = createStubDataView({
  spec: { title: '.alerts-security.alerts-default' },
});

describe('<AnalyzerPreview />', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAlertPrevalenceFromProcessTree.mockReturnValue(mockTreeValues);
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
    (useSelectedPatterns as jest.Mock).mockReturnValue(['index']);
    (useDataView as jest.Mock).mockReturnValue({
      status: 'ready',
      dataView: {
        ...dataView,
        hasMatchedIndices: jest.fn().mockReturnValue(true),
      },
    });
  });

  it('shows analyzer preview correctly when documentId and index are present', () => {
    const contextValue = {
      ...mockContextValue,
      dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
    };
    const wrapper = renderAnalyzerPreview(contextValue);

    expect(mockUseAlertPrevalenceFromProcessTree).toHaveBeenCalledWith({
      isActiveTimeline: false,
      documentId: 'eventId',
      indices: ['rule-indices'],
    });
    expect(wrapper.getByTestId(ANALYZER_PREVIEW_TEST_ID)).toBeInTheDocument();
  });

  it('should use selected index patterns for non-alerts', () => {
    const contextValue = {
      ...mockContextValue,
      dataFormattedForFieldBrowser: [],
    };
    const wrapper = renderAnalyzerPreview(contextValue);

    expect(mockUseAlertPrevalenceFromProcessTree).toHaveBeenCalledWith({
      isActiveTimeline: false,
      documentId: 'eventId',
      indices: ['index'],
    });
    expect(wrapper.getByTestId(ANALYZER_PREVIEW_TEST_ID)).toBeInTheDocument();
  });

  it('should use ancestor id as document id when in preview', () => {
    const contextValue = {
      ...mockContextValue,
      getFieldsData: () => 'ancestors-id',
      dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
      isRulePreview: true,
    };
    const wrapper = renderAnalyzerPreview(contextValue);

    expect(mockUseAlertPrevalenceFromProcessTree).toHaveBeenCalledWith({
      isActiveTimeline: false,
      documentId: 'ancestors-id',
      indices: ['rule-indices'],
    });
    expect(wrapper.getByTestId(ANALYZER_PREVIEW_TEST_ID)).toBeInTheDocument();
  });

  it('should show loading skeleton when the data view is loading', () => {
    (useDataView as jest.Mock).mockReturnValue({
      status: 'loading',
    });

    const contextValue = {
      ...mockContextValue,
      dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
    };
    const { getByTestId } = renderAnalyzerPreview(contextValue);

    expect(getByTestId(ANALYZER_PREVIEW_LOADING_TEST_ID)).toBeInTheDocument();
  });

  it('should show loading skeleton when the data view is pristine', () => {
    (useDataView as jest.Mock).mockReturnValue({
      status: 'pristine',
    });

    const contextValue = {
      ...mockContextValue,
      dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
    };
    const { getByTestId } = renderAnalyzerPreview(contextValue);

    expect(getByTestId(ANALYZER_PREVIEW_LOADING_TEST_ID)).toBeInTheDocument();
  });

  it('should show loading skeleton when the process tree is being fetched', () => {
    mockUseAlertPrevalenceFromProcessTree.mockReturnValue({
      loading: true,
    });

    const contextValue = {
      ...mockContextValue,
      dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
    };
    const { getByTestId } = renderAnalyzerPreview(contextValue);

    expect(getByTestId(ANALYZER_PREVIEW_LOADING_TEST_ID)).toBeInTheDocument();
  });

  it('should show error message if the data view is error', () => {
    (useDataView as jest.Mock).mockReturnValue({
      status: 'error',
    });

    const contextValue = {
      ...mockContextValue,
      dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
    };
    const { getByText } = renderAnalyzerPreview(contextValue);

    expect(getByText('Unable to retrieve the data view for analyzer.')).toBeInTheDocument();
  });

  it('should show error message if the data view is ready but no matched indices', () => {
    (useDataView as jest.Mock).mockReturnValue({
      status: 'ready',
      dataView: {
        ...dataView,
        hasMatchedIndices: jest.fn().mockReturnValue(false),
      },
    });

    const contextValue = {
      ...mockContextValue,
      dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
    };
    const { getByText } = renderAnalyzerPreview(contextValue);

    expect(getByText('Unable to retrieve the data view for analyzer.')).toBeInTheDocument();
  });

  it('should show error message when there is an error fetching the process tree data', () => {
    mockUseAlertPrevalenceFromProcessTree.mockReturnValue({
      loading: false,
      error: true,
      alertIds: undefined,
      statsNodes: undefined,
    });

    const { getByText } = renderAnalyzerPreview(mockContextValue);

    expect(getByText('An error is preventing this alert from being analyzed.')).toBeInTheDocument();
  });
});
