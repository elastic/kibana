/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { render, waitFor } from '@testing-library/react';
import { GraphInvestigation, type NodeViewModel } from '@kbn/cloud-security-posture-graph';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { GraphVisualization } from './graph_visualization';
import { mockFlyoutApi } from '../../shared/mocks/mock_flyout_context';
import { GRAPH_VISUALIZATION_TEST_ID } from './test_ids';

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
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Subject } = require('rxjs');
  // Import actual utility functions directly from the source
  const { isEntityNode, getNodeDocumentMode, hasNodeDocumentsData, getSingleDocumentData } =
    jest.requireActual('@kbn/cloud-security-posture-graph/src/components/utils');
  const { GraphGroupedNodePreviewPanelKey, GROUP_PREVIEW_BANNER } = jest.requireActual(
    '@kbn/cloud-security-posture-graph/src/components/graph_grouped_node_preview_panel/constants'
  );

  return {
    // Mocked GraphInvestigation component
    GraphInvestigation: jest.fn(),
    // Real RxJS Subject for groupedItemClick$
    groupedItemClick$: new Subject(),
    // Use actual utility functions
    isEntityNode,
    getNodeDocumentMode,
    hasNodeDocumentsData,
    getSingleDocumentData,
    // Use actual constants
    GraphGroupedNodePreviewPanelKey,
    GROUP_PREVIEW_BANNER,
  };
});

jest.mock('../../../../common/lib/kibana', () => {
  return {
    useToasts: () => mockToasts,
    KibanaServices: {
      get: () => ({
        uiSettings: {
          get: jest.fn().mockReturnValue(true),
        },
      }),
    },
  };
});

jest.mock('../../../../common/hooks/timeline/use_investigate_in_timeline', () => ({
  useInvestigateInTimeline: () => mockInvestigateInTimeline,
}));

jest.mock('../../../../data_view_manager/hooks/use_data_view', () => ({
  useDataView: () => ({
    dataView: {
      id: 'experimental-data-view',
      getIndexPattern: jest.fn().mockReturnValue('experimental-data-view-pattern'),
    },
  }),
}));

jest.mock('../../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: () => true,
}));

jest.mock('../../shared/context', () => ({
  useDocumentDetailsContext: () => ({
    getFieldsData: jest.fn(),
    dataAsNestedObject: {},
    dataFormattedForFieldBrowser: {},
    scopeId: 'test-scope',
  }),
}));

