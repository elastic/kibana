/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import '@testing-library/jest-dom';
import { render, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux-v7';
import { createStore } from 'redux-v4';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';
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
  addDanger: vi.fn(),
  addError: vi.fn(),
  addSuccess: vi.fn(),
  addWarning: vi.fn(),
  addInfo: vi.fn(),
  remove: vi.fn(),
};

const GRAPH_INVESTIGATION_TEST_ID = 'cloudSecurityPostureGraphGraphInvestigation';

vi.mock('@kbn/expandable-flyout', () => {
  const mocked = {
    useExpandableFlyoutApi: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/cloud-security-posture-graph', async () => {
  const { isEntityNode, getNodeDocumentMode, hasNodeDocumentsData, getSingleDocumentData } =
    await vi.importActual('@kbn/cloud-security-posture-graph/src/components/utils');
  const { GraphGroupedNodePreviewPanelKey, GROUP_PREVIEW_BANNER } = await vi.importActual(
    '@kbn/cloud-security-posture-graph/src/components/graph_grouped_node_preview_panel/constants'
  );
  const { isEntityItem } = await vi.importActual(
    '@kbn/cloud-security-posture-graph/src/components/graph_grouped_node_preview_panel/components/grouped_item/types'
  );

  return {
    GraphInvestigation: vi.fn(),
    isEntityNode,
    isEntityItem,
    getNodeDocumentMode,
    hasNodeDocumentsData,
    getSingleDocumentData,
    GraphGroupedNodePreviewPanelKey,
    GROUP_PREVIEW_BANNER,
  };
});

vi.mock('../../../../common/lib/kibana', () => {
  const mocked = {
    useToasts: () => mockToasts,
    useKibana: () => ({
      services: {
        application: {
          capabilities: {
            securitySolutionTimeline: { read: true, crud: true },
          },
        },
        overlays: {
          openSystemFlyout: vi.fn(),
        },
      },
    }),
    KibanaServices: {
      get: () => ({
        uiSettings: {
          get: vi.fn().mockReturnValue(true),
        },
      }),
    },
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../common/hooks/is_in_security_app', () => {
  const mocked = {
    useIsInSecurityApp: () => true,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../flyout_v2/shared/components/flyout_provider', () => {
  const mocked = {
    flyoutProviders: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../flyout_v2/document/main/document_flyout_wrapper', () => {
  const mocked = {
    DocumentFlyoutWrapper: () => <div />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../flyout_v2/network/main', () => {
  const mocked = {
    Network: () => <div />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../common/hooks/timeline/use_investigate_in_timeline', () => {
  const mocked = {
    useInvestigateInTimeline: () => ({ investigateInTimeline: vi.fn() }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../data_view_manager/hooks/use_data_view', () => {
  const mocked = {
    useDataView: () => ({
      dataView: {
        id: 'experimental-data-view',
        getIndexPattern: vi.fn().mockReturnValue('experimental-data-view-pattern'),
      },
      status: 'ready',
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../common/hooks/use_experimental_features', () => {
  const mocked = {
    useIsExperimentalFeatureEnabled: () => true,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../shared/context', () => {
  const mocked = {
    useDocumentDetailsContext: () => ({
      searchHit: { _id: 'doc-1', _index: 'idx', _source: {} },
      scopeId: 'test-scope',
    }),
  };
  return { ...mocked, default: mocked };
});

const MOCK_EVENT_IDS = ['event-1', 'event-2'];
const MOCK_TIMESTAMP = new Date().toISOString();

vi.mock('../../../../flyout_v2/document/main/hooks/use_graph_preview', () => {
  const mocked = {
    useGraphPreview: () => ({
      eventIds: MOCK_EVENT_IDS,
      timestamp: MOCK_TIMESTAMP,
    }),
  };
  return { ...mocked, default: mocked };
});

const store = createStore(() => ({}));
const history = createMemoryHistory();

const renderGraphVisualization = () =>
  render(
    <Provider store={store}>
      <Router history={history}>
        <GraphVisualization />
      </Router>
    </Provider>
  );

describe('GraphVisualization (document_details wrapper)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useExpandableFlyoutApi).mockReturnValue(mockFlyoutApi);
    (GraphInvestigation as unknown as Mock).mockReturnValue(
      <div data-test-subj={GRAPH_INVESTIGATION_TEST_ID} />
    );
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('renders the graph visualization wrapper', async () => {
    const { getByTestId } = renderGraphVisualization();
    expect(getByTestId(GRAPH_VISUALIZATION_TEST_ID)).toBeInTheDocument();

    await waitFor(() => {
      expect(getByTestId(GRAPH_INVESTIGATION_TEST_ID)).toBeInTheDocument();
    });
  });

  it('passes event context from useDocumentDetailsContext and useGraphPreview as originEventIds', async () => {
    renderGraphVisualization();

    await waitFor(() => {
      expect(GraphInvestigation).toHaveBeenCalledTimes(1);
    });

    const { initialState, scopeId } = vi.mocked(GraphInvestigation).mock.calls[0][0];
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
