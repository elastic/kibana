/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import {
  INSIGHTS_SECTION_TEST_ID,
  INSIGHTS_SECTION_TITLE,
  InsightsSection,
} from './insights_section';
import { useExpandSection } from '../../shared/hooks/use_expand_section';
import { useRuleWithFallback } from '../../../detection_engine/rule_management/logic/use_rule_with_fallback';
import { useKibana } from '../../../common/lib/kibana';
import { useIsInSecurityApp } from '../../../common/hooks/is_in_security_app';
import { getColumns } from '../../prevalence/utils/get_columns';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import { documentFlyoutHistoryKey } from '../../shared/constants/flyout_history';

jest.mock('../../shared/hooks/use_expand_section', () => ({
  useExpandSection: jest.fn(),
}));
jest.mock('../../../detection_engine/rule_management/logic/use_rule_with_fallback', () => ({
  useRuleWithFallback: jest.fn(),
}));
jest.mock('../../../common/lib/kibana', () => ({
  useKibana: jest.fn(),
}));
jest.mock('../../../common/hooks/is_in_security_app', () => ({
  useIsInSecurityApp: jest.fn(),
}));
jest.mock('../../prevalence/utils/get_columns', () => ({
  ...jest.requireActual('../../prevalence/utils/get_columns'),
  getColumns: jest.fn(),
}));
jest.mock('../../correlations', () => ({
  CorrelationsDetails: () => null,
}));
jest.mock('../../shared/components/flyout_provider', () => ({
  flyoutProviders: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('./correlations_overview', () => ({
  CorrelationsOverview: ({
    onShowCorrelationsDetails,
  }: {
    onShowCorrelationsDetails: () => void;
  }) => (
    <button
      type="button"
      data-test-subj="correlationsOverviewMock"
      onClick={onShowCorrelationsDetails}
    >
      {'Show correlations'}
    </button>
  ),
}));
jest.mock('./prevalence_overview', () => ({
  PrevalenceOverview: ({ onShowPrevalenceDetails }: { onShowPrevalenceDetails: () => void }) => (
    <button type="button" data-test-subj="prevalenceOverviewMock" onClick={onShowPrevalenceDetails}>
      {'Show prevalence'}
    </button>
  ),
}));
jest.mock('./threat_intelligence_overview', () => ({
  ThreatIntelligenceOverview: () => <div data-test-subj="threatIntelligenceOverviewMock" />,
}));

const createMockHit = (flattened: DataTableRecord['flattened']): DataTableRecord =>
  ({
    id: '1',
    raw: { _id: '1', _index: 'test', _source: {} },
    flattened,
    isAnchor: false,
  } as DataTableRecord);

const alertMockHit = createMockHit({
  'event.kind': 'signal',
  'kibana.alert.rule.uuid': 'rule-1',
});
const nonAlertMockHit = createMockHit({
  'event.kind': 'event',
  'signal.rule.id': 'rule-2',
});
const onAlertUpdated = jest.fn();
const mockRenderCellActions = jest.fn(({ children }) => <>{children}</>);

describe('InsightsSection', () => {
  const mockUseExpandSection = jest.mocked(useExpandSection);
  const mockUseRuleWithFallback = jest.mocked(useRuleWithFallback);
  const mockUseKibana = jest.mocked(useKibana);
  const mockUseIsInSecurityApp = jest.mocked(useIsInSecurityApp);
  const mockGetColumns = jest.mocked(getColumns);
  const store = createStore(() => ({}));
  const history = createMemoryHistory();
  const mockOpenSystemFlyout = jest.fn();

  const renderInsightsSection = (hit = alertMockHit) =>
    render(
      <IntlProvider locale="en">
        <Provider store={store}>
          <Router history={history}>
            <InsightsSection
              hit={hit}
              renderCellActions={mockRenderCellActions}
              onAlertUpdated={onAlertUpdated}
            />
          </Router>
        </Provider>
      </IntlProvider>
    );

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseExpandSection.mockReturnValue(true);
    mockUseIsInSecurityApp.mockReturnValue(true);
    mockUseRuleWithFallback.mockReturnValue({
      rule: {
        investigation_fields: {
          field_names: ['host.name'],
        },
      },
    } as unknown as ReturnType<typeof useRuleWithFallback>);
    mockGetColumns.mockReturnValue([]);
    mockUseKibana.mockReturnValue({
      services: {
        overlays: {
          openSystemFlyout: mockOpenSystemFlyout,
        },
      },
    } as unknown as ReturnType<typeof useKibana>);
  });

  it('renders the Insights expandable section', () => {
    mockUseExpandSection.mockReturnValue(true);

    const { getByTestId } = renderInsightsSection();

    expect(getByTestId(`${INSIGHTS_SECTION_TEST_ID}Header`)).toHaveTextContent(
      INSIGHTS_SECTION_TITLE
    );
  });

  it('renders the component collapsed if value is false in local storage', async () => {
    mockUseExpandSection.mockReturnValue(false);

    const { getByTestId } = renderInsightsSection();

    await act(async () => {
      expect(getByTestId(`${INSIGHTS_SECTION_TEST_ID}Content`)).not.toBeVisible();
    });
  });

  it('renders the component expanded if value is true in local storage', async () => {
    mockUseExpandSection.mockReturnValue(true);

    const { getByTestId } = renderInsightsSection();

    await act(async () => {
      expect(getByTestId(`${INSIGHTS_SECTION_TEST_ID}Content`)).toBeVisible();
    });
  });

  it('renders threat intelligence overview for alerts only', () => {
    const { getByTestId, rerender, queryByTestId } = renderInsightsSection(alertMockHit);

    expect(getByTestId('threatIntelligenceOverviewMock')).toBeInTheDocument();

    rerender(
      <IntlProvider locale="en">
        <Provider store={store}>
          <Router history={history}>
            <InsightsSection
              hit={nonAlertMockHit}
              renderCellActions={mockRenderCellActions}
              onAlertUpdated={onAlertUpdated}
            />
          </Router>
        </Provider>
      </IntlProvider>
    );

    expect(queryByTestId('threatIntelligenceOverviewMock')).not.toBeInTheDocument();
  });

  it('opens a tools flyout when clicking correlations overview', () => {
    const { getByTestId } = renderInsightsSection();

    fireEvent.click(getByTestId('correlationsOverviewMock'));

    expect(mockOpenSystemFlyout).toHaveBeenCalledTimes(1);
    expect(mockOpenSystemFlyout).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        historyKey: documentFlyoutHistoryKey,
        session: 'start',
      })
    );
  });

  it('opens prevalence flyout and uses timeline-enabled columns in Security Solution', () => {
    const { getByTestId } = renderInsightsSection();

    fireEvent.click(getByTestId('prevalenceOverviewMock'));

    expect(mockGetColumns).toHaveBeenCalledWith(
      expect.any(Function),
      true,
      '',
      expect.any(Function)
    );
    expect(mockOpenSystemFlyout).toHaveBeenCalledTimes(1);
  });

  it('disables timeline interactions when not in Security Solution', () => {
    mockUseIsInSecurityApp.mockReturnValue(false);

    const { getByTestId } = renderInsightsSection();
    fireEvent.click(getByTestId('prevalenceOverviewMock'));

    expect(mockGetColumns).toHaveBeenCalledWith(
      expect.any(Function),
      false,
      '',
      expect.any(Function)
    );
    expect(mockOpenSystemFlyout).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        historyKey: DOC_VIEWER_FLYOUT_HISTORY_KEY,
        session: 'start',
      })
    );
  });
});