jest.mock('../../shared/hooks/use_graph_preview', () => ({
  useGraphPreview: () => ({
    eventIds: ['event-1', 'event-2'],
    timestamp: new Date().toISOString(),
    isAlert: false,
  }),
}));

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

  describe('onOpenEventPreview', () => {
    it('renders GraphInvestigation component', async () => {
      const { getByTestId } = render(<GraphVisualization />);
      expect(getByTestId(GRAPH_VISUALIZATION_TEST_ID)).toBeInTheDocument();

      // Wait for lazy-loaded GraphInvestigation to appear
      await waitFor(() => {
        expect(getByTestId(GRAPH_INVESTIGATION_TEST_ID)).toBeInTheDocument();
      });
    });

    it('calls open grouped events preview for alert with event - normal alert case', async () => {
      const { getByTestId } = render(<GraphVisualization />);
      expect(getByTestId(GRAPH_VISUALIZATION_TEST_ID)).toBeInTheDocument();

      // Wait for lazy-loaded GraphInvestigation to appear
      await waitFor(() => {
        expect(getByTestId(GRAPH_INVESTIGATION_TEST_ID)).toBeInTheDocument();
      });

      expect(GraphInvestigation).toHaveBeenCalledTimes(1);
      expect(jest.mocked(GraphInvestigation).mock.calls[0][0]).toHaveProperty('onOpenEventPreview');
      const onOpenEventPreview =
        jest.mocked(GraphInvestigation).mock.calls[0][0].onOpenEventPreview;

      // Act - Alert nodes contain both the event and alert documents
      onOpenEventPreview?.({
        id: 'node-1',
        shape: 'label',
        color: 'danger',
        documentsData: [
          {
            index: 'event-index',
            id: 'event-id',
            type: 'event',
            event: { id: 'event-id' },
          },
          {
            index: 'alert-index',
            id: 'alert-id',
            type: 'alert',
            event: { id: 'alert-id' },
          },
        ],
      } satisfies NodeViewModel);

      // Assert - should open grouped events preview panel (not single alert preview)
      expect(mockFlyoutApi.openPreviewPanel).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'graphGroupedNodePreviewPanel',
          params: {
            id: 'node-1',
            scopeId: 'test-scope',
            isPreviewMode: true,
            banner: expect.objectContaining({ backgroundColor: 'warning', textColor: 'warning' }),
            docMode: 'grouped-events',
            dataViewId: 'experimental-data-view-pattern',
            documentIds: ['event-id', 'alert-id'],
          },
        })
      );
    });

    it('calls open event preview callback for event', async () => {
      const { getByTestId } = render(<GraphVisualization />);
      expect(getByTestId(GRAPH_VISUALIZATION_TEST_ID)).toBeInTheDocument();

      // Wait for lazy-loaded GraphInvestigation to appear
      await waitFor(() => {
        expect(getByTestId(GRAPH_INVESTIGATION_TEST_ID)).toBeInTheDocument();
      });

      expect(GraphInvestigation).toHaveBeenCalledTimes(1);
      expect(jest.mocked(GraphInvestigation).mock.calls[0][0]).toHaveProperty('onOpenEventPreview');
      const onOpenEventPreview =
        jest.mocked(GraphInvestigation).mock.calls[0][0].onOpenEventPreview;

      // Act
      onOpenEventPreview?.({
        id: 'node-1',
        shape: 'label',
        color: 'danger',
        documentsData: [
          {
            index: 'event-index',
            id: 'event-id',
            type: 'event',
          },
        ],
      } satisfies NodeViewModel);

      // Assert
      expect(mockFlyoutApi.openPreviewPanel).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'document-details-preview',
          params: {
            id: 'event-id',
            indexName: 'event-index',
            banner: expect.objectContaining({ title: 'Preview event details' }),
            scopeId: 'test-scope',
            isPreviewMode: true,
          },
        })
      );
    });

    it('should not call open entity preview callback for entity - without entity data', async () => {
      const { getByTestId } = render(<GraphVisualization />);
      expect(getByTestId(GRAPH_VISUALIZATION_TEST_ID)).toBeInTheDocument();

      // Wait for lazy-loaded GraphInvestigation to appear
      await waitFor(() => {
        expect(getByTestId(GRAPH_INVESTIGATION_TEST_ID)).toBeInTheDocument();
      });

      expect(GraphInvestigation).toHaveBeenCalledTimes(1);
      expect(jest.mocked(GraphInvestigation).mock.calls[0][0]).toHaveProperty('onOpenEventPreview');
      const onOpenEventPreview =
        jest.mocked(GraphInvestigation).mock.calls[0][0].onOpenEventPreview;

      // Act
      onOpenEventPreview?.({
        id: 'node-1',
        shape: 'hexagon',
        color: 'primary',
        documentsData: [
          {
            index: 'entity-index',
            id: 'entity-id',
            type: 'entity',
          },
        ],
      } satisfies NodeViewModel);

      // Assert
      expect(mockFlyoutApi.openPreviewPanel).not.toHaveBeenCalled();
    });

    it('calls open entity preview callback for entity - with entity data', async () => {
      const { getByTestId } = render(<GraphVisualization />);
      expect(getByTestId(GRAPH_VISUALIZATION_TEST_ID)).toBeInTheDocument();

      // Wait for lazy-loaded GraphInvestigation to appear
      await waitFor(() => {
        expect(getByTestId(GRAPH_INVESTIGATION_TEST_ID)).toBeInTheDocument();
      });

      expect(GraphInvestigation).toHaveBeenCalledTimes(1);
      expect(jest.mocked(GraphInvestigation).mock.calls[0][0]).toHaveProperty('onOpenEventPreview');
      const onOpenEventPreview =
        jest.mocked(GraphInvestigation).mock.calls[0][0].onOpenEventPreview;

      // Act
      onOpenEventPreview?.({
        id: 'node-1',
        shape: 'hexagon',
        color: 'primary',
        documentsData: [
          {
            index: 'entity-index',
            id: 'entity-id',
            type: 'entity',
            entity: {
              name: 'Admin',
              type: 'Identity',
              sub_type: 'Test User',
              availableInEntityStore: true,
              ecsParentField: 'entity',
            },
          },
        ],
      } satisfies NodeViewModel);

      // Assert
      expect(mockFlyoutApi.openPreviewPanel).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'generic-entity-panel',
          params: {
            entityId: 'entity-id',
            scopeId: 'test-scope',
            isPreviewMode: true,
            banner: expect.objectContaining({ title: 'Preview entity details' }),
            isEngineMetadataExist: true,
          },
        })
      );
    });

    it('shows danger toast when cannot open event preview - documentsData is empty', async () => {
      const { getByTestId } = render(<GraphVisualization />);
      expect(getByTestId(GRAPH_VISUALIZATION_TEST_ID)).toBeInTheDocument();

      // Wait for lazy-loaded GraphInvestigation to appear
      await waitFor(() => {
        expect(getByTestId(GRAPH_INVESTIGATION_TEST_ID)).toBeInTheDocument();
      });

      expect(GraphInvestigation).toHaveBeenCalledTimes(1);
      expect(jest.mocked(GraphInvestigation).mock.calls[0][0]).toHaveProperty('onOpenEventPreview');
      const onOpenEventPreview =
        jest.mocked(GraphInvestigation).mock.calls[0][0].onOpenEventPreview;

      // Act
      onOpenEventPreview?.({
        id: 'node-1',
        shape: 'label',
        color: 'danger',
        documentsData: [],
      } satisfies NodeViewModel);

      // Assert
      expect(mockFlyoutApi.openPreviewPanel).not.toHaveBeenCalled();
      expect(mockToasts.addDanger).toHaveBeenCalled();
    });

    it('calls open grouped entities preview for multiple entities', async () => {
      const { getByTestId } = render(<GraphVisualization />);
      expect(getByTestId(GRAPH_VISUALIZATION_TEST_ID)).toBeInTheDocument();

      // Wait for lazy-loaded GraphInvestigation to appear
      await waitFor(() => {
        expect(getByTestId(GRAPH_INVESTIGATION_TEST_ID)).toBeInTheDocument();
      });

      expect(GraphInvestigation).toHaveBeenCalledTimes(1);
      expect(jest.mocked(GraphInvestigation).mock.calls[0][0]).toHaveProperty('onOpenEventPreview');
      const onOpenEventPreview =
        jest.mocked(GraphInvestigation).mock.calls[0][0].onOpenEventPreview;

      // Act - Grouped entities node with multiple entity documents
      onOpenEventPreview?.({
        id: 'grouped-entity-node',
        shape: 'rectangle',
        color: 'primary',
        icon: 'user',
        count: 3,
        documentsData: [
          {
            id: 'entity-1',
            type: 'entity',
            entity: {
              name: 'User 1',
              type: 'Identity',
              sub_type: 'IAM User',
              ecsParentField: 'user',
              availableInEntityStore: true,
            },
          },
          {
            id: 'entity-2',
            type: 'entity',
            entity: {
              name: 'User 2',
              type: 'Identity',
              sub_type: 'IAM User',
              ecsParentField: 'user',
              availableInEntityStore: true,
            },
          },
          {
            id: 'entity-3',
            type: 'entity',
            entity: {
              ecsParentField: 'user',
              availableInEntityStore: false,
            },
          },
        ],
      } satisfies NodeViewModel);

      // Assert - should open grouped entities preview panel
      expect(mockFlyoutApi.openPreviewPanel).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'graphGroupedNodePreviewPanel',
          params: {
            id: 'grouped-entity-node',
            scopeId: 'test-scope',
            isPreviewMode: true,
            banner: expect.objectContaining({ backgroundColor: 'warning', textColor: 'warning' }),
            docMode: 'grouped-entities',
            entityItems: [
              {
                itemType: 'entity',
                id: 'entity-1',
                type: 'Identity',
                subType: 'IAM User',
                icon: 'user',
                availableInEntityStore: true,
              },
              {
                itemType: 'entity',
                id: 'entity-2',
                type: 'Identity',
                subType: 'IAM User',
                icon: 'user',
                availableInEntityStore: true,
              },
              {
                itemType: 'entity',
                id: 'entity-3',
                type: undefined,
                subType: undefined,
                icon: 'user',
                availableInEntityStore: false,
              },
            ],
          },
        })
      );
      expect(mockToasts.addDanger).not.toHaveBeenCalled();
    });

    it('calls open grouped events preview for multiple events', async () => {
      const { getByTestId } = render(<GraphVisualization />);
      expect(getByTestId(GRAPH_VISUALIZATION_TEST_ID)).toBeInTheDocument();

      // Wait for lazy-loaded GraphInvestigation to appear
      await waitFor(() => {
        expect(getByTestId(GRAPH_INVESTIGATION_TEST_ID)).toBeInTheDocument();
      });

      expect(GraphInvestigation).toHaveBeenCalledTimes(1);
      expect(jest.mocked(GraphInvestigation).mock.calls[0][0]).toHaveProperty('onOpenEventPreview');
      const onOpenEventPreview =
        jest.mocked(GraphInvestigation).mock.calls[0][0].onOpenEventPreview;

      // Act
      onOpenEventPreview?.({
        id: 'node-1',
        shape: 'label',
        color: 'danger',
        documentsData: [
          {
            index: 'event-index',
            id: 'event-id-1',
            type: 'event',
            event: { id: 'event-id-1' },
          },
          {
            index: 'event-index',
            id: 'event-id-2',
            type: 'event',
            event: { id: 'event-id-2' },
          },
        ],
      } satisfies NodeViewModel);

      // Assert - should open grouped events preview panel
      expect(mockFlyoutApi.openPreviewPanel).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'graphGroupedNodePreviewPanel',
          params: {
            id: 'node-1',
            scopeId: 'test-scope',
            isPreviewMode: true,
            banner: expect.objectContaining({ backgroundColor: 'warning', textColor: 'warning' }),
            docMode: 'grouped-events',
            dataViewId: 'experimental-data-view-pattern',
            documentIds: ['event-id-1', 'event-id-2'],
          },
        })
      );
      expect(mockToasts.addDanger).not.toHaveBeenCalled();
    });
  });

  describe('onInvestigateInTimeline', () => {
    it('shows danger toast when cannot investigate in timeline - missing time range', async () => {
      const { getByTestId } = render(<GraphVisualization />);
      expect(getByTestId(GRAPH_VISUALIZATION_TEST_ID)).toBeInTheDocument();

      // Wait for lazy-loaded GraphInvestigation to appear
      await waitFor(() => {
        expect(getByTestId(GRAPH_INVESTIGATION_TEST_ID)).toBeInTheDocument();
      });

      expect(GraphInvestigation).toHaveBeenCalledTimes(1);
      expect(jest.mocked(GraphInvestigation).mock.calls[0][0]).toHaveProperty(
        'onInvestigateInTimeline'
      );
      const onInvestigateInTimeline =
        jest.mocked(GraphInvestigation).mock.calls[0][0].onInvestigateInTimeline;

      // Act
      onInvestigateInTimeline?.(undefined, [], { from: '', to: '' });

      // Assert
      expect(mockInvestigateInTimeline.investigateInTimeline).not.toHaveBeenCalled();
      expect(mockToasts.addDanger).toHaveBeenCalled();
    });

    it('calls investigate in time', async () => {
      const { getByTestId } = render(<GraphVisualization />);
      expect(getByTestId(GRAPH_VISUALIZATION_TEST_ID)).toBeInTheDocument();

      // Wait for lazy-loaded GraphInvestigation to appear
      await waitFor(() => {
        expect(getByTestId(GRAPH_INVESTIGATION_TEST_ID)).toBeInTheDocument();
      });

      expect(GraphInvestigation).toHaveBeenCalledTimes(1);
      expect(jest.mocked(GraphInvestigation).mock.calls[0][0]).toHaveProperty(
        'onInvestigateInTimeline'
      );
      const onInvestigateInTimeline =
        jest.mocked(GraphInvestigation).mock.calls[0][0].onInvestigateInTimeline;

      // Act
      onInvestigateInTimeline?.(undefined, [], { from: 'now-15m', to: 'now' });

      // Assert
      expect(mockInvestigateInTimeline.investigateInTimeline).toHaveBeenCalled();
      expect(mockToasts.addDanger).not.toHaveBeenCalled();
    });
  });
});
