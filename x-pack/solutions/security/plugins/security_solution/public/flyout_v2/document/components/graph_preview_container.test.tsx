/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { TestProviders } from '../../../common/mock';
import { GraphPreviewContainer } from './graph_preview_container';
import { useGraphPreview } from '../hooks/use_graph_preview';
import { useUpsellingComponent } from '../../../common/hooks/use_upselling';
import { useFetchGraphData } from '@kbn/cloud-security-posture-graph/src/hooks';
import { GRAPH_PREVIEW_TECHNICAL_PREVIEW_TEST_ID, GRAPH_PREVIEW_TEST_ID } from './test_ids';
import { EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID } from '../../shared/components/test_ids';

jest.mock('../hooks/use_graph_preview');
jest.mock('../../../common/hooks/use_upselling');
jest.mock('@kbn/cloud-security-posture-graph/src/hooks', () => ({
  useFetchGraphData: jest.fn(),
}));
jest.mock('../../../flyout/shared/components/graph_preview', () => ({
  GraphPreview: () => <div data-test-subj="graphPreviewStub" />,
}));

const mockUseGraphPreview = jest.mocked(useGraphPreview);
const mockUseUpsellingComponent = jest.mocked(useUpsellingComponent);
const mockUseFetchGraphData = jest.mocked(useFetchGraphData);

const createMockHit = (flattened: DataTableRecord['flattened']): DataTableRecord =>
  ({
    id: '1',
    raw: { _id: '1', _index: 'index-1', _source: {} },
    flattened,
    isAnchor: false,
  } as DataTableRecord);

const renderContainer = (
  overrides: Partial<React.ComponentProps<typeof GraphPreviewContainer>> = {}
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
