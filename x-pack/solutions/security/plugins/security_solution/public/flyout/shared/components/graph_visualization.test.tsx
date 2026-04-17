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
import { mockFlyoutApi } from '../../document_details/shared/mocks/mock_flyout_context';
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
  const { isEntityNode, getNodeDocumentMode, hasNodeDocumentsData, getSingleDocumentData } =
    jest.requireActual('@kbn/cloud-security-posture-graph/src/components/utils');
  const { GraphGroupedNodePreviewPanelKey, GROUP_PREVIEW_BANNER } = jest.requireActual(
    '@kbn/cloud-security-posture-graph/src/components/graph_grouped_node_preview_panel/constants'
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
    GraphGroupedNodePreviewPanelKey,
    GROUP_PREVIEW_BANNER,
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

jest.mock('../../../sourcerer/components/use_get_sourcerer_data_view', () => ({
  useGetScopedSourcererDataView: () => ({
    dataView: {
      id: 'old-data-view',
      getIndexPattern: jest.fn().mockReturnValue('old-data-view-pattern'),
    },
  }),
}));

jest.mock('../../../data_view_manager/hooks/use_data_view', () => ({
  useDataView: () => ({
    dataView: {
      id: 'experimental-data-view',
      getIndexPattern: jest.fn().mockReturnValue('experimental-data-view-pattern'),
    },
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
});
