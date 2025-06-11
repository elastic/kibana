/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SMART_FALLBACK_FIELDS } from '@kbn/discover-utils';
import { FILTERS, Filter } from '@kbn/es-query';
import {
  normalizeUrlState,
  hydrateDataSourceSelection,
  getDiscoverColumnsWithFallbackFieldsFromDisplayOptions,
  getDiscoverFiltersFromState,
} from './logs_explorer_url_schema';
import type { DisplayOptions, ControlOptions } from './logs_explorer_schema_types';
import { TimeRange, RefreshInterval, Query } from '@kbn/data-plugin/common/types';
import { ALL_LOGS_DATA_VIEW_ID } from '@kbn/discover-utils/src/data_types';

jest.mock('@kbn/discover-utils/src/data_types/logs/utils', () => ({
  getAllLogsDataViewSpec: jest.fn(({ allLogsIndexPattern }) => ({
    id: 'discover-observability-solution-all-logs',
    name: 'All logs',
    title: allLogsIndexPattern,
    timeFieldName: '@timestamp',
  })),
}));

describe('logs_explorer_url_schema', () => {
  const mockTime: TimeRange = { from: 'now-24h', to: 'now' };
  const mockRefreshInterval: RefreshInterval = { pause: false, value: 15000 };
  const mockQuery: Query = { language: 'kuery', query: 'test query' };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('hydrateDataSourceSelection', () => {
    it('should handle "all" selection type correctly', () => {
      const result = hydrateDataSourceSelection({ selectionType: 'all' });
      expect(result).toEqual({
        id: ALL_LOGS_DATA_VIEW_ID,
      });
    });

    it('should handle "single" selection type correctly', () => {
      const result = hydrateDataSourceSelection({
        selectionType: 'single',
        selection: {
          dataset: { name: 'test-dataset', indexPattern: 'test-*' },
          title: 'Test Dataset',
        },
      });
      expect(result).toEqual({
        id: 'dataset-test-dataset',
        name: 'Test Dataset',
        title: 'test-*',
        timeFieldName: '@timestamp',
      });
    });

    it('should use dataset name as title if no title provided for single selection', () => {
      const result = hydrateDataSourceSelection({
        selectionType: 'single',
        selection: {
          dataset: { name: 'test-dataset', indexPattern: 'test-*' },
        },
      });
      expect(result).toEqual({
        id: 'dataset-test-dataset',
        name: 'test-dataset',
        title: 'test-*',
        timeFieldName: '@timestamp',
      });
    });

    it('should use dataset name if no indexPattern provided for single selection', () => {
      const result = hydrateDataSourceSelection({
        selectionType: 'single',
        selection: {
          dataset: { name: 'test-dataset' },
        },
      });
      expect(result).toEqual({
        id: 'dataset-test-dataset',
        name: 'test-dataset',
        title: 'test-dataset',
        timeFieldName: '@timestamp',
      });
    });

    it('should handle "dataView" selection type correctly', () => {
      const result = hydrateDataSourceSelection({
        selectionType: 'dataView',
        selection: {
          dataView: { id: 'test-id', title: 'Test View', indexPattern: 'test-*' },
        },
      });
      expect(result).toEqual({
        id: 'test-id',
        name: 'Test View',
        title: 'test-*',
        timeFieldName: '@timestamp',
      });
    });

    it('should handle "unresolved" selection type correctly', () => {
      const result = hydrateDataSourceSelection({
        selectionType: 'unresolved',
        selection: {
          dataset: { name: 'test-dataset', indexPattern: 'test-*' },
          name: 'Test Name',
        },
      });
      expect(result).toEqual({
        id: 'dataset-test-dataset',
        name: 'Test Name',
        title: 'test-*',
        timeFieldName: '@timestamp',
      });
    });

    it('should fallback to "all" selection when invalid selection type is provided', () => {
      // @ts-expect-error
      const result = hydrateDataSourceSelection({ selectionType: 'invalid' });
      expect(result).toEqual({
        id: 'discover-observability-solution-all-logs',
        name: 'All logs',
        title: 'logs-*,dataset-logs-*-*',
        timeFieldName: '@timestamp',
      });
    });
  });

  describe('normalizeUrlState', () => {
    it('should convert v1 schema to public state', () => {
      const input = {
        v: 1,
        datasetSelection: { selectionType: 'all' },
        time: mockTime,
        refreshInterval: mockRefreshInterval,
        query: mockQuery,
      };
      const result = normalizeUrlState(input);
      expect(result).toMatchObject({
        dataSourceSelection: { selectionType: 'all' },
        time: mockTime,
        refreshInterval: mockRefreshInterval,
        query: mockQuery,
      });
    });

    it('should handle v2 schema correctly', () => {
      const input = {
        v: 2,
        dataSourceSelection: { selectionType: 'all' },
        time: mockTime,
        refreshInterval: mockRefreshInterval,
        query: mockQuery,
      };
      const result = normalizeUrlState(input);
      expect(result).toMatchObject({
        dataSourceSelection: { selectionType: 'all' },
        time: mockTime,
        refreshInterval: mockRefreshInterval,
        query: mockQuery,
      });
    });

    it('should return null for invalid input', () => {
      const result = normalizeUrlState(null);
      expect(result).toBeNull();
    });

    it('should handle schema with breakdownField', () => {
      const input = {
        v: 2,
        dataSourceSelection: { selectionType: 'all' },
        breakdownField: 'host.name',
      };
      const result = normalizeUrlState(input);
      expect(result).toMatchObject({
        dataSourceSelection: { selectionType: 'all' },
        chart: {
          breakdownField: 'host.name',
        },
      });
    });

    it('should handle schema with columns and rows', () => {
      const input = {
        v: 2,
        dataSourceSelection: { selectionType: 'all' },
        columns: [{ field: 'host.name', type: 'string' }],
        rowHeight: 40,
        rowsPerPage: 25,
      };
      const result = normalizeUrlState(input);
      expect(result).toMatchObject({
        dataSourceSelection: { selectionType: 'all' },
        grid: {
          columns: [{ field: 'host.name', type: 'string' }],
          rows: {
            rowHeight: 40,
            rowsPerPage: 25,
          },
        },
      });
    });

    it('should handle schema with controls', () => {
      const controlsState = {
        namespace: {
          mode: 'include' as const,
          selection: { type: 'options' as const, selectedOptions: ['default'] },
        },
      };
      const input = {
        v: 2,
        dataSourceSelection: { selectionType: 'all' },
        controls: controlsState,
      };

      const result = normalizeUrlState(input);
      expect(result).toMatchObject({
        dataSourceSelection: { selectionType: 'all' },
        controls: controlsState,
      });
    });
  });

  describe('getDiscoverColumnsWithFallbackFieldsFromDisplayOptions', () => {
    it('should extract document fields from display options', () => {
      const displayOptions: DisplayOptions = {
        grid: {
          columns: [
            { type: 'document-field', field: 'host.name' },
            { type: 'document-field', field: 'message' },
          ],
          rows: { rowHeight: 40, rowsPerPage: 25 },
        },
        chart: { breakdownField: null },
      };

      const result = getDiscoverColumnsWithFallbackFieldsFromDisplayOptions(displayOptions);
      expect(result).toEqual(['host.name', 'message']);
    });

    it('should handle smart fields with fallback fields', () => {
      const displayOptions: DisplayOptions = {
        grid: {
          columns: [{ type: 'smart-field', smartField: 'content' }],
          rows: { rowHeight: 40, rowsPerPage: 25 },
        },
        chart: { breakdownField: null },
      };

      const result = getDiscoverColumnsWithFallbackFieldsFromDisplayOptions(displayOptions);
      expect(result).toEqual(SMART_FALLBACK_FIELDS.content.fallbackFields);
    });

    it('should handle mixed document and smart fields', () => {
      const displayOptions: DisplayOptions = {
        grid: {
          columns: [
            { type: 'document-field', field: 'host.name' },
            { type: 'smart-field', smartField: 'resource' },
          ],
          rows: { rowHeight: 40, rowsPerPage: 25 },
        },
        chart: { breakdownField: null },
      };

      const result = getDiscoverColumnsWithFallbackFieldsFromDisplayOptions(displayOptions);
      expect(result).toEqual(['host.name', ...SMART_FALLBACK_FIELDS.resource.fallbackFields]);
    });

    it('should handle empty or invalid columns gracefully', () => {
      const displayOptions: DisplayOptions = {
        grid: {
          columns: [{ type: 'document-field' }, { type: 'smart-field' }],
          rows: { rowHeight: 40, rowsPerPage: 25 },
        },
        chart: { breakdownField: null },
      };

      const result = getDiscoverColumnsWithFallbackFieldsFromDisplayOptions(displayOptions);
      expect(result).toEqual([]);
    });

    it('should handle undefined display options', () => {
      const result = getDiscoverColumnsWithFallbackFieldsFromDisplayOptions(undefined);
      expect(result).toEqual(undefined);
    });
  });

  describe('getDiscoverFiltersFromState', () => {
    it('should combine filters and controls', () => {
      const index = 'test-index';
      const mockFilter: Filter = { meta: { type: 'phrase', key: 'host.name' } } as Filter;
      const filters: Filter[] = [mockFilter];
      const controls: ControlOptions = {
        'data_stream.namespace': {
          mode: 'include',
          selection: {
            type: 'options',
            selectedOptions: ['default'],
          },
        },
      };

      const result = getDiscoverFiltersFromState(index, filters, controls);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(mockFilter);
      expect(result[1].meta.type).toEqual(FILTERS.PHRASES);
      expect(result[1].meta.key).toEqual('data_stream.namespace');
      expect(result[1].meta.params).toEqual(['default']);
      expect(result[1].meta.negate).toBeFalsy();
    });

    it('should handle exists filter type in controls', () => {
      const index = 'test-index';
      const filters: Filter[] = [];
      const controls: ControlOptions = {
        'data_stream.namespace': {
          mode: 'exclude',
          selection: {
            type: 'exists',
          },
        },
      };

      const result = getDiscoverFiltersFromState(index, filters, controls);

      expect(result).toHaveLength(1);
      expect(result[0].meta.type).toEqual(FILTERS.EXISTS);
      expect(result[0].meta.key).toEqual('data_stream.namespace');
      expect(result[0].meta.negate).toBeTruthy();
    });

    it('should handle empty controls', () => {
      const index = 'test-index';
      const mockFilter: Filter = { meta: { type: 'phrase', key: 'host.name' } } as Filter;
      const filters: Filter[] = [mockFilter];

      const result = getDiscoverFiltersFromState(index, filters);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockFilter);
    });

    it('should handle empty filters', () => {
      const index = 'test-index';

      const result = getDiscoverFiltersFromState(index);

      expect(result).toEqual([]);
    });

    it('should not create filters for empty selected options', () => {
      const index = 'test-index';
      const controls: ControlOptions = {
        'data_stream.namespace': {
          mode: 'include',
          selection: {
            type: 'options',
            selectedOptions: [],
          },
        },
      };

      const result = getDiscoverFiltersFromState(index, [], controls);

      expect(result).toEqual([]);
    });
  });
});
