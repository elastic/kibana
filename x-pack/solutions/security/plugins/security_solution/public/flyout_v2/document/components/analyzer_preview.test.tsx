/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, waitFor } from '@testing-library/react';
import React from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { TestProviders } from '../../../common/mock';
import { useAlertPrevalenceFromProcessTree } from '../hooks/use_alert_prevalence_from_process_tree';
import { AnalyzerPreview } from './analyzer_preview';
import { ANALYZER_PREVIEW_LOADING_TEST_ID, ANALYZER_PREVIEW_TEST_ID } from './test_ids';
import * as mock from '../../../flyout/document_details/right/mocks/mock_analyzer_data';

jest.mock('../hooks/use_alert_prevalence_from_process_tree', () => ({
  useAlertPrevalenceFromProcessTree: jest.fn(),
}));
const mockUseAlertPrevalenceFromProcessTree = useAlertPrevalenceFromProcessTree as jest.Mock;

const mockTreeValues = {
  loading: false,
  error: false,
  alertIds: ['alertid'],
  statsNodes: mock.mockStatsNodes,
};

const createMockHit = (
  flattened: DataTableRecord['flattened'],
  rawId = 'eventId'
): DataTableRecord =>
  ({
    id: 'test-id',
    raw: { _id: rawId },
    flattened,
    isAnchor: false,
  } as DataTableRecord);

const renderAnalyzerPreview = (
  hit: DataTableRecord,
  options?: {
    dataViewIndices?: string[];
    shouldUseAncestor?: boolean;
  }
) =>
  render(
    <TestProviders>
      <AnalyzerPreview
        dataViewIndices={options?.dataViewIndices ?? ['index']}
        hit={hit}
        shouldUseAncestor={options?.shouldUseAncestor ?? false}
      />
    </TestProviders>
  );

describe('<AnalyzerPreview />', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAlertPrevalenceFromProcessTree.mockReturnValue(mockTreeValues);
  });

  it('shows analyzer preview correctly when documentId and alert rule indices are present', async () => {
    const hit = createMockHit({
      'kibana.alert.rule.indices': ['rule-indices'],
    });
    const wrapper = renderAnalyzerPreview(hit);

    expect(mockUseAlertPrevalenceFromProcessTree).toHaveBeenCalledWith({
      documentId: 'eventId',
      indices: 'rule-indices',
    });

    await waitFor(() => {
      expect(wrapper.getByTestId(ANALYZER_PREVIEW_TEST_ID)).toBeInTheDocument();
    });
  });

  it('should use provided data view indices when alert indices are missing', async () => {
    const hit = createMockHit({});
    const wrapper = renderAnalyzerPreview(hit, { dataViewIndices: ['index'] });

    expect(mockUseAlertPrevalenceFromProcessTree).toHaveBeenCalledWith({
      documentId: 'eventId',
      indices: ['index'],
    });

    await waitFor(() => {
      expect(wrapper.getByTestId(ANALYZER_PREVIEW_TEST_ID)).toBeInTheDocument();
    });
  });

  it('should use rule parameters index when rule indices are not present', async () => {
    const hit = createMockHit({
      'kibana.alert.rule.parameters': { index: 'rule-parameters-index' },
    });
    const wrapper = renderAnalyzerPreview(hit);

    expect(mockUseAlertPrevalenceFromProcessTree).toHaveBeenCalledWith({
      documentId: 'eventId',
      indices: ['rule-parameters-index'],
    });

    await waitFor(() => {
      expect(wrapper.getByTestId(ANALYZER_PREVIEW_TEST_ID)).toBeInTheDocument();
    });
  });

  it('should use all rule parameters indices when provided as an array', async () => {
    const hit = createMockHit({
      'kibana.alert.rule.parameters': {
        index: ['rule-parameters-index-1', 'rule-parameters-index-2'],
      },
    });
    const wrapper = renderAnalyzerPreview(hit);

    expect(mockUseAlertPrevalenceFromProcessTree).toHaveBeenCalledWith({
      documentId: 'eventId',
      indices: ['rule-parameters-index-1', 'rule-parameters-index-2'],
    });

    await waitFor(() => {
      expect(wrapper.getByTestId(ANALYZER_PREVIEW_TEST_ID)).toBeInTheDocument();
    });
  });

  it('should use ancestor id as document id when shouldUseAncestor is true', async () => {
    const hit = createMockHit({
      'kibana.alert.rule.indices': ['rule-indices'],
      'kibana.alert.ancestors.id': ['ancestors-id'],
    });
    const wrapper = renderAnalyzerPreview(hit, { shouldUseAncestor: true });

    expect(mockUseAlertPrevalenceFromProcessTree).toHaveBeenCalledWith({
      documentId: 'ancestors-id',
      indices: 'rule-indices',
    });

    await waitFor(() => {
      expect(wrapper.getByTestId(ANALYZER_PREVIEW_TEST_ID)).toBeInTheDocument();
    });
  });

  it('should show loading skeleton when the process tree is being fetched', () => {
    mockUseAlertPrevalenceFromProcessTree.mockReturnValue({
      loading: true,
    });

    const hit = createMockHit({});
    const { getByTestId } = renderAnalyzerPreview(hit);

    expect(getByTestId(ANALYZER_PREVIEW_LOADING_TEST_ID)).toBeInTheDocument();
  });

  it('should show error message when there is an error fetching the process tree data', () => {
    mockUseAlertPrevalenceFromProcessTree.mockReturnValue({
      loading: false,
      error: true,
      alertIds: undefined,
      statsNodes: undefined,
    });

    const hit = createMockHit({});
    const { getByText } = renderAnalyzerPreview(hit);

    expect(getByText('An error is preventing this alert from being analyzed.')).toBeInTheDocument();
  });

  it('should show error message when the process tree is empty', () => {
    mockUseAlertPrevalenceFromProcessTree.mockReturnValue({
      loading: false,
      error: false,
      alertIds: [],
      statsNodes: [],
    });

    const hit = createMockHit({});
    const { getByText } = renderAnalyzerPreview(hit);

    expect(getByText('An error is preventing this alert from being analyzed.')).toBeInTheDocument();
  });
});
