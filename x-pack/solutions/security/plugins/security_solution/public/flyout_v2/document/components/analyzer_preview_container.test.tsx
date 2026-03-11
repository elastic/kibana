/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';
import React from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { AnalyzerPreviewContainer } from './analyzer_preview_container';
import { useIsAnalyzerEnabled } from '../../../detections/hooks/use_is_analyzer_enabled';
import {
  ANALYZER_PREVIEW_COLD_FROZEN_TIER_BADGE_TEST_ID,
  ANALYZER_PREVIEW_LOADING_TEST_ID,
  ANALYZER_PREVIEW_TEST_ID,
} from './test_ids';
import { EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID } from '../../shared/components/test_ids';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { useSourcererDataView } from '../../../sourcerer/containers';
import { useSelectedPatterns } from '../../../data_view_manager/hooks/use_selected_patterns';
import { PageScope } from '../../../data_view_manager/constants';

jest.mock('../../../detections/hooks/use_is_analyzer_enabled');
jest.mock('../../../data_view_manager/hooks/use_data_view');
jest.mock('../../../common/hooks/use_experimental_features');
jest.mock('../../../sourcerer/containers');
jest.mock('../../../data_view_manager/hooks/use_selected_patterns');

const mockUiSettingsGet = jest.fn();
let mockServerless: unknown;
jest.mock('../../../common/lib/kibana', () => {
  const actual = jest.requireActual('../../../common/lib/kibana');
  return {
    ...actual,
    useKibana: () => ({
      services: {
        uiSettings: {
          get: mockUiSettingsGet,
        },
        serverless: mockServerless,
      },
    }),
  };
});

const mockAnalyzerPreview = jest.fn((_props: unknown) => (
  <div data-test-subj="analyzerPreviewStub" />
));
jest.mock('./analyzer_preview', () => ({
  AnalyzerPreview: (props: unknown) => mockAnalyzerPreview(props),
}));

const createMockHit = (flattened: DataTableRecord['flattened']): DataTableRecord =>
  ({
    id: 'test-id',
    raw: { _id: 'event-id' },
    flattened,
    isAnchor: false,
  } as DataTableRecord);

const mockOnShowAnalyzer = jest.fn();
const mockHit = createMockHit({});

const renderAnalyzerPreview = (
  overrides: Partial<React.ComponentProps<typeof AnalyzerPreviewContainer>> = {}
) =>
  render(
    <TestProviders>
      <AnalyzerPreviewContainer
        hit={mockHit}
        onShowAnalyzer={mockOnShowAnalyzer}
        shouldUseAncestor={false}
        showIcon={false}
        disableNavigation={false}
        {...overrides}
      />
    </TestProviders>
  );

describe('AnalyzerPreviewContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockServerless = undefined;
    mockUiSettingsGet.mockReturnValue(true);
    (useIsAnalyzerEnabled as jest.Mock).mockReturnValue(true);
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

    mockOnShowAnalyzer.mockClear();
    mockAnalyzerPreview.mockClear();
  });

  it('should render excluded cold/frozen tiers badge when setting is enabled', () => {
    const { getByTestId } = renderAnalyzerPreview();

    expect(getByTestId(ANALYZER_PREVIEW_COLD_FROZEN_TIER_BADGE_TEST_ID)).toHaveTextContent(
      'Cold/Frozen tiers off'
    );
  });

  it('should render included cold/frozen tiers badge when setting is disabled', () => {
    mockUiSettingsGet.mockReturnValue(false);

    const { getByTestId } = renderAnalyzerPreview();

    expect(getByTestId(ANALYZER_PREVIEW_COLD_FROZEN_TIER_BADGE_TEST_ID)).toHaveTextContent(
      'Cold/Frozen tiers on'
    );
  });

  it('should hide cold/frozen tiers badge in serverless', () => {
    mockServerless = {};

    const { queryByTestId } = renderAnalyzerPreview();

    expect(queryByTestId(ANALYZER_PREVIEW_COLD_FROZEN_TIER_BADGE_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render AnalyzerPreview with experimental patterns when the new picker is enabled', () => {
    renderAnalyzerPreview();

    expect(mockAnalyzerPreview).toHaveBeenCalledWith(
      expect.objectContaining({
        dataViewIndices: ['experimental-analyzer-pattern'],
        hit: mockHit,
        shouldUseAncestor: false,
      })
    );
  });

  it('should render AnalyzerPreview with sourcerer patterns when the new picker is disabled', () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(false);

    renderAnalyzerPreview();
    expect(mockAnalyzerPreview).toHaveBeenCalledWith(
      expect.objectContaining({ dataViewIndices: ['old-analyzer-pattern'] })
    );
  });

  it('should pass shouldUseAncestor to AnalyzerPreview', () => {
    renderAnalyzerPreview({ shouldUseAncestor: true });

    expect(mockAnalyzerPreview).toHaveBeenCalledWith(
      expect.objectContaining({ shouldUseAncestor: true })
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
    (useIsAnalyzerEnabled as jest.Mock).mockReturnValue(false);

    const { getByText, queryByTestId } = renderAnalyzerPreview();
    expect(queryByTestId(ANALYZER_PREVIEW_LOADING_TEST_ID)).not.toBeInTheDocument();
    expect(
      getByText(/You can only visualize events triggered by hosts configured/i)
    ).toBeInTheDocument();
    expect(mockAnalyzerPreview).not.toHaveBeenCalled();
  });

  it('should not render a title link when analyzer is not enabled', () => {
    (useIsAnalyzerEnabled as jest.Mock).mockReturnValue(false);

    const { queryByTestId } = renderAnalyzerPreview();
    expect(
      queryByTestId(EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(ANALYZER_PREVIEW_TEST_ID))
    ).not.toBeInTheDocument();
  });

  it('should open analyzer when clicking on the title link', () => {
    const { getByTestId } = renderAnalyzerPreview();

    getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(ANALYZER_PREVIEW_TEST_ID)).click();
    expect(mockOnShowAnalyzer).toHaveBeenCalled();
  });

  it('should disable title link when disableNavigation is true', () => {
    const { queryByTestId } = renderAnalyzerPreview({ disableNavigation: true });
    expect(
      queryByTestId(EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(ANALYZER_PREVIEW_TEST_ID))
    ).not.toBeInTheDocument();
  });

  it('should use the analyzer page scope hooks', () => {
    renderAnalyzerPreview();

    expect(useSourcererDataView).toHaveBeenCalledWith(PageScope.analyzer);
    expect(useSelectedPatterns).toHaveBeenCalledWith(PageScope.analyzer);
    expect(useDataView).toHaveBeenCalledWith(PageScope.analyzer);
  });
});
