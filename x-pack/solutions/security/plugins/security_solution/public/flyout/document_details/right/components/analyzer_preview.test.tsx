/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../../common/mock';
import { useAlertPrevalenceFromProcessTree } from '../../shared/hooks/use_alert_prevalence_from_process_tree';
import { mockContextValue } from '../../shared/mocks/mock_context';
import { mockDataFormattedForFieldBrowser } from '../../shared/mocks/mock_data_formatted_for_field_browser';
import { DocumentDetailsContext } from '../../shared/context';
import { AnalyzerPreview } from './analyzer_preview';
import { ANALYZER_PREVIEW_LOADING_TEST_ID, ANALYZER_PREVIEW_TEST_ID } from './test_ids';

import * as mock from '../mocks/mock_analyzer_data';

jest.mock('../../shared/hooks/use_alert_prevalence_from_process_tree', () => ({
  useAlertPrevalenceFromProcessTree: jest.fn(),
}));
const mockUseAlertPrevalenceFromProcessTree = useAlertPrevalenceFromProcessTree as jest.Mock;

const mockTreeValues = {
  loading: false,
  error: false,
  alertIds: ['alertid'],
  statsNodes: mock.mockStatsNodes,
};

const renderAnalyzerPreview = (
  contextValue: DocumentDetailsContext,
  dataViewIndices: string[] = ['index']
) =>
  render(
    <TestProviders>
      <DocumentDetailsContext.Provider value={contextValue}>
        <AnalyzerPreview dataViewIndices={dataViewIndices} />
      </DocumentDetailsContext.Provider>
    </TestProviders>
  );

describe('<AnalyzerPreview />', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAlertPrevalenceFromProcessTree.mockReturnValue(mockTreeValues);
  });

  it('shows analyzer preview correctly when documentId and index are present', async () => {
    const contextValue = {
      ...mockContextValue,
      dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
    };
    const wrapper = renderAnalyzerPreview(contextValue);

    expect(mockUseAlertPrevalenceFromProcessTree).toHaveBeenCalledWith({
      documentId: 'eventId',
      indices: ['rule-indices'],
    });

    await waitFor(() => {
      expect(wrapper.getByTestId(ANALYZER_PREVIEW_TEST_ID)).toBeInTheDocument();
    });
  });

  it('should use provided data view indices for non-alerts', async () => {
    const contextValue = {
      ...mockContextValue,
      dataFormattedForFieldBrowser: [],
    };
    const wrapper = renderAnalyzerPreview(contextValue, ['index']);

    expect(mockUseAlertPrevalenceFromProcessTree).toHaveBeenCalledWith({
      documentId: 'eventId',
      indices: ['index'],
    });

    await waitFor(() => {
      expect(wrapper.getByTestId(ANALYZER_PREVIEW_TEST_ID)).toBeInTheDocument();
    });
  });

  it('should use ancestor id as document id when in rule preview', async () => {
    const contextValue = {
      ...mockContextValue,
      getFieldsData: () => 'ancestors-id',
      dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
      isRulePreview: true,
    };
    const wrapper = renderAnalyzerPreview(contextValue);

    expect(mockUseAlertPrevalenceFromProcessTree).toHaveBeenCalledWith({
      documentId: 'ancestors-id',
      indices: ['rule-indices'],
    });

    await waitFor(() => {
      expect(wrapper.getByTestId(ANALYZER_PREVIEW_TEST_ID)).toBeInTheDocument();
    });
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

  it('should show error message when the process tree is empty', () => {
    mockUseAlertPrevalenceFromProcessTree.mockReturnValue({
      loading: false,
      error: false,
      alertIds: [],
      statsNodes: [],
    });

    const { getByText } = renderAnalyzerPreview(mockContextValue);

    expect(getByText('An error is preventing this alert from being analyzed.')).toBeInTheDocument();
  });
});
