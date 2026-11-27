/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import { cloneDeep } from 'lodash/fp';
import type { ComponentProps } from 'react';
import React from 'react';
import { TableId } from '@kbn/securitysolution-data-table';
import type { Alert } from '@kbn/alerting-types';
import type { ColumnHeaderOptions } from '../../../../common/types';
import { mockBrowserFields } from '../../../common/containers/source/mock';
import { DragDropContextWrapper } from '../../../common/components/drag_and_drop/drag_drop_context_wrapper';
import { defaultHeaders, mockTimelineData, TestProviders } from '../../../common/mock';
import { defaultRowRenderers } from '../../../timelines/components/timeline/body/renderers';
import type { TimelineNonEcsData } from '../../../../common/search_strategy/timeline';
import type { RenderCellValueProps } from './render_cell_value';
import { CellValue } from './render_cell_value';
import { AlertTableCellContextProvider as CellContextProvider } from './cell_value_context';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import { PageScope } from '../../../data_view_manager/constants';
import { DefaultCellRenderer } from '../../../timelines/components/timeline/cell_rendering/default_cell_renderer';

jest.mock('../../../common/lib/kibana');

// Keeps the real implementation, but lets the tests look at the props the cell renderer receives
jest.mock('../../../timelines/components/timeline/cell_rendering/default_cell_renderer', () => {
  const actual = jest.requireActual(
    '../../../timelines/components/timeline/cell_rendering/default_cell_renderer'
  );
  return { ...actual, DefaultCellRenderer: jest.fn(actual.DefaultCellRenderer) };
});

const mockDefaultCellRenderer = DefaultCellRenderer as unknown as jest.Mock;

/** Retrieves the data view the way the alerts table does, and hands it to the provider */
const AlertTableCellContextProvider = (
  props: Omit<React.ComponentProps<typeof CellContextProvider>, 'dataViewState'>
) => <CellContextProvider {...props} dataViewState={useDataView(props.sourcererScope)} />;

