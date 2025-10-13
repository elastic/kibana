/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TableId } from '@kbn/securitysolution-data-table';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { DocumentDetailsContext } from '../../shared/context';
import { TestProviders } from '../../../../common/mock';
import {
  AnalyzeGraph,
  ANALYZER_PREVIEW_BANNER,
  DATA_VIEW_ERROR_TEST_ID,
  DATA_VIEW_LOADING_TEST_ID,
} from './analyze_graph';
import { ANALYZER_GRAPH_TEST_ID } from './test_ids';
import { useWhichFlyout } from '../../shared/hooks/use_which_flyout';
import { mockFlyoutApi } from '../../shared/mocks/mock_flyout_context';
import { DocumentDetailsAnalyzerPanelKey } from '../../shared/constants/panel_keys';
import { useIsInvestigateInResolverActionEnabled } from '../../../../detections/components/alerts_table/timeline_actions/investigate_in_resolver';
import { useSelectedPatterns } from '../../../../data_view_manager/hooks/use_selected_patterns';
import { useDataView } from '../../../../data_view_manager/hooks/use_data_view';
import type { DataView } from '@kbn/data-views-plugin/common';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_views/data_view.stub';

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useLocation: jest.fn().mockReturnValue({ pathname: '' }) };
});
jest.mock('@kbn/expandable-flyout');
jest.mock('../../../../resolver/view/use_resolver_query_params_cleaner');
jest.mock('../../shared/hooks/use_which_flyout');
jest.mock(
  '../../../../detections/components/alerts_table/timeline_actions/investigate_in_resolver'
);
jest.mock('../../../../common/hooks/use_experimental_features');
jest.mock('../../../../data_view_manager/hooks/use_selected_patterns');

const mockUseWhichFlyout = useWhichFlyout as jest.Mock;
const FLYOUT_KEY = 'securitySolution';

const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');

  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});

const NO_ANALYZER_MESSAGE =
  'You can only visualize events triggered by hosts configured with the Elastic Defend integration or any sysmon data from winlogbeat. Refer to Visual event analyzer(external, opens in a new tab or window) for more information.';

const dataView: DataView = createStubDataView({
  spec: { title: '.alerts-security.alerts-default' },
});

const renderAnalyzer = (
  contextValue = {
    eventId: 'eventId',
    scopeId: TableId.test,
  } as unknown as DocumentDetailsContext
) =>
  render(
    <TestProviders>
      <DocumentDetailsContext.Provider value={contextValue}>
        <AnalyzeGraph />
      </DocumentDetailsContext.Provider>
    </TestProviders>
  );

describe('<AnalyzeGraph />', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseWhichFlyout.mockReturnValue(FLYOUT_KEY);
    jest.mocked(useExpandableFlyoutApi).mockReturnValue(mockFlyoutApi);
    (useSelectedPatterns as jest.Mock).mockReturnValue(['index']);
    (useIsInvestigateInResolverActionEnabled as jest.Mock).mockReturnValue(true);
    (useDataView as jest.Mock).mockReturnValue({
      status: 'ready',
      dataView: {
        ...dataView,
        hasMatchedIndices: jest.fn().mockReturnValue(true),
      },
    });
  });

  it('renders analyzer graph correctly', () => {
    const wrapper = renderAnalyzer();

    expect(wrapper.getByTestId(ANALYZER_GRAPH_TEST_ID)).toBeInTheDocument();
  });

  it('should render no data message when analyzer is not enabled', () => {
    (useIsInvestigateInResolverActionEnabled as jest.Mock).mockReturnValue(false);

    const contextValue = {
      eventId: 'eventId',
      scopeId: TableId.test,
      dataAsNestedObject: {},
    } as unknown as DocumentDetailsContext;

    const { container } = renderAnalyzer(contextValue);

    expect(container).toHaveTextContent(NO_ANALYZER_MESSAGE);
  });

  it('should show loading spinner while data view is loading', () => {
    (useDataView as jest.Mock).mockReturnValue({
      status: 'loading',
    });

    const { getByTestId } = renderAnalyzer();

    expect(getByTestId(DATA_VIEW_LOADING_TEST_ID)).toBeInTheDocument();
  });

  it('should show loading spinner while data view is pristine', () => {
    (useDataView as jest.Mock).mockReturnValue({
      status: 'pristine',
    });

    const { getByTestId } = renderAnalyzer();

    expect(getByTestId(DATA_VIEW_LOADING_TEST_ID)).toBeInTheDocument();
  });

  it('should show error message if data view is error', () => {
    (useDataView as jest.Mock).mockReturnValue({
      status: 'error',
    });

    const { getByTestId } = renderAnalyzer();

    expect(getByTestId(DATA_VIEW_ERROR_TEST_ID)).toHaveTextContent(
      'Unable to retrieve the data view for analyzer'
    );
  });

  it('should show error message if data view is ready but no matched indices', () => {
    (useDataView as jest.Mock).mockReturnValue({
      status: 'ready',
      dataView: {
        ...dataView,
        hasMatchedIndices: jest.fn().mockReturnValue(false),
      },
    });

    const { getByTestId } = renderAnalyzer();

    expect(getByTestId(DATA_VIEW_ERROR_TEST_ID)).toHaveTextContent(
      'Unable to retrieve the data view for analyzer'
    );
  });

  it('should open details panel in preview when clicking on view button', () => {
    const wrapper = renderAnalyzer();

    expect(wrapper.getByTestId('resolver:graph-controls:show-panel-button')).toBeInTheDocument();
    wrapper.getByTestId('resolver:graph-controls:show-panel-button').click();
    expect(mockFlyoutApi.openPreviewPanel).toBeCalledWith({
      id: DocumentDetailsAnalyzerPanelKey,
      params: {
        resolverComponentInstanceID: `${FLYOUT_KEY}-${TableId.test}`,
        banner: ANALYZER_PREVIEW_BANNER,
      },
    });
  });
});
