/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TestProviders } from '../../../../../common/mock';
import { ENTITY_ANALYTICS_TABLE_ID } from '../../../../../entity_analytics/components/home/constants';
import { useGraphTelemetry } from '../../../../shared/hooks/use_graph_telemetry';
import { useOpenFlyout } from '../../../../shared/hooks/use_open_flyout';
import { GraphVisualization } from '../../../../document/tools/graph/components/graph_visualization';
import { GraphView } from '.';
import type { GraphViewProps } from '.';

jest.mock('../../../../shared/hooks/use_graph_telemetry');
jest.mock('../../../../shared/hooks/use_open_flyout');
jest.mock('../../../../document/tools/graph/components/graph_visualization', () => ({
  GraphVisualization: jest.fn(() => <div data-test-subj="mockGraphVisualization" />),
}));

const mockOnTelemetryEvent = jest.fn();
const mockOpen = jest.fn();

const renderGraphView = (scopeId: string, entryPoint: GraphViewProps['entryPoint']) =>
  render(
    <TestProviders>
      <GraphView
        entityId="entity-id"
        scopeId={scopeId}
        entityName="entity-name"
        onShowEntity={jest.fn()}
        entryPoint={entryPoint}
      />
    </TestProviders>
  );

const openGroupedPanel = () => {
  const { onShowGrouped } = jest.mocked(GraphVisualization).mock.calls[0][0];
  onShowGrouped({
    docMode: 'grouped-entities',
    scopeId: 'graph-scope',
    dataViewId: 'data-view-id',
    documentIds: [],
    entityItems: [],
  });
  const [panel] = mockOpen.mock.calls[0];
  return panel;
};

describe('<GraphView />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useGraphTelemetry).mockReturnValue({
      onTelemetryEvent: mockOnTelemetryEvent,
      reportGraphPreviewShown: jest.fn(),
      reportGraphPreviewExpanded: jest.fn(),
      reportGraphOpened: jest.fn(),
      reportDrillThrough: jest.fn(),
    });
    jest.mocked(useOpenFlyout).mockReturnValue(mockOpen);
  });

  it('passes the given entry point to the grouped panel telemetry and the graph it renders', () => {
    renderGraphView('some-flyout-scope', 'entity_flyout');

    expect(useGraphTelemetry).toHaveBeenCalledWith('entity_flyout');
    expect(jest.mocked(GraphVisualization).mock.calls[0][0]).toEqual(
      expect.objectContaining({ mode: 'entity', entryPoint: 'entity_flyout' })
    );
    expect(openGroupedPanel().props.onTelemetryEvent).toBe(mockOnTelemetryEvent);
  });

  it('passes the entities grid entry point as is when the scope is the entities table scope', () => {
    renderGraphView(ENTITY_ANALYTICS_TABLE_ID, 'entity_data_grid');

    expect(useGraphTelemetry).toHaveBeenCalledWith('entity_data_grid');
    expect(useGraphTelemetry).not.toHaveBeenCalledWith('entity_flyout');
    expect(jest.mocked(GraphVisualization).mock.calls[0][0]).toEqual(
      expect.objectContaining({ mode: 'entity', entryPoint: 'entity_data_grid' })
    );
    expect(openGroupedPanel().props.onTelemetryEvent).toBe(mockOnTelemetryEvent);
  });

  it('does not fall back to an entry point when none is given', () => {
    renderGraphView('some-flyout-scope', undefined);

    expect(useGraphTelemetry).toHaveBeenCalledWith(undefined);
    expect(useGraphTelemetry).not.toHaveBeenCalledWith('entity_flyout');
    const props = jest.mocked(GraphVisualization).mock.calls[0][0];
    expect(props).toHaveProperty('entryPoint', undefined);
    expect(openGroupedPanel().props.onTelemetryEvent).toBe(mockOnTelemetryEvent);
  });

  it('does not fall back to an entry point for the entities table scope either', () => {
    renderGraphView(ENTITY_ANALYTICS_TABLE_ID, undefined);

    expect(useGraphTelemetry).toHaveBeenCalledWith(undefined);
    expect(useGraphTelemetry).not.toHaveBeenCalledWith('entity_flyout');
    expect(useGraphTelemetry).not.toHaveBeenCalledWith('entity_data_grid');
    const props = jest.mocked(GraphVisualization).mock.calls[0][0];
    expect(props).toHaveProperty('entryPoint', undefined);
  });
});
