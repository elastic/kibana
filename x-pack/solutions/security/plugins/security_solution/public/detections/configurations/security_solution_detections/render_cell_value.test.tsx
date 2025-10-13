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
import type { ColumnHeaderOptions } from '../../../../common/types';
import { mockBrowserFields } from '../../../common/containers/source/mock';
import { DragDropContextWrapper } from '../../../common/components/drag_and_drop/drag_drop_context_wrapper';
import { defaultHeaders, mockTimelineData, TestProviders } from '../../../common/mock';
import { defaultRowRenderers } from '../../../timelines/components/timeline/body/renderers';
import type { TimelineNonEcsData } from '../../../../common/search_strategy/timeline';
import type { RenderCellValueProps } from './render_cell_value';
import { CellValue } from './render_cell_value';
import { AlertTableCellContextProvider } from './cell_value_context';
import { PageScope } from '../../../data_view_manager/constants';

jest.mock('../../../common/lib/kibana');

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
    defaultProps = {
      columnId,
      legacyAlert: data,
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
      ecsData: undefined,
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
});
