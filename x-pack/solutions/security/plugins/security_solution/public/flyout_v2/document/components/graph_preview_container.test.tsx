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
import type { DataTableRecord } from '@kbn/discover-utils';
import { TestProviders } from '../../../common/mock';
import { GraphPreviewContainer } from './graph_preview_container';
import { GRAPH_PREVIEW_TEST_ID } from './test_ids';
import { useGraphPreview } from '../hooks/use_graph_preview';
import {
  EXPANDABLE_PANEL_CONTENT_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID,
  EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID,
} from '../../shared/components/test_ids';
import { useUpsellingComponent } from '../../../common/hooks/use_upselling';

jest.mock('../../../common/hooks/use_upselling');
const mockUseUpsellingComponent = useUpsellingComponent as jest.Mock;

jest.mock('@kbn/cloud-security-posture-common/utils/ui_metrics', () => ({
  uiMetricService: {
    trackUiMetric: jest.fn(),
  },
}));

const uiMetricServiceMock = uiMetricService as jest.Mocked<typeof uiMetricService>;

jest.mock('../hooks/use_graph_preview');
jest.mock('@kbn/cloud-security-posture-graph/src/hooks', () => ({
  useFetchGraphData: jest.fn(),
}));
const mockUseFetchGraphData = useFetchGraphData as jest.Mock;

const mockGraph = () => <div data-test-subj={GRAPH_PREVIEW_TEST_ID} />;
jest.mock('@kbn/cloud-security-posture-graph', () => {
  return { Graph: mockGraph };
});

const createMockHit = (flattened: DataTableRecord['flattened']): DataTableRecord =>
  ({
    id: '1',
    raw: {},
    flattened,
    isAnchor: false,
  } as DataTableRecord);

const mockHit = createMockHit({ 'event.kind': 'signal' });
const mockOnShowGraph = jest.fn();

const DEFAULT_NODES = [
  {
    id: '1',
    color: 'primary',
    shape: 'ellipse',
  },
];

const renderGraphPreviewContainer = (
  overrides: Partial<React.ComponentProps<typeof GraphPreviewContainer>> = {}
) =>
  render(
    <TestProviders>
      <GraphPreviewContainer
        hit={mockHit}
        onShowGraph={mockOnShowGraph}
        showIcon={true}
        disableNavigation={false}
        {...overrides}
      />
    </TestProviders>
  );

describe('<GraphPreviewContainer />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUpsellingComponent.mockReturnValue(null);
    mockUseFetchGraphData.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { nodes: DEFAULT_NODES, edges: [] },
    });
  });

  it('should render component and link in header when shouldShowGraph is true', async () => {
    const timestamp = new Date().toISOString();

    (useGraphPreview as jest.Mock).mockReturnValue({
      timestamp,
      eventIds: ['eventId'],
      shouldShowGraph: true,
      isAlert: true,
    });

    const { getByTestId, queryByTestId, findByTestId } = renderGraphPreviewContainer();

    expect(await findByTestId(GRAPH_PREVIEW_TEST_ID)).toBeInTheDocument();
    expect(
      getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(GRAPH_PREVIEW_TEST_ID))
    ).toBeInTheDocument();
    expect(
      queryByTestId(EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID(GRAPH_PREVIEW_TEST_ID))
    ).not.toBeInTheDocument();
    expect(
      getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID(GRAPH_PREVIEW_TEST_ID))
    ).toBeInTheDocument();
    expect(
      getByTestId(EXPANDABLE_PANEL_CONTENT_TEST_ID(GRAPH_PREVIEW_TEST_ID))
    ).toBeInTheDocument();
  });

  it('should call onShowGraph when header link is clicked', async () => {
    const timestamp = new Date().toISOString();

    (useGraphPreview as jest.Mock).mockReturnValue({
      timestamp,
      eventIds: ['eventId'],
      shouldShowGraph: true,
      isAlert: true,
    });

    const { getByTestId, findByTestId } = renderGraphPreviewContainer();

    expect(await findByTestId(GRAPH_PREVIEW_TEST_ID)).toBeInTheDocument();
    getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(GRAPH_PREVIEW_TEST_ID)).click();

    expect(mockOnShowGraph).toHaveBeenCalled();
  });

  it('should not render header link when disableNavigation is true', async () => {
    (useGraphPreview as jest.Mock).mockReturnValue({
      timestamp: new Date().toISOString(),
      eventIds: ['eventId'],
      shouldShowGraph: true,
      isAlert: true,
    });

    const { getByTestId, queryByTestId, findByTestId } = renderGraphPreviewContainer({
      disableNavigation: true,
    });

    expect(await findByTestId(GRAPH_PREVIEW_TEST_ID)).toBeInTheDocument();
    expect(
      queryByTestId(EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(GRAPH_PREVIEW_TEST_ID))
    ).not.toBeInTheDocument();
    expect(
      getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID(GRAPH_PREVIEW_TEST_ID))
    ).toBeInTheDocument();
  });

  it('should not render header icon when showIcon is false', async () => {
    (useGraphPreview as jest.Mock).mockReturnValue({
      timestamp: new Date().toISOString(),
      eventIds: ['eventId'],
      shouldShowGraph: true,
      isAlert: true,
    });

    const { queryByTestId, findByTestId } = renderGraphPreviewContainer({ showIcon: false });

    expect(await findByTestId(GRAPH_PREVIEW_TEST_ID)).toBeInTheDocument();
    expect(
      queryByTestId(EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID(GRAPH_PREVIEW_TEST_ID))
    ).not.toBeInTheDocument();
  });

  it('should track ui metric when shouldShowGraph is true', async () => {
    (useGraphPreview as jest.Mock).mockReturnValue({
      timestamp: new Date().toISOString(),
      eventIds: ['eventId'],
      shouldShowGraph: true,
      isAlert: true,
    });

    const { findByTestId } = renderGraphPreviewContainer();
    await findByTestId(GRAPH_PREVIEW_TEST_ID);

    expect(uiMetricServiceMock.trackUiMetric).toHaveBeenCalledWith(
      METRIC_TYPE.LOADED,
      GRAPH_PREVIEW
    );
  });

  it('should not render when shouldShowGraph is false and no upsell', () => {
    (useGraphPreview as jest.Mock).mockReturnValue({
      timestamp: new Date().toISOString(),
      eventIds: [],
      shouldShowGraph: false,
      isAlert: true,
    });

    const { container } = renderGraphPreviewContainer();

    expect(container).toBeEmptyDOMElement();
    expect(uiMetricServiceMock.trackUiMetric).not.toHaveBeenCalled();
  });

  it('should render upsell when shouldShowGraph is false and upsell component is available', () => {
    (useGraphPreview as jest.Mock).mockReturnValue({
      timestamp: new Date().toISOString(),
      eventIds: [],
      shouldShowGraph: false,
      isAlert: true,
    });

    const MockUpsell = () => <div data-test-subj="graphVisualizationUpsell">{'Upgrade'}</div>;
    mockUseUpsellingComponent.mockReturnValue(MockUpsell);

    const { getByTestId } = renderGraphPreviewContainer();

    expect(getByTestId('graphVisualizationUpsell')).toBeInTheDocument();
  });

  it('should pass hit to useGraphPreview', () => {
    (useGraphPreview as jest.Mock).mockReturnValue({
      timestamp: new Date().toISOString(),
      eventIds: [],
      shouldShowGraph: false,
      isAlert: false,
    });

    renderGraphPreviewContainer();

    expect(useGraphPreview).toHaveBeenCalledWith({ hit: mockHit });
  });
});
