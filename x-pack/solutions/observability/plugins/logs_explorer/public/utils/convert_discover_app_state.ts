/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryState } from '@kbn/data-plugin/public';
import { DiscoverAppState } from '@kbn/discover-plugin/public';
import { ExistsFilter, Filter, FILTERS, PhrasesFilter } from '@kbn/es-query';
import { PhraseFilterValue } from '@kbn/es-query/src/filters/build_filters';
import { cloneDeep } from 'lodash';
import { CONTENT_FIELD, RESOURCE_FIELD, SMART_FALLBACK_FIELDS } from '../../common/constants';
import {
  ChartDisplayOptions,
  DisplayOptions,
  GridColumnDisplayOptions,
  GridRowsDisplayOptions,
} from '../../common';
import type { ControlOptions, OptionsListControl } from '../controller';

export const getGridColumnDisplayOptionsFromDiscoverAppState = (
  discoverAppState: DiscoverAppState
): GridColumnDisplayOptions[] | undefined =>
  discoverAppState.columns?.map((field) => {
    if (field === CONTENT_FIELD || field === RESOURCE_FIELD) {
      return SMART_FALLBACK_FIELDS[field];
    }
    return {
      type: 'document-field',
      field,
      width: discoverAppState.grid?.columns?.[field]?.width,
    };
  });

export const getGridRowsDisplayOptionsFromDiscoverAppState = (
  discoverAppState: DiscoverAppState
): Partial<GridRowsDisplayOptions> => ({
  ...(discoverAppState.rowHeight != null ? { rowHeight: discoverAppState.rowHeight } : {}),
  ...(discoverAppState.rowsPerPage != null ? { rowsPerPage: discoverAppState.rowsPerPage } : {}),
});

export const getChartDisplayOptionsFromDiscoverAppState = (
  discoverAppState: DiscoverAppState
): Partial<ChartDisplayOptions> => ({
  breakdownField: discoverAppState.breakdownField ?? null,
});

export const getQueryStateFromDiscoverAppState = (
  discoverAppState: DiscoverAppState
): QueryState => ({
  query: discoverAppState.query,
  filters: discoverAppState.filters,
});

export const getDiscoverAppStateFromContext = (
  displayOptions: DisplayOptions & QueryState
): Partial<DiscoverAppState> => ({
  breakdownField: displayOptions.chart.breakdownField ?? undefined,
  columns: getDiscoverColumnsFromDisplayOptions(displayOptions),
  grid: getDiscoverGridFromDisplayOptions(displayOptions),
  rowHeight: displayOptions.grid.rows.rowHeight,
  rowsPerPage: displayOptions.grid.rows.rowsPerPage,
  query: cloneDeep(displayOptions.query),
  filters: cloneDeep(displayOptions.filters),
});

export const getDiscoverColumnsWithFallbackFieldsFromDisplayOptions = (
  displayOptions: DisplayOptions
): DiscoverAppState['columns'] =>
  displayOptions.grid.columns.flatMap((column) => {
    return column.type === 'document-field'
      ? column.field
      : SMART_FALLBACK_FIELDS[column.smartField].fallbackFields;
  });

export const getDiscoverColumnsFromDisplayOptions = (
  displayOptions: DisplayOptions
): DiscoverAppState['columns'] =>
  displayOptions.grid.columns.flatMap((column) => {
    return column.type === 'document-field' ? column.field : column.smartField;
  });

export const getDiscoverGridFromDisplayOptions = (
  displayOptions: DisplayOptions
): DiscoverAppState['grid'] => ({
  columns: displayOptions.grid.columns.reduce<
    NonNullable<NonNullable<DiscoverAppState['grid']>['columns']>
  >((gridColumns, column) => {
    const key = column.type === 'document-field' ? column.field : column.smartField;

    if (column.width != null) {
      gridColumns[key] = { width: column.width };
    }
    return gridColumns;
  }, {}),
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
    value: FILTERS.EXISTS, // Required for the filter to be displayed correctly in FilterBadge
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
