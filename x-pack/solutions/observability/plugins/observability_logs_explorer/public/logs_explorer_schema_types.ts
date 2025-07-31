/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimeRange, RefreshInterval, Query } from '@kbn/data-plugin/common/types';
import { DataViewSpec } from '@kbn/data-views-plugin/common';
import { Filter } from '@kbn/es-query';

export interface Column {
  field: string;
  type: string;
}

export interface DataSourceSelectionPlain {
  selectionType: 'all' | 'single' | 'dataView' | 'unresolved';
  selection?:
    | SingleDatasetSelectionPayload
    | DataViewSelectionPayload
    | UnresolvedDatasetSelectionPayload;
}

export interface DataViewSelectionPayload {
  dataView: {
    id: string;
    title: string;
    indexPattern?: string;
  };
}

export interface SingleDatasetSelectionPayload {
  name?: string;
  title?: string;
  version?: string;
  dataset: {
    name: string;
    indexPattern?: string;
  };
}

export interface UnresolvedDatasetSelectionPayload {
  name?: string;
  dataset: {
    name: string;
    indexPattern?: string;
  };
}

export interface DataViewSpecWithId extends DataViewSpec {
  id: string;
}

export interface BaseUrlSchema {
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

export interface UrlSchemaV1 extends BaseUrlSchema {
  v?: 1;
  datasetSelection?: DataSourceSelectionPlain;
}

export interface UrlSchemaV2 extends BaseUrlSchema {
  v?: 2;
  dataSourceSelection?: DataSourceSelectionPlain;
}

export interface ControlsState {
  namespace?: {
    mode: 'exclude' | 'include';
    selection: FilterSelection;
  };
}

export type FilterSelection = { type: 'exists' } | { type: 'options'; selectedOptions: string[] };

export interface ChartDisplayOptions {
  breakdownField: string | null;
}

export interface GridDisplayOptions {
  columns: GridColumnDisplayOptions[];
  rows: GridRowsDisplayOptions;
}

export interface GridColumnDisplayOptions {
  type: 'document-field' | 'smart-field';
  field?: string;
  smartField?: 'content' | 'resource';
  fallbackFields?: string[];
  width?: number;
}

export interface GridRowsDisplayOptions {
  rowHeight: number;
  rowsPerPage: number;
}

export interface DisplayOptions {
  grid: GridDisplayOptions;
  chart: ChartDisplayOptions;
}

export interface OptionsListControlOption {
  type: 'options';
  selectedOptions: string[];
}

export interface OptionsListControlExists {
  type: 'exists';
}

export interface OptionsListControl {
  mode: 'include' | 'exclude';
  selection: OptionsListControlOption | OptionsListControlExists;
}

export interface ControlOptions {
  ['data_stream.namespace']?: OptionsListControl;
}
