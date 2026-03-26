/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import { InsightsSection } from './insights_section';
import { useExpandSection } from '../../shared/hooks/use_expand_section';
import { useRuleWithFallback } from '../../../detection_engine/rule_management/logic/use_rule_with_fallback';
import { useKibana } from '../../../common/lib/kibana';
import { usePrevalence } from '../../prevalence/hooks/use_prevalence';
import { useIsInSecurityApp } from '../../../common/hooks/is_in_security_app';
import { getColumns } from '../../prevalence/utils/get_columns';
import { PREVALENCE_TEST_ID } from './test_ids';
import { EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID } from '../../shared/components/test_ids';

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

jest.mock('../../prevalence/hooks/use_prevalence');
jest.mock('../../prevalence/utils/get_columns', () => ({
  getColumns: jest.fn(),
}));
jest.mock('../../shared/components/flyout_provider', () => ({
  flyoutProviders: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('./correlations_overview', () => ({
  CorrelationsOverview: () => <div data-test-subj="correlationsOverviewMock" />,
}));

const createMockHit = (flattened: DataTableRecord['flattened']): DataTableRecord =>
  ({
    id: '1',
    raw: {},
    flattened,
    isAnchor: false,
  } as DataTableRecord);

const mockHit = createMockHit({
  'event.kind': 'event',
  'signal.rule.id': 'rule-1',
});

describe('InsightsSection', () => {
  const mockUseExpandSection = jest.mocked(useExpandSection);
  const mockUseRuleWithFallback = jest.mocked(useRuleWithFallback);
  const mockUseKibana = jest.mocked(useKibana);
  const mockUseIsInSecurityApp = jest.mocked(useIsInSecurityApp);
  const mockGetColumns = jest.mocked(getColumns);
  const store = createStore(() => ({}));
  const history = createMemoryHistory();
  const openSystemFlyout = jest.fn();

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
          openSystemFlyout,
        },
        storage: {
          get: jest.fn().mockReturnValue(undefined),
        },
        uiSettings: {
          get: jest.fn().mockReturnValue(true),
        },
        serverless: undefined,
      },
    } as unknown as ReturnType<typeof useKibana>);
    (usePrevalence as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [],
    });
  });

  it('opens a tools flyout when clicking prevalence header', () => {
    const { getByTestId } = render(
      <IntlProvider locale="en">
        <Provider store={store}>
          <Router history={history}>
            <InsightsSection hit={mockHit} />
          </Router>
        </Provider>
      </IntlProvider>
    );

    getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(PREVALENCE_TEST_ID)).click();
    expect(openSystemFlyout).toHaveBeenCalled();
  });

  it('uses timeline-enabled columns when in Security Solution', () => {
    const { getByTestId } = render(
      <IntlProvider locale="en">
        <Provider store={store}>
          <Router history={history}>
            <InsightsSection hit={mockHit} />
          </Router>
        </Provider>
      </IntlProvider>
    );

    getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(PREVALENCE_TEST_ID)).click();

    expect(mockGetColumns).toHaveBeenCalledWith(expect.any(Function), true, '');
  });

  it('disables timeline interactions when not in Security Solution', () => {
    mockUseIsInSecurityApp.mockReturnValue(false);

    const { getByTestId } = render(
      <IntlProvider locale="en">
        <Provider store={store}>
          <Router history={history}>
            <InsightsSection hit={mockHit} />
          </Router>
        </Provider>
      </IntlProvider>
    );

    getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(PREVALENCE_TEST_ID)).click();

    expect(mockGetColumns).toHaveBeenCalledWith(expect.any(Function), false, '');
  });
});
