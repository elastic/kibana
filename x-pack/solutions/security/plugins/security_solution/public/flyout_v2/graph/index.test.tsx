/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { Graph, GRAPH_TEST_ID } from '.';
import { useGraphPreview } from '../document/hooks/use_graph_preview';

jest.mock('../document/hooks/use_graph_preview');
jest.mock('../../flyout/shared/components/graph_visualization', () => ({
  GraphVisualization: jest.fn(() => <div data-test-subj="sharedGraphVisualizationMock" />),
}));
jest.mock('../shared/components/tools_flyout_header', () => ({
  ToolsFlyoutHeader: ({ title }: { title: React.ReactNode }) => (
    <div data-test-subj="toolsFlyoutHeaderMock">{title}</div>
  ),
}));

const mockUseGraphPreview = jest.mocked(useGraphPreview);

const createMockHit = (flattened: DataTableRecord['flattened']): DataTableRecord =>
  ({
    id: '1',
    raw: { _id: '1', _index: 'test', _source: {} },
    flattened,
    isAnchor: false,
  } as DataTableRecord);

describe('Graph (tools flyout)', () => {
  const renderCellActions = jest.fn();
  const onAlertUpdated = jest.fn();

  const renderGraph = (hit: DataTableRecord = createMockHit({})) =>
    render(
      <IntlProvider locale="en">
        <Graph hit={hit} renderCellActions={renderCellActions} onAlertUpdated={onAlertUpdated} />
      </IntlProvider>
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when there are no event ids', () => {
    mockUseGraphPreview.mockReturnValue({
      eventIds: [],
      timestamp: '2025-01-01T00:00:00.000Z',
      actorIds: [],
      targetIds: [],
      action: [],
      isAlert: false,
      hasGraphData: false,
      shouldShowGraph: false,
    });

    const { container } = renderGraph();

    expect(container).toBeEmptyDOMElement();
  });

  it('returns null when timestamp is missing', () => {
    mockUseGraphPreview.mockReturnValue({
      eventIds: ['event-id'],
      timestamp: null,
      actorIds: [],
      targetIds: [],
      action: [],
      isAlert: false,
      hasGraphData: false,
      shouldShowGraph: false,
    });

    const { container } = renderGraph();

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the header and the shared graph visualization when data is present', () => {
    mockUseGraphPreview.mockReturnValue({
      eventIds: ['event-id'],
      timestamp: '2025-01-01T00:00:00.000Z',
      actorIds: ['alice'],
      targetIds: ['bob'],
      action: ['process-started'],
      isAlert: true,
      hasGraphData: true,
      shouldShowGraph: true,
    });

    const { getByTestId } = renderGraph();

    expect(getByTestId(GRAPH_TEST_ID)).toBeInTheDocument();
    expect(getByTestId('toolsFlyoutHeaderMock')).toHaveTextContent('Graph');
    expect(getByTestId('sharedGraphVisualizationMock')).toBeInTheDocument();
  });
});
