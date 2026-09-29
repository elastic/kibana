/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, Mocked } from 'vitest';

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render } from '@testing-library/react';
import { useFetchGraphData } from '@kbn/cloud-security-posture-graph/src/hooks';
import {
  GRAPH_PREVIEW,
  uiMetricService,
} from '@kbn/cloud-security-posture-common/utils/ui_metrics';
import { METRIC_TYPE } from '@kbn/analytics';
import {
  VISUALIZATIONS_SECTION_CONTENT_TEST_ID,
  VISUALIZATIONS_SECTION_HEADER_TEST_ID,
} from './test_ids';
import {
  ANALYZER_PREVIEW_TEST_ID,
  SESSION_PREVIEW_TEST_ID,
} from '../../../../flyout_v2/document/main/components/test_ids';
import { GRAPH_PREVIEW_TEST_ID } from '../../../../flyout_v2/shared/components/test_ids';
import { VisualizationsSection } from './visualizations_section';
import { mockContextValue } from '../../shared/mocks/mock_context';
import { mockDataFormattedForFieldBrowser } from '../../shared/mocks/mock_data_formatted_for_field_browser';
import { DocumentDetailsContext } from '../../shared/context';
import { useAlertPrevalenceFromProcessTree } from '../../../../flyout_v2/document/main/hooks/use_alert_prevalence_from_process_tree';
import { TestProviders } from '../../../../common/mock';
import { useExpandSection } from '../../../../flyout_v2/shared/hooks/use_expand_section';
import { useInvestigateInTimeline } from '../../../../detections/components/alerts_table/timeline_actions/use_investigate_in_timeline';
import { useGraphPreview } from '../../../../flyout_v2/document/main/hooks/use_graph_preview';
import { useNavigateToGraphVisualization } from '../../shared/hooks/use_navigate_to_graph_visualization';
import { useUpsellingComponent } from '../../../../common/hooks/use_upselling';
import { useSelectedPatterns } from '../../../../data_view_manager/hooks/use_selected_patterns';
import { useNavigateToSessionView } from '../../shared/hooks/use_navigate_to_session_view';

