/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { render, waitFor } from '@testing-library/react';
import { GraphInvestigation } from '@kbn/cloud-security-posture-graph';
import { ENTITY_ANALYTICS_TABLE_ID } from '../../../../../entity_analytics/components/home/constants';
import { GraphVisualization, GRAPH_VISUALIZATION_TEST_ID } from './graph_visualization';

const mockToasts = {
  addDanger: jest.fn(),
  addError: jest.fn(),
  addSuccess: jest.fn(),
  addWarning: jest.fn(),
  addInfo: jest.fn(),
  remove: jest.fn(),
};

const mockInvestigateInTimeline = {
  investigateInTimeline: jest.fn(),
};

const GRAPH_INVESTIGATION_TEST_ID = 'cloudSecurityPostureGraphGraphInvestigation';

jest.mock('@kbn/cloud-security-posture-graph', () => {
  const { getNodeDocumentMode, getSingleDocumentData } = jest.requireActual(
    '@kbn/cloud-security-posture-graph/src/components/utils'
  );

  return {
    GraphInvestigation: jest.fn(),
    getNodeDocumentMode: jest.fn().mockImplementation(getNodeDocumentMode),
    getSingleDocumentData: jest.fn().mockImplementation(getSingleDocumentData),
  };
});

const mockCapabilities = {
  securitySolutionTimeline: {
    read: true,
    crud: true,
  },
};

jest.mock('../../../../../common/lib/kibana', () => ({
  useToasts: () => mockToasts,
  useKibana: () => ({
    services: {
      application: {
        capabilities: mockCapabilities,
      },
    },
  }),
  KibanaServices: {
    get: () => ({
      uiSettings: {
        get: jest.fn().mockReturnValue(true),
      },
    }),
  },
}));

const mockOnTelemetryEvent = jest.fn();
const mockReportGraphOpened = jest.fn();
const mockReportDrillThrough = jest.fn();
const mockUseGraphTelemetry = jest.fn();

jest.mock('../../../../shared/hooks/use_graph_telemetry', () => ({
  useGraphTelemetry: (entryPoint: string) => mockUseGraphTelemetry(entryPoint),
}));

jest.mock('../../../../../common/hooks/timeline/use_investigate_in_timeline', () => ({
  useInvestigateInTimeline: () => mockInvestigateInTimeline,
}));

jest.mock('../../../../../data_view_manager/hooks/use_data_view', () => ({
  useDataView: () => ({
    dataView: {
      id: 'experimental-data-view',
      getIndexPattern: jest.fn().mockReturnValue('experimental-data-view-pattern'),
    },
    status: 'ready',
  }),
}));

const callbacks = {
  onShowDocument: jest.fn(),
  onShowEntity: jest.fn(),
  onShowGrouped: jest.fn(),
  onShowNetwork: jest.fn(),
};

const EVENT_PROPS = {
  mode: 'event' as const,
  scopeId: 'test-scope',
  eventIds: ['event-1', 'event-2'],
  timestamp: new Date().toISOString(),
  isAlert: false,
  ...callbacks,
};

const ENTITY_PROPS = {
  mode: 'entity' as const,
  scopeId: 'test-scope',
  entityId: 'entity-1',
  ...callbacks,
};

