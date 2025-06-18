/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimeRange, RefreshInterval, Query } from '@kbn/data-plugin/common/types';
import { DiscoverAppState } from '@kbn/discover-plugin/public';
import { SMART_FALLBACK_FIELDS } from '@kbn/discover-utils';
import { ExistsFilter, Filter, PhrasesFilter } from '@kbn/es-query';
import { FILTERS } from '@kbn/es-query';
import { PhraseFilterValue } from '@kbn/es-query/src/filters/build_filters';

import { ALL_LOGS_DATA_VIEW_ID } from '@kbn/discover-utils/src';
import {
  Column,
  DataSourceSelectionPlain,
  DataViewSelectionPayload,
  SingleDatasetSelectionPayload,
  UnresolvedDatasetSelectionPayload,
  DataViewSpecWithId,
  UrlSchemaV1,
  UrlSchemaV2,
  ControlsState,
  DisplayOptions,
  OptionsListControl,
  ControlOptions,
} from './logs_explorer_schema_types';

export interface LogsExplorerPublicState {
  chart?: {
    breakdownField?: string | null;
  };
  controls?: ControlsState;
  dataSourceSelection?: DataSourceSelectionPlain;
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

export const hydrateDataSourceSelection = (
  dataSourceSelection: DataSourceSelectionPlain
): DataViewSpecWithId => {
  if (dataSourceSelection.selectionType === 'all') {
    return {
      id: ALL_LOGS_DATA_VIEW_ID,
    };
  } else if (dataSourceSelection.selectionType === 'single' && dataSourceSelection.selection) {
    const selection = dataSourceSelection.selection as SingleDatasetSelectionPayload;
    return {
      id: `dataset-${selection.dataset.name}`,
      name: selection.title || selection.dataset.name,
      title: selection.dataset.indexPattern || selection.dataset.name,
      timeFieldName: '@timestamp',
    };
  } else if (dataSourceSelection.selectionType === 'dataView' && dataSourceSelection.selection) {
    const selection = dataSourceSelection.selection as DataViewSelectionPayload;
    return {
      id: selection.dataView.id,
      name: selection.dataView.title,
      title: selection.dataView.indexPattern || selection.dataView.title,
      timeFieldName: '@timestamp',
    };
  } else if (dataSourceSelection.selectionType === 'unresolved' && dataSourceSelection.selection) {
    const selection = dataSourceSelection.selection as UnresolvedDatasetSelectionPayload;
    return {
      id: `dataset-${selection.dataset.name}`,
      name: selection.name || selection.dataset.name,
      title: selection.dataset.indexPattern || selection.dataset.name,
      timeFieldName: '@timestamp',
    };
  }

  return {
    id: 'discover-observability-solution-all-logs',
    name: 'All logs',
    title: 'logs-*,dataset-logs-*-*',
    timeFieldName: '@timestamp',
  };
};

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
  chart: schema.breakdownField ? { breakdownField: schema.breakdownField } : undefined,
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

export const getDiscoverColumnsWithFallbackFieldsFromDisplayOptions = (
  displayOptions: DisplayOptions | undefined
): DiscoverAppState['columns'] | undefined =>
  displayOptions?.grid.columns?.flatMap((column) => {
    if (column.type === 'document-field' && column.field) {
      return column.field;
    } else if (column.type === 'smart-field' && column.smartField) {
      return SMART_FALLBACK_FIELDS[column.smartField].fallbackFields;
    }
    return [];
  });

const createDiscoverPhrasesFilter = ({
  key,
  values,
  negate,
  index,
}: {
  index: string;
  key: string;
  values: PhraseFilterValue[];
  negate?: boolean;
}): PhrasesFilter => ({
  meta: {
    index,
    type: FILTERS.PHRASES,
    key,
    params: values.map((value) => value.toString()),
    negate,
  },
  query: {
    bool: {
      should: values.map((value) => ({ match_phrase: { [key]: value.toString() } })),
      minimum_should_match: 1,
    },
  },
});

const createDiscoverExistsFilter = ({
  index,
  key,
  negate,
}: {
  key: string;
  index: string;
  negate?: boolean;
}): ExistsFilter => ({
  meta: {
    index,
    type: FILTERS.EXISTS,
    value: FILTERS.EXISTS,
    key,
    negate,
  },
  query: { exists: { field: key } },
});

export const getDiscoverFiltersFromState = (
  index: string,
  filters: Filter[] = [],
  controls?: ControlOptions
) => {
  return [
    ...filters,
    ...(controls
      ? (Object.entries(controls) as Array<[keyof ControlOptions, OptionsListControl]>).reduce<
          Filter[]
        >((acc, [key, control]) => {
          if (control.selection.type === 'exists') {
            acc.push(
              createDiscoverExistsFilter({
                index,
                key,
                negate: control.mode === 'exclude',
              })
            );
          } else if (control.selection.selectedOptions.length > 0) {
            acc.push(
              createDiscoverPhrasesFilter({
                index,
                key,
                values: control.selection.selectedOptions,
                negate: control.mode === 'exclude',
              })
            );
          }
          return acc;
        }, [])
      : []),
  ];
};
