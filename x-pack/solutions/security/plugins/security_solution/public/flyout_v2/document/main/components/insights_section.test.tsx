/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React, { type ReactNode } from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';
import { Provider } from 'react-redux-v7';
import { createStore } from 'redux-v4';
import { INSIGHTS_SECTION_TEST_ID, InsightsSection } from './insights_section';
import { INSIGHTS_SECTION_TITLE } from '../../../shared/constants/flyout_titles';
import { useExpandSection } from '../../../shared/hooks/use_expand_section';
import { useRuleWithFallback } from '../../../../detection_engine/rule_management/logic/use_rule_with_fallback';
import { useKibana } from '../../../../common/lib/kibana';
import { useIsInSecurityApp } from '../../../../common/hooks/is_in_security_app';
import { getColumns } from '../../tools/prevalence/utils/get_columns';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import { documentFlyoutHistoryKey } from '../../../shared/constants/flyout_history';

vi.mock('../../../shared/hooks/use_expand_section', () => {
  const mocked = {
    useExpandSection: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../../detection_engine/rule_management/logic/use_rule_with_fallback', () => {
  const mocked = {
    useRuleWithFallback: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../../common/lib/kibana', () => {
  const mocked = {
    useKibana: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../../common/hooks/is_in_security_app', () => {
  const mocked = {
    useIsInSecurityApp: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../tools/prevalence/utils/get_columns', async () => {
  const mocked = {
    ...(await vi.importActual('../../tools/prevalence/utils/get_columns')),
    getColumns: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../tools/correlations', () => {
  const mocked = {
    CorrelationsDetails: () => null,
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../shared/components/flyout_provider', () => {
  const mocked = {
    flyoutProviders: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
  return { ...mocked, default: mocked };
});
vi.mock('./correlations_overview', () => {
  const mocked = {
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
  };
  return { ...mocked, default: mocked };
});
vi.mock('./prevalence_overview', () => {
  const mocked = {
    PrevalenceOverview: ({ onShowPrevalenceDetails }: { onShowPrevalenceDetails: () => void }) => (
      <button
        type="button"
        data-test-subj="prevalenceOverviewMock"
        onClick={onShowPrevalenceDetails}
      >
        {'Show prevalence'}
      </button>
    ),
  };
  return { ...mocked, default: mocked };
});
vi.mock('./threat_intelligence_overview', () => {
  const mocked = {
    ThreatIntelligenceOverview: () => <div data-test-subj="threatIntelligenceOverviewMock" />,
  };
  return { ...mocked, default: mocked };
});
vi.mock('./entities_overview', () => {
  const mocked = {
    EntitiesOverview: ({ onShowEntitiesDetails }: { onShowEntitiesDetails: () => void }) => (
      <button type="button" data-test-subj="entitiesOverviewMock" onClick={onShowEntitiesDetails}>
        {'Show entities'}
      </button>
    ),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../tools/entities', () => {
  const mocked = {
    EntityDetails: () => null,
  };
  return { ...mocked, default: mocked };
});
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
const onAlertUpdated = vi.fn();
const mockRenderCellActions = vi.fn(({ children }) => <>{children}</>);

/**
 * `overlays.openSystemFlyout` is mocked (see `mockOpenSystemFlyout`), so the flyout content it
 * receives is never actually mounted/rendered (the lazily-loaded `CorrelationsDetails` component
 * is only ever created as an unrendered element, wrapped in `React.lazy`, so it can't be matched
 * by type). This walks the unrendered React element tree passed to it looking for the element
 * carrying the given prop, so tests can inspect callbacks it was given without rendering it.
 */
const findElementWithProp = (node: ReactNode, propName: string): React.ReactElement | undefined => {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findElementWithProp(child, propName);
      if (found) {
        return found;
      }
    }
    return undefined;
  }
  if (!React.isValidElement(node)) {
    return undefined;
  }
  const props = node.props as Record<string, unknown>;
  if (propName in props) {
    return node;
  }
  return findElementWithProp((props as { children?: ReactNode }).children, propName);
};

describe('InsightsSection', () => {
  const mockUseExpandSection = vi.mocked(useExpandSection);
  const mockUseRuleWithFallback = vi.mocked(useRuleWithFallback);
  const mockUseKibana = vi.mocked(useKibana);
  const mockUseIsInSecurityApp = vi.mocked(useIsInSecurityApp);
  const mockGetColumns = vi.mocked(getColumns);
  const store = createStore(() => ({}));
  const history = createMemoryHistory();
  const mockOpenSystemFlyout = vi.fn();

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
    vi.clearAllMocks();
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
    mockOpenSystemFlyout.mockReturnValue({ onClose: Promise.resolve(), close: vi.fn() });
    mockUseKibana.mockReturnValue({
      services: {
        overlays: {
          openSystemFlyout: mockOpenSystemFlyout,
        },
        storage: { get: vi.fn(), set: vi.fn(), remove: vi.fn() },
        telemetry: { reportEvent: vi.fn() },
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

  it('opens a tools flyout when clicking entities overview', () => {
    const { getByTestId } = renderInsightsSection();

    fireEvent.click(getByTestId('entitiesOverviewMock'));

    expect(mockOpenSystemFlyout).toHaveBeenCalledTimes(1);
    expect(mockOpenSystemFlyout).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        historyKey: documentFlyoutHistoryKey,
        session: 'start',
      })
    );
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

  it('wires onShowAttack so it opens the attack flyout as a child of the correlations flyout', () => {
    const { getByTestId } = renderInsightsSection();

    fireEvent.click(getByTestId('correlationsOverviewMock'));

    expect(mockOpenSystemFlyout).toHaveBeenCalledTimes(1);
    const correlationsElement = findElementWithProp(
      mockOpenSystemFlyout.mock.calls[0][0],
      'onShowAttack'
    );
    expect(correlationsElement).toBeDefined();

    const onShowAttack = correlationsElement?.props.onShowAttack;
    expect(onShowAttack).toBeInstanceOf(Function);

    act(() => {
      onShowAttack('attack-id-1', '.alerts-security.attack.discovery.alerts-default', 'Attack 1');
    });

    expect(mockOpenSystemFlyout).toHaveBeenCalledTimes(2);
    expect(mockOpenSystemFlyout).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.objectContaining({
        historyKey: documentFlyoutHistoryKey,
        session: 'inherit',
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
