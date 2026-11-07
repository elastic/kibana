/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useGraphTelemetry } from './use_graph_telemetry';
import { useKibana } from '../../../common/lib/kibana';
import type { GraphEntryPoint } from '../../../common/lib/telemetry';
import { GraphEventTypes } from '../../../common/lib/telemetry';

jest.mock('../../../common/lib/kibana');

const mockReportEvent = jest.fn();
const entryPoint: GraphEntryPoint = 'alert_flyout';

describe('useGraphTelemetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: { telemetry: { reportEvent: mockReportEvent } },
    });
  });

  it('maps a node action to node_action_clicked', () => {
    const { result } = renderHook(() => useGraphTelemetry(entryPoint));

    result.current.onTelemetryEvent({
      type: 'node_action',
      nodeType: 'entity',
      action: 'show_actions_by',
      state: 'show',
    });

    expect(mockReportEvent).toHaveBeenCalledWith(GraphEventTypes.EntityGraph, {
      id: 'node_action_clicked',
      entryPoint,
      nodeType: 'entity',
      action: 'show_actions_by',
      state: 'show',
    });
  });

  it('omits state for non-toggle node actions', () => {
    const { result } = renderHook(() => useGraphTelemetry(entryPoint));

    result.current.onTelemetryEvent({
      type: 'node_action',
      nodeType: 'grouped_entity',
      action: 'show_grouped_entities',
    });

    expect(mockReportEvent).toHaveBeenCalledWith(GraphEventTypes.EntityGraph, {
      id: 'node_action_clicked',
      entryPoint,
      nodeType: 'grouped_entity',
      action: 'show_grouped_entities',
    });
  });

  it('maps a grouped event node action without a state', () => {
    const { result } = renderHook(() => useGraphTelemetry(entryPoint));

    result.current.onTelemetryEvent({
      type: 'node_action',
      nodeType: 'grouped_event',
      action: 'show_grouped_events',
    });

    expect(mockReportEvent).toHaveBeenCalledWith(GraphEventTypes.EntityGraph, {
      id: 'node_action_clicked',
      entryPoint,
      nodeType: 'grouped_event',
      action: 'show_grouped_events',
    });
  });

  it('maps filter_changed', () => {
    const { result } = renderHook(() => useGraphTelemetry(entryPoint));

    result.current.onTelemetryEvent({ type: 'filter_changed', change: 'added' });

    expect(mockReportEvent).toHaveBeenCalledWith(GraphEventTypes.EntityGraph, {
      id: 'filter_changed',
      entryPoint,
      change: 'added',
    });
  });

  it('maps search_submitted', () => {
    const { result } = renderHook(() => useGraphTelemetry(entryPoint));

    result.current.onTelemetryEvent({
      type: 'search_submitted',
      timeRangeChanged: true,
      queryChanged: false,
    });

    expect(mockReportEvent).toHaveBeenCalledWith(GraphEventTypes.EntityGraph, {
      id: 'search_submitted',
      entryPoint,
      timeRangeChanged: true,
      queryChanged: false,
    });
  });

  it('maps expansion_result', () => {
    const { result } = renderHook(() => useGraphTelemetry(entryPoint));

    result.current.onTelemetryEvent({
      type: 'expansion_result',
      action: 'show_actions_by',
      nodeType: 'entity',
      state: 'show',
      nodesAdded: true,
      nodesLimitReached: false,
    });

    expect(mockReportEvent).toHaveBeenCalledWith(GraphEventTypes.EntityGraph, {
      id: 'expansion_result',
      entryPoint,
      action: 'show_actions_by',
      nodeType: 'entity',
      state: 'show',
      nodesAdded: true,
      nodesLimitReached: false,
    });
  });

  it('maps empty_state_shown', () => {
    const { result } = renderHook(() => useGraphTelemetry(entryPoint));

    result.current.onTelemetryEvent({ type: 'empty_state_shown', emptyReason: 'no_data' });

    expect(mockReportEvent).toHaveBeenCalledWith(GraphEventTypes.EntityGraph, {
      id: 'empty_state_shown',
      entryPoint,
      emptyReason: 'no_data',
    });
  });

  it('maps fetch_failed', () => {
    const { result } = renderHook(() => useGraphTelemetry(entryPoint));

    result.current.onTelemetryEvent({ type: 'fetch_failed', errorCategory: 'timeout' });

    expect(mockReportEvent).toHaveBeenCalledWith(GraphEventTypes.EntityGraph, {
      id: 'fetch_failed',
      entryPoint,
      errorCategory: 'timeout',
    });
  });

  it('maps grouped_panel_opened', () => {
    const { result } = renderHook(() => useGraphTelemetry(entryPoint));

    result.current.onTelemetryEvent({ type: 'grouped_panel_opened', nodeType: 'grouped_event' });

    expect(mockReportEvent).toHaveBeenCalledWith(GraphEventTypes.EntityGraph, {
      id: 'grouped_panel_opened',
      entryPoint,
      nodeType: 'grouped_event',
    });
  });

  it('maps grouped_item_viewed', () => {
    const { result } = renderHook(() => useGraphTelemetry(entryPoint));

    result.current.onTelemetryEvent({ type: 'grouped_item_viewed', itemType: 'alert' });

    expect(mockReportEvent).toHaveBeenCalledWith(GraphEventTypes.EntityGraph, {
      id: 'grouped_item_viewed',
      entryPoint,
      itemType: 'alert',
    });
  });

  it('reports the graph preview being shown with a graph', () => {
    const { result } = renderHook(() => useGraphTelemetry(entryPoint));

    result.current.reportGraphPreviewShown(false);

    expect(mockReportEvent).toHaveBeenCalledTimes(1);
    expect(mockReportEvent).toHaveBeenCalledWith(GraphEventTypes.EntityGraph, {
      id: 'graph_preview_shown',
      entryPoint,
      isEmpty: false,
    });
  });

  it('reports the graph preview being shown empty', () => {
    const { result } = renderHook(() => useGraphTelemetry(entryPoint));

    result.current.reportGraphPreviewShown(true);

    expect(mockReportEvent).toHaveBeenCalledTimes(1);
    expect(mockReportEvent).toHaveBeenCalledWith(GraphEventTypes.EntityGraph, {
      id: 'graph_preview_shown',
      entryPoint,
      isEmpty: true,
    });
  });

  it('reports the graph preview expand', () => {
    const { result } = renderHook(() => useGraphTelemetry(entryPoint));

    result.current.reportGraphPreviewExpanded();

    expect(mockReportEvent).toHaveBeenCalledTimes(1);
    expect(mockReportEvent).toHaveBeenCalledWith(GraphEventTypes.EntityGraph, {
      id: 'graph_preview_expanded',
      entryPoint,
    });
  });

  it('reports the graph opening', () => {
    const { result } = renderHook(() => useGraphTelemetry(entryPoint));

    result.current.reportGraphOpened();

    expect(mockReportEvent).toHaveBeenCalledWith(GraphEventTypes.EntityGraph, {
      id: 'graph_opened',
      entryPoint,
    });
  });

  it('reports a drill-through with its target', () => {
    const { result } = renderHook(() => useGraphTelemetry(entryPoint));

    result.current.reportDrillThrough('network');

    expect(mockReportEvent).toHaveBeenCalledWith(GraphEventTypes.EntityGraph, {
      id: 'drill_through',
      entryPoint,
      drillTarget: 'network',
    });
  });

  it('uses the entry point it was given', () => {
    const { result } = renderHook(() => useGraphTelemetry('entity_data_grid'));

    result.current.reportGraphOpened();

    expect(mockReportEvent).toHaveBeenCalledWith(GraphEventTypes.EntityGraph, {
      id: 'graph_opened',
      entryPoint: 'entity_data_grid',
    });
  });

  it('does not throw when the telemetry service is unavailable', () => {
    (useKibana as jest.Mock).mockReturnValue({ services: {} });
    const { result } = renderHook(() => useGraphTelemetry(entryPoint));

    expect(() => {
      result.current.onTelemetryEvent({ type: 'filter_changed', change: 'removed' });
      result.current.reportGraphPreviewShown(true);
      result.current.reportGraphPreviewExpanded();
      result.current.reportGraphOpened();
      result.current.reportDrillThrough('event');
    }).not.toThrow();
  });
});
