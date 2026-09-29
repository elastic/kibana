/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { useGraphPreview } from '../../../../flyout_v2/document/main/hooks/use_graph_preview';
import { useUpsellingComponent } from '../../../../common/hooks/use_upselling';
import { useExpandableFlyoutState } from '@kbn/expandable-flyout';
import { useDocumentDetailsContext } from '../../shared/context';
import { GRAPH_ID } from '../components/graph_visualization';
import { VisualizeTab } from './visualize_tab';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { VISUALIZE_TAB_GRAPH_VISUALIZATION_BUTTON_TEST_ID } from './test_ids';

const mockGraphVisualizationTestId = 'graph-visualization';
const mockAnalyzeGraphTestId = 'analyze-graph';
const mockSessionViewTestId = 'session-view';

// Mock all required dependencies
vi.mock('../../../../flyout_v2/document/main/hooks/use_graph_preview');
vi.mock('../../../../common/hooks/use_upselling');
vi.mock('@kbn/expandable-flyout');
vi.mock('../../shared/context');
vi.mock('../components/graph_visualization', () => {
  const mocked = {
    GRAPH_ID: 'graph-id',
    GraphVisualization: () => (
      <div data-test-subj={mockGraphVisualizationTestId}>{'Graph Visualization'}</div>
    ),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../components/analyze_graph', () => {
  const mocked = {
    ANALYZE_GRAPH_ID: 'analyze-graph-id',
    AnalyzeGraph: () => <div data-test-subj={mockAnalyzeGraphTestId}>{'Analyze Graph'}</div>,
  };
  return { ...mocked, default: mocked };
});
vi.mock('../components/session_view', () => {
  const mocked = {
    SESSION_VIEW_ID: 'session-view-id',
    SessionView: () => <div data-test-subj={mockSessionViewTestId}>{'Session View'}</div>,
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/cloud-security-posture-common/utils/ui_metrics', () => {
  const mocked = {
    uiMetricService: {
      trackUiMetric: vi.fn(),
    },
    GRAPH_INVESTIGATION: 'graph-investigation',
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../../common/lib/apm/use_start_transaction', () => {
  const mocked = {
    useStartTransaction: () => ({
      startTransaction: vi.fn(),
    }),
  };
  return { ...mocked, default: mocked };
});

const renderVisualizeTab = () => {
  return render(
    <IntlProvider locale="en">
      <VisualizeTab />
    </IntlProvider>
  );
};

describe('VisualizeTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (useGraphPreview as Mock).mockReturnValue({
      shouldShowGraph: true,
      hasGraphData: true,
    });

    (useUpsellingComponent as Mock).mockReturnValue(null);

    (useExpandableFlyoutState as Mock).mockReturnValue({
      left: {
        path: {
          subTab: GRAPH_ID,
        },
      },
    });

    (useDocumentDetailsContext as Mock).mockReturnValue({
      searchHit: { _id: 'doc-1', _index: 'idx', _source: {} },
    });
  });

  it('should not render GraphVisualization component when graph is not available', () => {
    (useGraphPreview as Mock).mockReturnValue({
      shouldShowGraph: false,
      hasGraphData: false,
    });

    renderVisualizeTab();

    expect(
      screen.queryByTestId(VISUALIZE_TAB_GRAPH_VISUALIZATION_BUTTON_TEST_ID)
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId(mockGraphVisualizationTestId)).not.toBeInTheDocument();
    expect(screen.getByTestId(mockSessionViewTestId)).toBeInTheDocument();
  });

  it('should render graph visualization when shouldShowGraph is true', () => {
    (useGraphPreview as Mock).mockReturnValue({
      shouldShowGraph: true,
      hasGraphData: true,
    });

    renderVisualizeTab();

    expect(
      screen.queryByTestId(VISUALIZE_TAB_GRAPH_VISUALIZATION_BUTTON_TEST_ID)
    ).toBeInTheDocument();
    expect(screen.getByTestId(mockGraphVisualizationTestId)).toBeInTheDocument();
  });

  it('should render graph upselling message when hasGraphData is true and upsell component is available', () => {
    (useGraphPreview as Mock).mockReturnValue({
      shouldShowGraph: false,
      hasGraphData: true,
    });

    const MockUpsell = () => <div data-test-subj="graphVisualizationUpsell">{'Upgrade'}</div>;
    (useUpsellingComponent as Mock).mockReturnValue(MockUpsell);

    renderVisualizeTab();

    expect(
      screen.queryByTestId(VISUALIZE_TAB_GRAPH_VISUALIZATION_BUTTON_TEST_ID)
    ).toBeInTheDocument();
    expect(screen.queryByTestId(mockGraphVisualizationTestId)).not.toBeInTheDocument();
    expect(screen.getByTestId('graphVisualizationUpsell')).toBeInTheDocument();
  });
});
