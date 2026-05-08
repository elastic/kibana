/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import {
  GRAPH_PREVIEW,
  uiMetricService,
} from '@kbn/cloud-security-posture-common/utils/ui_metrics';
import { METRIC_TYPE } from '@kbn/analytics';
import { TestProviders } from '../../../common/mock';
import { GraphPreviewContainer } from './graph_preview_container';
import { useGraphPreview } from '../hooks/use_graph_preview';
import { useShouldShowGraph } from '../../graph/hooks/use_should_show_graph';
import { useUpsellingComponent } from '../../../common/hooks/use_upselling';
import { useFetchGraphData } from '@kbn/cloud-security-posture-graph/src/hooks';
import { GRAPH_PREVIEW_TECHNICAL_PREVIEW_TEST_ID, GRAPH_PREVIEW_TEST_ID } from './test_ids';
import { EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID } from '../../shared/components/test_ids';

jest.mock('../hooks/use_graph_preview');
jest.mock('../../graph/hooks/use_should_show_graph');
jest.mock('../../../common/hooks/use_upselling');
jest.mock('@kbn/cloud-security-posture-graph/src/hooks', () => ({
  useFetchGraphData: jest.fn(),
}));
jest.mock('@kbn/cloud-security-posture-common/utils/ui_metrics', () => ({
  uiMetricService: { trackUiMetric: jest.fn() },
  GRAPH_PREVIEW: 'graph_preview',
}));
jest.mock('./graph_preview', () => ({
  GraphPreview: () => <div data-test-subj="graphPreviewStub" />,
}));

const mockUseGraphPreview = jest.mocked(useGraphPreview);
const mockUseShouldShowGraph = jest.mocked(useShouldShowGraph);
const mockUseUpsellingComponent = jest.mocked(useUpsellingComponent);
const mockUseFetchGraphData = jest.mocked(useFetchGraphData);
const mockTrackUiMetric = jest.mocked(uiMetricService.trackUiMetric);

const createMockHit = (flattened: DataTableRecord['flattened']): DataTableRecord =>
  ({
    id: '1',
    raw: { _id: '1', _index: 'index-1', _source: {} },
    flattened,
    isAnchor: false,
  } as DataTableRecord);

const renderContainer = (
  overrides: Partial<{
    hit: DataTableRecord;
    onShowGraph: () => void;
    showIcon: boolean;
    disableNavigation: boolean;
  }> = {}
) =>
  render(
    <TestProviders>
      <GraphPreviewContainer
        hit={createMockHit({})}
        onShowGraph={onShowGraph}
        showIcon={false}
        disableNavigation={false}
        {...overrides}
      />
    </TestProviders>
  );

const onShowGraph = jest.fn();

describe('GraphPreviewContainer (flyout v2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUpsellingComponent.mockReturnValue(null);
    mockUseFetchGraphData.mockReturnValue({
      isLoading: false,
      isError: false,
      isFetching: false,
      error: null,
      refresh: jest.fn(),
      data: { nodes: [{ id: 'n1' } as never], edges: [] },
    } as unknown as ReturnType<typeof useFetchGraphData>);
  });

  const populatedPreviewData = {
    eventIds: ['event-id'],
    timestamp: '2025-01-01T00:00:00.000Z',
    actorIds: ['alice'],
    targetIds: ['bob'],
    action: ['process-started'],
    isAlert: true,
    hasGraphData: true,
    shouldShowGraph: true,
  };

  it('renders the panel and the technical preview badge when graph data is available', () => {
    mockUseGraphPreview.mockReturnValue(populatedPreviewData);

    const { getByTestId } = renderContainer();

    expect(getByTestId(`${GRAPH_PREVIEW_TEST_ID}LeftSection`)).toBeInTheDocument();
    expect(getByTestId(GRAPH_PREVIEW_TECHNICAL_PREVIEW_TEST_ID)).toBeInTheDocument();
  });

  it('returns null when graph cannot be shown and no upsell is registered', () => {
    mockUseGraphPreview.mockReturnValue({
      ...populatedPreviewData,
      shouldShowGraph: false,
    });

    const { queryByTestId } = renderContainer();

    expect(queryByTestId(`${GRAPH_PREVIEW_TEST_ID}LeftSection`)).not.toBeInTheDocument();
  });

  it('renders the upsell component when the license is insufficient', () => {
    mockUseGraphPreview.mockReturnValue({
      ...populatedPreviewData,
      shouldShowGraph: false,
    });
    mockUseUpsellingComponent.mockReturnValue(() => <div data-test-subj="graphUpsellStub" />);

    const { getByTestId } = renderContainer();

    expect(getByTestId('graphUpsellStub')).toBeInTheDocument();
  });

  it('wires the header link callback when navigation is enabled', () => {
    mockUseGraphPreview.mockReturnValue(populatedPreviewData);

    const { getByTestId } = renderContainer({ disableNavigation: false });

    getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(GRAPH_PREVIEW_TEST_ID)).click();
    expect(onShowGraph).toHaveBeenCalled();
  });

  it('omits the header link when navigation is disabled', () => {
    mockUseGraphPreview.mockReturnValue(populatedPreviewData);

    const { queryByTestId } = renderContainer({ disableNavigation: true });

    expect(
      queryByTestId(EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(GRAPH_PREVIEW_TEST_ID))
    ).not.toBeInTheDocument();
  });
});

