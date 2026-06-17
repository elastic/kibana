/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiTheme } from '@kbn/kibana-react-plugin/common';
import type { ColumnHeaderOptions } from '../../common/types';
import {
  addBuildingBlockStyle,
  hasCellActions,
  mapSortDirectionToDirection,
  mapSortingColumns,
} from './helpers';
import { mockDnsEvent } from '../../mock/mock_timeline_data';

describe('helpers', () => {
  describe('mapSortDirectionToDirection', () => {
    test('it returns the expected direction when sortDirection is `asc`', () => {
      expect(mapSortDirectionToDirection('asc')).toBe('asc');
    });

    test('it returns the expected direction when sortDirection is `desc`', () => {
      expect(mapSortDirectionToDirection('desc')).toBe('desc');
    });

    test('it returns the expected direction when sortDirection is `none`', () => {
      expect(mapSortDirectionToDirection('none')).toBe('desc'); // defaults to a valid direction accepted by `EuiDataGrid`
    });
  });

  describe('mapSortingColumns', () => {
    const columns: Array<{
      id: string;
      direction: 'asc' | 'desc';
    }> = [
      {
        id: 'kibana.rac.alert.status',
        direction: 'asc',
      },
      {
        id: 'kibana.rac.alert.start',
        direction: 'desc',
      },
    ];

    const columnHeaders: ColumnHeaderOptions[] = [
      {
        columnHeaderType: 'not-filtered',
        displayAsText: 'Status',
        id: 'kibana.rac.alert.status',
        initialWidth: 79,
        category: 'kibana',
        type: 'string',
        aggregatable: true,
        actions: {
          showSortAsc: {
            label: 'Sort A-Z',
          },
          showSortDesc: {
            label: 'Sort Z-A',
          },
        },
        defaultSortDirection: 'desc',
        display: {
          key: null,
          ref: null,
          props: {
            children: {
              key: null,
              ref: null,
              props: {
                children: 'Status',
              },
              _owner: null,
            },
          },
          _owner: null,
        } as unknown as React.ReactNode,
        isSortable: true,
      },
      {
        columnHeaderType: 'not-filtered',
        displayAsText: 'Triggered',
        id: 'kibana.rac.alert.start',
        initialWidth: 176,
        category: 'kibana',
        type: 'date',
        esTypes: ['date'],
        aggregatable: true,
        actions: {
          showSortAsc: {
            label: 'Sort A-Z',
          },
          showSortDesc: {
            label: 'Sort Z-A',
          },
        },
        defaultSortDirection: 'desc',
        display: {
          key: null,
          ref: null,
          props: {
            children: {
              key: null,
              ref: null,
              props: {
                children: 'Triggered',
              },
              _owner: null,
            },
          },
          _owner: null,
        } as unknown as React.ReactNode,
        isSortable: true,
      },
    ];

    test('it returns the expected results when each column has a corresponding entry in `columnHeaders`', () => {
      expect(mapSortingColumns({ columns, columnHeaders })).toEqual([
        {
          columnId: 'kibana.rac.alert.status',
          columnType: 'string',
          esTypes: [],
          sortDirection: 'asc',
        },
        {
          columnId: 'kibana.rac.alert.start',
          columnType: 'date',
          esTypes: ['date'],
          sortDirection: 'desc',
        },
      ]);
    });

    test('it defaults to a `columnType` of empty string when a column does NOT have a corresponding entry in `columnHeaders`', () => {
      const withUnknownColumn: Array<{
        id: string;
        direction: 'asc' | 'desc';
      }> = [
        {
          id: 'kibana.rac.alert.status',
          direction: 'asc',
        },
        {
          id: 'kibana.rac.alert.start',
          direction: 'desc',
        },
        {
          id: 'unknown', // <-- no entry for this in `columnHeaders`
          direction: 'asc',
        },
      ];

      expect(mapSortingColumns({ columns: withUnknownColumn, columnHeaders })).toEqual([
        {
          columnId: 'kibana.rac.alert.status',
          columnType: 'string',
          esTypes: [],
          sortDirection: 'asc',
        },
        {
          columnId: 'kibana.rac.alert.start',
          columnType: 'date',
          esTypes: ['date'],
          sortDirection: 'desc',
        },
        {
          columnId: 'unknown',
          columnType: '', // <-- mapped to the default
          esTypes: [], // <-- mapped to the default
          sortDirection: 'asc',
        },
      ]);
    });
  });

  describe('addBuildingBlockStyle', () => {
    const THEME = { eui: { euiColorHighlight: 'euiColorHighlight' }, darkMode: false } as EuiTheme;

    test('it calls `setCellProps` with background color when event is a building block', () => {
      const mockedSetCellProps = jest.fn();
      const ecs = {
        ...mockDnsEvent,
        ...{ kibana: { alert: { building_block_type: ['default'] } } },
      };

      addBuildingBlockStyle(ecs, THEME, mockedSetCellProps);

      expect(mockedSetCellProps).toBeCalledWith({
        style: {
          backgroundColor: 'euiColorHighlight',
        },
      });
    });

    test('it call `setCellProps` resetting the background color when event is not a building block', () => {
      const mockedSetCellProps = jest.fn();

      addBuildingBlockStyle(mockDnsEvent, THEME, mockedSetCellProps);

      expect(mockedSetCellProps).toBeCalledWith({ style: { backgroundColor: 'inherit' } });
    });
  });

  describe('hasCellActions', () => {
    const columnId = '@timestamp';

    test('it returns false when the columnId is included in `disabledCellActions` ', () => {
      const disabledCellActions = ['foo', '@timestamp', 'bar', 'baz']; // includes @timestamp

      expect(hasCellActions({ columnId, disabledCellActions })).toBe(false);
    });

    test('it returns true when the columnId is NOT included in `disabledCellActions` ', () => {
      const disabledCellActions = ['foo', 'bar', 'baz'];

      expect(hasCellActions({ columnId, disabledCellActions })).toBe(true);
    });
  });
});