describe('GraphVisualization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGraphTelemetry.mockReturnValue({
      onTelemetryEvent: mockOnTelemetryEvent,
      reportGraphPreviewShown: jest.fn(),
      reportGraphPreviewExpanded: jest.fn(),
      reportGraphOpened: mockReportGraphOpened,
      reportDrillThrough: mockReportDrillThrough,
    });
    (GraphInvestigation as unknown as jest.Mock).mockReturnValue(
      <div data-test-subj={GRAPH_INVESTIGATION_TEST_ID} />
    );
  });

  it('passes the graph telemetry handler to GraphInvestigation', async () => {
    render(<GraphVisualization {...EVENT_PROPS} />);

    await waitFor(() => expect(GraphInvestigation).toHaveBeenCalled());
    expect((GraphInvestigation as unknown as jest.Mock).mock.calls[0][0].onTelemetryEvent).toBe(
      mockOnTelemetryEvent
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('telemetry', () => {
    it('reports graph_opened exactly once on mount, not again after a re-render', async () => {
      // In production the function identity changes whenever the telemetry service or entry point
      // does, so hand out a new function on every render.
      mockUseGraphTelemetry.mockImplementation(() => ({
        onTelemetryEvent: mockOnTelemetryEvent,
        reportGraphPreviewShown: jest.fn(),
        reportGraphPreviewExpanded: jest.fn(),
        reportGraphOpened: () => mockReportGraphOpened(),
        reportDrillThrough: mockReportDrillThrough,
      }));
      const { rerender } = render(<GraphVisualization {...EVENT_PROPS} />);
      await waitFor(() => expect(GraphInvestigation).toHaveBeenCalled());

      rerender(<GraphVisualization {...EVENT_PROPS} eventIds={['event-3']} />);

      expect(mockReportGraphOpened).toHaveBeenCalledTimes(1);
    });

    it('uses the alert_flyout entry point for an alert', () => {
      render(<GraphVisualization {...EVENT_PROPS} isAlert />);

      expect(mockUseGraphTelemetry).toHaveBeenCalledWith('alert_flyout');
    });

    it('uses the event_flyout entry point for a non-alert event', () => {
      render(<GraphVisualization {...EVENT_PROPS} isAlert={false} />);

      expect(mockUseGraphTelemetry).toHaveBeenCalledWith('event_flyout');
    });

    it('uses the entity_flyout entry point for an entity', () => {
      render(<GraphVisualization {...ENTITY_PROPS} />);

      expect(mockUseGraphTelemetry).toHaveBeenCalledWith('entity_flyout');
    });

    it('keeps the entity_flyout entry point when the scope is the entities table scope', () => {
      render(<GraphVisualization {...ENTITY_PROPS} scopeId={ENTITY_ANALYTICS_TABLE_ID} />);

      expect(mockUseGraphTelemetry).toHaveBeenCalledWith('entity_flyout');
      expect(mockUseGraphTelemetry).not.toHaveBeenCalledWith('entity_data_grid');
    });

    it('uses the entry point the entity graph was opened from when one is given', () => {
      render(<GraphVisualization {...ENTITY_PROPS} entryPoint="entity_data_grid" />);

      expect(mockUseGraphTelemetry).toHaveBeenCalledWith('entity_data_grid');
      expect(mockUseGraphTelemetry).not.toHaveBeenCalledWith('entity_flyout');
    });
  });

  describe('event mode', () => {
    it('renders the wrapper and lazy-loads GraphInvestigation', async () => {
      const { getByTestId } = render(<GraphVisualization {...EVENT_PROPS} />);
      expect(getByTestId(GRAPH_VISUALIZATION_TEST_ID)).toBeInTheDocument();

      await waitFor(() => {
        expect(getByTestId(GRAPH_INVESTIGATION_TEST_ID)).toBeInTheDocument();
      });
    });

    it('passes originEventIds derived from eventIds and isAlert', async () => {
      render(<GraphVisualization {...EVENT_PROPS} />);

      await waitFor(() => {
        expect(GraphInvestigation).toHaveBeenCalledTimes(1);
      });

      const { initialState } = jest.mocked(GraphInvestigation).mock.calls[0][0];
      expect(initialState.originEventIds).toEqual([
        { id: 'event-1', isAlert: false },
        { id: 'event-2', isAlert: false },
      ]);
      expect(initialState.entityIds).toBeUndefined();
    });

    it('passes a timestamp-anchored timeRange', async () => {
      const timestamp = '2024-01-15T10:00:00.000Z';
      render(<GraphVisualization {...EVENT_PROPS} timestamp={timestamp} />);

      await waitFor(() => {
        expect(GraphInvestigation).toHaveBeenCalledTimes(1);
      });

      const { initialState } = jest.mocked(GraphInvestigation).mock.calls[0][0];
      expect(initialState.timeRange).toEqual({
        from: `${timestamp}||-30m`,
        to: `${timestamp}||+30m`,
      });
    });
  });

  describe('entity mode', () => {
    it('renders the wrapper and lazy-loads GraphInvestigation', async () => {
      const { getByTestId } = render(<GraphVisualization {...ENTITY_PROPS} />);
      expect(getByTestId(GRAPH_VISUALIZATION_TEST_ID)).toBeInTheDocument();

      await waitFor(() => {
        expect(getByTestId(GRAPH_INVESTIGATION_TEST_ID)).toBeInTheDocument();
      });
    });

    it('passes entityIds with isOrigin: true', async () => {
      render(<GraphVisualization {...ENTITY_PROPS} />);

      await waitFor(() => {
        expect(GraphInvestigation).toHaveBeenCalledTimes(1);
      });

      const { initialState } = jest.mocked(GraphInvestigation).mock.calls[0][0];
      expect(initialState.entityIds).toEqual([{ id: 'entity-1', isOrigin: true }]);
      expect(initialState.originEventIds).toBeUndefined();
    });

    it('passes a rolling 30-day timeRange', async () => {
      render(<GraphVisualization {...ENTITY_PROPS} />);

      await waitFor(() => {
        expect(GraphInvestigation).toHaveBeenCalledTimes(1);
      });

      const { initialState } = jest.mocked(GraphInvestigation).mock.calls[0][0];
      expect(initialState.timeRange).toEqual({ from: 'now-30d', to: 'now' });
    });

    it('seeds the timeRange from the scope when opened from the new Entity Analytics home', async () => {
      render(
        <GraphVisualization {...ENTITY_PROPS} scopeId="entity-analytics-new-entities-table-7d" />
      );

      await waitFor(() => {
        expect(GraphInvestigation).toHaveBeenCalledTimes(1);
      });

      const { initialState } = jest.mocked(GraphInvestigation).mock.calls[0][0];
      expect(initialState.timeRange).toEqual({ from: 'now-7d', to: 'now' });
    });
  });

  describe('graph scope', () => {
    it('gives each mounted graph its own scope derived from the consumer scope', async () => {
      render(
        <>
          <GraphVisualization {...ENTITY_PROPS} />
          <GraphVisualization {...ENTITY_PROPS} entityId="entity-2" />
        </>
      );

      await waitFor(() => {
        expect(GraphInvestigation).toHaveBeenCalledTimes(2);
      });

      const [first, second] = jest
        .mocked(GraphInvestigation)
        .mock.calls.map(([{ scopeId }]) => scopeId);
      expect(first).toMatch(/^test-scope-graph/);
      expect(second).toMatch(/^test-scope-graph/);
      expect(first).not.toEqual(second);
    });

    it('uses graphScopeId as is when provided', async () => {
      const { getNodeDocumentMode } = jest.requireMock('@kbn/cloud-security-posture-graph');
      getNodeDocumentMode.mockReturnValueOnce('grouped-events');

      render(<GraphVisualization {...EVENT_PROPS} graphScopeId="test-scope" />);

      await waitFor(() => {
        expect(GraphInvestigation).toHaveBeenCalledTimes(1);
      });

      const { onOpenEventPreview, scopeId } = jest.mocked(GraphInvestigation).mock.calls[0][0];
      expect(scopeId).toBe('test-scope');

      onOpenEventPreview?.({ documentsData: [{ id: 'doc-1', type: 'event' }] } as never);
      expect(callbacks.onShowGrouped).toHaveBeenCalledWith(
        expect.objectContaining({ scopeId: 'test-scope' })
      );
    });

    it('keeps the same scope across re-renders', async () => {
      const { rerender } = render(<GraphVisualization {...ENTITY_PROPS} />);

      await waitFor(() => {
        expect(GraphInvestigation).toHaveBeenCalledTimes(1);
      });

      rerender(<GraphVisualization {...ENTITY_PROPS} entityId="entity-2" />);

      await waitFor(() => {
        expect(GraphInvestigation).toHaveBeenCalledTimes(2);
      });

      const [first, second] = jest
        .mocked(GraphInvestigation)
        .mock.calls.map(([{ scopeId }]) => scopeId);
      expect(second).toEqual(first);
    });
  });

  describe('showInvestigateInTimeline', () => {
    it('passes showInvestigateInTimeline as true when user has timeline read access', async () => {
      mockCapabilities.securitySolutionTimeline.read = true;
      render(<GraphVisualization {...EVENT_PROPS} />);

      await waitFor(() => {
        expect(GraphInvestigation).toHaveBeenCalledTimes(1);
      });

      expect(jest.mocked(GraphInvestigation).mock.calls[0][0].showInvestigateInTimeline).toBe(true);
    });

    it('passes showInvestigateInTimeline as false when user has no timeline read access', async () => {
      mockCapabilities.securitySolutionTimeline.read = false;
      render(<GraphVisualization {...EVENT_PROPS} />);

      await waitFor(() => {
        expect(GraphInvestigation).toHaveBeenCalledTimes(1);
      });

      expect(jest.mocked(GraphInvestigation).mock.calls[0][0].showInvestigateInTimeline).toBe(
        false
      );
    });
  });

  describe('node dispatch', () => {
    it('routes a single-event node to onShowDocument', async () => {
      const { getNodeDocumentMode, getSingleDocumentData } = jest.requireMock(
        '@kbn/cloud-security-posture-graph'
      );
      getNodeDocumentMode.mockReturnValueOnce('single-event');
      getSingleDocumentData.mockReturnValueOnce({ id: 'doc-id', index: 'logs-*' });

      render(<GraphVisualization {...EVENT_PROPS} />);

      await waitFor(() => {
        expect(GraphInvestigation).toHaveBeenCalledTimes(1);
      });

      const { onOpenEventPreview } = jest.mocked(GraphInvestigation).mock.calls[0][0];
      onOpenEventPreview?.({} as never);

      expect(callbacks.onShowDocument).toHaveBeenCalledWith('doc-id', 'logs-*', true);
    });

    it('routes a grouped-events node to onShowGrouped using document _ids, even without event.id', async () => {
      const { getNodeDocumentMode } = jest.requireMock('@kbn/cloud-security-posture-graph');
      getNodeDocumentMode.mockReturnValueOnce('grouped-events');

      render(<GraphVisualization {...EVENT_PROPS} />);

      await waitFor(() => {
        expect(GraphInvestigation).toHaveBeenCalledTimes(1);
      });

      const { onOpenEventPreview } = jest.mocked(GraphInvestigation).mock.calls[0][0];
      onOpenEventPreview?.({
        documentsData: [
          { id: 'doc-1', type: 'event', index: 'logs-qualys_vmdr.user_activity-default' },
          { id: 'doc-2', type: 'event', index: 'logs-qualys_vmdr.user_activity-default' },
        ],
      } as never);

      const { scopeId: graphScopeId } = jest.mocked(GraphInvestigation).mock.calls[0][0];
      expect(callbacks.onShowGrouped).toHaveBeenCalledWith({
        docMode: 'grouped-events',
        documentIds: ['doc-1', 'doc-2'],
        dataViewId: 'experimental-data-view-pattern',
        entityItems: [],
        scopeId: graphScopeId,
      });
      expect(mockToasts.addDanger).not.toHaveBeenCalled();
    });

    it('routes a grouped-entities node to onShowGrouped with the graph scope', async () => {
      const { getNodeDocumentMode } = jest.requireMock('@kbn/cloud-security-posture-graph');
      getNodeDocumentMode.mockReturnValueOnce('grouped-entities');

      render(<GraphVisualization {...ENTITY_PROPS} />);

      await waitFor(() => {
        expect(GraphInvestigation).toHaveBeenCalledTimes(1);
      });

      const { onOpenEventPreview, scopeId: graphScopeId } =
        jest.mocked(GraphInvestigation).mock.calls[0][0];
      onOpenEventPreview?.({
        icon: 'user',
        documentsData: [{ id: 'entity-2', type: 'entity', entity: { name: 'Entity 2' } }],
      } as never);

      expect(callbacks.onShowGrouped).toHaveBeenCalledWith(
        expect.objectContaining({ docMode: 'grouped-entities', scopeId: graphScopeId })
      );
    });

    it('routes onOpenNetworkPreview to onShowNetwork', async () => {
      render(<GraphVisualization {...EVENT_PROPS} />);

      await waitFor(() => {
        expect(GraphInvestigation).toHaveBeenCalledTimes(1);
      });

      jest
        .mocked(GraphInvestigation)
        .mock.calls[0][0].onOpenNetworkPreview?.('10.0.0.1', 'graph-scope');

      expect(callbacks.onShowNetwork).toHaveBeenCalledWith('10.0.0.1');
    });
  });

  describe('onInvestigateInTimeline', () => {
    it('shows a danger toast when time range cannot be parsed', async () => {
      render(<GraphVisualization {...EVENT_PROPS} />);

      await waitFor(() => {
        expect(GraphInvestigation).toHaveBeenCalledTimes(1);
      });

      const { onInvestigateInTimeline } = jest.mocked(GraphInvestigation).mock.calls[0][0];
      onInvestigateInTimeline?.(undefined, [], { from: '', to: '' });

      expect(mockInvestigateInTimeline.investigateInTimeline).not.toHaveBeenCalled();
      expect(mockToasts.addDanger).toHaveBeenCalled();
    });

    it('calls investigateInTimeline with a valid time range', async () => {
      render(<GraphVisualization {...EVENT_PROPS} />);

      await waitFor(() => {
        expect(GraphInvestigation).toHaveBeenCalledTimes(1);
      });

      const { onInvestigateInTimeline } = jest.mocked(GraphInvestigation).mock.calls[0][0];
      onInvestigateInTimeline?.(undefined, [], { from: 'now-15m', to: 'now' });

      expect(mockInvestigateInTimeline.investigateInTimeline).toHaveBeenCalled();
      expect(mockToasts.addDanger).not.toHaveBeenCalled();
    });
  });

  describe('drill-through telemetry', () => {
    const renderGraph = async (props: React.ComponentProps<typeof GraphVisualization>) => {
      render(<GraphVisualization {...props} />);
      await waitFor(() => expect(GraphInvestigation).toHaveBeenCalledTimes(1));
      return jest.mocked(GraphInvestigation).mock.calls[0][0];
    };

    beforeEach(() => {
      const { getNodeDocumentMode, getSingleDocumentData } = jest.requireMock(
        '@kbn/cloud-security-posture-graph'
      );
      const actual = jest.requireActual('@kbn/cloud-security-posture-graph/src/components/utils');
      getNodeDocumentMode.mockImplementation(actual.getNodeDocumentMode);
      getSingleDocumentData.mockImplementation(actual.getSingleDocumentData);
    });

    it('reports an event drill-through after opening a single-event node', async () => {
      const { onOpenEventPreview } = await renderGraph(EVENT_PROPS);

      onOpenEventPreview?.({
        id: 'node-1',
        shape: 'label',
        documentsData: [{ id: 'doc-id', type: 'event', index: 'logs-*' }],
      } as never);

      expect(callbacks.onShowDocument).toHaveBeenCalledWith('doc-id', 'logs-*', true);
      expect(mockReportDrillThrough).toHaveBeenCalledTimes(1);
      expect(mockReportDrillThrough).toHaveBeenCalledWith('event');
    });

    it('reports an alert drill-through after opening a single-alert node', async () => {
      const { onOpenEventPreview } = await renderGraph(EVENT_PROPS);

      onOpenEventPreview?.({
        id: 'node-1',
        shape: 'label',
        documentsData: [{ id: 'alert-id', type: 'alert', index: '.alerts-*' }],
      } as never);

      expect(callbacks.onShowDocument).toHaveBeenCalledWith('alert-id', '.alerts-*', false);
      expect(mockReportDrillThrough).toHaveBeenCalledTimes(1);
      expect(mockReportDrillThrough).toHaveBeenCalledWith('alert');
    });

    it('reports an entity drill-through after opening an enriched single-entity node', async () => {
      const { onOpenEventPreview } = await renderGraph(ENTITY_PROPS);

      onOpenEventPreview?.({
        id: 'node-1',
        shape: 'hexagon',
        documentsData: [
          {
            id: 'entity-2',
            type: 'entity',
            entity: { name: 'Entity 2', availableInEntityStore: true },
          },
        ],
      } as never);

      expect(callbacks.onShowEntity).toHaveBeenCalledTimes(1);
      expect(mockReportDrillThrough).toHaveBeenCalledTimes(1);
      expect(mockReportDrillThrough).toHaveBeenCalledWith('entity');
    });

    it('does not report a drill-through for a single-entity node that is not enriched', async () => {
      const { onOpenEventPreview } = await renderGraph(ENTITY_PROPS);

      onOpenEventPreview?.({
        id: 'node-1',
        shape: 'hexagon',
        documentsData: [
          {
            id: 'entity-2',
            type: 'entity',
            entity: { name: 'Entity 2', availableInEntityStore: false },
          },
        ],
      } as never);

      expect(callbacks.onShowEntity).not.toHaveBeenCalled();
      expect(mockToasts.addDanger).toHaveBeenCalled();
      expect(mockReportDrillThrough).not.toHaveBeenCalled();
    });

    it('does not report a drill-through for a grouped-entities node', async () => {
      const { onOpenEventPreview } = await renderGraph(ENTITY_PROPS);

      onOpenEventPreview?.({
        id: 'node-1',
        shape: 'hexagon',
        documentsData: [
          { id: 'entity-2', type: 'entity', entity: { name: 'Entity 2' } },
          { id: 'entity-3', type: 'entity', entity: { name: 'Entity 3' } },
        ],
      } as never);

      expect(callbacks.onShowGrouped).toHaveBeenCalledTimes(1);
      expect(mockReportDrillThrough).not.toHaveBeenCalled();
    });

    it('does not report a drill-through for a grouped-events node', async () => {
      const { onOpenEventPreview } = await renderGraph(EVENT_PROPS);

      onOpenEventPreview?.({
        id: 'node-1',
        shape: 'label',
        documentsData: [
          { id: 'doc-1', type: 'event' },
          { id: 'doc-2', type: 'event' },
        ],
      } as never);

      expect(callbacks.onShowGrouped).toHaveBeenCalledTimes(1);
      expect(mockReportDrillThrough).not.toHaveBeenCalled();
    });

    it('reports a network drill-through after opening the network preview', async () => {
      const { onOpenNetworkPreview } = await renderGraph(EVENT_PROPS);

      onOpenNetworkPreview?.('10.0.0.1', 'graph-scope');

      expect(callbacks.onShowNetwork).toHaveBeenCalledWith('10.0.0.1');
      expect(mockReportDrillThrough).toHaveBeenCalledTimes(1);
      expect(mockReportDrillThrough).toHaveBeenCalledWith('network');
    });

    it('reports a timeline drill-through after investigating in timeline', async () => {
      const { onInvestigateInTimeline } = await renderGraph(EVENT_PROPS);

      onInvestigateInTimeline?.(undefined, [], { from: 'now-15m', to: 'now' });

      expect(mockInvestigateInTimeline.investigateInTimeline).toHaveBeenCalled();
      expect(mockReportDrillThrough).toHaveBeenCalledTimes(1);
      expect(mockReportDrillThrough).toHaveBeenCalledWith('timeline');
    });

    it('does not report a drill-through when the time range is invalid', async () => {
      const { onInvestigateInTimeline } = await renderGraph(EVENT_PROPS);

      onInvestigateInTimeline?.(undefined, [], { from: '', to: '' });

      expect(mockToasts.addDanger).toHaveBeenCalled();
      expect(mockReportDrillThrough).not.toHaveBeenCalled();
    });
  });
});
