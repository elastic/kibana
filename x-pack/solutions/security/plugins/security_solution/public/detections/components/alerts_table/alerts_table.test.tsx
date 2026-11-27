/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render } from '@testing-library/react';
import { TableId } from '@kbn/securitysolution-data-table';
import type { DataView } from '@kbn/data-views-plugin/public';
import { TestProviders } from '../../../common/mock';
import { PageScope } from '../../../data_view_manager/constants';
import type { UseDataViewReturnValue } from '../../../data_view_manager/hooks/use_data_view';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import { AlertsTable } from '.';

const BADGE_DATA_VIEW_TEST_ID = 'badgeDataView';

// The table the field badges are rendered in. Only used by the mocked table below
let mockBadgeTableId: string = TableId.alertsOnAlertsPage;

// Stands in for the shared alerts table: renders the data view a field badge of one of its cells would be given.
// A badge looks it up for the scope resolved from the id of the table it is rendered in, not for the page scope.
jest.mock('@kbn/response-ops-alerts-table', () => {
  const { forwardRef, createElement } = jest.requireActual('react');
  const { useCellActionsDataView } = jest.requireActual(
    '../../../common/components/cell_actions/data_view_context'
  );
  const { getSourcererScopeId } = jest.requireActual('../../../helpers');

  const MockAlertsTable = forwardRef(() => {
    const badgeDataView = useCellActionsDataView(getSourcererScopeId(mockBadgeTableId));

    return createElement('span', { 'data-test-subj': 'badgeDataView' }, badgeDataView?.id);
  });

  return { AlertsTable: MockAlertsTable };
});

jest.mock('../../../common/lib/kibana');
jest.mock('../../../data_view_manager/hooks/use_data_view');
jest.mock('../../../data_view_manager/hooks/use_browser_fields', () => ({
  useBrowserFields: jest.fn(() => ({})),
}));
jest.mock('./alerts_context', () => ({
  useAlertsContext: () => ({ alertsTableRef: { current: null } }),
}));
jest.mock('../../../common/containers/use_global_time', () => ({
  useGlobalTime: () => ({
    from: '2020-01-01T00:00:00.000Z',
    to: '2020-01-02T00:00:00.000Z',
    setQuery: jest.fn(),
  }),
}));

const mockUseDataView = useDataView as jest.Mock;

const dataViews = new Map<PageScope, DataView>();

// Stable per scope: a new object on every call would make the table's effects loop
const getDataView = (scope: PageScope) => {
  if (!dataViews.has(scope)) {
    dataViews.set(scope, {
      id: `${scope}-data-view-id`,
      getRuntimeMappings: () => ({}),
    } as unknown as DataView);
  }
  return dataViews.get(scope) as DataView;
};

const renderAlertsTable = async ({
  tableType,
  pageScope,
}: {
  tableType: TableId;
  pageScope: PageScope;
}) => {
  mockBadgeTableId = tableType;

  let result!: ReturnType<typeof render>;
  await act(async () => {
    result = render(
      <TestProviders>
        <AlertsTable id="test-alerts-table" tableType={tableType} pageScope={pageScope} />
      </TestProviders>
    );
  });
  return result;
};

describe('AlertsTable', () => {
  let status: UseDataViewReturnValue['status'];

  beforeEach(() => {
    jest.clearAllMocks();
    status = 'ready';
    // Every scope has its own data view, so that the one that is handed down can be told apart
    mockUseDataView.mockImplementation((scope: PageScope) => ({
      dataView: getDataView(scope),
      status,
    }));
  });

  describe('data view handed to the field badges', () => {
    describe('on the alerts page', () => {
      const props = { tableType: TableId.alertsOnAlertsPage, pageScope: PageScope.alerts };

      it('retrieves the data view of its page scope', async () => {
        await renderAlertsTable(props);

        expect(mockUseDataView).toHaveBeenCalledWith(PageScope.alerts);
      });

      it('provides the data view of its page scope to the badges once it is ready', async () => {
        const { getByTestId } = await renderAlertsTable(props);

        expect(getByTestId(BADGE_DATA_VIEW_TEST_ID)).toHaveTextContent(
          getDataView(PageScope.alerts).id as string
        );
      });

      it.each(['pristine', 'loading', 'error'] as const)(
        'does not provide the data view while its status is %s',
        async (notReadyStatus) => {
          status = notReadyStatus;

          const { getByTestId } = await renderAlertsTable(props);

          expect(getByTestId(BADGE_DATA_VIEW_TEST_ID)).toBeEmptyDOMElement();
        }
      );
    });

    it('does not provide the data view of its page scope to badges that use another scope', async () => {
      // The badges of this table resolve to the alerts scope, whereas the table uses the attacks one
      const { getByTestId } = await renderAlertsTable({
        tableType: TableId.alertsOnAttacksPage,
        pageScope: PageScope.attacks,
      });

      expect(mockUseDataView).toHaveBeenCalledWith(PageScope.attacks);
      expect(getByTestId(BADGE_DATA_VIEW_TEST_ID)).toBeEmptyDOMElement();
    });
  });
});
