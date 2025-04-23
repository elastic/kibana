/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimeRange, RefreshInterval, Query } from '@kbn/data-plugin/common/types';
import { Filter } from '@kbn/es-query';

interface Column {
  field: string;
  type: string;
}

export interface LogsExplorerPublicState {
  chart?: {
    breakdownField?: string | null;
  };
  controls?: ControlsState;
  dataSourceSelection?: DataSourceSelection;
  filters?: Filter[];
  grid?: {
    columns?: Column[];
    rows?: {
      rowHeight?: number;
      rowsPerPage?: number;
    };
  };
  query?: Query;
  refreshInterval?: RefreshInterval;
  time?: TimeRange;
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

export interface UrlSchemaV1 extends BaseUrlSchema {
  v?: 1;
  datasetSelection?: DataSourceSelection;
}

export interface UrlSchemaV2 extends BaseUrlSchema {
  v?: 2;
  dataSourceSelection?: DataSourceSelection;
}

export interface ControlsState {
  namespace?: {
    mode: 'exclude' | 'include';
    selection: FilterSelection;
  };
}

export type FilterSelection = { type: 'exists' } | { type: 'options'; selectedOptions: string[] };

export type DataSourceSelection =
  | { selectionType: 'all' }
  | { selectionType: 'dataView'; selection: { dataView: unknown } }
  | { selectionType: 'single'; selection: SingleDatasetSelection }
  | { selectionType: 'unresolved'; selection: UnresolvedDatasetSelection };

interface SingleDatasetSelection {
  name?: string;
  title?: string;
  version?: string;
  dataset: Record<string, unknown>;
}

interface UnresolvedDatasetSelection {
  dataset: Record<string, unknown>;
}

export const normalizeUrlState = (input: unknown): LogsExplorerPublicState | null => {
  try {
    const parsed = parseUnknownInput(input);
    const normalized = normalizeVersions(parsed);
    return convertToPublicState(normalized);
  } catch (err) {
    return null;
  }
};

const parseUnknownInput = (input: unknown): UrlSchemaV1 | UrlSchemaV2 => {
  if (typeof input !== 'object' || input === null) {
    throw new Error('Invalid URL state format');
  }

  return input as UrlSchemaV1 | UrlSchemaV2;
};

const normalizeVersions = (schema: UrlSchemaV1 | UrlSchemaV2): UrlSchemaV2 => {
  if ('datasetSelection' in schema) {
    return {
      ...schema,
      v: 2,
      dataSourceSelection: schema.datasetSelection,
    };
  }
  return schema as UrlSchemaV2;
};

const convertToPublicState = (schema: UrlSchemaV2): LogsExplorerPublicState => ({
  chart: { breakdownField: schema.breakdownField },
  controls: schema.controls,
  dataSourceSelection: schema.dataSourceSelection,
  filters: schema.filters,
  grid: {
    columns: schema.columns,
    rows: {
      rowHeight: schema.rowHeight,
      rowsPerPage: schema.rowsPerPage,
    },
  },
  query: schema.query,
  refreshInterval: schema.refreshInterval,
  time: schema.time,
});
