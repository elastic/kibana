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

const renderGraphView = (
  scopeId: string,
  extraProps: Partial<Pick<GraphViewProps, 'entryPoint'>> = {}
) =>
  render(
    <TestProviders>
      <GraphView
        entityId="entity-id"
        scopeId={scopeId}
        entityName="entity-name"
        onShowEntity={jest.fn()}
        {...extraProps}
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

  it('reports grouped panel telemetry with the entity flyout entry point by default', () => {
    renderGraphView('some-flyout-scope');

    expect(useGraphTelemetry).toHaveBeenCalledWith('entity_flyout');
    expect(openGroupedPanel().props.onTelemetryEvent).toBe(mockOnTelemetryEvent);
  });

  it('keeps the entity flyout entry point when the scope is the entities table scope', () => {
    renderGraphView(ENTITY_ANALYTICS_TABLE_ID);

    expect(useGraphTelemetry).toHaveBeenCalledWith('entity_flyout');
    expect(useGraphTelemetry).not.toHaveBeenCalledWith('entity_data_grid');
    expect(jest.mocked(GraphVisualization).mock.calls[0][0]).toEqual(
      expect.objectContaining({ entryPoint: 'entity_flyout' })
    );
    expect(openGroupedPanel().props.onTelemetryEvent).toBe(mockOnTelemetryEvent);
  });

  it('uses the given entry point for the grouped panel telemetry and the graph it renders', () => {
    renderGraphView(ENTITY_ANALYTICS_TABLE_ID, { entryPoint: 'entity_data_grid' });

    expect(useGraphTelemetry).toHaveBeenCalledWith('entity_data_grid');
    expect(useGraphTelemetry).not.toHaveBeenCalledWith('entity_flyout');
    expect(jest.mocked(GraphVisualization).mock.calls[0][0]).toEqual(
      expect.objectContaining({ mode: 'entity', entryPoint: 'entity_data_grid' })
    );
    expect(openGroupedPanel().props.onTelemetryEvent).toBe(mockOnTelemetryEvent);
  });
});