describe('GraphPreviewContainer entity mode (flyout v2)', () => {
  const renderEntityContainer = (
    overrides: Partial<{
      entityId: string;
      onShowGraph: () => void;
      showIcon: boolean;
      disableNavigation: boolean;
    }> = {}
  ) =>
    render(
      <TestProviders>
        <GraphPreviewContainer
          mode="entity"
          entityId="entity-1"
          onShowGraph={onShowGraph}
          showIcon={false}
          disableNavigation={false}
          {...overrides}
        />
      </TestProviders>
    );

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUpsellingComponent.mockReturnValue(null);
    mockUseShouldShowGraph.mockReturnValue(true);
    mockUseFetchGraphData.mockReturnValue({
      isLoading: false,
      isError: false,
      isFetching: false,
      error: null,
      refresh: jest.fn(),
      data: { nodes: [{ id: 'n1' } as never], edges: [] },
    } as unknown as ReturnType<typeof useFetchGraphData>);
  });

  it('queries entity graph data with the entity ID and a 30-day window', () => {
    renderEntityContainer({ entityId: 'entity-42' });

    expect(mockUseFetchGraphData).toHaveBeenCalledWith(
      expect.objectContaining({
        req: {
          query: {
            entityIds: [{ id: 'entity-42', isOrigin: true }],
            start: 'now-30d',
            end: 'now',
          },
        },
        options: expect.objectContaining({ enabled: true }),
      })
    );
  });

  it('does not call useGraphPreview in entity mode', () => {
    renderEntityContainer();
    expect(mockUseGraphPreview).not.toHaveBeenCalled();
  });

  it('renders the panel and tracks the UI metric when the graph can be shown', () => {
    const { getByTestId } = renderEntityContainer();

    expect(getByTestId(`${GRAPH_PREVIEW_TEST_ID}LeftSection`)).toBeInTheDocument();
    expect(mockTrackUiMetric).toHaveBeenCalledWith(METRIC_TYPE.LOADED, GRAPH_PREVIEW);
  });

  it('returns null when the graph cannot be shown and no upsell is registered', () => {
    mockUseShouldShowGraph.mockReturnValue(false);

    const { queryByTestId } = renderEntityContainer();

    expect(queryByTestId(`${GRAPH_PREVIEW_TEST_ID}LeftSection`)).not.toBeInTheDocument();
    expect(mockUseFetchGraphData).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({ enabled: false }),
      })
    );
  });

  it('renders the upsell component when the license is insufficient', () => {
    mockUseShouldShowGraph.mockReturnValue(false);
    mockUseUpsellingComponent.mockReturnValue(() => <div data-test-subj="graphUpsellStub" />);

    const { getByTestId } = renderEntityContainer();

    expect(getByTestId('graphUpsellStub')).toBeInTheDocument();
  });

  it('wires the header link callback when navigation is enabled', () => {
    const { getByTestId } = renderEntityContainer({ disableNavigation: false });

    getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(GRAPH_PREVIEW_TEST_ID)).click();
    expect(onShowGraph).toHaveBeenCalled();
  });

  it('omits the header link when navigation is disabled', () => {
    const { queryByTestId } = renderEntityContainer({ disableNavigation: true });

    expect(
      queryByTestId(EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(GRAPH_PREVIEW_TEST_ID))
    ).not.toBeInTheDocument();
  });
});
