/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render } from '@testing-library/react';
import { useFetchGraphData } from '@kbn/cloud-security-posture-graph/src/hooks';
import {
  uiMetricService,
  GRAPH_PREVIEW,
} from '@kbn/cloud-security-posture-common/utils/ui_metrics';
import { METRIC_TYPE } from '@kbn/analytics';
import {
  ANALYZER_PREVIEW_TEST_ID,
  SESSION_PREVIEW_TEST_ID,
  GRAPH_PREVIEW_TEST_ID,
  VISUALIZATIONS_SECTION_CONTENT_TEST_ID,
  VISUALIZATIONS_SECTION_HEADER_TEST_ID,
} from './test_ids';
import { VisualizationsSection } from './visualizations_section';
import { mockContextValue } from '../../shared/mocks/mock_context';
import { mockDataFormattedForFieldBrowser } from '../../shared/mocks/mock_data_formatted_for_field_browser';
import { DocumentDetailsContext } from '../../shared/context';
import { useAlertPrevalenceFromProcessTree } from '../../shared/hooks/use_alert_prevalence_from_process_tree';
import { useTimelineDataFilters } from '../../../../timelines/containers/use_timeline_data_filters';
import { TestProvider } from '@kbn/expandable-flyout/src/test/provider';
import { useExpandSection } from '../hooks/use_expand_section';
import { useInvestigateInTimeline } from '../../../../detections/components/alerts_table/timeline_actions/use_investigate_in_timeline';
import { useIsInvestigateInResolverActionEnabled } from '../../../../detections/components/alerts_table/timeline_actions/investigate_in_resolver';
import { useGraphPreview } from '../../shared/hooks/use_graph_preview';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { createUseUiSetting$Mock } from '../../../../common/lib/kibana/kibana_react.mock';
import {
  ENABLE_GRAPH_VISUALIZATION_SETTING,
  ENABLE_VISUALIZATIONS_IN_FLYOUT_SETTING,
} from '../../../../../common/constants';

jest.mock('../hooks/use_expand_section');
jest.mock('../../shared/hooks/use_alert_prevalence_from_process_tree', () => ({
  useAlertPrevalenceFromProcessTree: jest.fn(),
}));
const mockUseAlertPrevalenceFromProcessTree = useAlertPrevalenceFromProcessTree as jest.Mock;

jest.mock('../../../../timelines/containers/use_timeline_data_filters', () => ({
  useTimelineDataFilters: jest.fn(),
}));
const mockUseTimelineDataFilters = useTimelineDataFilters as jest.Mock;
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');

  return {
    ...original,
    useDispatch: () => jest.fn(),
  };
});
jest.mock(
  '../../../../detections/components/alerts_table/timeline_actions/use_investigate_in_timeline'
);
jest.mock(
  '../../../../detections/components/alerts_table/timeline_actions/investigate_in_resolver'
);

jest.mock('../../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn(),
}));

const useIsExperimentalFeatureEnabledMock = useIsExperimentalFeatureEnabled as jest.Mock;
useIsExperimentalFeatureEnabledMock.mockReturnValue(true);
const mockUseUiSetting = jest.fn().mockImplementation((key) => [false]);

jest.mock('@kbn/kibana-react-plugin/public', () => {
  const original = jest.requireActual('@kbn/kibana-react-plugin/public');
  return {
    ...original,
    useUiSetting$: (...args: unknown[]) => mockUseUiSetting(...args),
  };
});
jest.mock('../../shared/hooks/use_graph_preview');

const mockUseGraphPreview = useGraphPreview as jest.Mock;

jest.mock('@kbn/cloud-security-posture-graph/src/hooks', () => ({
  useFetchGraphData: jest.fn(),
}));

const mockUseFetchGraphData = useFetchGraphData as jest.Mock;

jest.mock('@kbn/cloud-security-posture-common/utils/ui_metrics', () => ({
  uiMetricService: {
    trackUiMetric: jest.fn(),
  },
}));

const uiMetricServiceMock = uiMetricService as jest.Mocked<typeof uiMetricService>;

const panelContextValue = {
  ...mockContextValue,
  dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
};

const renderVisualizationsSection = (contextValue = panelContextValue) =>
  render(
    <IntlProvider locale="en">
      <TestProvider>
        <DocumentDetailsContext.Provider value={contextValue}>
          <VisualizationsSection />
        </DocumentDetailsContext.Provider>
      </TestProvider>
    </IntlProvider>
  );

