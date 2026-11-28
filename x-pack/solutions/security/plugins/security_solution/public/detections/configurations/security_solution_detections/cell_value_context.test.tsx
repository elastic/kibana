/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';
import { render } from '@testing-library/react';
import { TableId } from '@kbn/securitysolution-data-table';
import type { DataView } from '@kbn/data-views-plugin/public';
import { TestProviders } from '../../../common/mock';
import { PageScope } from '../../../data_view_manager/constants';
import type { UseDataViewReturnValue } from '../../../data_view_manager/hooks/use_data_view';
import { useCellActionsDataView } from '../../../common/components/cell_actions/data_view_context';
import { AlertTableCellContext, AlertTableCellContextProvider } from './cell_value_context';

jest.mock('../../../common/lib/kibana');
jest.mock('../../../data_view_manager/hooks/use_browser_fields', () => ({
  useBrowserFields: jest.fn(() => ({})),
}));

const dataView = { id: 'alerts-data-view-id' } as unknown as DataView;

const CELL_ACTIONS_DATA_VIEW_TEST_ID = 'cellActionsDataView';
const BROWSER_FIELDS_TEST_ID = 'browserFields';

/** Reads what the cells and the cell actions under the provider would read */
const Consumer = ({ scope }: { scope: PageScope }) => {
  const cellActionsDataView = useCellActionsDataView(scope);
  const cellContext = useContext(AlertTableCellContext);

  return (
    <>
      <span data-test-subj={CELL_ACTIONS_DATA_VIEW_TEST_ID}>
        {cellActionsDataView?.id ?? 'none'}
      </span>
      <span data-test-subj={BROWSER_FIELDS_TEST_ID}>
        {cellContext ? Object.keys(cellContext.browserFields).length : 'no context'}
      </span>
    </>
  );
};

const renderProvider = ({
  sourcererScope = PageScope.alerts,
  consumerScope = PageScope.alerts,
  dataViewState = { dataView, status: 'ready' },
}: {
  sourcererScope?: PageScope;
  consumerScope?: PageScope;
  dataViewState?: UseDataViewReturnValue;
} = {}) => {
  const ui = (state: UseDataViewReturnValue) => (
    <TestProviders>
      <AlertTableCellContextProvider
        tableId={TableId.alertsOnAlertsPage}
        sourcererScope={sourcererScope}
        dataViewState={state}
      >
        <Consumer scope={consumerScope} />
      </AlertTableCellContextProvider>
    </TestProviders>
  );
  const result = render(ui(dataViewState));

  return {
    ...result,
    rerenderWithState: (state: UseDataViewReturnValue) => result.rerender(ui(state)),
  };
};

describe('AlertTableCellContextProvider', () => {
  it('still provides the alert table cell context', () => {
    const { getByTestId } = renderProvider();

    expect(getByTestId(BROWSER_FIELDS_TEST_ID)).toHaveTextContent('0');
  });

  describe('data view for the cell actions', () => {
    it('provides the data view to the cell actions of its scope when it is ready', () => {
      const { getByTestId } = renderProvider();

      expect(getByTestId(CELL_ACTIONS_DATA_VIEW_TEST_ID)).toHaveTextContent('alerts-data-view-id');
    });

    it.each(['pristine', 'loading', 'error'] as const)(
      'does not provide the data view while its status is %s',
      (status) => {
        const { getByTestId } = renderProvider({ dataViewState: { dataView, status } });

        expect(getByTestId(CELL_ACTIONS_DATA_VIEW_TEST_ID)).toHaveTextContent('none');
      }
    );

    it('does not provide the data view to the cell actions of another scope', () => {
      const { getByTestId } = renderProvider({
        sourcererScope: PageScope.alerts,
        consumerScope: PageScope.default,
      });

      expect(getByTestId(CELL_ACTIONS_DATA_VIEW_TEST_ID)).toHaveTextContent('none');
    });

    it('provides the data view once it becomes ready', () => {
      const { getByTestId, rerenderWithState } = renderProvider({
        dataViewState: { dataView, status: 'loading' },
      });
      expect(getByTestId(CELL_ACTIONS_DATA_VIEW_TEST_ID)).toHaveTextContent('none');

      rerenderWithState({ dataView, status: 'ready' });

      expect(getByTestId(CELL_ACTIONS_DATA_VIEW_TEST_ID)).toHaveTextContent('alerts-data-view-id');
    });
  });
});
