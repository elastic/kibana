/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TableId } from '@kbn/securitysolution-data-table';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { DocumentDetailsContext } from '../../shared/context';
import { TestProviders } from '../../../../common/mock';
import {
  AnalyzeGraph,
  ANALYZER_PREVIEW_BANNER,
  resetAnalyzerColdFrozenTierCalloutDismissedStateForTests,
} from './analyze_graph';
import {
  ANALYZER_COLD_FROZEN_TIER_CALLOUT_DISMISS_BUTTON_TEST_ID,
  ANALYZER_COLD_FROZEN_TIER_CALLOUT_TEST_ID,
  ANALYZER_GRAPH_TEST_ID,
} from './test_ids';
import { useWhichFlyout } from '../../shared/hooks/use_which_flyout';
import { mockFlyoutApi } from '../../shared/mocks/mock_flyout_context';
import { DocumentDetailsAnalyzerPanelKey } from '../../shared/constants/panel_keys';
import { useIsInvestigateInResolverActionEnabled } from '../../../../detections/components/alerts_table/timeline_actions/investigate_in_resolver';
import { useEnableExperimental } from '../../../../common/hooks/use_experimental_features';
import { useSelectedPatterns } from '../../../../data_view_manager/hooks/use_selected_patterns';
import { useSourcererDataView } from '../../../../sourcerer/containers';

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
jest.mock('../../../../sourcerer/containers');

const mockUiSettingsGet = jest.fn();
jest.mock('../../../../common/lib/kibana', () => {
  const actual = jest.requireActual('../../../../common/lib/kibana');
  return {
    ...actual,
    useKibana: () => ({
      services: {
        uiSettings: {
          get: mockUiSettingsGet,
        },
      },
    }),
  };
});

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

