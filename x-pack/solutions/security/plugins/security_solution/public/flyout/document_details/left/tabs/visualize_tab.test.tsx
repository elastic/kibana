/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
jest.mock('../../../../flyout_v2/document/main/hooks/use_graph_preview');
jest.mock('../../../../common/hooks/use_upselling');
jest.mock('@kbn/expandable-flyout');
jest.mock('../../shared/context');
jest.mock('../components/graph_visualization', () => ({
  GRAPH_ID: 'graph-id',
  GraphVisualization: () => (
    <div data-test-subj={mockGraphVisualizationTestId}>{'Graph Visualization'}</div>
  ),
}));
jest.mock('../components/analyze_graph', () => ({
  ANALYZE_GRAPH_ID: 'analyze-graph-id',
  AnalyzeGraph: () => <div data-test-subj={mockAnalyzeGraphTestId}>{'Analyze Graph'}</div>,
}));
jest.mock('../components/session_view', () => ({
  SESSION_VIEW_ID: 'session-view-id',
  SessionView: () => <div data-test-subj={mockSessionViewTestId}>{'Session View'}</div>,
}));

jest.mock('@kbn/cloud-security-posture-common/utils/ui_metrics', () => ({
  uiMetricService: {
    trackUiMetric: jest.fn(),
  },
  GRAPH_INVESTIGATION: 'graph-investigation',
}));
jest.mock('../../../../common/lib/apm/use_start_transaction', () => ({
  useStartTransaction: () => ({
    startTransaction: jest.fn(),
  }),
}));

const renderVisualizeTab = () => {
  return render(
    <IntlProvider locale="en">
      <VisualizeTab />
    </IntlProvider>
  );
};

describe('VisualizeTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useGraphPreview as jest.Mock).mockReturnValue({
      shouldShowGraph: true,
      hasGraphData: true,
    });

    (useUpsellingComponent as jest.Mock).mockReturnValue(null);

    (useExpandableFlyoutState as jest.Mock).mockReturnValue({
      left: {
        path: {
          subTab: GRAPH_ID,
        },
      },
    });

    (useDocumentDetailsContext as jest.Mock).mockReturnValue({
      searchHit: { _id: 'doc-1', _index: 'idx', _source: {} },
    });
  });

  it('should not render GraphVisualization component when graph is not available', () => {
    (useGraphPreview as jest.Mock).mockReturnValue({
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
    (useGraphPreview as jest.Mock).mockReturnValue({
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
    (useGraphPreview as jest.Mock).mockReturnValue({
      shouldShowGraph: false,
      hasGraphData: true,
    });

    const MockUpsell = () => <div data-test-subj="graphVisualizationUpsell">{'Upgrade'}</div>;
    (useUpsellingComponent as jest.Mock).mockReturnValue(MockUpsell);

    renderVisualizeTab();

    expect(
      screen.queryByTestId(VISUALIZE_TAB_GRAPH_VISUALIZATION_BUTTON_TEST_ID)
    ).toBeInTheDocument();
    expect(screen.queryByTestId(mockGraphVisualizationTestId)).not.toBeInTheDocument();
    expect(screen.getByTestId('graphVisualizationUpsell')).toBeInTheDocument();
  });
});