vi.mock('../../../../flyout_v2/shared/hooks/use_expand_section', () => {
  const mocked = {
    useExpandSection: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../../flyout_v2/document/main/hooks/use_alert_prevalence_from_process_tree', () => {
  const mocked = {
    useAlertPrevalenceFromProcessTree: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
const mockUseAlertPrevalenceFromProcessTree = useAlertPrevalenceFromProcessTree as Mock;

vi.mock('../../../../common/hooks/use_experimental_features');
vi.mock('../../../../data_view_manager/hooks/use_selected_patterns');
vi.mock('../../shared/hooks/use_navigate_to_session_view');
vi.mock('../../shared/hooks/use_navigate_to_graph_visualization');

vi.mock('react-redux-v7', () => {
  const original = require('react-redux-v7');

  return {
    ...original,
    useDispatch: () => vi.fn(),
  };
});
vi.mock(
  '../../../../detections/components/alerts_table/timeline_actions/use_investigate_in_timeline'
);
vi.mock('../../../../detections/hooks/use_is_analyzer_enabled');

vi.mock('../../../../flyout_v2/document/main/hooks/use_graph_preview');
vi.mock('../../../../common/hooks/use_upselling');

const mockUseGraphPreview = useGraphPreview as Mock;
const mockUseUpsellingComponent = useUpsellingComponent as Mock;

vi.mock('@kbn/cloud-security-posture-graph/src/hooks', () => {
  const mocked = {
    useFetchGraphData: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

const mockUseFetchGraphData = useFetchGraphData as Mock;

vi.mock('@kbn/cloud-security-posture-common/utils/ui_metrics', () => {
  const mocked = {
    uiMetricService: {
      trackUiMetric: vi.fn(),
    },
  };
  return { ...mocked, default: mocked };
});

const uiMetricServiceMock = uiMetricService as Mocked<typeof uiMetricService>;

const panelContextValue = {
  ...mockContextValue,
  dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
};

const renderVisualizationsSection = (contextValue = panelContextValue) =>
  render(
    <IntlProvider locale="en">
      <TestProviders>
        <DocumentDetailsContext.Provider value={contextValue}>
          <VisualizationsSection />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    </IntlProvider>
  );

describe('<VisualizationsSection />', () => {
  const mockUseExpandSection = vi.mocked(useExpandSection);

  beforeEach(() => {
    (useNavigateToSessionView as Mock).mockReturnValue({
      navigateToSessionView: vi.fn(),
    });
    (useNavigateToGraphVisualization as Mock).mockReturnValue({
      navigateToGraphVisualization: vi.fn(),
    });
    (useSelectedPatterns as Mock).mockReturnValue(['index']);
    mockUseAlertPrevalenceFromProcessTree.mockReturnValue({
      loading: false,
      error: false,
      alertIds: undefined,
      statsNodes: undefined,
    });
    // Default mock: graph visualization not available
    mockUseGraphPreview.mockReturnValue({
      shouldShowGraph: false,
      hasGraphData: false,
      eventIds: [],
    });
    mockUseUpsellingComponent.mockReturnValue(null);
    mockUseFetchGraphData.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        nodes: [],
        edges: [],
      },
    });
  });

  it('should render visualizations component', () => {
    const { getByTestId } = renderVisualizationsSection();

    expect(getByTestId(VISUALIZATIONS_SECTION_HEADER_TEST_ID)).toHaveTextContent('Visualizations');
    expect(getByTestId(VISUALIZATIONS_SECTION_CONTENT_TEST_ID)).toBeInTheDocument();
  });

  it('should render the component collapsed if value is false in local storage', () => {
    mockUseExpandSection.mockReturnValue(false);

    const { getByTestId } = renderVisualizationsSection();
    expect(getByTestId(VISUALIZATIONS_SECTION_CONTENT_TEST_ID)).not.toBeVisible();
  });

  it('should render the component expanded if value is true in local storage', () => {
    (useInvestigateInTimeline as Mock).mockReturnValue({
      investigateInTimelineAlertClick: vi.fn(),
    });
    mockUseExpandSection.mockReturnValue(true);

    const { getByTestId, queryByTestId } = renderVisualizationsSection();
    expect(getByTestId(VISUALIZATIONS_SECTION_CONTENT_TEST_ID)).toBeVisible();

    expect(getByTestId(`${SESSION_PREVIEW_TEST_ID}LeftSection`)).toBeInTheDocument();
    expect(getByTestId(`${ANALYZER_PREVIEW_TEST_ID}LeftSection`)).toBeInTheDocument();
    expect(queryByTestId(`${GRAPH_PREVIEW_TEST_ID}LeftSection`)).not.toBeInTheDocument();
  });

  it('should render the graph preview component when shouldShowGraph is true', () => {
    mockUseExpandSection.mockReturnValue(true);

    mockUseGraphPreview.mockReturnValue({
      shouldShowGraph: true,
      hasGraphData: true,
      eventIds: [],
    });

    const { getByTestId } = renderVisualizationsSection();

    expect(getByTestId(`${GRAPH_PREVIEW_TEST_ID}LeftSection`)).toBeInTheDocument();
    expect(uiMetricServiceMock.trackUiMetric).toHaveBeenCalledWith(
      METRIC_TYPE.LOADED,
      GRAPH_PREVIEW
    );
  });

  it('should not render the graph preview component when shouldShowGraph is false', () => {
    mockUseExpandSection.mockReturnValue(true);

    const { queryByTestId } = renderVisualizationsSection();

    expect(queryByTestId(`${GRAPH_PREVIEW_TEST_ID}LeftSection`)).not.toBeInTheDocument();
  });

  it('should render the graph upsell when hasGraphData is true and upsell component is available', () => {
    mockUseExpandSection.mockReturnValue(true);

    mockUseGraphPreview.mockReturnValue({
      shouldShowGraph: false,
      hasGraphData: true,
      eventIds: [],
    });

    const MockUpsell = () => <div data-test-subj="graphVisualizationUpsell">{'Upgrade'}</div>;
    mockUseUpsellingComponent.mockReturnValue(MockUpsell);

    const { getByTestId } = renderVisualizationsSection();

    expect(getByTestId(`${GRAPH_PREVIEW_TEST_ID}LeftSection`)).toBeInTheDocument();
    expect(getByTestId('graphVisualizationUpsell')).toBeInTheDocument();
  });

  it('should not render the graph container when hasGraphData is false', () => {
    mockUseExpandSection.mockReturnValue(true);

    mockUseGraphPreview.mockReturnValue({
      shouldShowGraph: false,
      hasGraphData: false,
      eventIds: [],
    });

    const { queryByTestId } = renderVisualizationsSection();

    expect(queryByTestId(`${GRAPH_PREVIEW_TEST_ID}LeftSection`)).not.toBeInTheDocument();
  });
});
