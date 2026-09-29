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
import { TableId } from '@kbn/securitysolution-data-table';
import { useFetchGraphData } from '@kbn/cloud-security-posture-graph/src/hooks';
import {
  GRAPH_PREVIEW,
  uiMetricService,
} from '@kbn/cloud-security-posture-common/utils/ui_metrics';
import { METRIC_TYPE } from '@kbn/analytics';
import {
  GRAPH_PREVIEW_TEST_ID,
  VISUALIZATIONS_SECTION_CONTENT_TEST_ID,
  VISUALIZATIONS_SECTION_HEADER_TEST_ID,
} from './test_ids';
import { VisualizationsSection } from './visualizations_section';
import { mockContextValue } from '../../../../document_details/shared/mocks/mock_context';
import { mockDataFormattedForFieldBrowser } from '../../../../document_details/shared/mocks/mock_data_formatted_for_field_browser';
import { DocumentDetailsContext } from '../../../../document_details/shared/context';
import { TestProviders } from '../../../../../common/mock';
import { useExpandSection } from '../../../../../flyout_v2/shared/hooks/use_expand_section';
import { EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID } from '../../../../../flyout_v2/shared/components/test_ids';
import { useShouldShowGraph } from '../../../../shared/hooks/use_should_show_graph';

vi.mock('../../../../../flyout_v2/shared/hooks/use_expand_section', () => {
      const mocked = {
      useExpandSection: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('react-redux-v7', () => {
  const original = require('react-redux-v7');

  return {
    ...original,
    useDispatch: () => vi.fn(),
  };
});

vi.mock('../../../../shared/hooks/use_should_show_graph');

const mockUseShouldShowGraph = useShouldShowGraph as Mock;

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

const renderVisualizationsSection = ({
  contextValue = panelContextValue,
  isPreviewMode = false,
  scopeId = 'test-scope-id',
}: {
  contextValue?: typeof panelContextValue;
  isPreviewMode?: boolean;
  scopeId?: string;
} = {}) =>
  render(
    <IntlProvider locale="en">
      <TestProviders>
        <DocumentDetailsContext.Provider value={contextValue}>
          <VisualizationsSection
            entityId="test-entity-id"
            isPreviewMode={isPreviewMode}
            scopeId={scopeId}
          />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    </IntlProvider>
  );

describe('<VisualizationsSection />', () => {
  const mockUseExpandSection = vi.mocked(useExpandSection);

  beforeEach(() => {
    // Default mock: graph visualization available
    mockUseShouldShowGraph.mockReturnValue(true);
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
    mockUseExpandSection.mockReturnValue(true);

    const { getByTestId } = renderVisualizationsSection();
    expect(getByTestId(VISUALIZATIONS_SECTION_CONTENT_TEST_ID)).toBeVisible();

    expect(getByTestId(`${GRAPH_PREVIEW_TEST_ID}LeftSection`)).toBeInTheDocument();
  });

  it('should render the graph preview component if the feature is enabled', () => {
    mockUseExpandSection.mockReturnValue(true);
    mockUseShouldShowGraph.mockReturnValue(true);

    const { getByTestId } = renderVisualizationsSection();

    expect(getByTestId(`${GRAPH_PREVIEW_TEST_ID}LeftSection`)).toBeInTheDocument();
    expect(uiMetricServiceMock.trackUiMetric).toHaveBeenCalledWith(
      METRIC_TYPE.LOADED,
      GRAPH_PREVIEW
    );
  });

  it('should render the graph preview link when not in preview mode or rule preview', () => {
    mockUseExpandSection.mockReturnValue(true);
    mockUseShouldShowGraph.mockReturnValue(true);

    const { getByTestId } = renderVisualizationsSection();

    expect(
      getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(GRAPH_PREVIEW_TEST_ID))
    ).toBeInTheDocument();
  });

  it('should not render the graph preview link in preview mode', () => {
    mockUseExpandSection.mockReturnValue(true);
    mockUseShouldShowGraph.mockReturnValue(true);

    const { queryByTestId } = renderVisualizationsSection({ isPreviewMode: true });

    expect(
      queryByTestId(EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(GRAPH_PREVIEW_TEST_ID))
    ).toBeNull();
  });

  it('should not render the graph preview link in the rule preview scope', () => {
    mockUseExpandSection.mockReturnValue(true);
    mockUseShouldShowGraph.mockReturnValue(true);

    const { queryByTestId } = renderVisualizationsSection({ scopeId: TableId.rulePreview });

    expect(
      queryByTestId(EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(GRAPH_PREVIEW_TEST_ID))
    ).toBeNull();
  });

  it('should not render the graph preview component if the graph feature is disabled', () => {
    mockUseExpandSection.mockReturnValue(true);
    mockUseShouldShowGraph.mockReturnValue(false);

    const { queryByTestId } = renderVisualizationsSection();

    expect(queryByTestId(`${GRAPH_PREVIEW_TEST_ID}LeftSection`)).not.toBeInTheDocument();
  });
});
