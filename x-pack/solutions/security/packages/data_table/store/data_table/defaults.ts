/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ColumnHeaderOptions, ColumnHeaderType, VIEW_SELECTION } from '../../common/types';
import {
  DEFAULT_TABLE_COLUMN_MIN_WIDTH,
  DEFAULT_TABLE_DATE_COLUMN_MIN_WIDTH,
} from '../../components/data_table/constants';
import type { SubsetDataTableModel } from './model';
import * as i18n from './translations';

export const defaultColumnHeaderType: ColumnHeaderType = 'not-filtered';

export const defaultHeaders: ColumnHeaderOptions[] = [
  {
    columnHeaderType: defaultColumnHeaderType,
    id: '@timestamp',
    initialWidth: DEFAULT_TABLE_DATE_COLUMN_MIN_WIDTH,
    esTypes: ['date'],
    type: 'date',
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'message',
    initialWidth: DEFAULT_TABLE_COLUMN_MIN_WIDTH,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'event.category',
    initialWidth: DEFAULT_TABLE_COLUMN_MIN_WIDTH,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'event.action',
    initialWidth: DEFAULT_TABLE_COLUMN_MIN_WIDTH,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'host.name',
    initialWidth: DEFAULT_TABLE_COLUMN_MIN_WIDTH,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'source.ip',
    initialWidth: DEFAULT_TABLE_COLUMN_MIN_WIDTH,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'destination.ip',
    initialWidth: DEFAULT_TABLE_COLUMN_MIN_WIDTH,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'user.name',
    initialWidth: DEFAULT_TABLE_COLUMN_MIN_WIDTH,
  },
];

export const tableDefaults: SubsetDataTableModel = {
  defaultColumns: defaultHeaders,
  dataViewId: null,
  deletedEventIds: [],
  filters: [],
  indexNames: [],
  isSelectAllChecked: false,
  isLoading: false,
  itemsPerPage: 25,
  itemsPerPageOptions: [10, 25, 50, 100],
  loadingEventIds: [],
  selectedEventIds: {},
  showCheckboxes: false,
  sort: [
    {
      columnId: '@timestamp',
      columnType: 'date',
      esTypes: ['date'],
      sortDirection: 'desc',
    },
  ],
  selectAll: false,
  graphEventId: '',
  sessionViewConfig: null,
  columns: defaultHeaders,
  queryFields: [],
  title: '',
  totalCount: 0,
  viewMode: VIEW_SELECTION.gridView,
  additionalFilters: {
    showBuildingBlockAlerts: false,
    showOnlyThreatIndicatorAlerts: false,
  },
};

export const getDataTableManageDefaults = (id: string) => ({
  defaultColumns: defaultHeaders,
  loadingText: i18n.LOADING_EVENTS,
  documentType: '',
  selectAll: false,
  id,
  isLoading: false,
  queryFields: [],
  title: '',
  unit: (n: number) => i18n.UNIT(n),
  graphEventId: '',
});