describe('<AnalyzeGraph />', () => {
  beforeEach(() => {
    resetAnalyzerColdFrozenTierCalloutDismissedStateForTests();
    mockUiSettingsGet.mockReturnValue(true);
    mockUseWhichFlyout.mockReturnValue(FLYOUT_KEY);
    jest.mocked(useExpandableFlyoutApi).mockReturnValue(mockFlyoutApi);
    (useEnableExperimental as jest.Mock).mockReturnValue({
      newDataViewPickerEnabled: true,
    });
    (useSelectedPatterns as jest.Mock).mockReturnValue(['index']);
    (useSourcererDataView as jest.Mock).mockReturnValue({
      selectedPatterns: ['index'],
    });
  });

  it('renders analyzer graph correctly', () => {
    (useIsInvestigateInResolverActionEnabled as jest.Mock).mockReturnValue(true);
    const contextValue = {
      eventId: 'eventId',
      scopeId: TableId.test,
    } as unknown as DocumentDetailsContext;

    const wrapper = render(
      <TestProviders>
        <DocumentDetailsContext.Provider value={contextValue}>
          <AnalyzeGraph />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    );
    expect(wrapper.getByTestId(ANALYZER_GRAPH_TEST_ID)).toBeInTheDocument();
  });

  it('should render excluded cold/frozen tiers callout when setting is enabled', () => {
    const contextValue = {
      eventId: 'eventId',
      scopeId: TableId.test,
    } as unknown as DocumentDetailsContext;

    const { getByTestId } = render(
      <TestProviders>
        <DocumentDetailsContext.Provider value={contextValue}>
          <AnalyzeGraph />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    );

    expect(getByTestId(ANALYZER_COLD_FROZEN_TIER_CALLOUT_TEST_ID)).toHaveTextContent(
      'Some data excluded'
    );
    expect(getByTestId(ANALYZER_COLD_FROZEN_TIER_CALLOUT_TEST_ID)).toHaveTextContent(
      'Cold and frozen tiers are excluded to improve performance.'
    );
  });

  it('should render included cold/frozen tiers callout when setting is disabled', () => {
    const contextValue = {
      eventId: 'eventId',
      scopeId: TableId.test,
    } as unknown as DocumentDetailsContext;

    mockUiSettingsGet.mockReturnValue(false);

    const { getByTestId } = render(
      <TestProviders>
        <DocumentDetailsContext.Provider value={contextValue}>
          <AnalyzeGraph />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    );

    expect(getByTestId(ANALYZER_COLD_FROZEN_TIER_CALLOUT_TEST_ID)).toHaveTextContent(
      'Performance optimization'
    );
    expect(getByTestId(ANALYZER_COLD_FROZEN_TIER_CALLOUT_TEST_ID)).toHaveTextContent(
      'This view loads more slowly because cold and frozen tiers are included.'
    );
  });

  it('should keep callout hidden in same tab session after dismissing and opening another alert flyout', () => {
    const contextValue = {
      eventId: 'eventId',
      scopeId: TableId.test,
      dataAsNestedObject: {},
    } as unknown as DocumentDetailsContext;

    const { getByTestId, queryByTestId, unmount } = render(
      <TestProviders>
        <DocumentDetailsContext.Provider value={contextValue}>
          <AnalyzeGraph />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    );

    fireEvent.click(getByTestId(ANALYZER_COLD_FROZEN_TIER_CALLOUT_DISMISS_BUTTON_TEST_ID));
    expect(queryByTestId(ANALYZER_COLD_FROZEN_TIER_CALLOUT_TEST_ID)).not.toBeInTheDocument();

    unmount();

    const contextValue2 = {
      eventId: 'eventId2',
      scopeId: TableId.test,
    } as unknown as DocumentDetailsContext;

    const { queryByTestId: queryByTestIdAfterOpeningAnotherFlyout } = render(
      <TestProviders>
        <DocumentDetailsContext.Provider value={contextValue2}>
          <AnalyzeGraph />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    );

    expect(
      queryByTestIdAfterOpeningAnotherFlyout(ANALYZER_COLD_FROZEN_TIER_CALLOUT_TEST_ID)
    ).not.toBeInTheDocument();
  });

  it('should show callout again after page refresh', () => {
    const contextValue = {
      eventId: 'eventId',
      scopeId: TableId.test,
      dataAsNestedObject: {},
    } as unknown as DocumentDetailsContext;

    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <DocumentDetailsContext.Provider value={contextValue}>
          <AnalyzeGraph />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    );

    fireEvent.click(getByTestId(ANALYZER_COLD_FROZEN_TIER_CALLOUT_DISMISS_BUTTON_TEST_ID));
    expect(queryByTestId(ANALYZER_COLD_FROZEN_TIER_CALLOUT_TEST_ID)).not.toBeInTheDocument();

    resetAnalyzerColdFrozenTierCalloutDismissedStateForTests();
    const { getByTestId: getByTestIdAfterRefresh } = render(
      <TestProviders>
        <DocumentDetailsContext.Provider value={contextValue}>
          <AnalyzeGraph />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    );

    expect(getByTestIdAfterRefresh(ANALYZER_COLD_FROZEN_TIER_CALLOUT_TEST_ID)).toBeInTheDocument();
  });

  it('renders no data message when analyzer is not enabled', () => {
    (useIsInvestigateInResolverActionEnabled as jest.Mock).mockReturnValue(false);
    const contextValue = {
      eventId: 'eventId',
      scopeId: TableId.test,
      dataAsNestedObject: {},
    } as unknown as DocumentDetailsContext;

    const { container } = render(
      <TestProviders>
        <DocumentDetailsContext.Provider value={contextValue}>
          <AnalyzeGraph />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    );
    expect(container).toHaveTextContent(NO_ANALYZER_MESSAGE);
  });

  it('clicking view button should open details panel in preview', () => {
    (useIsInvestigateInResolverActionEnabled as jest.Mock).mockReturnValue(true);
    const contextValue = {
      eventId: 'eventId',
      scopeId: TableId.test,
    } as unknown as DocumentDetailsContext;

    const wrapper = render(
      <TestProviders>
        <DocumentDetailsContext.Provider value={contextValue}>
          <AnalyzeGraph />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    );

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
