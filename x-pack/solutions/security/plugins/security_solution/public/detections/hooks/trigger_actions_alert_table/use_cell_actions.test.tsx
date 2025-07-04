/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockStore, mockGlobalState, TestProviders } from '../../../common/mock';
import { TableId } from '@kbn/securitysolution-data-table';
import { useCellActionsOptions } from './use_cell_actions';
import { columns as mockColumns, data as mockData } from './mock/data';
import type {
  EuiDataGridColumn,
  EuiDataGridColumnCellAction,
  EuiDataGridColumnCellActionProps,
  EuiDataGridRefProps,
} from '@elastic/eui';
import { EuiButtonEmpty } from '@elastic/eui';
import { render, screen, waitFor, renderHook } from '@testing-library/react';
import type { ComponentProps, JSXElementConstructor, PropsWithChildren } from 'react';
import React from 'react';
import { makeAction } from '../../../common/components/cell_actions/mocks';
import { VIEW_SELECTION } from '../../../../common/constants';
import type { LegacyField } from '@kbn/alerting-types';

const mockDataGridRef: {
  current: EuiDataGridRefProps;
} = {
  current: {
    closeCellPopover: jest.fn(),
    setIsFullScreen: jest.fn(),
    setFocusedCell: jest.fn(),
    openCellPopover: jest.fn(),
  },
};

const renderCellAction = (
  columnCellAction: EuiDataGridColumnCellAction,
  props: Partial<EuiDataGridColumnCellActionProps> = {}
) => {
  const CellActions = columnCellAction as JSXElementConstructor<EuiDataGridColumnCellActionProps>;
  return render(
    <CellActions
      Component={EuiButtonEmpty}
      colIndex={0}
      rowIndex={0}
      columnId={''}
      isExpanded={false}
      {...props}
    />
  );
};

const compatibleActions = [makeAction('action1')];

const withCustomPropsAndCellActions = (props: ComponentProps<typeof TestProviders>) => {
  const TestProviderWithCustomProps = (_props: PropsWithChildren<Record<string, unknown>>) => (
    <TestProviders {...props}> {_props.children}</TestProviders>
  );
  TestProviderWithCustomProps.displayName = 'TestProviderWithCustomProps';
  return TestProviderWithCustomProps;
};

const TestProviderWithActions = withCustomPropsAndCellActions({ cellActions: compatibleActions });

const mockedStateWithEventRenderedView: typeof mockGlobalState = {
  ...mockGlobalState,
  dataTable: {
    ...mockGlobalState.dataTable,
    tableById: {
      ...mockGlobalState.dataTable.tableById,
      [TableId.test]: {
        ...mockGlobalState.dataTable.tableById[TableId.test],
        viewMode: VIEW_SELECTION.eventRenderedView,
      },
    },
  },
};

const TestProviderWithCustomStateAndActions = withCustomPropsAndCellActions({
  cellActions: compatibleActions,
  store: createMockStore(mockedStateWithEventRenderedView),
});

describe('getUseCellActionsHook', () => {
  it('should render cell actions correctly for gridView view', async () => {
    const { result } = renderHook(
      () =>
        useCellActionsOptions(TableId.test, {
          columns: mockColumns as unknown as EuiDataGridColumn[],
          oldAlertsData: mockData as LegacyField[][],
          dataGridRef: mockDataGridRef,
          pageSize: 10,
          pageIndex: 0,
        }),
      {
        wrapper: TestProviderWithActions,
      }
    );

    await waitFor(() => {
      const cellAction = result.current.getCellActionsForColumn('host.name', 0)[0];

      renderCellAction(cellAction);

      expect(screen.getByTestId('dataGridColumnCellAction-action1')).toBeInTheDocument();
    });
  });

  it('should not render cell actions correctly for eventRendered view', async () => {
    const { result } = renderHook(
      () =>
        useCellActionsOptions(TableId.test, {
          columns: mockColumns as unknown as EuiDataGridColumn[],
          oldAlertsData: mockData as LegacyField[][],
          dataGridRef: mockDataGridRef,
          pageSize: 10,
          pageIndex: 0,
        }),
      {
        wrapper: TestProviderWithCustomStateAndActions,
      }
    );

    const cellAction = result.current.getCellActionsForColumn('host.name', 0);

    await waitFor(() => expect(cellAction).toHaveLength(0));
  });
});
