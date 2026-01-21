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
  const { isEntityItem } = jest.requireActual(
    '@kbn/cloud-security-posture-graph/src/components/graph_grouped_node_preview_panel/components/grouped_item/types'
  );

  // Create a shared Subject that can be accessed in tests
  const mockPreviewAction$ = new Subject();

  return {
    // Mocked GraphInvestigation component
    GraphInvestigation: jest.fn(),
    // Real RxJS Subject for previewAction$ (and deprecated groupedItemClick$ alias)
    previewAction$: mockPreviewAction$,
    groupedItemClick$: mockPreviewAction$,
    // Use actual utility functions
    isEntityNode,
    isEntityItem,
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

jest.mock('../../../../sourcerer/components/use_get_sourcerer_data_view', () => ({
  useGetScopedSourcererDataView: () => ({
    dataView: {
      id: 'old-data-view',
      getIndexPattern: jest.fn().mockReturnValue('old-data-view-pattern'),
    },
  }),
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

  describe('previewAction$ subscription', () => {
    it('renders GraphInvestigation component', async () => {
      const { getByTestId } = render(<GraphVisualization />);
      expect(getByTestId(GRAPH_VISUALIZATION_TEST_ID)).toBeInTheDocument();

      // Wait for lazy-loaded GraphInvestigation to appear
      await waitFor(() => {
        expect(getByTestId(GRAPH_INVESTIGATION_TEST_ID)).toBeInTheDocument();
      });
    });

    it('opens alert preview panel when alert item is emitted', async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { previewAction$ } = require('@kbn/cloud-security-posture-graph');

      const { getByTestId } = render(<GraphVisualization />);
      expect(getByTestId(GRAPH_VISUALIZATION_TEST_ID)).toBeInTheDocument();

      // Wait for lazy-loaded GraphInvestigation to appear and subscription to be active
      await waitFor(() => {
        expect(getByTestId(GRAPH_INVESTIGATION_TEST_ID)).toBeInTheDocument();
      });

      // Act - Emit an alert item through pub-sub
      previewAction$.next({
        itemType: 'alert',
        id: 'alert-1',
        docId: 'alert-doc-id',
        index: 'alert-index',
        action: 'login-failed',
      });

      // Assert - should open alert preview panel
      await waitFor(() => {
        expect(mockFlyoutApi.openPreviewPanel).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'document-details-preview',
            params: {
              id: 'alert-doc-id',
              indexName: 'alert-index',
              banner: expect.objectContaining({ title: 'Preview alert details' }),
              scopeId: 'test-scope',
              isPreviewMode: true,
            },
          })
        );
      });
    });

    it('opens event preview panel when event item is emitted', async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { previewAction$ } = require('@kbn/cloud-security-posture-graph');

      const { getByTestId } = render(<GraphVisualization />);
      expect(getByTestId(GRAPH_VISUALIZATION_TEST_ID)).toBeInTheDocument();

      // Wait for lazy-loaded GraphInvestigation to appear
      await waitFor(() => {
        expect(getByTestId(GRAPH_INVESTIGATION_TEST_ID)).toBeInTheDocument();
      });

      // Act - Emit an event item through pub-sub
      previewAction$.next({
        itemType: 'event',
        id: 'event-1',
        docId: 'event-doc-id',
        index: 'event-index',
        action: 'file-created',
      });

      // Assert - should open event preview panel
      await waitFor(() => {
        expect(mockFlyoutApi.openPreviewPanel).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'document-details-preview',
            params: {
              id: 'event-doc-id',
              indexName: 'event-index',
              banner: expect.objectContaining({ title: 'Preview event details' }),
              scopeId: 'test-scope',
              isPreviewMode: true,
            },
          })
        );
      });
    });

    it('opens entity preview panel when entity item is emitted', async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { previewAction$ } = require('@kbn/cloud-security-posture-graph');

      const { getByTestId } = render(<GraphVisualization />);
      expect(getByTestId(GRAPH_VISUALIZATION_TEST_ID)).toBeInTheDocument();

      // Wait for lazy-loaded GraphInvestigation to appear
      await waitFor(() => {
        expect(getByTestId(GRAPH_INVESTIGATION_TEST_ID)).toBeInTheDocument();
      });

      // Act - Emit an entity item through pub-sub
      previewAction$.next({
        itemType: 'entity',
        id: 'entity-id',
        label: 'Admin User',
        type: 'Identity',
        subType: 'IAM User',
        availableInEntityStore: true,
      });

      // Assert - should open entity preview panel
      await waitFor(() => {
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
    });

    it('opens entity preview panel with isEngineMetadataExist false when entity not in store', async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { previewAction$ } = require('@kbn/cloud-security-posture-graph');

      const { getByTestId } = render(<GraphVisualization />);
      expect(getByTestId(GRAPH_VISUALIZATION_TEST_ID)).toBeInTheDocument();

      // Wait for lazy-loaded GraphInvestigation to appear
      await waitFor(() => {
        expect(getByTestId(GRAPH_INVESTIGATION_TEST_ID)).toBeInTheDocument();
      });

      // Act - Emit an entity item without availableInEntityStore
      previewAction$.next({
        itemType: 'entity',
        id: 'entity-id',
        label: 'Unknown User',
        availableInEntityStore: false,
      });

      // Assert - should open entity preview panel with isEngineMetadataExist false
      await waitFor(() => {
        expect(mockFlyoutApi.openPreviewPanel).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'generic-entity-panel',
            params: {
              entityId: 'entity-id',
              scopeId: 'test-scope',
              isPreviewMode: true,
              banner: expect.objectContaining({ title: 'Preview entity details' }),
              isEngineMetadataExist: false,
            },
          })
        );
      });
    });

    it('GraphInvestigation does not receive onOpenEventPreview prop', async () => {
      const { getByTestId } = render(<GraphVisualization />);

      await waitFor(() => {
        expect(getByTestId(GRAPH_INVESTIGATION_TEST_ID)).toBeInTheDocument();
      });

      expect(GraphInvestigation).toHaveBeenCalledTimes(1);
      // Verify onOpenEventPreview is NOT passed (pub-sub is used instead)
      expect(jest.mocked(GraphInvestigation).mock.calls[0][0]).not.toHaveProperty(
        'onOpenEventPreview'
      );
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