describe('RenderCellValue', () => {
  const columnId = '@timestamp';
  const eventId = '_id-123';
  const linkValues = ['foo', 'bar', '@baz'];
  const rowIndex = 5;
  const scopeId = 'table-test';

  let data: TimelineNonEcsData[];
  let header: ColumnHeaderOptions;
  let defaultProps: RenderCellValueProps;

  beforeEach(() => {
    data = cloneDeep(mockTimelineData[0].data);
    header = cloneDeep(defaultHeaders[0]);
    const mockAlert: Alert = data.reduce<Record<string, unknown>>((acc, { field, value }) => {
      if (field === '_id' || field === '_index') {
        acc[field] = (value as string[])?.[0] ?? '';
      } else {
        acc[field] = value;
      }
      return acc;
    }, {}) as Alert;
    defaultProps = {
      columnId,
      alert: mockAlert,
      eventId,
      header,
      isDetails: false,
      isExpandable: false,
      isExpanded: false,
      linkValues,
      rowIndex,
      colIndex: 0,
      setCellProps: jest.fn(),
      scopeId,
      rowRenderers: defaultRowRenderers,
      asPlainText: false,
      truncate: false,
      context: undefined,
      browserFields: {},
    } as unknown as ComponentProps<typeof CellValue>;
  });

  const RenderCellValueComponent = (props: RenderCellValueProps) => {
    return (
      <TestProviders>
        <DragDropContextWrapper browserFields={mockBrowserFields}>
          <AlertTableCellContextProvider tableId={TableId.test} sourcererScope={PageScope.alerts}>
            <CellValue
              {...defaultProps}
              {...props}
              pageScope={PageScope.alerts}
              tableType={TableId.test}
            />
          </AlertTableCellContextProvider>
        </DragDropContextWrapper>
      </TestProviders>
    );
  };

  it('should throw an error if not wrapped by the AlertTableCellContextProvider', () => {
    const renderWithError = () =>
      render(
        <TestProviders>
          <DragDropContextWrapper browserFields={mockBrowserFields}>
            <CellValue {...defaultProps} pageScope={PageScope.alerts} tableType={TableId.test} />
          </DragDropContextWrapper>
        </TestProviders>
      );

    expect(renderWithError).toThrow(
      'render_cell_value.tsx: CellValue must be used within AlertTableCellContextProvider'
    );
  });

  it('should fully render the cell value', () => {
    const { getByText } = render(<RenderCellValueComponent {...defaultProps} />);

    expect(getByText('Nov 5, 2018 @ 19:03:25.937')).toBeInTheDocument();
  });

  describe('scopeId given to the cell renderer', () => {
    beforeEach(() => {
      mockDefaultCellRenderer.mockClear();
    });

    it('is the id of the table, not the data view scope of the page', () => {
      render(<RenderCellValueComponent {...defaultProps} />);

      // RenderCellValueComponent renders the cell with pageScope = PageScope.alerts and tableType = TableId.test
      expect(mockDefaultCellRenderer).toHaveBeenCalled();
      mockDefaultCellRenderer.mock.calls.forEach(([props]) => {
        expect(props.scopeId).toBe(TableId.test);
        expect(props.scopeId).not.toBe(PageScope.alerts);
      });
    });

    it.each([
      TableId.alertsOnAlertsPage,
      TableId.alertsOnRuleDetailsPage,
      TableId.alertsOnCasePage,
    ])('is %s when the cell is rendered in that table', (tableType) => {
      render(
        <TestProviders>
          <DragDropContextWrapper browserFields={mockBrowserFields}>
            <AlertTableCellContextProvider tableId={tableType} sourcererScope={PageScope.alerts}>
              <CellValue {...defaultProps} pageScope={PageScope.alerts} tableType={tableType} />
            </AlertTableCellContextProvider>
          </DragDropContextWrapper>
        </TestProviders>
      );

      expect(mockDefaultCellRenderer).toHaveBeenCalled();
      mockDefaultCellRenderer.mock.calls.forEach(([props]) => {
        expect(props.scopeId).toBe(tableType);
      });
    });

    it('does not depend on the data view scope of the page', () => {
      render(
        <TestProviders>
          <DragDropContextWrapper browserFields={mockBrowserFields}>
            <AlertTableCellContextProvider
              tableId={TableId.test}
              sourcererScope={PageScope.default}
            >
              <CellValue
                {...defaultProps}
                pageScope={PageScope.default}
                tableType={TableId.alertsOnAlertsPage}
              />
            </AlertTableCellContextProvider>
          </DragDropContextWrapper>
        </TestProviders>
      );

      mockDefaultCellRenderer.mock.calls.forEach(([props]) => {
        expect(props.scopeId).toBe(TableId.alertsOnAlertsPage);
      });
    });
  });

  it('renders flattened object fields as JSON strings instead of [object Object]', () => {
    const FLATTENED_FIELD = 'kibana.cps_scope.linked_projects';
    const linkedProjects = [
      { id: 'p1', alias: '_alias:project-one', type: 'project', organization: 'org-1' },
      { id: 'p2', alias: '_alias:project-two', type: 'project', organization: 'org-1' },
    ];
    const alertWithCps: Alert = {
      ...(defaultProps.alert as Alert),
      [FLATTENED_FIELD]: linkedProjects,
    } as unknown as Alert;

    const cpsHeader = { ...cloneDeep(defaultHeaders[0]), id: FLATTENED_FIELD };
    const { queryByText, baseElement } = render(
      <RenderCellValueComponent
        {...defaultProps}
        alert={alertWithCps}
        columnId={FLATTENED_FIELD}
        header={cpsHeader as ColumnHeaderOptions}
      />
    );

    expect(queryByText(/\[object Object\]/)).not.toBeInTheDocument();
    expect(baseElement.textContent).toContain('"alias":"_alias:project-one"');
    expect(baseElement.textContent).toContain('"alias":"_alias:project-two"');
  });
});
