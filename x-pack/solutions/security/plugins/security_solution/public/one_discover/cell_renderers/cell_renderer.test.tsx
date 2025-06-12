/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { DefaultCellRenderer } from '../../timelines/components/timeline/cell_rendering/default_cell_renderer';
import { render } from '@testing-library/react';
import { getCellRendererForGivenRecord } from './cell_renderers';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';

jest.mock('../../timelines/components/timeline/cell_rendering/default_cell_renderer');

const DefaultCellRendererMock = DefaultCellRenderer as unknown as jest.Mock<React.ReactElement>;

/**
 * Mocking DefaultCellRenderer here because it will be renderered
 * in Discover's environment and context and we cannot test that here in jest.
 *
 * Actual working of Cell Renderer will be tested in Discover's functional tests
 *
 * */
const mockDefaultCellRenderer = jest.fn((props) => {
  return <div data-test-subj="mocked-default-cell-render" />;
});

const mockDataView = dataViewMock;
mockDataView.getFieldByName = jest.fn().mockReturnValue({ type: 'string' } as DataViewField);

describe('getCellRendererForGivenRecord', () => {
  beforeEach(() => {
    DefaultCellRendererMock.mockImplementation(mockDefaultCellRenderer);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return cell renderer correctly for allowed fields with correct data format', () => {
    const cellRenderer = getCellRendererForGivenRecord('host.name');
    expect(cellRenderer).toBeDefined();
    const props: DataGridCellValueElementProps = {
      columnId: 'host.name',
      isDetails: false,
      isExpanded: false,
      row: {
        id: '1',
        raw: {},
        flattened: {
          'host.name': 'host1',
          'user.name': 'user1',
        },
      },
      dataView: mockDataView,
      setCellProps: jest.fn(),
      isExpandable: false,
      rowIndex: 0,
      colIndex: 0,
      fieldFormats: fieldFormatsMock,
      closePopover: jest.fn(),
    };
    const CellRenderer = cellRenderer as React.FC<DataGridCellValueElementProps>;
    const { getByTestId } = render(<CellRenderer {...props} />);
    expect(getByTestId('mocked-default-cell-render')).toBeVisible();
    expect(mockDefaultCellRenderer).toHaveBeenCalledWith(
      {
        isTimeline: false,
        isDetails: false,
        data: [
          { field: 'host.name', value: ['host1'] },
          { field: 'user.name', value: ['user1'] },
        ],
        eventId: '1',
        scopeId: 'one-discover',
        linkValues: undefined,
        header: {
          id: 'host.name',
          columnHeaderType: 'not-filtered',
          type: 'string',
        },
        asPlainText: false,
        context: undefined,
        rowRenderers: undefined,
        ecsData: undefined,
        colIndex: 0,
        rowIndex: 0,
        isExpandable: false,
        isExpanded: false,
        setCellProps: props.setCellProps,
        columnId: 'host.name',
      },
      {}
    );
  });
  it('should return undefined for non-allowedFields', () => {
    const cellRenderer = getCellRendererForGivenRecord('non-allowed-field');
    expect(cellRenderer).toBeUndefined();
  });
});
