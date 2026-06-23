/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { render, waitFor } from '@testing-library/react';
import {
  GraphGroupedNodePreviewPanelKey,
  GraphInvestigation,
  GROUP_PREVIEW_BANNER,
  NETWORK_PREVIEW_BANNER,
} from '@kbn/cloud-security-posture-graph';
import type { NodeViewModel } from '@kbn/cloud-security-posture-graph';
import {
  DOCUMENT_TYPE_ALERT,
  DOCUMENT_TYPE_ENTITY,
  DOCUMENT_TYPE_EVENT,
} from '@kbn/cloud-security-posture-common/schema/graph/v1';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { GraphVisualization } from './graph_visualization';
import { mockFlyoutApi } from '../../document_details/shared/mocks/mock_flyout_context';
import { GRAPH_VISUALIZATION_TEST_ID } from './test_ids';
import {
  ALERT_PREVIEW_BANNER,
  EVENT_PREVIEW_BANNER,
  GENERIC_ENTITY_PREVIEW_BANNER,
} from '../../document_details/preview/constants';
import { DocumentDetailsPreviewPanelKey } from '../../document_details/shared/constants/panel_keys';
import {
  GenericEntityPanelKey,
  HostPanelKey,
  ServicePanelKey,
  UserPanelKey,
} from '../../entity_details/shared/constants';
import { FlowTargetSourceDest } from '../../../../common/search_strategy';

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

jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: jest.fn(),
}));

jest.mock('@kbn/cloud-security-posture-graph', () => {
  const { isEntityNode, getNodeDocumentMode, hasNodeDocumentsData, getSingleDocumentData } =
    jest.requireActual('@kbn/cloud-security-posture-graph/src/components/utils');
  const {
    GraphGroupedNodePreviewPanelKey: actualGraphGroupedNodePreviewPanelKey,
    GROUP_PREVIEW_BANNER: actualGroupPreviewBanner,
  } = jest.requireActual(
    '@kbn/cloud-security-posture-graph/src/components/graph_grouped_node_preview_panel/constants'
  );
  const { NETWORK_PREVIEW_BANNER: actualNetworkPreviewBanner } = jest.requireActual(
    '@kbn/cloud-security-posture-graph/src/components/constants'
  );
  const { isEntityItem } = jest.requireActual(
    '@kbn/cloud-security-posture-graph/src/components/graph_grouped_node_preview_panel/components/grouped_item/types'
  );

  return {
    GraphInvestigation: jest.fn(),
    isEntityNode,
    isEntityItem,
    getNodeDocumentMode,
    hasNodeDocumentsData,
    getSingleDocumentData,
    GraphGroupedNodePreviewPanelKey: actualGraphGroupedNodePreviewPanelKey,
    GROUP_PREVIEW_BANNER: actualGroupPreviewBanner,
    NETWORK_PREVIEW_BANNER: actualNetworkPreviewBanner,
  };
});

const mockCapabilities = {
  securitySolutionTimeline: {
    read: true,
    crud: true,
  },
};

