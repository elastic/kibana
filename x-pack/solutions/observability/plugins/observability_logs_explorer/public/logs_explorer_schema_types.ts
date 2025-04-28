/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimeRange, RefreshInterval, Query } from '@kbn/data-plugin/common/types';
import { DataViewSpec } from '@kbn/data-views-plugin/common';
import { Filter } from '@kbn/es-query';

interface Column {
  field: string;
  type: string;
}

interface DataSourceSelectionPlain {
  selectionType: 'all' | 'single' | 'dataView' | 'unresolved';
  selection?:
    | SingleDatasetSelectionPayload
    | DataViewSelectionPayload
    | UnresolvedDatasetSelectionPayload;
}

interface DataViewSelectionPayload {
  dataView: {
    id: string;
    title: string;
    indexPattern?: string;
  };
}

interface SingleDatasetSelectionPayload {
  name?: string;
  title?: string;
  version?: string;
  dataset: {
    name: string;
    indexPattern?: string;
  };
}

interface UnresolvedDatasetSelectionPayload {
  name?: string;
  dataset: {
    name: string;
    indexPattern?: string;
  };
}

interface DataViewSpecWithId extends DataViewSpec {
  id: string;
}

interface BaseUrlSchema {
  breakdownField?: string | null;
  columns?: Column[];
  filters?: Filter[];
  query?: Query;
  refreshInterval?: RefreshInterval;
  rowHeight?: number;
  rowsPerPage?: number;
  time?: TimeRange;
  controls?: ControlsState;
}

interface UrlSchemaV1 extends BaseUrlSchema {
  v?: 1;
  datasetSelection?: DataSourceSelectionPlain;
}

interface UrlSchemaV2 extends BaseUrlSchema {
  v?: 2;
  dataSourceSelection?: DataSourceSelectionPlain;
}

interface ControlsState {
  namespace?: {
    mode: 'exclude' | 'include';
    selection: FilterSelection;
  };
}

type FilterSelection = { type: 'exists' } | { type: 'options'; selectedOptions: string[] };

interface ChartDisplayOptions {
  breakdownField: string | null;
}

interface GridDisplayOptions {
  columns: GridColumnDisplayOptions[];
  rows: GridRowsDisplayOptions;
}

interface GridColumnDisplayOptions {
  type: 'document-field' | 'smart-field';
  field?: string;
  smartField?: 'content' | 'resource';
  fallbackFields?: string[];
  width?: number;
}

interface GridRowsDisplayOptions {
  rowHeight: number;
  rowsPerPage: number;
}

interface DisplayOptions {
  grid: GridDisplayOptions;
  chart: ChartDisplayOptions;
}

interface OptionsListControlOption {
  type: 'options';
  selectedOptions: string[];
}

interface OptionsListControlExists {
  type: 'exists';
}

interface OptionsListControl {
  mode: 'include' | 'exclude';
  selection: OptionsListControlOption | OptionsListControlExists;
}

interface ControlOptions {
  ['data_stream.namespace']?: OptionsListControl;
}

export type {
  Column,
  DataSourceSelectionPlain,
  DataViewSelectionPayload,
  SingleDatasetSelectionPayload,
  UnresolvedDatasetSelectionPayload,
  DataViewSpecWithId,
  BaseUrlSchema,
  UrlSchemaV1,
  UrlSchemaV2,
  ControlsState,
  FilterSelection,
  ChartDisplayOptions,
  GridDisplayOptions,
  GridColumnDisplayOptions,
  GridRowsDisplayOptions,
  DisplayOptions,
  OptionsListControlOption,
  OptionsListControlExists,
  OptionsListControl,
  ControlOptions,
};
