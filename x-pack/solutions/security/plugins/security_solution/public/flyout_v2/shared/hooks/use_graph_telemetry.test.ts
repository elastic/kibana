/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useGraphTelemetry } from './use_graph_telemetry';
import { useKibana } from '../../../common/lib/kibana';
import { GraphEventTypes } from '../../../common/lib/telemetry';

jest.mock('../../../common/lib/kibana');

const mockReportEvent = jest.fn();

describe('useGraphTelemetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: { telemetry: { reportEvent: mockReportEvent } },
    });
  });

  it('maps a node action to GraphEventTypes.NodeActionClicked', () => {
    const { result } = renderHook(() => useGraphTelemetry());

    result.current.onTelemetryEvent({
      type: 'node_action',
      nodeType: 'entity',
      action: 'show_actions_by',
      state: 'show',
    });

    expect(mockReportEvent).toHaveBeenCalledWith(GraphEventTypes.NodeActionClicked, {
      nodeType: 'entity',
      action: 'show_actions_by',
      state: 'show',
    });
  });

  it('omits state for non-toggle node actions', () => {
    const { result } = renderHook(() => useGraphTelemetry());

    result.current.onTelemetryEvent({
      type: 'node_action',
      nodeType: 'grouped_entity',
      action: 'show_grouped_entities',
    });

    expect(mockReportEvent).toHaveBeenCalledWith(GraphEventTypes.NodeActionClicked, {
      nodeType: 'grouped_entity',
      action: 'show_grouped_entities',
      state: undefined,
    });
  });

  it('maps a grouped event node action without a state', () => {
    const { result } = renderHook(() => useGraphTelemetry());

    result.current.onTelemetryEvent({
      type: 'node_action',
      nodeType: 'grouped_event',
      action: 'show_grouped_events',
    });

    expect(mockReportEvent).toHaveBeenCalledWith(GraphEventTypes.NodeActionClicked, {
      nodeType: 'grouped_event',
      action: 'show_grouped_events',
      state: undefined,
    });
  });

  it('maps filter_changed and search_submitted', () => {
    const { result } = renderHook(() => useGraphTelemetry());

    result.current.onTelemetryEvent({ type: 'filter_changed', change: 'added' });
    result.current.onTelemetryEvent({
      type: 'search_submitted',
      timeRangeChanged: true,
      queryChanged: false,
    });

    expect(mockReportEvent).toHaveBeenNthCalledWith(1, GraphEventTypes.FilterChanged, {
      change: 'added',
    });
    expect(mockReportEvent).toHaveBeenNthCalledWith(2, GraphEventTypes.SearchSubmitted, {
      timeRangeChanged: true,
      queryChanged: false,
    });
  });

  it('reports the preview expand', () => {
    const { result } = renderHook(() => useGraphTelemetry());

    result.current.reportPreviewExpanded();

    expect(mockReportEvent).toHaveBeenCalledWith(GraphEventTypes.PreviewExpanded, {});
  });

  it('does not throw when the telemetry service is unavailable', () => {
    (useKibana as jest.Mock).mockReturnValue({ services: {} });
    const { result } = renderHook(() => useGraphTelemetry());

    expect(() => {
      result.current.onTelemetryEvent({ type: 'filter_changed', change: 'removed' });
      result.current.reportPreviewExpanded();
    }).not.toThrow();
  });
});
