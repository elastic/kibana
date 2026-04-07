/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { useFetchGraphData } from '@kbn/cloud-security-posture-graph/src/hooks';
import {
  GRAPH_PREVIEW,
  uiMetricService,
} from '@kbn/cloud-security-posture-common/utils/ui_metrics';
import { METRIC_TYPE } from '@kbn/analytics';
import { TestProviders } from '../../../common/mock';
import { mockContextValue } from '../../document_details/shared/mocks/mock_context';
import { GraphPreviewContainer } from './graph_preview_container';
import { GRAPH_PREVIEW_TEST_ID } from './test_ids';
import {
  EXPANDABLE_PANEL_CONTENT_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID,
  EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID,
} from '../../../flyout_v2/shared/components/test_ids';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';

jest.mock('@kbn/cloud-security-posture-common/utils/ui_metrics', () => ({
  uiMetricService: {
    trackUiMetric: jest.fn(),
  },
}));

jest.mock('../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn(),
}));

const useIsExperimentalFeatureEnabledMock = useIsExperimentalFeatureEnabled as jest.Mock;

jest.mock('../hooks/use_graph_preview');
jest.mock('@kbn/cloud-security-posture-graph/src/hooks', () => ({
  useFetchGraphData: jest.fn(),
}));
const mockUseFetchGraphData = useFetchGraphData as jest.Mock;

const mockGraph = () => <div data-test-subj={GRAPH_PREVIEW_TEST_ID} />;

jest.mock('@kbn/cloud-security-posture-graph', () => {
  return { Graph: mockGraph };
});

const uiMetricServiceMock = uiMetricService as jest.Mocked<typeof uiMetricService>;

const mockOnExpandGraph = jest.fn();

const defaultProps = {
  mode: 'event' as const,
  timestamp: new Date().toISOString(),
  shouldShowGraph: true,
  isAlert: false,
  eventIds: [mockContextValue.eventId],
  indexName: mockContextValue.indexName,
  isPreviewMode: mockContextValue.isPreviewMode,
  isRulePreview: mockContextValue.isRulePreview,
  onExpandGraph: mockOnExpandGraph,
};

const renderGraphPreview = (override: Partial<typeof defaultProps> = {}) =>
  render(
    <TestProviders>
      <GraphPreviewContainer {...defaultProps} {...override} />
    </TestProviders>
  );

const DEFAULT_NODES = [
  {
    id: '1',
    color: 'primary',
    shape: 'ellipse',
  },
];

describe('<GraphPreviewContainer /> (shared)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useIsExperimentalFeatureEnabledMock.mockReturnValue(true);
  });

  it('should not track ui metric when graph should not show', async () => {
    mockUseFetchGraphData.mockReturnValue({
      isLoading: false,
      isError: false,
      data: undefined,
    });

    const timestamp = new Date().toISOString();

    const { queryByTestId } = renderGraphPreview({
      timestamp,
      eventIds: [],
      shouldShowGraph: false,
      isAlert: true,
    });

    expect(
      queryByTestId(EXPANDABLE_PANEL_CONTENT_TEST_ID(GRAPH_PREVIEW_TEST_ID))
    ).not.toBeInTheDocument();
    expect(mockUseFetchGraphData.mock.calls[0][0].options.enabled).toBe(false);
    expect(uiMetricServiceMock.trackUiMetric).not.toHaveBeenCalled();
  });

  it('should render graph when shouldShowGraph is true and data loads', async () => {
    mockUseFetchGraphData.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { nodes: DEFAULT_NODES, edges: [] },
    });

    const timestamp = new Date().toISOString();
    const { findByTestId } = renderGraphPreview({
      timestamp,
      eventIds: [],
      shouldShowGraph: true,
      isAlert: true,
    });

    expect(await findByTestId(GRAPH_PREVIEW_TEST_ID)).toBeInTheDocument();
    expect(uiMetricServiceMock.trackUiMetric).toHaveBeenCalledWith(
      METRIC_TYPE.LOADED,
      GRAPH_PREVIEW
    );
  });

  it('should show expand link when onExpandGraph is provided', async () => {
    mockUseFetchGraphData.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { nodes: DEFAULT_NODES, edges: [] },
    });

    const timestamp = new Date().toISOString();
    const { getByTestId, findByTestId } = renderGraphPreview({
      timestamp,
      eventIds: [],
      shouldShowGraph: true,
      isAlert: true,
      onExpandGraph: mockOnExpandGraph,
    });

    expect(await findByTestId(GRAPH_PREVIEW_TEST_ID)).toBeInTheDocument();
    expect(
      getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(GRAPH_PREVIEW_TEST_ID))
    ).toBeInTheDocument();
    getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(GRAPH_PREVIEW_TEST_ID)).click();
    expect(mockOnExpandGraph).toHaveBeenCalled();
  });

  it('should not show expand link when onExpandGraph is undefined', async () => {
    mockUseFetchGraphData.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { nodes: DEFAULT_NODES, edges: [] },
    });

    const timestamp = new Date().toISOString();

    const { queryByTestId, findByTestId, getByTestId } = renderGraphPreview({
      timestamp,
      eventIds: [],
      shouldShowGraph: true,
      isAlert: true,
      onExpandGraph: undefined,
    });

    expect(await findByTestId(GRAPH_PREVIEW_TEST_ID)).toBeInTheDocument();
    expect(
      queryByTestId(EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(GRAPH_PREVIEW_TEST_ID))
    ).not.toBeInTheDocument();
    expect(
      queryByTestId(EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID(GRAPH_PREVIEW_TEST_ID))
    ).not.toBeInTheDocument();
    expect(
      getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID(GRAPH_PREVIEW_TEST_ID))
    ).toBeInTheDocument();
  });

  it('should not show expand link in preview mode even if onExpandGraph is provided', async () => {
    mockUseFetchGraphData.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { nodes: DEFAULT_NODES, edges: [] },
    });

    const timestamp = new Date().toISOString();

    const { queryByTestId, findByTestId, getByTestId } = renderGraphPreview({
      timestamp,
      eventIds: [],
      shouldShowGraph: true,
      isAlert: true,
      isPreviewMode: true,
      onExpandGraph: mockOnExpandGraph,
    });

    expect(await findByTestId(GRAPH_PREVIEW_TEST_ID)).toBeInTheDocument();
    expect(
      queryByTestId(EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(GRAPH_PREVIEW_TEST_ID))
    ).not.toBeInTheDocument();
    expect(
      queryByTestId(EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID(GRAPH_PREVIEW_TEST_ID))
    ).not.toBeInTheDocument();
    expect(
      queryByTestId(EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID(GRAPH_PREVIEW_TEST_ID))
    ).not.toBeInTheDocument();
    expect(
      getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID(GRAPH_PREVIEW_TEST_ID))
    ).toBeInTheDocument();
    expect(mockOnExpandGraph).not.toHaveBeenCalled();
  });
});
