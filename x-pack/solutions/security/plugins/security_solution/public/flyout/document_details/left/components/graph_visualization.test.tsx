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
  // Import actual utility functions directly from the source
  const { isEntityNode, getNodeDocumentMode, hasNodeDocumentsData, getSingleDocumentData } =
    jest.requireActual('@kbn/cloud-security-posture-graph/src/components/utils');
  const { GraphGroupedNodePreviewPanelKey, GROUP_PREVIEW_BANNER } = jest.requireActual(
    '@kbn/cloud-security-posture-graph/src/components/graph_grouped_node_preview_panel/constants'
  );
  const { isEntityItem } = jest.requireActual(
    '@kbn/cloud-security-posture-graph/src/components/graph_grouped_node_preview_panel/components/grouped_item/types'
  );

  return {
    // Mocked GraphInvestigation component
    GraphInvestigation: jest.fn(),
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

  describe('rendering', () => {
    it('renders GraphInvestigation component', async () => {
      const { getByTestId } = render(<GraphVisualization />);
      expect(getByTestId(GRAPH_VISUALIZATION_TEST_ID)).toBeInTheDocument();

      // Wait for lazy-loaded GraphInvestigation to appear
      await waitFor(() => {
        expect(getByTestId(GRAPH_INVESTIGATION_TEST_ID)).toBeInTheDocument();
      });
    });

    it('GraphInvestigation receives onOpenEventPreview callback', async () => {
      const { getByTestId } = render(<GraphVisualization />);

      await waitFor(() => {
        expect(getByTestId(GRAPH_INVESTIGATION_TEST_ID)).toBeInTheDocument();
      });

      expect(GraphInvestigation).toHaveBeenCalledTimes(1);
      // Verify onOpenEventPreview IS passed as a callback
      expect(jest.mocked(GraphInvestigation).mock.calls[0][0]).toHaveProperty('onOpenEventPreview');
      expect(typeof jest.mocked(GraphInvestigation).mock.calls[0][0].onOpenEventPreview).toBe(
        'function'
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