jest.mock('../../../common/lib/kibana', () => ({
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

jest.mock('../../../common/hooks/timeline/use_investigate_in_timeline', () => ({
  useInvestigateInTimeline: () => mockInvestigateInTimeline,
}));

jest.mock('../../../data_view_manager/hooks/use_data_view', () => ({
  useDataView: () => ({
    dataView: {
      id: 'experimental-data-view',
      getIndexPattern: jest.fn().mockReturnValue('experimental-data-view-pattern'),
    },
    status: 'ready',
  }),
}));

jest.mock('../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: () => true,
}));

const EVENT_PROPS = {
  mode: 'event' as const,
  scopeId: 'test-scope',
  eventIds: ['event-1', 'event-2'],
  timestamp: new Date().toISOString(),
  isAlert: false,
};

const ENTITY_PROPS = {
  mode: 'entity' as const,
  scopeId: 'test-scope',
  entityId: 'entity-1',
};

const buildEntityShapeNode = (
  documentsData: Array<Record<string, unknown>>,
  overrides: Partial<Record<string, unknown>> = {}
): NodeViewModel =>
  ({
    id: 'node-entity',
    color: 'primary',
    shape: 'ellipse',
    icon: 'globe',
    documentsData,
    ...overrides,
  } as unknown as NodeViewModel);

const buildGroupShapeNode = (
  documentsData: Array<Record<string, unknown>>,
  overrides: Partial<Record<string, unknown>> = {}
): NodeViewModel =>
  ({
    id: 'node-group',
    shape: 'group',
    documentsData,
    ...overrides,
  } as unknown as NodeViewModel);

const renderAndCaptureGraphProps = async () => {
  render(<GraphVisualization {...EVENT_PROPS} />);
  await waitFor(() => {
    expect(GraphInvestigation).toHaveBeenCalledTimes(1);
  });
  return jest.mocked(GraphInvestigation).mock.calls[0][0];
};

describe('GraphVisualization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useExpandableFlyoutApi).mockReturnValue(mockFlyoutApi);
    (GraphInvestigation as unknown as jest.Mock).mockReturnValue(
      <div data-test-subj={GRAPH_INVESTIGATION_TEST_ID} />
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
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

    it('passes onOpenEventPreview callback', async () => {
      render(<GraphVisualization {...EVENT_PROPS} />);

      await waitFor(() => {
        expect(GraphInvestigation).toHaveBeenCalledTimes(1);
      });

      expect(typeof jest.mocked(GraphInvestigation).mock.calls[0][0].onOpenEventPreview).toBe(
        'function'
      );
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

  // These tests mirror the FTR cases in the deleted `entity_preview_flyout.ts` that exercised
  // the engine_type → panel-ID dispatch implemented inline here in `onOpenEventPreview`. The
  // graph-package side has its own dispatch (covered by `use_open_entity_preview_panel.test.tsx`),
  // but this callback is a separate implementation living in `security_solution`, so it needs
  // its own coverage at the L1 layer.
  describe('onOpenEventPreview', () => {
    it('opens the document preview panel with EVENT_PREVIEW_BANNER for single-event docMode', async () => {
      const { onOpenEventPreview } = await renderAndCaptureGraphProps();
      onOpenEventPreview?.(
        buildGroupShapeNode([{ id: 'event-doc-1', type: DOCUMENT_TYPE_EVENT, index: 'logs-*' }])
      );

      expect(mockFlyoutApi.openPreviewPanel).toHaveBeenCalledWith({
        id: DocumentDetailsPreviewPanelKey,
        params: {
          id: 'event-doc-1',
          indexName: 'logs-*',
          scopeId: EVENT_PROPS.scopeId,
          banner: EVENT_PREVIEW_BANNER,
          isPreviewMode: true,
        },
      });
      expect(mockToasts.addDanger).not.toHaveBeenCalled();
    });

    it('opens the document preview panel with ALERT_PREVIEW_BANNER for single-alert docMode', async () => {
      const { onOpenEventPreview } = await renderAndCaptureGraphProps();
      onOpenEventPreview?.(
        buildGroupShapeNode([{ id: 'alert-doc-1', type: DOCUMENT_TYPE_ALERT, index: '.alerts-*' }])
      );

      expect(mockFlyoutApi.openPreviewPanel).toHaveBeenCalledWith({
        id: DocumentDetailsPreviewPanelKey,
        params: {
          id: 'alert-doc-1',
          indexName: '.alerts-*',
          scopeId: EVENT_PROPS.scopeId,
          banner: ALERT_PREVIEW_BANNER,
          isPreviewMode: true,
        },
      });
      expect(mockToasts.addDanger).not.toHaveBeenCalled();
    });

    it('opens HostPanelKey with hostName for enriched single-entity, engine_type host', async () => {
      const { onOpenEventPreview } = await renderAndCaptureGraphProps();
      onOpenEventPreview?.(
        buildEntityShapeNode([
          {
            id: 'host-doc-1',
            type: DOCUMENT_TYPE_ENTITY,
            entity: {
              engine_type: 'host',
              name: 'host-instance-1',
              availableInEntityStore: true,
            },
          },
        ])
      );

      expect(mockFlyoutApi.openPreviewPanel).toHaveBeenCalledWith({
        id: HostPanelKey,
        params: {
          entityId: 'host-doc-1',
          scopeId: EVENT_PROPS.scopeId,
          isPreviewMode: true,
          banner: GENERIC_ENTITY_PREVIEW_BANNER,
          isEngineMetadataExist: true,
          hostName: 'host-instance-1',
        },
      });
    });

    it('opens UserPanelKey with userName for enriched single-entity, engine_type user', async () => {
      const { onOpenEventPreview } = await renderAndCaptureGraphProps();
      onOpenEventPreview?.(
        buildEntityShapeNode([
          {
            id: 'user-doc-1',
            type: DOCUMENT_TYPE_ENTITY,
            entity: {
              engine_type: 'user',
              name: 'jdoe',
              availableInEntityStore: true,
            },
          },
        ])
      );

      expect(mockFlyoutApi.openPreviewPanel).toHaveBeenCalledWith({
        id: UserPanelKey,
        params: {
          entityId: 'user-doc-1',
          scopeId: EVENT_PROPS.scopeId,
          isPreviewMode: true,
          banner: GENERIC_ENTITY_PREVIEW_BANNER,
          isEngineMetadataExist: true,
          userName: 'jdoe',
        },
      });
    });

    it('opens ServicePanelKey with serviceName for enriched single-entity, engine_type service', async () => {
      const { onOpenEventPreview } = await renderAndCaptureGraphProps();
      onOpenEventPreview?.(
        buildEntityShapeNode([
          {
            id: 'service-doc-1',
            type: DOCUMENT_TYPE_ENTITY,
            entity: {
              engine_type: 'service',
              name: 'web-api',
              availableInEntityStore: true,
            },
          },
        ])
      );

      expect(mockFlyoutApi.openPreviewPanel).toHaveBeenCalledWith({
        id: ServicePanelKey,
        params: {
          entityId: 'service-doc-1',
          scopeId: EVENT_PROPS.scopeId,
          isPreviewMode: true,
          banner: GENERIC_ENTITY_PREVIEW_BANNER,
          isEngineMetadataExist: true,
          serviceName: 'web-api',
        },
      });
    });

    it('opens GenericEntityPanelKey without name params for enriched single-entity, engine_type undefined', async () => {
      const { onOpenEventPreview } = await renderAndCaptureGraphProps();
      onOpenEventPreview?.(
        buildEntityShapeNode([
          {
            id: 'unknown-doc-1',
            type: DOCUMENT_TYPE_ENTITY,
            entity: {
              name: 'unknown-1',
              availableInEntityStore: true,
            },
          },
        ])
      );

      expect(mockFlyoutApi.openPreviewPanel).toHaveBeenCalledWith({
        id: GenericEntityPanelKey,
        params: {
          entityId: 'unknown-doc-1',
          scopeId: EVENT_PROPS.scopeId,
          isPreviewMode: true,
          banner: GENERIC_ENTITY_PREVIEW_BANNER,
          isEngineMetadataExist: true,
        },
      });
    });

    // Pinning the security_solution-side fallback to GenericEntityPanelKey for engine_type 'generic'.
    // The graph-package hook (`useOpenEntityPreviewPanel`) silently no-ops for 'generic'; this
    // callback diverges and opens the generic panel. If that divergence is ever reconciled, this
    // test breaks, forcing the discussion instead of producing a silent UX change.
    it('opens GenericEntityPanelKey for enriched single-entity, engine_type "generic" (divergent fallback)', async () => {
      const { onOpenEventPreview } = await renderAndCaptureGraphProps();
      onOpenEventPreview?.(
        buildEntityShapeNode([
          {
            id: 'generic-doc-1',
            type: DOCUMENT_TYPE_ENTITY,
            entity: {
              engine_type: 'generic',
              name: 'generic-1',
              availableInEntityStore: true,
            },
          },
        ])
      );

      expect(mockFlyoutApi.openPreviewPanel).toHaveBeenCalledWith({
        id: GenericEntityPanelKey,
        params: {
          entityId: 'generic-doc-1',
          scopeId: EVENT_PROPS.scopeId,
          isPreviewMode: true,
          banner: GENERIC_ENTITY_PREVIEW_BANNER,
          isEngineMetadataExist: true,
        },
      });
    });

    it('shows a danger toast and does not open any panel for single-entity that is not enriched', async () => {
      const { onOpenEventPreview } = await renderAndCaptureGraphProps();
      onOpenEventPreview?.(
        buildEntityShapeNode([
          {
            id: 'host-doc-unenriched',
            type: DOCUMENT_TYPE_ENTITY,
            entity: {
              engine_type: 'host',
              name: 'host-unenriched',
            },
          },
        ])
      );

      expect(mockFlyoutApi.openPreviewPanel).not.toHaveBeenCalled();
      expect(mockToasts.addDanger).toHaveBeenCalledTimes(1);
    });

    it('opens GraphGroupedNodePreviewPanelKey with entityItems for grouped-entities docMode', async () => {
      const { onOpenEventPreview } = await renderAndCaptureGraphProps();
      onOpenEventPreview?.(
        buildEntityShapeNode(
          [
            {
              id: 'host-doc-a',
              type: DOCUMENT_TYPE_ENTITY,
              entity: { engine_type: 'host', name: 'host-a' },
            },
            {
              id: 'host-doc-b',
              type: DOCUMENT_TYPE_ENTITY,
              entity: { engine_type: 'host', name: 'host-b' },
            },
          ],
          { id: 'grouped-entity-node', icon: 'globe' }
        )
      );

      expect(mockFlyoutApi.openPreviewPanel).toHaveBeenCalledWith({
        id: GraphGroupedNodePreviewPanelKey,
        params: {
          id: 'grouped-entity-node',
          scopeId: EVENT_PROPS.scopeId,
          isPreviewMode: true,
          banner: GROUP_PREVIEW_BANNER,
          docMode: 'grouped-entities',
          entityItems: [
            {
              itemType: DOCUMENT_TYPE_ENTITY,
              entity: { engine_type: 'host', name: 'host-a' },
              id: 'host-doc-a',
              icon: 'globe',
            },
            {
              itemType: DOCUMENT_TYPE_ENTITY,
              entity: { engine_type: 'host', name: 'host-b' },
              id: 'host-doc-b',
              icon: 'globe',
            },
          ],
        },
      });
    });

    it('opens GraphGroupedNodePreviewPanelKey with documentIds for grouped-events docMode', async () => {
      const { onOpenEventPreview } = await renderAndCaptureGraphProps();
      onOpenEventPreview?.(
        buildGroupShapeNode(
          [
            { id: 'event-doc-a', type: DOCUMENT_TYPE_EVENT, event: { id: 'ev-a' } },
            { id: 'event-doc-b', type: DOCUMENT_TYPE_EVENT, event: { id: 'ev-b' } },
          ],
          { id: 'grouped-event-node' }
        )
      );

      expect(mockFlyoutApi.openPreviewPanel).toHaveBeenCalledWith({
        id: GraphGroupedNodePreviewPanelKey,
        params: {
          id: 'grouped-event-node',
          scopeId: EVENT_PROPS.scopeId,
          isPreviewMode: true,
          banner: GROUP_PREVIEW_BANNER,
          docMode: 'grouped-events',
          dataViewId: 'experimental-data-view-pattern',
          documentIds: ['ev-a', 'ev-b'],
        },
      });
    });

    it('shows a danger toast for nodes with no documentsData (na docMode fall-through)', async () => {
      const { onOpenEventPreview } = await renderAndCaptureGraphProps();
      onOpenEventPreview?.(buildGroupShapeNode([]));

      expect(mockFlyoutApi.openPreviewPanel).not.toHaveBeenCalled();
      expect(mockToasts.addDanger).toHaveBeenCalledTimes(1);
    });
  });

  describe('onOpenNetworkPreview', () => {
    it('opens the network-preview panel with the supplied IP, scope, and NETWORK_PREVIEW_BANNER', async () => {
      const { onOpenNetworkPreview } = await renderAndCaptureGraphProps();
      onOpenNetworkPreview?.('10.0.0.1', 'network-scope-1');

      expect(mockFlyoutApi.openPreviewPanel).toHaveBeenCalledWith({
        id: 'network-preview',
        params: {
          ip: '10.0.0.1',
          scopeId: 'network-scope-1',
          flowTarget: FlowTargetSourceDest.source,
          banner: NETWORK_PREVIEW_BANNER,
          isPreviewMode: true,
        },
      });
    });
  });
});