describe('<VisualizationsSection />', () => {
  beforeEach(() => {
    mockUseUiSetting.mockImplementation(() => [false]);
    mockUseTimelineDataFilters.mockReturnValue({ selectedPatterns: ['index'] });
    mockUseAlertPrevalenceFromProcessTree.mockReturnValue({
      loading: false,
      error: false,
      alertIds: undefined,
      statsNodes: undefined,
    });
    mockUseGraphPreview.mockReturnValue({
      hasGraphRepresentation: true,
      eventIds: [],
    });
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

    expect(getByTestId(VISUALIZATIONS_SECTION_HEADER_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(VISUALIZATIONS_SECTION_HEADER_TEST_ID)).toHaveTextContent('Visualizations');
    expect(getByTestId(VISUALIZATIONS_SECTION_CONTENT_TEST_ID)).toBeInTheDocument();
  });

  it('should render the component collapsed if value is false in local storage', () => {
    (useExpandSection as jest.Mock).mockReturnValue(false);

    const { getByTestId } = renderVisualizationsSection();
    expect(getByTestId(VISUALIZATIONS_SECTION_CONTENT_TEST_ID)).not.toBeVisible();
  });

  it('should render the component expanded if value is true in local storage', () => {
    (useInvestigateInTimeline as jest.Mock).mockReturnValue({
      investigateInTimelineAlertClick: jest.fn(),
    });
    (useIsInvestigateInResolverActionEnabled as jest.Mock).mockReturnValue(true);
    (useExpandSection as jest.Mock).mockReturnValue(true);
    mockUseUiSetting.mockImplementation((key, defaultValue) => {
      const useUiSetting$Mock = createUseUiSetting$Mock();

      if (key === ENABLE_GRAPH_VISUALIZATION_SETTING) {
        return [false, jest.fn()];
      } else if (key === ENABLE_VISUALIZATIONS_IN_FLYOUT_SETTING) {
        return [false, jest.fn()];
      }

      return useUiSetting$Mock(key, defaultValue);
    });

    const { getByTestId, queryByTestId } = renderVisualizationsSection();
    expect(getByTestId(VISUALIZATIONS_SECTION_CONTENT_TEST_ID)).toBeVisible();

    expect(getByTestId(`${SESSION_PREVIEW_TEST_ID}LeftSection`)).toBeInTheDocument();
    expect(getByTestId(`${ANALYZER_PREVIEW_TEST_ID}LeftSection`)).toBeInTheDocument();
    expect(queryByTestId(`${GRAPH_PREVIEW_TEST_ID}LeftSection`)).not.toBeInTheDocument();
  });

  it('should render the graph preview component if the feature is enabled', () => {
    (useExpandSection as jest.Mock).mockReturnValue(true);
    mockUseUiSetting.mockImplementation((key, defaultValue) => {
      const useUiSetting$Mock = createUseUiSetting$Mock();

      if (key === ENABLE_GRAPH_VISUALIZATION_SETTING) {
        return [true, jest.fn()];
      } else if (key === ENABLE_VISUALIZATIONS_IN_FLYOUT_SETTING) {
        return [true, jest.fn()];
      }

      return useUiSetting$Mock(key, defaultValue);
    });

    const { getByTestId } = renderVisualizationsSection();

    expect(getByTestId(`${GRAPH_PREVIEW_TEST_ID}LeftSection`)).toBeInTheDocument();
    expect(uiMetricServiceMock.trackUiMetric).toHaveBeenCalledWith(
      METRIC_TYPE.LOADED,
      GRAPH_PREVIEW
    );
  });

  it('should not render the graph preview component if the graph feature is disabled', () => {
    (useExpandSection as jest.Mock).mockReturnValue(true);
    mockUseUiSetting.mockImplementation((key, defaultValue) => {
      const useUiSetting$Mock = createUseUiSetting$Mock();

      if (key === ENABLE_GRAPH_VISUALIZATION_SETTING) {
        return [false, jest.fn()];
      } else if (key === ENABLE_VISUALIZATIONS_IN_FLYOUT_SETTING) {
        return [true, jest.fn()];
      }

      return useUiSetting$Mock(key, defaultValue);
    });

    const { queryByTestId } = renderVisualizationsSection();

    expect(queryByTestId(`${GRAPH_PREVIEW_TEST_ID}LeftSection`)).not.toBeInTheDocument();
  });

  it('should not render the graph preview component if the flyout feature is disabled', () => {
    (useExpandSection as jest.Mock).mockReturnValue(true);
    mockUseUiSetting.mockImplementation((key, defaultValue) => {
      const useUiSetting$Mock = createUseUiSetting$Mock();

      if (key === ENABLE_GRAPH_VISUALIZATION_SETTING) {
        return [true, jest.fn()];
      } else if (key === ENABLE_VISUALIZATIONS_IN_FLYOUT_SETTING) {
        return [false, jest.fn()];
      }

      return useUiSetting$Mock(key, defaultValue);
    });

    const { queryByTestId } = renderVisualizationsSection();

    expect(queryByTestId(`${GRAPH_PREVIEW_TEST_ID}LeftSection`)).not.toBeInTheDocument();
  });
});
