/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import type {
  AlertsTableProps as ResponseOpsAlertsTableProps,
  RenderContext,
} from '@kbn/response-ops-alerts-table/types';
import { TableId } from '@kbn/securitysolution-data-table';
import type { Alert } from '@kbn/alerting-types';
import { TestProviders } from '../../../common/mock';
import { useOpenFlyout } from '../../../flyout_v2/shared/hooks/use_open_flyout';
import type { ScopedPaginationSlice } from '../../../flyout_v2/document/pagination/types';
import type { SecurityAlertsTableContext } from './types';
import { ALERTS_TABLE_DEFAULT_ITEMS_PER_PAGE } from './default_config';
import { AlertsTable } from '.';

const mockResponseOpsAlertsTable = jest.fn(
  (_props: ResponseOpsAlertsTableProps<SecurityAlertsTableContext>) => null
);
jest.mock('@kbn/response-ops-alerts-table', () => {
  const { forwardRef } = jest.requireActual<typeof import('react')>('react');
  return {
    AlertsTable: forwardRef<unknown, ResponseOpsAlertsTableProps<SecurityAlertsTableContext>>(
      (props, _ref) => mockResponseOpsAlertsTable(props)
    ),
    alertsTableQueryClient: { mount: jest.fn(), unmount: jest.fn() },
  };
});
jest.mock('../../../common/lib/kibana', () => ({
  useKibana: jest.fn(() => ({
    services: {
      data: {},
      http: {},
      notifications: {},
      rendering: {},
      fieldFormats: {},
      application: {},
      licensing: {},
      uiSettings: { get: jest.fn() },
      settings: {},
      cases: {},
      agentBuilder: {},
    },
  })),
  KibanaServices: {
    getKibanaVersion: jest.fn(() => '8.0.0'),
  },
  KibanaContextProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('../../../common/containers/use_global_time', () => ({
  useGlobalTime: jest.fn(() => ({
    from: '2020-01-01T00:00:00Z',
    to: '2020-01-02T00:00:00Z',
    setQuery: jest.fn(),
    deleteQuery: jest.fn(),
  })),
}));
jest.mock('../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn(() => false),
}));
jest.mock('../../../data_view_manager/hooks/use_data_view', () => ({
  useDataView: jest.fn(() => ({
    dataView: { getRuntimeMappings: jest.fn(() => ({})) },
    status: 'ready',
  })),
}));
jest.mock('../../../data_view_manager/hooks/use_browser_fields', () => ({
  useBrowserFields: jest.fn(() => ({})),
}));
jest.mock('../../../common/hooks/use_license', () => ({
  useLicense: jest.fn(() => ({
    isEnterprise: jest.fn(() => false),
    isPlatinumPlus: jest.fn(() => false),
    isGold: jest.fn(() => false),
    getType: jest.fn(() => 'basic'),
  })),
}));
jest.mock('../../../common/hooks/use_selector', () => ({
  useDeepEqualSelector: jest.fn(() => []),
  useShallowEqualSelector: jest.fn(() => ({})),
}));
jest.mock('../../hooks/trigger_actions_alert_table/use_bulk_actions', () => ({
  useBulkActionsByTableType: jest.fn(() => []),
}));
jest.mock('../../../common/components/user_privileges', () => ({
  useUserPrivileges: jest.fn(() => ({
    timelinePrivileges: { read: true },
    notesPrivileges: { read: true },
    kibanaSecuritySolutionsPrivileges: { crud: true, read: true },
  })),
}));
jest.mock('../../../notes/hooks/use_fetch_notes', () => ({
  useFetchNotes: jest.fn(() => ({ onLoad: jest.fn() })),
}));
jest.mock('../../configurations/security_solution_detections/fetch_page_context', () => ({
  useFetchUserProfilesFromAlerts: jest.fn(() => new Map()),
}));
jest.mock('../../hooks/trigger_actions_alert_table/use_cell_actions', () => ({
  useCellActionsOptions: jest.fn(() => undefined),
}));
jest.mock(
  '../../hooks/trigger_actions_alert_table/use_trigger_actions_browser_fields_options',
  () => ({
    useAlertsTableFieldsBrowserOptions: jest.fn(() => undefined),
  })
);
jest.mock('../../../common/hooks/use_invalid_filter_query', () => ({
  useInvalidFilterQuery: jest.fn(),
}));
jest.mock('../../../common/lib/kuery', () => ({
  combineQueries: jest.fn(() => null),
}));
jest.mock('../../configurations/security_solution_detections', () => ({
  CellValue: () => null,
  getColumns: jest.fn(() => []),
}));
jest.mock('../../../timelines/components/timeline/body/control_columns', () => ({
  getDefaultControlColumn: jest.fn(() => [{ width: 124 }]),
}));
jest.mock('../../../agent_builder/hooks/use_agent_builder_availability', () => ({
  useAgentBuilderAvailability: jest.fn(() => ({
    isAgentBuilderEnabled: false,
    hasAgentBuilderPrivilege: false,
    isAgentChatExperienceEnabled: false,
    hasValidAgentBuilderLicense: false,
  })),
}));

const mockOpenFlyout = jest.fn().mockReturnValue({ close: jest.fn() });
jest.mock('../../../flyout_v2/shared/hooks/use_open_flyout', () => ({
  useOpenFlyout: jest.fn(),
}));

const makeAlerts = (prefix: string, count: number): Alert[] =>
  Array.from(
    { length: count },
    (_, i) => ({ _id: `${prefix}-${i}`, _index: 'alerts-index' } as Alert)
  );

const makeRenderContext = (
  overrides: Partial<RenderContext<SecurityAlertsTableContext>>
): RenderContext<SecurityAlertsTableContext> =>
  ({
    isLoading: false,
    alertsCount: 0,
    refresh: jest.fn(),
    ...overrides,
  } as unknown as RenderContext<SecurityAlertsTableContext>);

describe('AlertsTable flyout pagination', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useOpenFlyout).mockReturnValue(mockOpenFlyout);
  });

  const renderTable = async () => {
    render(
      <TestProviders>
        <AlertsTable tableType={TableId.alertsOnAlertsPage} isLoading={false} />
      </TestProviders>
    );
    // Wait for the mount effect that seeds `itemsPerPage` in redux (which `resolveDocument`'s
    // page math depends on) to settle before any test drives pagination.
    await waitFor(() => {
      const lastCall =
        mockResponseOpsAlertsTable.mock.calls[mockResponseOpsAlertsTable.mock.calls.length - 1];
      expect(lastCall[0].pageSize).toBe(ALERTS_TABLE_DEFAULT_ITEMS_PER_PAGE);
    });
    const getProps = () =>
      mockResponseOpsAlertsTable.mock.calls[mockResponseOpsAlertsTable.mock.calls.length - 1][0];
    const getSlice = (): ScopedPaginationSlice => {
      const flyoutElement = mockOpenFlyout.mock.calls[0][0];
      return flyoutElement.props.value.getSnapshot();
    };
    return { getProps, getSlice };
  };

  it(
    'does not resolve a stale, page-mismatched document when the table page index outruns the ' +
      'loaded render context',
    async () => {
      const { getProps, getSlice } = await renderTable();

      // Page 0 finishes loading: `tableContext.pageIndex` is 0 and matches `tablePageIndex`.
      act(() => {
        getProps().onUpdate!(
          makeRenderContext({
            pageIndex: 0,
            alerts: makeAlerts('page0', ALERTS_TABLE_DEFAULT_ITEMS_PER_PAGE),
            alertsCount: ALERTS_TABLE_DEFAULT_ITEMS_PER_PAGE * 2,
          })
        );
      });

      // Open the flyout on the table's own page first, so the overlay is mounted.
      act(() => {
        getProps().additionalContext!.openDocumentFlyout(1);
      });
      expect(getSlice().flyoutDocumentId).toBe('page0-1');

      // The user paginates the table to page 1, which updates `tablePageIndex` synchronously.
      // `onUpdate` (and therefore `tableContext`) has not caught up yet, so `tableContext` still
      // describes page 0 — recreating the one-render race between the two.
      act(() => {
        getProps().onPageIndexChange!(1);
      });

      // Navigate the flyout to the first index of the (not yet loaded) page 1.
      act(() => {
        getProps().additionalContext!.openDocumentFlyout(ALERTS_TABLE_DEFAULT_ITEMS_PER_PAGE);
      });

      // Must not resolve against the stale page-0 `tableContext` (which would incorrectly
      // resolve to `page0-0`). The previous id is cleared until that page's rows arrive.
      expect(getSlice().flyoutDocumentId).toBeNull();
      expect(getProps().pageIndex).toBe(1);
    }
  );

  it('clears a stale cross-page query error once pagination returns to a loaded page', async () => {
    const page0Alerts = makeAlerts('page0', ALERTS_TABLE_DEFAULT_ITEMS_PER_PAGE);
    const { getProps, getSlice } = await renderTable();

    act(() => {
      getProps().onUpdate!(
        makeRenderContext({
          pageIndex: 0,
          alerts: page0Alerts,
          alertsCount: ALERTS_TABLE_DEFAULT_ITEMS_PER_PAGE * 2,
          isLoadingAlerts: false,
        })
      );
    });

    act(() => {
      getProps().additionalContext!.openDocumentFlyout(ALERTS_TABLE_DEFAULT_ITEMS_PER_PAGE);
    });

    // The table follows the flyout onto the next page, then that fetch fails to produce a row.
    act(() => {
      getProps().onUpdate!(
        makeRenderContext({
          pageIndex: 1,
          alerts: page0Alerts,
          alertsCount: ALERTS_TABLE_DEFAULT_ITEMS_PER_PAGE * 2,
          isLoadingAlerts: true,
        })
      );
    });
    act(() => {
      getProps().onUpdate!(
        makeRenderContext({
          pageIndex: 1,
          alerts: page0Alerts,
          alertsCount: ALERTS_TABLE_DEFAULT_ITEMS_PER_PAGE * 2,
          isLoadingAlerts: false,
        })
      );
    });

    expect(getSlice().hasFlyoutQueryError).toBe(true);
    expect(getSlice().flyoutDocumentId).toBeNull();

    act(() => {
      getProps().additionalContext!.openDocumentFlyout(2);
    });

    expect(getSlice().hasFlyoutQueryError).toBe(false);

    act(() => {
      getProps().onUpdate!(
        makeRenderContext({
          pageIndex: 0,
          alerts: [...page0Alerts],
          alertsCount: ALERTS_TABLE_DEFAULT_ITEMS_PER_PAGE * 2,
          isLoadingAlerts: false,
        })
      );
    });

    await waitFor(() => {
      expect(getSlice().flyoutDocumentId).toBe('page0-2');
    });
  });

  it('follows the flyout again when the same document is requested after the table moved away', async () => {
    const pageSize = ALERTS_TABLE_DEFAULT_ITEMS_PER_PAGE;
    const page0Alerts = makeAlerts('page0', pageSize);
    const page1Alerts = makeAlerts('page1', pageSize);
    const { getProps, getSlice } = await renderTable();

    act(() => {
      getProps().onUpdate!(
        makeRenderContext({
          pageIndex: 0,
          alerts: page0Alerts,
          alertsCount: pageSize * 2,
          isLoadingAlerts: false,
        })
      );
    });

    act(() => {
      getProps().additionalContext!.openDocumentFlyout(pageSize);
    });
    expect(getSlice().flyoutDocumentId).toBeNull();
    expect(getProps().pageIndex).toBe(1);

    act(() => {
      getProps().onPageIndexChange!(0);
    });
    expect(getProps().pageIndex).toBe(0);

    act(() => {
      getProps().additionalContext!.openDocumentFlyout(pageSize);
    });
    expect(getProps().pageIndex).toBe(1);

    act(() => {
      getProps().onUpdate!(
        makeRenderContext({
          pageIndex: 1,
          alerts: page1Alerts,
          alertsCount: pageSize * 2,
          isLoadingAlerts: false,
        })
      );
    });

    await waitFor(() => {
      expect(getSlice().flyoutDocumentId).toBe('page1-0');
    });
  });
});
