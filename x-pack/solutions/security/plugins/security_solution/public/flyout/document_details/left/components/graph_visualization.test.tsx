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

/**
 * Unit tests for the document_details GraphVisualization wrapper.
 *
 * This wrapper reads event context from useDocumentDetailsContext + useGraphPreview
 * and passes the resolved values to the shared GraphVisualization component in 'event' mode.
 *
 * The full callback behaviour (onInvestigateInTimeline, onOpenEventPreview, etc.) is tested in:
 * flyout/shared/components/graph_visualization.test.tsx
 */

const mockToasts = {
  addDanger: jest.fn(),
  addError: jest.fn(),
  addSuccess: jest.fn(),
  addWarning: jest.fn(),
  addInfo: jest.fn(),
  remove: jest.fn(),
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

jest.mock('../../../../common/lib/kibana', () => ({
  useToasts: () => mockToasts,
  KibanaServices: {
    get: () => ({
      uiSettings: {
        get: jest.fn().mockReturnValue(true),
      },
    }),
  },
}));

jest.mock('../../../../common/hooks/timeline/use_investigate_in_timeline', () => ({
  useInvestigateInTimeline: () => ({ investigateInTimeline: jest.fn() }),
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

const MOCK_EVENT_IDS = ['event-1', 'event-2'];
const MOCK_TIMESTAMP = new Date().toISOString();

jest.mock('../../shared/hooks/use_graph_preview', () => ({
  useGraphPreview: () => ({
    eventIds: MOCK_EVENT_IDS,
    timestamp: MOCK_TIMESTAMP,
    isAlert: false,
  }),
}));

describe('GraphVisualization (document_details wrapper)', () => {
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

  it('renders the graph visualization wrapper', async () => {
    const { getByTestId } = render(<GraphVisualization />);
    expect(getByTestId(GRAPH_VISUALIZATION_TEST_ID)).toBeInTheDocument();

    await waitFor(() => {
      expect(getByTestId(GRAPH_INVESTIGATION_TEST_ID)).toBeInTheDocument();
    });
  });

  it('passes event context from useDocumentDetailsContext and useGraphPreview as originEventIds', async () => {
    render(<GraphVisualization />);

    await waitFor(() => {
      expect(GraphInvestigation).toHaveBeenCalledTimes(1);
    });

    const { initialState, scopeId } = jest.mocked(GraphInvestigation).mock.calls[0][0];
    expect(scopeId).toBe('test-scope');
    expect(initialState.originEventIds).toEqual([
      { id: 'event-1', isAlert: false },
      { id: 'event-2', isAlert: false },
    ]);
    expect(initialState.timeRange).toEqual({
      from: `${MOCK_TIMESTAMP}||-30m`,
      to: `${MOCK_TIMESTAMP}||+30m`,
    });
  });
});
